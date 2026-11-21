import asyncio
import json
import re
import time
from datetime import datetime
from typing import Dict, Any, List, Literal, Optional, Sequence
from langchain_core.messages import AIMessage, ToolMessage, SystemMessage, HumanMessage, BaseMessage
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from config import settings
from llm.gemini import get_gemini_llm
from tools import ALL_TOOLS
from tools.rag_retrieval_tool import set_active_turn_files
from agent.state import AgentState, ExecutionStep, ValidationResult, extract_text_content
from utils.rag_terminal_logger import RAGTerminalLogger

# Map tool names to tool instances for direct async parallel execution
TOOL_MAP = {t.name: t for t in ALL_TOOLS}

# Maximum parallel tools allowed per single turn to avoid quota explosion
MAX_PARALLEL_TOOLS_PER_TURN = 6

AVAILABLE_TOOL_DESCRIPTIONS = {
    "retrieve_document_context": (
        "- **retrieve_document_context**: Search and retrieve grounded factual evidence and paragraphs from user-selected uploaded documents (PDFs, DOCX, etc.) using Hybrid Search.\n"
        "  * DECISION RULE FOR DOCUMENT QUESTIONS: When the user asks about their uploaded documents, reports, contracts, policies, or files (e.g. 'Summarize this PDF', 'What does section 4 say about termination?', 'Compare these two selected contracts', 'What is the conclusion of my report?'), ALWAYS invoke `retrieve_document_context`.\n"
        "  * DECISION RULE FOR GENERAL QUESTIONS: If the question is general knowledge, concepts, coding, math, or conversation (e.g. 'Explain what RAG means', 'Write a quicksort in Python', 'Hello'), answer directly or use web/math tools. Do NOT invoke `retrieve_document_context`.\n"
        "  * DECISION RULE FOR NO SELECTED FILES: If the user asks about an uploaded document but NO files are selected or attached, do NOT search or hallucinate. Politely instruct: 'Please select one or more documents from the document selector above the chat input so I can examine them.'\n"
        "  * GROUNDED CITATION RULE: Ground your answers strictly on the retrieved document excerpts. Keep the response clean, natural, and readable using tables and bullet points. If referencing pages in your text, keep it simple and compact like `[p.1]`. Do NOT insert long quote strings or cumbersome text inside bracket tags."
    ),
    "web_search": "- **web_search**: Search current events, live news, and documentation across the web.",
    "web_scrape": "- **web_scrape**: Extract, scrape, and read full clean markdown content and text from a specific webpage URL or online PDF link via Firecrawl. Use when the user shares a link to read, summarize, or extract data from.",
    "calculate": "- **calculate**: Accurate mathematical computation.",
    "get_current_time": "- **get_current_time**: Current date, time, and timezone information.",
    "export_chat_pdf": "- **export_chat_pdf**: Generate a polished PDF document (with justified text, bold headers, and styled tables). ONLY invoke when user explicitly asks to export, generate, or download a PDF or report.",
    "export_chat_excel": "- **export_chat_excel**: Generate a clean Excel spreadsheet (with bold center-aligned headers, alternating rows, and gridlines removed). ONLY invoke when user explicitly asks to export, generate, or download an Excel file or spreadsheet.",
    "export_chat_docx": "- **export_chat_docx**: Generate a clean Microsoft Word (.docx) document (with styled headings, lists, inline formatting, and tables). ONLY invoke when user explicitly asks to export, generate, or download a Word document or DOCX file.",
    "export_chat_txt": "- **export_chat_txt**: Generate a plain text transcript dump. ONLY invoke when user explicitly asks to export, dump, or download as text or txt.",
    "process_image": "- **process_image**: Specialized image OCR/analysis tool. (Note: images in conversation history are perceived natively through vision).",
}

def build_agent_system_instruction(enabled_tools: Optional[List[str]] = None) -> str:
    """Build dynamic system prompt tailored strictly to active tools, avoiding hallucinated calls for disabled tools."""
    active_keys = enabled_tools if enabled_tools is not None else list(AVAILABLE_TOOL_DESCRIPTIONS.keys())
    tool_bullets = [AVAILABLE_TOOL_DESCRIPTIONS[k] for k in active_keys if k in AVAILABLE_TOOL_DESCRIPTIONS]
    tools_section = "\n".join(tool_bullets) if tool_bullets else "(No external tools currently active - answer directly using your knowledge)"

    return (
        "You are AutoFlow, an advanced AI Assistant powered by Google Gemini and LangGraph. "
        "You act as the primary Decision Maker and Synthesizer.\n\n"
        "Multimodal Vision Capability:\n"
        "- Images attached in user messages or conversation history are perceived natively through your vision system. "
        "You can directly view, inspect, describe, and answer questions about any images in the chat history without calling external tools.\n\n"
        f"Active Available Tools:\n{tools_section}\n\n"
        "CRITICAL TOOL RESTRICTION: Do NOT call export tools (export_chat_pdf, export_chat_excel, export_chat_docx, export_chat_txt) for ordinary questions. Only call them when the user explicitly requests an export or download in their message (e.g. 'export to docx', 'export to excel', 'download as pdf'). When the user asks to 'extract tables', 'show tables', or 'summarize data', ALWAYS format and render the tables directly in the chat using Markdown tables (| Header 1 | Header 2 |)!\n\n"
        "When tools are used, immediately synthesize the results into a complete, thorough, and structured response.\n\n"
        "Formatting & Presentation Standards:\n"
        "1. **Code Blocks**: Always enclose code in fenced code blocks with explicit language tags (e.g. ```python, ```javascript, ```json, ```sql, ```bash).\n"
        "2. **Math & Formulas**: Express formulas and equations clearly using standard LaTeX math notations (e.g. $E = mc^2$, $$\\int_0^\\infty e^{-x} dx = 1$$).\n"
        "3. **Tables**: Use Markdown tables (| Column 1 | Column 2 |) for summaries, comparisons, and structured answers.\n"
        "4. **Typography**: Use bold headers, bullet points, and numbered lists to structure complex answers.\n"
        "5. **Tools & Parallel Execution**: When research, email queries, or computation is needed, issue focused tool calls.\n"
        "6. **Citations**: When citing information from web_search, use bracketed numbers like `[1]`. When citing documents, keep inline page tags simple like `[p.1]`. The AutoFlow interface automatically displays the full list of retrieved document chunks and sources at the end of the answer.\n"
        "7. **Multi-Part Completeness**: If the user prompt contains multiple questions, sub-tasks, or conditions, answer every single part thoroughly."
    )

SYSTEM_INSTRUCTION = build_agent_system_instruction()

VALIDATOR_SYSTEM_PROMPT = (
    "You are a Task Completeness Validator in an autonomous reasoning workflow.\n"
    "Your SOLE purpose is to evaluate whether the assistant's generated response has adequately answered "
    "the user's questions, requests, and comparisons, or if core parts remain unaddressed.\n\n"
    "80% COMPLETENESS THRESHOLD RULE:\n"
    "- Calculate a `completeness_score` from 0 to 100 representing how thoroughly the user's core requests, queries, and comparisons have been answered.\n"
    "- If `completeness_score >= 80`, you MUST set `sufficient = true`. The task is considered complete and no further iterations are needed.\n"
    "- When substantive answers, data, tables, analyses, or generated content are provided in the chat response, secondary file/export formats (such as asking for a PDF/Word download or cosmetic nuances) DO NOT disqualify the response if the text is present. Mark completeness_score >= 80 and sufficient = true.\n"
    "- ONLY mark `sufficient = false` (completeness_score < 80) if major core questions, key comparisons, or fundamental sub-tasks were completely ignored or left unaddressed.\n\n"
    "CRITICAL RULES:\n"
    "1. DO NOT evaluate whether the facts, data, or search findings are true or false. You are NOT a fact-checker.\n"
    "2. If the user's query is simple, conversational (e.g. 'hello', 'thanks', 'explain X'), or standard Q&A, and the assistant answered, mark completeness_score = 100 and sufficient = true.\n"
    "3. For multi-part queries and comparisons, evaluate if at least 80% of the questions/comparisons were answered. If so, mark completeness_score >= 80 and sufficient = true.\n"
    "4. If the assistant provided a comprehensive solution, do NOT demand minor stylistic perfection or loop the agent unnecessarily.\n\n"
    "Respond ONLY with a valid JSON object matching this exact schema:\n"
    "{\n"
    '  "completeness_score": 0 to 100,\n'
    '  "sufficient": true/false,\n'
    '  "confidence": 0.0 to 1.0,\n'
    '  "missing_information": ["unanswered core question, missing comparison, or major omitted element", ...],\n'
    '  "issues": [],\n'
    '  "critique": "1-sentence summary of completeness and whether the 80% threshold is satisfied"\n'
    "}"
)


# Base streaming LLM instance for dynamic tool binding
base_streaming_llm = get_gemini_llm(
    model_name=settings.GEMINI_MODEL,
    temperature=settings.GEMINI_TEMPERATURE,
    streaming=True,
)

# Initialize LLM with default all tools
model_with_tools = base_streaming_llm.bind_tools(ALL_TOOLS)

# Validator LLM instance: Dedicated gemini-2.5-flash model for high-precision completeness validation
VALIDATOR_MODEL_NAME = getattr(settings, "VALIDATOR_MODEL", "gemini-2.5-flash") or "gemini-2.5-flash"
validator_llm = get_gemini_llm(
    model_name=VALIDATOR_MODEL_NAME,
    temperature=0.1,
    streaming=False,
)

# Summarizer LLM instance (dedicated low temperature for high-retention condensation)
summarizer_llm = get_gemini_llm(
    model_name=settings.GEMINI_MODEL,
    temperature=0.2,
    streaming=False,
)

# Checkpointer for conversation state persistence
memory_checkpointer = MemorySaver()


# ==============================================================================
# Persistent Conversation Memory & Summarization Prompt
# ==============================================================================
SUMMARIZER_SYSTEM_PROMPT = (
    "You are an expert conversation memory synthesizer and state condenser.\n"
    "Your objective is to produce a dense, high-retention summary of the conversation history provided.\n\n"
    "CRITICAL PRESERVATION RULES:\n"
    "1. Main Motive & Intent: Explicitly preserve the user's primary objectives, overarching intentions, and desired outputs.\n"
    "2. Important Names & Entities: Preserve all names of individuals, projects, tools, services, files, and organizations.\n"
    "3. Dates & Timelines: Retain all dates, deadlines, timestamps, schedules, and milestones mentioned.\n"
    "4. Key Facts, Metrics & Decisions: Document all definitive numbers, configurations, user preferences, code decisions, and solutions reached.\n"
    "5. Persistence Across Multiple Summarizations: This summary will be condensed repeatedly across long conversations. "
    "You MUST preserve and carry forward all vital background facts, motives, names, and dates from any previous summary. "
    "Never drop older critical context when integrating newer messages.\n\n"
    "Format the summary cleanly in structured bullet points for maximum clarity and fast retrieval by the AI agent."
)


def count_message_tokens(messages: Sequence[BaseMessage], llm=None) -> int:
    """Accurately count token count of messages using Gemini's tokenizer with character fallback."""
    if not messages:
        return 0
    try:
        combined_text = "\n".join(extract_text_content(m.content) for m in messages)
        if llm and hasattr(llm, "get_num_tokens"):
            return int(llm.get_num_tokens(combined_text))
        return max(1, len(combined_text) // 4)
    except Exception:
        total_chars = sum(len(extract_text_content(m.content)) for m in messages)
        return max(1, total_chars // 4)


def extract_clean_conversation_history(messages: Sequence[BaseMessage]) -> List[BaseMessage]:
    """
    Extracts clean conversation turns (User Input and AI Agent Final Response only).
    Excludes intermediate ToolMessages and raw tool-call AIMessages from past history.
    """
    clean_history: List[BaseMessage] = []
    for m in messages:
        if isinstance(m, HumanMessage):
            clean_history.append(m)
        elif isinstance(m, AIMessage):
            # Only include assistant messages that contain final text content (not pure tool calls)
            text = extract_text_content(m.content).strip()
            if text and not getattr(m, "tool_calls", None):
                clean_history.append(AIMessage(content=text))
            elif text and getattr(m, "tool_calls", None):
                # If an assistant message contains text alongside tool calls, retain only the text
                clean_history.append(AIMessage(content=text))
        # Skip ToolMessages entirely from past history!
    return clean_history


def format_messages_for_summary(messages: Sequence[BaseMessage]) -> str:
    """Format a sequence of clean user and assistant messages into a readable conversation transcript for the summarizer."""
    lines = []
    turn_idx = 1
    for m in messages:
        if isinstance(m, HumanMessage):
            content = extract_text_content(m.content).strip()
            lines.append(f"[User (Turn #{turn_idx})]: {content}")
        elif isinstance(m, AIMessage):
            content = extract_text_content(m.content).strip()
            if content:
                lines.append(f"[Assistant (Turn #{turn_idx})]: {content}")
                turn_idx += 1
    return "\n\n".join(lines)


async def manage_conversation_memory(
    messages: Sequence[BaseMessage],
    existing_summary: Optional[str] = None,
    summarized_count: Optional[int] = 0,
    llm=None,
) -> tuple[Optional[str], List[BaseMessage], int]:
    """
    Manages chat history context and sliding-window conversation summarization:
    - Token/character counts are removed. Driven purely by completed user conversation turns.
    - Past conversation history in context contains ONLY User Inputs and AI Agent final outputs
      (intermediate ToolMessages and raw tool calls are omitted from past history).
    - Window Rules:
      * Up to 10 completed conversations remain directly in history.
      * At the 11th user input: summarizes the first 5 conversations (1-5), retains the next 5 (6-10),
        plus the 11th active turn.
      * Every 5 conversations thereafter (16th, 21st, 26th...):
        Summarizes the oldest 5 unsummarized turns, merges with prior summary,
        and retains the latest 5 completed turns + active turn in context.
    - Active Turn Invariant: The active turn starting at messages[current_turn_start:] is never modified
      or partially sliced, preserving active tool calls and results during current turn execution.
    """
    total_messages = len(messages)
    summarized_count = summarized_count or 0

    # Identify all user input message indices (HumanMessage)
    user_indices = [idx for idx, m in enumerate(messages) if isinstance(m, HumanMessage)]
    total_user_inputs = len(user_indices)

    if not user_indices:
        return existing_summary, list(messages), summarized_count

    # The current active turn begins at the latest HumanMessage
    current_turn_start = user_indices[-1]

    # Completed user inputs before the current active turn
    completed_user_indices = user_indices[:-1]

    # Unsummarized completed user turns that have occurred since the last summary cutoff
    unsummarized_completed = [idx for idx in completed_user_indices if idx >= summarized_count]
    num_unsummarized = len(unsummarized_completed)

    # 1. Trigger Check:
    # Up to 10 completed conversations remain directly in history.
    # Summarization is triggered only once 10 unsummarized completed turns have accumulated
    # (i.e. at 11th user input, 16th user input, 21st user input, etc.)
    if num_unsummarized < 10:
        # No summarization needed yet.
        # Clean past completed messages (User and AI only, no ToolMessages)
        clean_past = extract_clean_conversation_history(messages[summarized_count:current_turn_start])
        # Retain full active turn (including any active tool calls/results for current execution)
        active_turn = list(messages[current_turn_start:])
        recent_messages = clean_past + active_turn
        return existing_summary, recent_messages, summarized_count

    # 2. Summarization Triggered (num_unsummarized >= 10):
    # Take the oldest 5 unsummarized completed turns to summarize
    # Cutoff index is the start of the 6th unsummarized turn
    cutoff_idx = unsummarized_completed[5]

    msgs_to_summarize = messages[summarized_count:cutoff_idx]
    clean_to_summarize = extract_clean_conversation_history(msgs_to_summarize)
    new_summarized_count = cutoff_idx

    # Retain the remaining 5 completed turns (clean User + AI) + full active turn
    clean_recent_past = extract_clean_conversation_history(messages[cutoff_idx:current_turn_start])
    active_turn = list(messages[current_turn_start:])
    recent_messages = clean_recent_past + active_turn

    if not clean_to_summarize:
        return existing_summary, recent_messages, summarized_count

    formatted_new_msgs = format_messages_for_summary(clean_to_summarize)
    prompt_parts = []
    if existing_summary:
        prompt_parts.append(
            f"### PRIOR PERSISTENT SUMMARY (Retain all critical motives, names, dates, and facts):\n{existing_summary}"
        )
        prompt_parts.append(
            f"### NEW CONVERSATION TURNS TO INTEGRATE (User Queries & Final Answers):\n{formatted_new_msgs}"
        )
        prompt_parts.append(
            "Update and condense the persistent summary by incorporating the new conversation turns above. "
            "Ensure ALL important names, dates, user motives, project goals, and key decisions from both the existing summary "
            "and new turns are strictly preserved across this repeated summarization."
        )
    else:
        prompt_parts.append(
            f"### CONVERSATION TURNS TO SUMMARIZE (Previous User Inputs and Final Answers):\n{formatted_new_msgs}"
        )
        prompt_parts.append(
            "Summarize the conversation turns above into a dense, high-retention summary. "
            "Ensure you explicitly capture the user's main motive, important names, dates, deadlines, and key factual points "
            "so that they remain persistent across future summarizations."
        )

    summary_prompt = "\n\n".join(prompt_parts)
    time_str = datetime.now().strftime("%H:%M:%S")

    try:
        print(f"[AutoFlow Graph] [{time_str}] Summarizing 5 conversation turns for conversation memory (total_user_inputs={total_user_inputs}, unsummarized_completed={num_unsummarized})...")
        sum_messages = [
            SystemMessage(content=SUMMARIZER_SYSTEM_PROMPT),
            HumanMessage(content=summary_prompt)
        ]
        sum_response = await invoke_llm_with_retry(llm, sum_messages, max_retries=2, initial_delay=2.0)
        updated_summary = extract_text_content(sum_response.content).strip()
        print(f"[AutoFlow Graph] [{time_str}] -> Persistent summary updated ({len(updated_summary)} chars). Retaining {len(clean_recent_past)} past turn message(s) + active turn in context.")
        return updated_summary, recent_messages, new_summarized_count
    except Exception as err:
        print(f"[AutoFlow Graph] [{time_str}] Summarizer fallback error: {err}")
        return existing_summary, recent_messages, new_summarized_count


async def invoke_llm_with_retry(llm, messages, max_retries: int = 2, initial_delay: float = 1.5):
    """Invoke LLM with graceful retry, exponential backoff, and model fallback on 429/503/high demand."""
    for attempt in range(max_retries + 1):
        try:
            return await llm.ainvoke(messages)
        except Exception as e:
            err_msg = str(e)
            is_transient = any(
                k in err_msg
                for k in [
                    "429",
                    "RESOURCE_EXHAUSTED",
                    "quota",
                    "Rate limit",
                    "503",
                    "UNAVAILABLE",
                    "Service Unavailable",
                    "high demand",
                    "Spikes in demand",
                    "500",
                    "502",
                    "504",
                    "Overloaded",
                ]
            )
            if is_transient and attempt < max_retries:
                delay = initial_delay * (attempt + 1)
                print(f"[AutoFlow LLM] Transient error encountered ({err_msg[:60]}...). Retrying {attempt+1}/{max_retries} in {delay}s...")
                await asyncio.sleep(delay)
            else:
                # If unavailable due to 503/high demand, attempt fallback to stable gemini-2.5-flash
                if any(k in err_msg for k in ["503", "UNAVAILABLE", "high demand", "Spikes in demand"]):
                    try:
                        print(f"[AutoFlow LLM] Primary model experiencing high demand. Engaging automatic fallback to 'gemini-2.5-flash'...")
                        fallback_base = get_gemini_llm(model_name="gemini-2.5-flash", temperature=0.2, streaming=True)
                        if hasattr(llm, "bound") and hasattr(llm.bound, "tools"):
                            tools = getattr(llm.bound, "tools", None)
                            fallback_llm = fallback_base.bind_tools(tools) if tools else fallback_base
                        elif hasattr(llm, "tools"):
                            fallback_llm = fallback_base.bind_tools(llm.tools)
                        else:
                            fallback_llm = fallback_base
                        return await fallback_llm.ainvoke(messages)
                    except Exception as fb_err:
                        print(f"[AutoFlow LLM] Fallback model invocation error: {fb_err}")
                raise e


async def agent_node(state: AgentState) -> Dict[str, Any]:
    """Agent node: Evaluates user query and prior critique to emit direct answer or parallel tool calls."""
    start_time = time.perf_counter()
    messages = list(state.get("messages", []))
    iteration = state.get("iteration_count", 0) + 1
    step_num = len(state.get("execution_steps", [])) + 1
    time_str = datetime.now().strftime("%H:%M:%S")

    # Determine research goal from last user message if not set
    research_goal = state.get("research_goal")
    if not research_goal and messages:
        for msg in reversed(messages):
            if isinstance(msg, HumanMessage):
                research_goal = extract_text_content(msg.content)
                break

    # 1. Manage conversation history with 10-turn sliding window summarization:
    # Retains only clean User & AI responses in past history (filters out intermediate tool outputs).
    # Keeps 10 conversations in history; at 11th turn, summarizes turns 1-5 and retains turns 6-10.
    # Every 5 turns thereafter (16th, 21st...), condenses next 5 turns into persistent summary.
    summary, context_messages, count_summarized = await manage_conversation_memory(
        messages=messages,
        existing_summary=state.get("summary"),
        summarized_count=state.get("summarized_message_count", 0),
        llm=summarizer_llm,
    )

    llm_messages = list(context_messages)

    # 2. If previous validation indicated incomplete coverage of user query (< 80%), inject targeted guidance
    validation = state.get("validation")
    is_followup = bool(validation and not validation.get("sufficient", True))
    missing_parts = validation.get("missing_information", []) if is_followup else None
    critique = validation.get("critique", "") if is_followup else None

    RAGTerminalLogger.log_agent_turn(
        iteration=iteration,
        research_goal=research_goal or "User query",
        is_followup=is_followup,
        missing_parts=missing_parts,
        critique=critique,
    )

    if validation and not validation.get("sufficient", True):
        missing_text = "; ".join(missing_parts) if missing_parts else "unaddressed aspects of the query"
        continuation_msg = (
            f"[Task Completeness Feedback - Iteration {iteration}]:\n"
            f"The previous output addressed part of the request, but the following specific questions, comparisons, or items were not yet completed (< 80%):\n"
            f"- Missing / Unaddressed parts: {missing_text}\n"
            f"- Completeness guidance: {critique}\n"
            f"CRITICAL INSTRUCTION: DO NOT repeat or apologize for the content already generated above. "
            f"Directly and concisely provide ONLY the missing answers, calculations, or comparisons requested."
        )
        llm_messages.append(HumanMessage(content=continuation_msg))

    # 3. Prepend dynamic system instruction tailored strictly to active tools, custom workflow prefix, and PERSISTENT SUMMARY
    enabled_tools = state.get("enabled_tools")
    prefix = state.get("system_prompt_prefix")
    base_instructions = build_agent_system_instruction(enabled_tools)
    if prefix and prefix.strip():
        full_system_text = f"## CUSTOM AGENT WORKFLOW SYSTEM PROMPT\n{prefix.strip()}\n\n---\n{base_instructions}"
    else:
        full_system_text = base_instructions
    system_messages = [SystemMessage(content=full_system_text)]
    if summary:
        summary_system_msg = SystemMessage(
            content=(
                "## PERSISTENT CONVERSATION MEMORY SUMMARY\n"
                "The following is an accumulated, verified summary of prior messages from earlier in this conversation. "
                "Use it as active context for user intentions, entities, dates, and previous conclusions:\n\n"
                f"{summary}\n"
                "---"
            )
        )
        system_messages.append(summary_system_msg)

    # 4. Inject trusted Document RAG Scope into prompt
    selected_files = state.get("selected_file_ids")
    if selected_files:
        files_system_msg = SystemMessage(
            content=(
                f"## ATTACHED / SELECTED DOCUMENTS SCOPE\n"
                f"The user has explicitly selected {len(selected_files)} document(s) for this query: {selected_files}.\n"
                f"When answering questions about these files, invoke the `retrieve_document_context` tool with a specific search query.\n"
                f"Ground your answer strictly on retrieved excerpts. Keep your response clean, natural, and well-structured using markdown tables and bullet points. Do not insert quote strings inside citation tags."
            )
        )
        system_messages.append(files_system_msg)
    else:
        files_system_msg = SystemMessage(
            content=(
                "## ATTACHED / SELECTED DOCUMENTS SCOPE\n"
                "No documents are currently selected. If the user asks about an uploaded document, report, or contract, "
                "do NOT guess or hallucinate. Politely instruct: 'Please select one or more documents from the document selector above the chat input so I can examine them.'"
            )
        )
        system_messages.append(files_system_msg)

    # 5. Dynamic Tool Binding & Disabled-Tool Out-of-Scope Guidance
    enabled_tools = state.get("enabled_tools")
    if enabled_tools is not None:
        active_tool_instances = [t for t in ALL_TOOLS if getattr(t, "name", "") in enabled_tools]
        current_llm = base_streaming_llm.bind_tools(active_tool_instances) if active_tool_instances else base_streaming_llm

        disabled_tool_names = [getattr(t, "name", "") for t in ALL_TOOLS if getattr(t, "name", "") not in enabled_tools]
        if disabled_tool_names:
            tool_display_map = {
                "web_search": "Web Search (Tavily)",
                "web_scrape": "Web Scraper & Reader (Firecrawl)",
                "calculate": "Calculator & Math Engine",
                "get_current_time": "Date, Time & Timezones",
                "export_chat_pdf": "PDF Transcript Exporter",
                "export_chat_excel": "Excel Spreadsheet Exporter",
                "export_chat_docx": "Word Document Exporter (DOCX)",
                "export_chat_txt": "Plain Text Exporter",
                "retrieve_document_context": "Document Context Retrieval (RAG)",
                "process_image": "Multimodal Vision Analysis",
            }
            disabled_labels = [tool_display_map.get(name, name) for name in disabled_tool_names]

            tool_restriction_content = (
                f"## CURRENT USER TOOL PREFERENCES & OUT-OF-SCOPE CAPABILITIES\n"
                f"The user has explicitly TOGGLED OFF the following tool(s) in their Tools settings:\n"
                f"- Disabled Tool IDs: {', '.join(disabled_tool_names)}\n"
                f"- Disabled Tool Names: {', '.join(disabled_labels)}\n\n"
                f"CRITICAL BEHAVIORAL RULES FOR DISABLED TOOLS:\n"
                f"These disabled tools are STRICTLY OUT OF SCOPE. You have NOT been provided with tool-call schemas for them and CANNOT invoke them.\n\n"
                f"1. **LIVE WEB SEARCH (`web_search` toggled off)**:\n"
                f"   - When the user asks a question about current events, live news, or documentation, provide the most helpful, comprehensive answer you can using your internal parametric knowledge.\n"
                f"   - ALWAYS append a clear, polite notice at the bottom:\n"
                f"     '> *Note: Live Web Search is currently toggled off in your Tools settings. To search the live web and retrieve real-time sources, please enable **Web Search** in the Tools panel.*'\n\n"
                f"2. **EXPORT TOOLS (`export_chat_pdf`, `export_chat_excel`, `export_chat_docx`, `export_chat_txt` toggled off)**:\n"
                f"   - If the user explicitly asks to export, generate, or download a PDF, Word document, Excel spreadsheet, or text file and that tool is toggled off, DO NOT attempt to call the export tool.\n"
                f"   - Instead, solve the user's request completely by presenting all requested data, tables, and formatted content directly in the chat using standard Markdown tables (`| Col 1 | Col 2 |`) or formatted sections.\n"
                f"   - ALWAYS append a clear notice at the bottom:\n"
                f"     '> *Note: [Format] export is currently unavailable because the tool is toggled off in your Tools settings. Your data has been generated above in the chat. To download the file directly, please enable **[Tool Name]** in the Tools panel.*'\n\n"
                f"3. **WEB SCRAPER (`web_scrape` toggled off)**:\n"
                f"   - If the user provides a URL to scrape or inspect, explain what you know about the topic/site, and state:\n"
                f"     '> *Note: Web Scraper (Firecrawl) is currently toggled off. Please enable it in the Tools panel to inspect and extract live URL content.*'\n\n"
                f"4. **DOCUMENT RETRIEVAL (`retrieve_document_context` toggled off)**:\n"
                f"   - If the user asks about their uploaded documents, state:\n"
                f"     '> *Note: Document Retrieval is currently toggled off in your Tools settings. Please enable Document Retrieval in the Tools panel to query your files.*'\n\n"
                f"5. **CALCULATOR (`calculate` toggled off)**:\n"
                f"   - Perform the arithmetic or algebraic calculation manually in chat with step-by-step working, and note that the external calculation tool is currently toggled off.\n\n"
                f"6. **TIME & TIMEZONE (`get_current_time` toggled off)**:\n"
                f"   - If the user asks for exact current local/world time, note that the temporal clock tool is toggled off.\n\n"
                f"GENERAL INSTRUCTION: If the user directly insists on using a specific tool that is toggled off, politely inform the user that the tool is currently toggled off in their settings and guide them to toggle it back ON in the Tools panel on the left navigation."
            )
            system_messages.append(SystemMessage(content=tool_restriction_content))
    else:
        current_llm = model_with_tools

    # Loop Protection: If iteration >= 4, prevent tool loops by stripping tool bindings and forcing direct synthesis
    if iteration >= 4:
        print(f"[AutoFlow Graph] [{time_str}] -> Iteration {iteration} reached: Enforcing direct synthesis (unbinding tools)")
        current_llm = base_streaming_llm

    llm_messages = system_messages + llm_messages

    print(f"\n[AutoFlow Graph] [{time_str}] Step {step_num} -> Entering Node [agent] (Iteration {iteration})")
    print(f"[AutoFlow Graph] [{time_str}] -> Invoking LLM ({settings.GEMINI_MODEL}) with {len(llm_messages)} message(s) (summary_active={bool(summary)})...")

    response = await invoke_llm_with_retry(current_llm, llm_messages, max_retries=2, initial_delay=2.0)
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

    has_tool_calls = bool(getattr(response, "tool_calls", None))
    tool_calls = getattr(response, "tool_calls", []) or []
    response_text = extract_text_content(response.content)

    RAGTerminalLogger.log_agent_actions(
        tool_calls=tool_calls,
        direct_response_preview=response_text if not tool_calls else None,
        elapsed_ms=elapsed_ms,
    )
    if not has_tool_calls and response_text:
        RAGTerminalLogger.log_workflow_agent_synthesis(
            evidence_count=len(state.get("evidence", [])),
            response_preview=response_text,
            elapsed_ms=elapsed_ms,
        )

    if has_tool_calls:
        tool_names = [tc["name"] for tc in response.tool_calls]
        action_desc = f"Emitted {len(response.tool_calls)} parallel tool call(s): {tool_names}"
    else:
        action_desc = "Synthesized response (Decision + Synthesizer)"
    preview = (response_text[:100] + "...") if len(response_text) > 100 else response_text

    new_step: ExecutionStep = {
        "step_id": step_num,
        "node": "agent",
        "type": "agent",
        "action": action_desc,
        "input": {
            "messages_count": len(llm_messages),
            "has_summary": bool(summary),
            "summarized_count": count_summarized,
        },
        "output": {
            "has_tool_calls": has_tool_calls,
            "tool_calls": getattr(response, "tool_calls", []),
            "response_preview": preview,
        },
        "status": "success",
        "latency_ms": elapsed_ms,
        "iteration": iteration,
        "parent_step_id": None,
        "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
    }

    return {
        "messages": [response],
        "current_node": "agent",
        "research_goal": research_goal or "User query",
        "iteration_count": iteration,
        "execution_steps": [new_step],
        "last_tool_call": response.tool_calls[0] if has_tool_calls else None,
        "status": "tools_requested" if has_tool_calls else "completed",
        "summary": summary,
        "summarized_message_count": count_summarized,
    }


async def parallel_tools_node(state: AgentState) -> Dict[str, Any]:
    """Parallel Tool Executor: Concurrently executes all requested tool calls via asyncio.gather."""
    start_time = time.perf_counter()

    # Synchronize trusted runtime document scope for RAG tool
    selected_files = state.get("selected_file_ids")
    if selected_files is not None:
        set_active_turn_files(selected_files)

    messages = state.get("messages", [])
    last_msg = messages[-1] if messages else None
    raw_tool_calls = getattr(last_msg, "tool_calls", []) or []
    
    # Cap parallel tools per turn to avoid token limits
    if len(raw_tool_calls) > MAX_PARALLEL_TOOLS_PER_TURN:
        print(f"[AutoFlow Graph] Capping tool calls from {len(raw_tool_calls)} to {MAX_PARALLEL_TOOLS_PER_TURN} to conserve token budget.")
        tool_calls = raw_tool_calls[:MAX_PARALLEL_TOOLS_PER_TURN]
    else:
        tool_calls = raw_tool_calls

    iteration = state.get("iteration_count", 1)
    base_step_id = len(state.get("execution_steps", []))
    time_str = datetime.now().strftime("%H:%M:%S")

    print(f"\n[AutoFlow Graph] [{time_str}] Step {base_step_id + 1} -> Entering Node [tools] (Parallel Executor)")
    print(f"[AutoFlow Graph] [{time_str}] -> Executing {len(tool_calls)} tool call(s) concurrently via asyncio.gather...")

    async def execute_single_tool(tc: Dict[str, Any], idx: int):
        tool_name = tc.get("name", "")
        tool_args = tc.get("args", {})
        tool_call_id = tc.get("id", f"call_{idx}")
        t_start = time.perf_counter()
        
        enabled_tool_list = state.get("enabled_tools")
        if enabled_tool_list is not None and tool_name not in enabled_tool_list:
            output_content = (
                f"Notice: The tool '{tool_name}' is currently disabled in the user's settings. "
                "Do NOT attempt to invoke this tool again. Please synthesize your response directly using your internal knowledge "
                "and politely inform the user that the tool is toggled off."
            )
            t_status = "success"
        else:
            try:
                tool_fn = TOOL_MAP.get(tool_name)
                if tool_fn:
                    output_content = await tool_fn.ainvoke(tool_args)
                else:
                    output_content = f"Error: Tool '{tool_name}' is not registered."
                t_status = "success"
            except Exception as err:
                output_content = f"Error executing tool '{tool_name}': {str(err)}"
                t_status = "failed"

        t_elapsed = round((time.perf_counter() - t_start) * 1000, 2)
        text_out = extract_text_content(output_content)
        preview = (text_out[:120] + "...") if len(text_out) > 120 else text_out
        print(f"[AutoFlow Graph] [{time_str}]    * Finished [{tool_name}]: {preview} (took {t_elapsed}ms)")
        RAGTerminalLogger.log_workflow_tool_flow(
            tool_name=tool_name,
            tool_input=tool_args,
            tool_output=text_out,
            elapsed_ms=t_elapsed,
        )

        tool_msg = ToolMessage(content=str(output_content), tool_call_id=tool_call_id, name=tool_name)
        
        step: ExecutionStep = {
            "step_id": base_step_id + idx + 1,
            "node": tool_name,
            "type": "tool",
            "action": f"Executed tool: {tool_name}",
            "input": tool_args,
            "output": {"result": text_out},
            "status": t_status,
            "latency_ms": t_elapsed,
            "iteration": iteration,
            "parent_step_id": base_step_id,
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
        }

        evidence_item = {
            "tool": tool_name,
            "input": tool_args,
            "output": text_out,
            "timestamp": time_str,
            "iteration": iteration,
        }

        return tool_msg, step, evidence_item

    # Run all tool calls concurrently
    results = await asyncio.gather(*[execute_single_tool(tc, i) for i, tc in enumerate(tool_calls)])
    
    total_elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    print(f"[AutoFlow Graph] [{time_str}] <- All parallel tools completed in {total_elapsed_ms}ms total")

    tool_messages = [r[0] for r in results]
    new_steps = [r[1] for r in results]
    new_evidence = [r[2] for r in results]

    existing_evidence = list(state.get("evidence", []))
    existing_tool_results = list(state.get("tool_results", []))

    return {
        "messages": tool_messages,
        "current_node": "tools",
        "evidence": existing_evidence + new_evidence,
        "tool_results": existing_tool_results + new_evidence,
        "execution_steps": new_steps,
        "status": "tools_executed",
    }


async def validator_node(state: AgentState) -> Dict[str, Any]:
    """Validator node: Evaluates task completeness to determine if user prompt is fully answered or requires more generation."""
    start_time = time.perf_counter()
    step_num = len(state.get("execution_steps", [])) + 1
    iteration = state.get("iteration_count", 1)
    time_str = datetime.now().strftime("%H:%M:%S")

    research_goal = state.get("research_goal", "Answer user query")
    messages = list(state.get("messages", []))

    # Collect assistant response text generated in this conversation
    assistant_texts = []
    for m in messages:
        if isinstance(m, AIMessage) and m.content:
            txt = extract_text_content(m.content).strip()
            # Only include actual synthesized content, skip raw tool call messages
            if txt and not getattr(m, "tool_calls", None):
                assistant_texts.append(txt)

    combined_response = "\n\n---\n\n".join(assistant_texts) if assistant_texts else "(No direct text response produced yet)"
    
    print(f"\n[AutoFlow Graph] [{time_str}] Step {step_num} -> Entering Node [validator] (Evaluating Task Completeness via {VALIDATOR_MODEL_NAME})")

    val_prompt = (
        f"Original User Request:\n\"{research_goal}\"\n\n"
        f"Assistant Response Provided:\n{combined_response}\n\n"
        f"Please evaluate strictly whether all parts, questions, calculations, and requirements in the user's request have been completely answered, "
        f"or if any sub-tasks, comparisons, or questions remain unfinished and require further generation from the assistant."
    )

    val_messages = [
        SystemMessage(content=VALIDATOR_SYSTEM_PROMPT),
        HumanMessage(content=val_prompt)
    ]

    try:
        val_response = await invoke_llm_with_retry(validator_llm, val_messages, max_retries=1, initial_delay=2.0)
        val_text = extract_text_content(val_response.content).strip()

        # Clean JSON markdown fences if present
        if "```json" in val_text:
            val_text = val_text.split("```json")[1].split("```")[0].strip()
        elif "```" in val_text:
            val_text = val_text.split("```")[1].split("```")[0].strip()

        val_data = json.loads(val_text)
        raw_sufficient = bool(val_data.get("sufficient", True))
        completeness_score = float(val_data.get("completeness_score", 100.0 if raw_sufficient else 60.0))
        confidence = float(val_data.get("confidence", 1.0))
        missing_info = list(val_data.get("missing_information", []))
        critique = str(val_data.get("critique", "Task completeness evaluation completed."))

        # 80% Completeness Threshold Enforcement:
        # If completeness_score >= 80%, the response is deemed sufficient and complete!
        is_sufficient = raw_sufficient or (completeness_score >= 80.0)
        if is_sufficient and completeness_score < 80.0:
            completeness_score = 80.0

        validation_result: ValidationResult = {
            "sufficient": is_sufficient,
            "completeness_score": completeness_score,
            "confidence": confidence,
            "missing_information": [] if is_sufficient else missing_info,
            "issues": list(val_data.get("issues", [])),
            "critique": critique,
        }
    except Exception as e:
        print(f"[AutoFlow Graph] [{time_str}] Validator fallback: {e}")
        validation_result: ValidationResult = {
            "sufficient": True,
            "completeness_score": 100.0,
            "confidence": 0.85,
            "missing_information": [],
            "issues": [],
            "critique": "Task considered complete (validator fallback).",
        }

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    status_str = "sufficient" if validation_result["sufficient"] else "insufficient"
    
    RAGTerminalLogger.log_validator_evaluation(
        iteration=iteration,
        completeness_score=validation_result.get("completeness_score", 0.0),
        is_sufficient=validation_result["sufficient"],
        missing_info=validation_result.get("missing_information", []),
        critique=validation_result.get("critique", ""),
        elapsed_ms=elapsed_ms,
    )

    new_step: ExecutionStep = {
        "step_id": step_num,
        "node": "validator",
        "type": "validator",
        "action": f"Completeness: {status_str} ({validation_result.get('completeness_score', 100):.0f}%, Confidence: {validation_result['confidence']:.2f})",
        "input": {"goal": research_goal},
        "output": validation_result,
        "status": status_str,
        "latency_ms": elapsed_ms,
        "iteration": iteration,
        "parent_step_id": step_num - 1,
        "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
    }

    return {
        "current_node": "validator",
        "validation": validation_result,
        "execution_steps": [new_step],
        "status": f"validated_{status_str}",
    }


def should_continue_agent(state: AgentState) -> Literal["tools", "validator"]:
    """Routing from Agent (Decision + Synthesizer): if tool calls are present -> tools, else -> validator."""
    messages = state.get("messages", [])
    last_message = messages[-1] if messages else None
    time_str = datetime.now().strftime("%H:%M:%S")

    if last_message and getattr(last_message, "tool_calls", None):
        print(f"[AutoFlow Graph] [{time_str}] -> Routing: [agent] -> [tools] (Needs Parallel Tool Execution)")
        return "tools"
    print(f"[AutoFlow Graph] [{time_str}] -> Routing: [agent] -> [validator] (Evaluating Task Completeness)")
    return "validator"


def should_continue_validator(state: AgentState) -> Literal["agent", "__end__"]:
    """Routing from Validator: if complete (>= 80% completeness) -> __end__, else -> agent to continue generating."""
    validation = state.get("validation", {})
    iteration = state.get("iteration_count", 1)
    max_iters = state.get("max_iterations", 5)
    time_str = datetime.now().strftime("%H:%M:%S")

    completeness = float(validation.get("completeness_score", 100.0 if validation.get("sufficient", False) else 0.0))
    is_sufficient = bool(validation.get("sufficient", False)) or (completeness >= 80.0)

    # 1. Complete -> Finished (only when output meets the >= 80% completeness threshold)
    if is_sufficient:
        print(f"[AutoFlow Graph] [{time_str}] -> Routing: [validator] -> [__end__] (Task Fully Completed - Completeness: {completeness:.1f}% >= 80%)")
        return "__end__"

    # 2. Safety cutoff: Allow up to 3 retrieval/refinement iterations for complex multi-part queries
    if iteration >= 3 or iteration >= max_iters:
        print(f"[AutoFlow Graph] [{time_str}] -> Routing: [validator] -> [__end__] (Iteration limit {iteration} reached - preventing excessive looping)")
        return "__end__"

    # 3. Incomplete (< 80%) -> Loop back to agent (Decision + Synthesizer) to continue generating missing parts
    print(f"[AutoFlow Graph] [{time_str}] -> Routing: [validator] -> [agent] (Completeness: {completeness:.1f}% < 80% - Continuing Generation for missing parts)")
    return "agent"


def build_chatbot_graph(checkpointer=memory_checkpointer):
    """Build and compile the Decision+Synthesizer + Parallel Tool Executor + Completeness Validator graph."""
    workflow = StateGraph(AgentState)

    # 1. Register Nodes (Synthesizer removed!)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", parallel_tools_node)
    workflow.add_node("validator", validator_node)

    # 2. Set Entry Point
    workflow.add_edge(START, "agent")

    # 3. Conditional Edge from Agent: if tool calls -> tools, else -> validator
    workflow.add_conditional_edges(
        "agent",
        should_continue_agent,
        {
            "tools": "tools",
            "validator": "validator",
        }
    )

    # 4. Tools always flow back to Agent so Agent can synthesize the tool results into its response
    workflow.add_edge("tools", "agent")

    # 5. Conditional Edge from Validator: if complete -> END, else -> agent
    workflow.add_conditional_edges(
        "validator",
        should_continue_validator,
        {
            "agent": "agent",
            "__end__": END,
        }
    )

    return workflow.compile(checkpointer=checkpointer)


# Compiled Singleton Graph Instance with Memory Checkpointing
chatbot_graph = build_chatbot_graph()


def get_graph_schema() -> Dict[str, Any]:
    """Return structured graph topology metadata for visual UI rendering."""
    return {
        "nodes": [
            {
                "id": "__start__",
                "label": "User Input",
                "type": "start",
                "description": "Ingests user prompt",
                "icon": "Play",
                "color": "#10b981",
            },
            {
                "id": "agent",
                "label": "AutoFlow Agent",
                "type": "llm",
                "description": "Gemini decides actions, dispatches parallel tools, and synthesizes answers directly.",
                "icon": "Brain",
                "color": "#6366f1",
            },
            {
                "id": "tools",
                "label": "Tool Dispatcher",
                "type": "tool",
                "description": "Executes tool calls",
                "icon": "Wrench",
                "color": "#ec4899",
            },
            {
                "id": "validator",
                "label": "Validator",
                "type": "validator",
                "description": "Evaluates if the full user prompt is answered; loops back to agent if more generation is required.",
                "icon": "ShieldCheck",
                "color": "#f59e0b",
            },
            {
                "id": "__end__",
                "label": "Final Output",
                "type": "end",
                "description": "Delivers the synthesized response once completeness is confirmed.",
                "icon": "CheckCircle2",
                "color": "#14b8a6",
            },
        ],
        "edges": [
            {"from": "__start__", "to": "agent", "type": "direct", "label": "Invoke"},
            {"from": "agent", "to": "tools", "type": "conditional", "label": "Needs Tools (Parallel)"},
            {"from": "tools", "to": "agent", "type": "direct", "label": "Synthesize Tool Results"},
            {"from": "agent", "to": "validator", "type": "conditional", "label": "Evaluate Completeness"},
            {"from": "validator", "to": "agent", "type": "loop", "label": "Incomplete (Continue Generating)"},
            {"from": "validator", "to": "__end__", "type": "conditional", "label": "Task Fully Completed"},
        ],
        "tools": [
            {"name": "calculate", "description": "Safe mathematical expression evaluation"},
            {"name": "web_search", "description": "Live Tavily web search with AI summary & sources"},
            {"name": "web_scrape", "description": "Firecrawl web scrape & PDF reader extracting clean markdown from URLs"},
            {"name": "get_current_time", "description": "Accurate timezone and datetime information"},
            {"name": "process_image", "description": "Multimodal visual QA, OCR, and photo analysis (max 5 MB; PNG, JPEG, WEBP, HEIC, HEIF)"},
            {"name": "export_chat_pdf", "description": "Generate formatted PDF transcript documents with styled tables and headers"},
            {"name": "export_chat_excel", "description": "Generate clean Excel spreadsheets without gridlines and styled headers"},
            {"name": "export_chat_docx", "description": "Generate clean Microsoft Word documents (.docx) with styled headings and tables"},
            {"name": "export_chat_txt", "description": "Generate plain text conversation transcript dumps"},
            {"name": "retrieve_document_context", "description": "Hybrid RAG search (Dense + BM25 + RRF + Cross-Encoder reranking) over selected documents"},
        ],
        "model": settings.GEMINI_MODEL,
        "features": [
            "Unified Decision + Synthesizer Agent",
            "Parallel Async Tool Execution",
            "Multimodal Image Vision Analysis (5 MB limit)",
            "Hybrid Document RAG (Dense + BM25 + RRF + Reranker)",
            "Dynamic Tool Enablement & Controls",
            "Task Completeness Controller & Continuation Loop",
            "Memory Checkpointer & Observability"
        ]
    }
