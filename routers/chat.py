import json
import asyncio
import time
import uuid
import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage, SystemMessage

from config import settings
from agent.chatbot_graph import chatbot_graph, memory_checkpointer
from agent.state import AgentState, extract_text_content
from auth import (
    get_optional_user,
    check_chat_quota_allowed,
    filter_tools_for_user_tier,
)
from db import ChatRepository
from db.tier_repository import TierRepository
from services.langfuse_service import LangfuseService
from utils.rag_terminal_logger import RAGTerminalLogger

router = APIRouter(prefix="/api/chat", tags=["Chat"])


def format_graceful_error(err: Exception) -> str:
    """Format technical backend exceptions into clean, human-readable user guidance."""
    if isinstance(err, HTTPException):
        return f"⚠️ **Tier Limit:** {err.detail}"
    err_str = str(err)
    if any(k in err_str for k in ["429", "RESOURCE_EXHAUSTED", "quota", "Rate limit"]):
        retry_match = re.search(r"retry in ([\d\.]+s?)", err_str, re.IGNORECASE)
        delay_info = f" (Suggested wait: ~{retry_match.group(1)})" if retry_match else " (Suggested wait: ~30 seconds)"
        return (
            f"**Google Gemini Free-Tier Quota / Rate Limit Exceeded (429)**\n\n"
            f"The request temporarily exceeded the per-minute token limit{delay_info}. "
            f"Please wait a few moments before submitting another request or upgrade your Google AI Studio quota."
        )
    if "API_KEY" in err_str or "invalid api key" in err_str.lower():
        return "Authentication Error: Invalid or missing `GEMINI_API_KEY` in server configuration."
    return err_str


def get_scoped_thread_id(raw_thread_id: str, user: Dict[str, Any]) -> str:
    """Scope thread ID by authenticated user ID to isolate conversation state."""
    if user.get("authenticated") and user.get("user_id"):
        return f"{user['user_id']}_{raw_thread_id}"
    return raw_thread_id


import base64
from tools.image_tool import (
    set_active_turn_image,
    clear_active_turn_image,
    SUPPORTED_MIME_TYPES,
    MAX_FILE_SIZE_BYTES,
)
from tools.rag_retrieval_tool import (
    set_active_turn_files,
    clear_active_turn_files,
)


class ChatMessagePayload(BaseModel):
    role: str = Field(..., description="The role of the message author ('user' or 'assistant')", example="user")
    content: str = Field(..., description="Message text content formatted in plain text or Markdown", example="What is 25 * 4?")
    image_data: Optional[str] = Field(default=None, description="Optional base64 image data URL or string (max 5 MB)")
    mime_type: Optional[str] = Field(default=None, description="MIME type of uploaded image (e.g. image/png, image/jpeg)")


class ChatRequest(BaseModel):
    message: str = Field(..., description="The latest user input prompt or query", example="Calculate 25 * 4 and search current AI news.")
    image_data: Optional[str] = Field(default=None, description="Base64 image data URL or raw base64 for multimodal vision analysis (max 5 MB)")
    mime_type: Optional[str] = Field(default="image/png", description="MIME type (image/png, image/jpeg, image/webp, image/heic, image/heif)")
    thread_id: Optional[str] = Field(
        default=None, 
        description="Unique conversation session ID for LangGraph checkpointer memory. If omitted, a new UUID is generated.", 
        example="thread_1727451200_abc123"
    )
    history: Optional[List[ChatMessagePayload]] = Field(
        default_factory=list, 
        description="Prior conversation history used to initialize a new thread if not already in server memory.",
        example=[
            {"role": "user", "content": "Hi, my name is Alex."},
            {"role": "assistant", "content": "Hello Alex! How can I help you today?"}
        ]
    )
    enabled_tools: Optional[List[str]] = Field(
        default=None,
        description="List of enabled tools selected by user. If provided, agent will only invoke these tools.",
        example=["calculate", "web_search", "web_scrape"]
    )
    selected_file_ids: Optional[List[str]] = Field(
        default_factory=list,
        description="List of document IDs selected by the user to query via Hybrid RAG",
        example=["doc_1793015507674_vn4u0"]
    )
    system_prompt_prefix: Optional[str] = Field(
        default=None,
        description="Custom system prompt prefix configured via Agent Builder workflow",
        example="You are a senior ATS resume optimization specialist."
    )


class ChatResponse(BaseModel):
    thread_id: str = Field(..., description="Conversation session ID persisted in LangGraph checkpointer", example="thread_1727451200_abc123")
    response: str = Field(..., description="Synthesized final Markdown answer generated by Gemini", example="The result of $25 \\times 4$ is **100**.")
    execution_steps: List[Dict[str, Any]] = Field(..., description="Trace log of visited LangGraph nodes, tool actions, and latency timings")
    status: str = Field(..., description="Final workflow execution status ('completed' or 'error')", example="completed")
    trace_id: Optional[str] = Field(default=None, description="Langfuse OpenTelemetry trace ID for observability and scoring")


class ThreadHistoryResponse(BaseModel):
    thread_id: str = Field(..., description="Session thread ID queried", example="thread_1727451200_abc123")
    messages: List[Dict[str, Any]] = Field(..., description="Chronological sequence of all messages in thread memory (User, Assistant, Tools)")
    current_node: str = Field(..., description="Last active node in graph", example="agent")
    execution_steps: List[Dict[str, Any]] = Field(..., description="List of recorded execution steps for this thread")


class ClearThreadResponse(BaseModel):
    status: str = Field(..., description="Deletion status indicator", example="cleared")
    thread_id: str = Field(..., description="Thread ID that was cleared from memory", example="thread_1727451200_abc123")


class FeedbackRequest(BaseModel):
    trace_id: str = Field(..., description="The Langfuse OpenTelemetry trace ID to associate feedback with")
    score: float = Field(..., description="1.0 for thumbs up (positive), 0.0 for thumbs down (negative)")
    comment: Optional[str] = Field(default=None, description="Optional text feedback or explanation")


@router.post("/feedback", summary="Submit User Feedback on Trace")
async def submit_feedback(payload: FeedbackRequest, user: Dict[str, Any] = Depends(get_optional_user)):
    """Submits user feedback score to Langfuse for continuous evaluation."""
    success = LangfuseService.record_feedback_score(
        trace_id=payload.trace_id,
        value=payload.score,
        comment=payload.comment,
    )
    return {"success": success, "trace_id": payload.trace_id}


def validate_and_prepare_image(image_data: Optional[str], mime_type: Optional[str] = "image/png"):
    """Validates image constraints: max 5 MB and supported MIME types."""
    if not image_data:
        clear_active_turn_image()
        return None, None

    raw_b64 = image_data
    chosen_mime = (mime_type or "image/png").lower().strip()

    if raw_b64.startswith("data:"):
        match = re.match(r"^data:([^;]+);base64,(.*)$", raw_b64, re.DOTALL)
        if match:
            chosen_mime = match.group(1).lower().strip()
            raw_b64 = match.group(2).strip()

    if chosen_mime == "image/jpg":
        chosen_mime = "image/jpeg"

    if chosen_mime not in SUPPORTED_MIME_TYPES:
        allowed = ", ".join(sorted(SUPPORTED_MIME_TYPES))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported MIME type '{chosen_mime}'. Supported types: {allowed}"
        )

    try:
        decoded = base64.b64decode(raw_b64)
        if len(decoded) > MAX_FILE_SIZE_BYTES:
            mb = len(decoded) / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"Image size ({mb:.2f} MB) exceeds maximum allowed limit of 5.0 MB."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")

    set_active_turn_image(raw_b64, chosen_mime)
    return raw_b64, chosen_mime


def build_human_message(text: str, image_data: Optional[str] = None, mime_type: Optional[str] = None) -> HumanMessage:
    """Construct HumanMessage with multimodal image parts if image_data is present."""
    if not image_data:
        return HumanMessage(content=text)

    raw_b64 = image_data
    chosen_mime = (mime_type or "image/png").lower().strip()

    if raw_b64.startswith("data:"):
        match = re.match(r"^data:([^;]+);base64,(.*)$", raw_b64, re.DOTALL)
        if match:
            chosen_mime = match.group(1).lower().strip()
            raw_b64 = match.group(2).strip()

    if chosen_mime == "image/jpg":
        chosen_mime = "image/jpeg"

    data_url = f"data:{chosen_mime};base64,{raw_b64}"
    return HumanMessage(
        content=[
            {"type": "text", "text": text or "Please analyze the uploaded image."},
            {"type": "image_url", "image_url": {"url": data_url}},
        ]
    )


def parse_history_to_messages(
    history: List[ChatMessagePayload],
    new_message: str,
    new_image: Optional[str] = None,
    new_mime: Optional[str] = None,
):
    """Convert input history and new message to LangChain BaseMessage objects with multimodal support."""
    langchain_messages = []
    for msg in history:
        if msg.role == "user":
            langchain_messages.append(build_human_message(msg.content, msg.image_data, msg.mime_type))
        elif msg.role == "assistant":
            langchain_messages.append(AIMessage(content=msg.content))
    
    langchain_messages.append(build_human_message(new_message, new_image, new_mime))
    return langchain_messages



# ==============================================================================
# Supabase Persistent Conversations Endpoints
# ==============================================================================

@router.get("/conversations", summary="List Authenticated User Conversations")
async def list_conversations(user: Dict[str, Any] = Depends(get_optional_user)):
    """Fetch user's saved conversations from Supabase PostgreSQL."""
    if not user.get("authenticated"):
        return []
    return await ChatRepository.get_user_conversations(user["user_id"])


@router.post("/conversations", summary="Create New Conversation")
async def create_conversation_endpoint(data: Dict[str, Any], user: Dict[str, Any] = Depends(get_optional_user)):
    """Create a new persistent conversation thread in Supabase."""
    title = data.get("title", "New Conversation")
    if not user.get("authenticated"):
        return {"id": str(uuid.uuid4()), "title": title, "created_at": time.time()}
    conv = await ChatRepository.create_conversation(user["user_id"], title)
    return conv or {"id": str(uuid.uuid4()), "title": title}


@router.get("/conversations/{conversation_id}/messages", summary="Get Persistent Messages in Conversation")
async def get_conversation_messages_endpoint(conversation_id: str, user: Dict[str, Any] = Depends(get_optional_user)):
    user_id = user.get("user_id") if user.get("authenticated") else None
    history = await ChatRepository.get_conversation_history(conversation_id, user_id=user_id)
    if history.get("messages") and len(history["messages"]) > 0:
        return history

    # Fallback to checkpointer memory if guest session or not found in Supabase
    try:
        scoped_id = get_scoped_thread_id(conversation_id, user)
        config = {"configurable": {"thread_id": scoped_id}}
        state = chatbot_graph.get_state(config)
        if state and state.values and state.values.get("messages"):
            serialized_messages = []
            for msg in state.values.get("messages", []):
                if isinstance(msg, HumanMessage):
                    serialized_messages.append({
                        "id": getattr(msg, "id", None) or str(uuid.uuid4())[:8],
                        "role": "user",
                        "content": extract_text_content(msg.content),
                        "timestamp": ""
                    })
                elif isinstance(msg, AIMessage):
                    serialized_messages.append({
                        "id": getattr(msg, "id", None) or str(uuid.uuid4())[:8],
                        "role": "assistant",
                        "content": extract_text_content(msg.content),
                        "timestamp": ""
                    })
            return {"messages": serialized_messages, "events": []}
    except Exception as e:
        print(f"[AutoFlow API] Fallback memory check error: {e}")

    return history


@router.delete("/conversations/{conversation_id}", summary="Delete Conversation from Supabase")
async def delete_conversation_endpoint(conversation_id: str, user: Dict[str, Any] = Depends(get_optional_user)):
    """Delete a conversation from Supabase and purge its checkpointer state."""
    if user.get("authenticated"):
        await ChatRepository.delete_conversation(conversation_id, user["user_id"])
        scoped_id = f"{user['user_id']}_{conversation_id}"
        if hasattr(memory_checkpointer, "storage") and scoped_id in memory_checkpointer.storage:
            del memory_checkpointer.storage[scoped_id]
    return {"status": "deleted", "id": conversation_id}


# ==============================================================================
# Thread History & Memory Endpoints
# ==============================================================================

@router.get(
    "/threads/{thread_id}/history",
    response_model=ThreadHistoryResponse,
    summary="Get Thread Conversation History",
    description="Retrieve message history stored in LangGraph memory checkpointer for a given user thread."
)
async def get_thread_history(thread_id: str, user: Dict[str, Any] = Depends(get_optional_user)):
    """Retrieve message history stored in LangGraph memory checkpointer for a given thread."""
    try:
        scoped_id = get_scoped_thread_id(thread_id, user)
        config = {"configurable": {"thread_id": scoped_id}}
        state = chatbot_graph.get_state(config)
        if not state or not state.values:
            return {"thread_id": thread_id, "messages": [], "current_node": "", "execution_steps": []}

        serialized_messages = []
        for msg in state.values.get("messages", []):
            if isinstance(msg, HumanMessage):
                serialized_messages.append({"role": "user", "content": extract_text_content(msg.content)})
            elif isinstance(msg, AIMessage):
                serialized_messages.append({"role": "assistant", "content": extract_text_content(msg.content)})
            elif isinstance(msg, ToolMessage):
                serialized_messages.append({"role": "tool", "content": extract_text_content(msg.content), "name": getattr(msg, "name", "")})

        return {
            "thread_id": thread_id,
            "messages": serialized_messages,
            "current_node": state.values.get("current_node", ""),
            "execution_steps": state.values.get("execution_steps", []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/threads/{thread_id}",
    response_model=ClearThreadResponse,
    summary="Clear Thread Memory",
    description="Permanently deletes all checkpointed state and conversation memory for a specific thread."
)
async def clear_thread(thread_id: str, user: Dict[str, Any] = Depends(get_optional_user)):
    """Clear memory for a given conversation thread."""
    try:
        scoped_id = get_scoped_thread_id(thread_id, user)
        if hasattr(memory_checkpointer, "storage") and scoped_id in memory_checkpointer.storage:
            del memory_checkpointer.storage[scoped_id]
        return {"status": "cleared", "thread_id": thread_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/invoke",
    response_model=ChatResponse,
    summary="Synchronous Chat Invocation (One-Shot)",
    description="Executes the full LangGraph chatbot workflow from start to finish and returns the final synthesized response."
)
async def invoke_chat(request: ChatRequest, user: Dict[str, Any] = Depends(get_optional_user)):
    """Asynchronously invoke the LangGraph chatbot pipeline with checkpointer memory."""
    try:
        raw_thread_id = request.thread_id or str(uuid.uuid4())
        scoped_thread_id = get_scoped_thread_id(raw_thread_id, user)
        config = {"configurable": {"thread_id": scoped_thread_id}}

        user_tag = user.get("email") or ("User: " + user.get("user_id") if user.get("authenticated") else "Anonymous")
        print(f"\n{'='*70}")
        print(f"[AutoFlow API] POST /api/chat/invoke - Thread: {raw_thread_id} ({user_tag})")
        print(f"[AutoFlow API] User Input: {repr(request.message)}")
        print(f"{'='*70}")

        # Validate image data (max 5 MB, supported MIME types) and set active image
        valid_b64, valid_mime = validate_and_prepare_image(request.image_data, request.mime_type)
        user_langchain_msg = build_human_message(request.message, valid_b64, valid_mime)

        # Set active turn files and user context for RAG retrieval
        set_active_turn_files(request.selected_file_ids or [], user_id=user.get("user_id"))

        # Log workflow pipeline execution start with ANSI terminal tree
        RAGTerminalLogger.log_workflow_pipeline_start(
            workflow_name="Agent Builder Pipeline" if request.system_prompt_prefix else "AutoFlow Execution Graph",
            user_query=request.message,
            selected_file_ids=request.selected_file_ids or [],
            enabled_tools=request.enabled_tools or ["all"],
            system_prompt_prefix=request.system_prompt_prefix,
        )

        # Enforce RBAC Quota & Filter Tools
        user_id = user.get("user_id") if user.get("authenticated") else None
        profile = TierRepository.get_user_profile(user_id=user_id, email=user.get("email"))
        check_chat_quota_allowed(profile, has_image=bool(request.image_data))
        if request.enabled_tools is None:
            user_saved_tools = TierRepository.get_user_tools(user_id)
            if user_saved_tools and isinstance(user_saved_tools, list):
                request.enabled_tools = [t.get("id") for t in user_saved_tools if t.get("enabled")]
            else:
                request.enabled_tools = profile.get("allowed_tools")
        request.enabled_tools = filter_tools_for_user_tier(profile, request.enabled_tools)
        # Safeguard: if files are selected in scope and document retrieval is allowed by user's tier,
        # ensure retrieve_document_context is enabled in enabled_tools
        if request.selected_file_ids and "retrieve_document_context" in profile.get("allowed_tools", []):
            if request.enabled_tools is not None and "retrieve_document_context" not in request.enabled_tools:
                request.enabled_tools.append("retrieve_document_context")

        # Initialize Langfuse tracing (Phase 1, 2)
        handler, trace_id = LangfuseService.get_callback_handler(
            user_id=user_id,
            session_id=raw_thread_id,
            tags=["autoflow", "invoke", "guest" if not user.get("authenticated") else "authenticated"],
        )
        if handler:
            config["callbacks"] = [handler]
            config["metadata"] = {
                "langfuse_session_id": raw_thread_id,
                "langfuse_user_id": user_id or "anonymous",
                "langfuse_tags": ["autoflow", "invoke"],
            }

        # Check existing state in checkpointer
        existing_state = chatbot_graph.get_state(config)
        if existing_state and existing_state.values:
            input_payload = {
                "messages": [user_langchain_msg],
                "current_node": "__start__",
                "status": "started",
                "iteration_count": 0,
                "last_tool_call": None,
                "research_goal": request.message,
                "validation": None,
                "evidence": [],
                "tool_results": [],
            }
            if request.selected_file_ids is not None:
                input_payload["selected_file_ids"] = request.selected_file_ids
            if request.enabled_tools is not None:
                input_payload["enabled_tools"] = request.enabled_tools
            if request.system_prompt_prefix is not None:
                input_payload["system_prompt_prefix"] = request.system_prompt_prefix
        else:
            messages = parse_history_to_messages(request.history or [], request.message, valid_b64, valid_mime)
            input_payload = {
                "messages": messages,
                "current_node": "__start__",
                "execution_steps": [],
                "last_tool_call": None,
                "status": "started",
                "summary": None,
                "summarized_message_count": 0,
                "enabled_tools": request.enabled_tools,
                "selected_file_ids": request.selected_file_ids or [],
                "retrieved_chunks": [],
                "system_prompt_prefix": request.system_prompt_prefix,
            }

        final_state = await chatbot_graph.ainvoke(input_payload, config=config)
        
        last_msg = final_state["messages"][-1]
        response_text = extract_text_content(last_msg.content)

        # Record Task Completeness Validator score to Langfuse (Phase 3)
        val_data = final_state.get("validation")
        if val_data and trace_id:
            LangfuseService.record_validation_score(
                trace_id=trace_id,
                completeness_score=val_data.get("completeness_score", 100.0),
                critique=val_data.get("critique", ""),
                session_id=raw_thread_id,
                issues=val_data.get("issues", []),
            )
        LangfuseService.flush()

        print(f"[AutoFlow API] Invoke completed. Total steps: {len(final_state.get('execution_steps', []))}")
        print(f"{'='*70}\n")

        total_ms = round((time.time() - start_time) * 1000, 2)
        RAGTerminalLogger.log_workflow_output_delivery(
            status=final_state.get("status", "completed"),
            total_latency_ms=total_ms,
            output_preview=response_text,
        )

        # Increment quota consumption
        TierRepository.increment_usage(user_id=user_id, resource="messages", amount=1)
        if request.image_data:
            TierRepository.increment_usage(user_id=user_id, resource="images", amount=1)

        return {
            "thread_id": raw_thread_id,
            "trace_id": trace_id,
            "response": response_text,
            "execution_steps": final_state.get("execution_steps", []),
            "status": final_state.get("status", "completed"),
        }
    except Exception as e:
        print(f"[AutoFlow API] Error in invoke_chat: {e}")
        raise HTTPException(status_code=500, detail=format_graceful_error(e))
    finally:
        LangfuseService.flush()
        clear_active_turn_image()
        clear_active_turn_files()


@router.post(
    "/stream",
    summary="Real-Time Streaming Chat (Server-Sent Events) with Supabase DB Persistence",
    description="Streams the LangGraph execution lifecycle and persists conversations, messages, runs, and tool calls into Supabase."
)
async def stream_chat(request: ChatRequest, user: Dict[str, Any] = Depends(get_optional_user)):
    """Stream LangGraph node lifecycle events, tool executions, and Markdown tokens via SSE."""
    
    raw_thread_id = request.thread_id or str(uuid.uuid4())
    scoped_thread_id = get_scoped_thread_id(raw_thread_id, user)
    config = {"configurable": {"thread_id": scoped_thread_id}}
    start_time = time.time()

    is_authenticated = user.get("authenticated", False)
    user_id = user.get("user_id")

    # DB Persistence handles
    db_run_id: Optional[str] = None
    step_counter = 0

    if is_authenticated and user_id:
        try:
            # Ensure conversation exists in Supabase and has a valid UUID
            title = request.message[:35] + ("..." if len(request.message) > 35 else "")
            conv_id = await ChatRepository.ensure_conversation(raw_thread_id, user_id, title=title)
            raw_thread_id = conv_id
            scoped_thread_id = get_scoped_thread_id(raw_thread_id, user)
            config = {"configurable": {"thread_id": scoped_thread_id}}

            seq_num = len(request.history or []) + 1
            user_msg = await ChatRepository.save_message(conv_id, "user", request.message, seq_num)
            run_rec = await ChatRepository.create_run(
                conversation_id=conv_id,
                model=settings.GEMINI_MODEL,
                input_message_id=user_msg.get("id") if user_msg else None
            )
            if run_rec:
                db_run_id = run_rec.get("id")
        except Exception as db_err:
            print(f"[Supabase DB] Error initializing turn persistence: {db_err}")

    user_tag = user.get("email") or ("User: " + user.get("user_id") if is_authenticated else "Anonymous")
    print(f"\n{'='*70}")
    print(f"[AutoFlow API] POST /api/chat/stream - Thread: {raw_thread_id} ({user_tag})")
    print(f"[AutoFlow API] User Input: {repr(request.message)}")
    if request.image_data:
        print(f"[AutoFlow API] Attached Image ({request.mime_type or 'image/png'})")
    print(f"{'='*70}")

    # Log workflow pipeline execution start with ANSI terminal tree
    RAGTerminalLogger.log_workflow_pipeline_start(
        workflow_name="Agent Builder Pipeline" if request.system_prompt_prefix else "AutoFlow Execution Graph",
        user_query=request.message,
        selected_file_ids=request.selected_file_ids or [],
        enabled_tools=request.enabled_tools or ["all"],
        system_prompt_prefix=request.system_prompt_prefix,
    )

    async def event_generator():
        accumulated_text = ""
        try:
            # 1. Enforce RBAC Quota and Filter Tools
            profile = TierRepository.get_user_profile(user_id=user_id, email=user.get("email"))
            check_chat_quota_allowed(profile, has_image=bool(request.image_data))
            if request.enabled_tools is None:
                user_saved_tools = TierRepository.get_user_tools(user_id)
                if user_saved_tools and isinstance(user_saved_tools, list):
                    request.enabled_tools = [t.get("id") for t in user_saved_tools if t.get("enabled")]
                else:
                    request.enabled_tools = profile.get("allowed_tools")
            request.enabled_tools = filter_tools_for_user_tier(profile, request.enabled_tools)
            # Safeguard: if files are selected in scope and document retrieval is allowed by user's tier,
            # ensure retrieve_document_context is enabled in enabled_tools
            if request.selected_file_ids and "retrieve_document_context" in profile.get("allowed_tools", []):
                if request.enabled_tools is not None and "retrieve_document_context" not in request.enabled_tools:
                    request.enabled_tools.append("retrieve_document_context")

            # Validate image data (max 5 MB, supported MIME types) and set active image
            valid_b64, valid_mime = validate_and_prepare_image(request.image_data, request.mime_type)
            user_langchain_msg = build_human_message(request.message, valid_b64, valid_mime)

            # Set active turn files and user context for RAG retrieval
            set_active_turn_files(request.selected_file_ids or [], user_id=user.get("user_id"))

            # Initialize Langfuse tracing for streaming run (Phase 1, 2)
            handler, trace_id = LangfuseService.get_callback_handler(
                user_id=user_id,
                session_id=raw_thread_id,
                tags=["autoflow", "stream", "guest" if not is_authenticated else "authenticated"],
            )
            if handler:
                config["callbacks"] = [handler]
                config["metadata"] = {
                    "langfuse_session_id": raw_thread_id,
                    "langfuse_user_id": user_id or "anonymous",
                    "langfuse_tags": ["autoflow", "stream"],
                }

            # Check existing state in checkpointer
            existing_state = chatbot_graph.get_state(config)
            if existing_state and existing_state.values:
                input_payload = {
                    "messages": [user_langchain_msg],
                    "current_node": "__start__",
                    "status": "started",
                    "iteration_count": 0,
                    "last_tool_call": None,
                    "research_goal": request.message,
                    "validation": None,
                    "evidence": [],
                    "tool_results": [],
                }
                if request.selected_file_ids is not None:
                    input_payload["selected_file_ids"] = request.selected_file_ids
                if request.enabled_tools is not None:
                    input_payload["enabled_tools"] = request.enabled_tools
                if request.system_prompt_prefix is not None:
                    input_payload["system_prompt_prefix"] = request.system_prompt_prefix
            else:
                messages = parse_history_to_messages(request.history or [], request.message, valid_b64, valid_mime)
                input_payload = {
                    "messages": messages,
                    "current_node": "__start__",
                    "execution_steps": [],
                    "last_tool_call": None,
                    "status": "started",
                    "summary": None,
                    "summarized_message_count": 0,
                    "enabled_tools": request.enabled_tools,
                    "selected_file_ids": request.selected_file_ids or [],
                    "retrieved_chunks": [],
                    "system_prompt_prefix": request.system_prompt_prefix,
                }

            # Emit initial workflow start event with thread_id
            yield {
                "event": "node_start",
                "data": json.dumps({
                    "node": "__start__",
                    "label": "Start",
                    "action": "Received user message",
                    "thread_id": raw_thread_id
                })
            }
            await asyncio.sleep(0.01)

            # Stream LangGraph events using astream_events v2 with thread config
            async for event in chatbot_graph.astream_events(input_payload, config=config, version="v2"):
                kind = event.get("event")
                name = event.get("name", "")
                data = event.get("data", {})

                # 1. Graph / Node on_chain_start
                if kind == "on_chain_start":
                    node_name = event.get("metadata", {}).get("langgraph_node")
                    if node_name:
                        yield {
                            "event": "node_start",
                            "data": json.dumps({
                                "node": node_name,
                                "name": name,
                                "timestamp": time.time(),
                                "thread_id": raw_thread_id,
                            })
                        }

                # 2. Graph / Node on_chain_end
                elif kind == "on_chain_end":
                    node_name = event.get("metadata", {}).get("langgraph_node")
                    # Ignore router conditional edges (should_continue_validator, should_continue_agent)
                    if node_name and not name.startswith("should_continue_"):
                        node_output = data.get("output", {})
                        yield {
                            "event": "node_end",
                            "data": json.dumps({
                                "node": node_name,
                                "name": name,
                                "output": str(node_output)[:300],
                                "thread_id": raw_thread_id,
                            })
                        }
                        
                        # Save execution step to Supabase if authenticated
                        if db_run_id:
                            nonlocal step_counter
                            step_counter += 1
                            step_output = node_output
                            if node_name == "validator" and isinstance(node_output, dict):
                                step_output = node_output.get("validation", node_output)
                            await ChatRepository.save_execution_step(
                                run_id=db_run_id,
                                step_number=step_counter,
                                node=node_name,
                                step_type=node_name,
                                action=f"Completed {node_name}",
                                status="success",
                                output_data=step_output
                            )

                        # Capture agent synthesized response if streaming chunks did not arrive
                        if node_name == "agent" and isinstance(node_output, dict):
                            out_msgs = node_output.get("messages", [])
                            for m in out_msgs:
                                if isinstance(m, AIMessage):
                                    synthesized_str = extract_text_content(m.content).strip()
                                    if synthesized_str and not accumulated_text:
                                        accumulated_text = synthesized_str
                                        yield {
                                            "event": "token",
                                            "data": json.dumps({"delta": synthesized_str, "thread_id": raw_thread_id})
                                        }

                        # Emit custom validation_result event when validator finishes
                        if node_name == "validator" and isinstance(node_output, dict):
                            val_data = node_output.get("validation", {})
                            if val_data:
                                # Phase 3: Push Task Completeness score & critique to Langfuse
                                if trace_id:
                                    LangfuseService.record_validation_score(
                                        trace_id=trace_id,
                                        completeness_score=val_data.get("completeness_score", 100.0),
                                        critique=val_data.get("critique", ""),
                                        session_id=raw_thread_id,
                                        issues=val_data.get("issues", []),
                                    )
                                yield {
                                    "event": "validation_result",
                                    "data": json.dumps({
                                        "sufficient": val_data.get("sufficient", True),
                                        "completeness_score": val_data.get("completeness_score", 100.0 if val_data.get("sufficient", True) else 60.0),
                                        "confidence": val_data.get("confidence", 1.0),
                                        "missing_information": val_data.get("missing_information", []),
                                        "issues": val_data.get("issues", []),
                                        "critique": val_data.get("critique", ""),
                                        "thread_id": raw_thread_id,
                                        "trace_id": trace_id,
                                    })
                                }

                # 3. LLM streaming token chunks
                elif kind == "on_chat_model_stream":
                    chunk = data.get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        text_chunk = extract_text_content(chunk.content)
                        if text_chunk:
                            accumulated_text += text_chunk
                            yield {
                                "event": "token",
                                "data": json.dumps({"delta": text_chunk, "thread_id": raw_thread_id})
                            }

                # 4. Tool calls started by LLM
                elif kind == "on_tool_start":
                    tool_input = data.get("input", {})
                    tool_run_id = event.get("run_id") or str(uuid.uuid4())[:8]
                    yield {
                        "event": "tool_start",
                        "data": json.dumps({
                            "id": tool_run_id,
                            "node": "tools",
                            "tool_name": name,
                            "input": tool_input,
                            "thread_id": raw_thread_id,
                        })
                    }

                # 5. Tool execution completed
                elif kind == "on_tool_end":
                    tool_output = data.get("output", "")
                    tool_run_id = event.get("run_id")
                    output_text = extract_text_content(getattr(tool_output, "content", tool_output))
                    yield {
                        "event": "tool_end",
                        "data": json.dumps({
                            "id": tool_run_id,
                            "node": "tools",
                            "tool_name": name,
                            "output": output_text,
                            "thread_id": raw_thread_id,
                        })
                    }

                    # Save tool call to Supabase if authenticated
                    if db_run_id:
                        await ChatRepository.save_tool_call(
                            run_id=db_run_id,
                            tool_name=name,
                            arguments=tool_input if 'tool_input' in locals() else {},
                            result=output_text[:1000]
                        )

            # Ensure accumulated_text is never empty by reading latest checkpointer state
            if not accumulated_text:
                final_chk = chatbot_graph.get_state(config)
                if final_chk and final_chk.values:
                    for m in reversed(final_chk.values.get("messages", [])):
                        if isinstance(m, AIMessage):
                            fallback_str = extract_text_content(m.content).strip()
                            if fallback_str:
                                accumulated_text = fallback_str
                                yield {
                                    "event": "token",
                                    "data": json.dumps({"delta": accumulated_text, "thread_id": raw_thread_id})
                                }
                                break
                    if not accumulated_text:
                        for m in reversed(final_chk.values.get("messages", [])):
                            if isinstance(m, ToolMessage):
                                t_content = extract_text_content(m.content).strip()
                                if any(kw in t_content for kw in ["Download", "Exported", "Spreadsheet", "Document"]):
                                    accumulated_text = t_content
                                    yield {
                                        "event": "token",
                                        "data": json.dumps({"delta": accumulated_text, "thread_id": raw_thread_id})
                                    }
                                    break

            # Emit workflow completion with thread_id
            yield {
                "event": "node_start",
                "data": json.dumps({
                    "node": "__end__",
                    "label": "End",
                    "action": "Workflow complete",
                    "thread_id": raw_thread_id
                })
            }

            total_latency = int((time.time() - start_time) * 1000)
            RAGTerminalLogger.log_workflow_output_delivery(
                status="completed",
                total_latency_ms=total_latency,
                output_preview=accumulated_text,
            )

            # Finalize DB records
            if db_run_id and is_authenticated:
                total_latency = int((time.time() - start_time) * 1000)
                seq_num = len(request.history or []) + 2
                if accumulated_text:
                    await ChatRepository.save_message(raw_thread_id, "assistant", accumulated_text, seq_num)
                await ChatRepository.complete_run(db_run_id, "completed", total_latency_ms=total_latency)
                # Auto-update conversation title from prompt if initial
                if len(request.history or []) == 0:
                    auto_title = request.message[:35] + ("..." if len(request.message) > 35 else "")
                    await ChatRepository.update_conversation_title(raw_thread_id, auto_title)

            total_ms = round((time.time() - start_time) * 1000, 2)
            RAGTerminalLogger.log_workflow_output_delivery(
                status="completed",
                total_latency_ms=total_ms,
                output_preview=accumulated_text,
            )

            # Increment quota consumption
            TierRepository.increment_usage(user_id=user_id, resource="messages", amount=1)
            if request.image_data:
                TierRepository.increment_usage(user_id=user_id, resource="images", amount=1)

            yield {
                "event": "done",
                "data": json.dumps({
                    "status": "completed",
                    "thread_id": raw_thread_id,
                    "trace_id": trace_id,
                    "content": accumulated_text
                })
            }

        except Exception as err:
            import traceback
            print(f"\n[AutoFlow API] ERROR during chat streaming in thread {raw_thread_id}: {err}")
            traceback.print_exc()
            clean_error = format_graceful_error(err)
            if db_run_id:
                await ChatRepository.complete_run(db_run_id, "error")
            yield {
                "event": "error",
                "data": json.dumps({"error": clean_error, "raw_error": str(err), "thread_id": raw_thread_id})
            }
        finally:
            LangfuseService.flush()
            clear_active_turn_image()
            clear_active_turn_files()

    return EventSourceResponse(event_generator())
