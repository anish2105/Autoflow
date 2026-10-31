import json
import uuid
import re
import ast
from datetime import datetime
from typing import Dict, Any, List, Optional
from supabase import create_client, Client
from config import settings

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """Obtain or initialize the Supabase client using server credentials."""
    global _supabase_client
    if _supabase_client is None and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            _supabase_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
        except Exception as e:
            print(f"[Supabase DB] Failed to initialize client: {e}")
            return None
    return _supabase_client


def is_valid_uuid(val: Any) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def sanitize_for_json(obj: Any, depth: int = 0) -> Any:
    """Recursively converts objects (including LangChain messages and Pydantic models) to JSON-serializable primitives."""
    if depth > 10:
        return str(obj)
    if obj is None or isinstance(obj, (bool, int, float, str)):
        return obj
    # Handle LangChain BaseMessage / message objects
    if hasattr(obj, "type") and hasattr(obj, "content"):
        content_val = obj.content
        if isinstance(content_val, list):
            clean_parts = []
            for part in content_val:
                if isinstance(part, dict) and part.get("type") == "image_url":
                    clean_parts.append({"type": "image_url", "image_url": "[base64 image]"})
                else:
                    clean_parts.append(sanitize_for_json(part, depth + 1))
            content_str = str(clean_parts)
        else:
            content_str = str(content_val)

        data = {
            "type": getattr(obj, "type", "message"),
            "content": content_str[:2000] if len(content_str) > 2000 else content_str,
        }
        if getattr(obj, "name", None):
            data["name"] = obj.name
        if getattr(obj, "tool_calls", None):
            data["tool_calls"] = sanitize_for_json(obj.tool_calls, depth + 1)
        if getattr(obj, "tool_call_id", None):
            data["tool_call_id"] = obj.tool_call_id
        return data
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v, depth + 1) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [sanitize_for_json(item, depth + 1) for item in obj]
    if hasattr(obj, "model_dump") and callable(obj.model_dump):
        try:
            return sanitize_for_json(obj.model_dump(), depth + 1)
        except Exception:
            pass
    if hasattr(obj, "dict") and callable(obj.dict):
        try:
            return sanitize_for_json(obj.dict(), depth + 1)
        except Exception:
            pass
    return str(obj)


class ChatRepository:
    """Database repository managing conversations, messages, runs, steps, and tool calls in Supabase."""

    @staticmethod
    async def get_user_conversations(user_id: str) -> List[Dict[str, Any]]:
        client = get_supabase_client()
        if not client or not user_id or user_id == "anonymous":
            return []
        try:
            res = client.table("conversations").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            print(f"[ChatRepo] Error fetching conversations: {e}")
            return []

    @staticmethod
    async def ensure_conversation(conversation_id: str, user_id: str, title: str = "New Conversation") -> str:
        """Ensure a conversation exists in Supabase. Returns a valid UUID string for the conversation."""
        client = get_supabase_client()
        if not client or not user_id or user_id == "anonymous":
            return conversation_id

        valid_id = conversation_id if is_valid_uuid(conversation_id) else str(uuid.uuid4())

        try:
            check = client.table("conversations").select("id, user_id").eq("id", valid_id).execute()
            if not check.data:
                client.table("conversations").insert({
                    "id": valid_id,
                    "user_id": user_id,
                    "title": title
                }).execute()
            elif check.data[0].get("user_id") != user_id:
                valid_id = str(uuid.uuid4())
                client.table("conversations").insert({
                    "id": valid_id,
                    "user_id": user_id,
                    "title": title
                }).execute()
            return valid_id
        except Exception as e:
            print(f"[ChatRepo] Error ensuring conversation: {e}")
            return valid_id

    @staticmethod
    async def create_conversation(user_id: str, title: str = "New Conversation") -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client or not user_id or user_id == "anonymous":
            return None
        try:
            res = client.table("conversations").insert({
                "user_id": user_id,
                "title": title
            }).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            print(f"[ChatRepo] Error creating conversation: {e}")
            return None

    @staticmethod
    async def update_conversation_title(conversation_id: str, title: str) -> None:
        client = get_supabase_client()
        if not client or not conversation_id or not is_valid_uuid(conversation_id):
            return
        try:
            client.table("conversations").update({"title": title, "updated_at": "now()"}).eq("id", conversation_id).execute()
        except Exception as e:
            print(f"[ChatRepo] Error updating conversation title: {e}")

    @staticmethod
    async def delete_conversation(conversation_id: str, user_id: str) -> bool:
        client = get_supabase_client()
        if not client or not conversation_id or not is_valid_uuid(conversation_id):
            return False
        try:
            client.table("conversations").delete().eq("id", conversation_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            print(f"[ChatRepo] Error deleting conversation: {e}")
            return False

    @staticmethod
    async def get_conversation_history(conversation_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Fetch complete conversation history with messages, associated tool calls, validation, and execution events."""
        client = get_supabase_client()
        if not client or not conversation_id or not is_valid_uuid(conversation_id):
            return {"messages": [], "events": []}

        try:
            # If user_id is provided, verify conversation belongs to the user
            if user_id and user_id != "anonymous":
                owner_check = client.table("conversations").select("id").eq("id", conversation_id).eq("user_id", user_id).execute()
                if not owner_check.data:
                    return {"messages": [], "events": []}

            # 1. Fetch messages
            msgs = client.table("messages").select("*").eq("conversation_id", conversation_id).order("sequence_number", desc=False).execute().data or []
            
            # 2. Fetch runs with related tool_calls and execution_steps
            runs = client.table("runs").select("id, input_message_id, created_at, tool_calls(*), execution_steps(*)").eq("conversation_id", conversation_id).order("created_at", desc=False).execute().data or []
            
            run_by_input = {r["input_message_id"]: r for r in runs if r.get("input_message_id")}
            runs_list = list(runs)
            run_idx = 0

            formatted_messages = []
            formatted_events = []
            last_user_id = None

            # Collect events from execution_steps across all runs
            for r in runs:
                steps = sorted(r.get("execution_steps") or [], key=lambda s: s.get("step_number", 0))
                for s in steps:
                    step_created = s.get("created_at") or ""
                    step_time = ""
                    if step_created:
                        try:
                            dt = datetime.fromisoformat(step_created.replace("Z", "+00:00"))
                            step_time = dt.strftime("%I:%M:%S %p")
                        except Exception:
                            step_time = str(step_created)

                    formatted_events.append({
                        "id": s.get("id") or str(uuid.uuid4())[:8],
                        "timestamp": step_time,
                        "node": s.get("node") or "agent",
                        "action": s.get("action") or f"Executed node [{s.get('node')}]",
                        "details": s.get("output"),
                        "latency_ms": s.get("latency_ms"),
                        "type": "node_end"
                    })

            for m in msgs:
                created_dt = m.get("created_at")
                time_str = ""
                if created_dt:
                    try:
                        dt = datetime.fromisoformat(created_dt.replace("Z", "+00:00"))
                        time_str = dt.strftime("%I:%M %p")
                    except Exception:
                        time_str = str(created_dt)

                if m["role"] == "user":
                    last_user_id = m["id"]
                    formatted_messages.append({
                        "id": m["id"],
                        "role": "user",
                        "content": m.get("content") or "",
                        "timestamp": time_str
                    })
                elif m["role"] == "assistant":
                    # Match run by input user message ID or sequentially
                    matched_run = run_by_input.get(last_user_id) if last_user_id else None
                    if not matched_run and run_idx < len(runs_list):
                        matched_run = runs_list[run_idx]
                        run_idx += 1
                        
                    tool_calls_items = []
                    validation_obj = None

                    if matched_run:
                        raw_tools = matched_run.get("tool_calls") or []
                        for tc in raw_tools:
                            out_val = tc.get("result")
                            if isinstance(out_val, dict) and "raw" in out_val:
                                out_str = str(out_val["raw"])
                            elif isinstance(out_val, dict):
                                out_str = json.dumps(out_val)
                            else:
                                out_str = str(out_val or "")

                            tool_calls_items.append({
                                "id": tc.get("id"),
                                "name": tc.get("tool_name") or "",
                                "input": tc.get("arguments"),
                                "output": out_str,
                                "status": tc.get("status") or "completed",
                                "latency_ms": tc.get("latency_ms")
                            })
                        
                        raw_steps = matched_run.get("execution_steps") or []
                        for step in raw_steps:
                            if step.get("node") == "validator":
                                step_out = step.get("output")
                                cand_val = None
                                if isinstance(step_out, dict):
                                    if "validation" in step_out and isinstance(step_out["validation"], dict):
                                        cand_val = step_out["validation"]
                                    elif "sufficient" in step_out:
                                        cand_val = step_out
                                    elif "raw" in step_out and isinstance(step_out["raw"], str):
                                        raw_text = step_out["raw"].strip()
                                        if raw_text not in ("__end__", "agent", "tools"):
                                            try:
                                                p = json.loads(raw_text)
                                                cand_val = p.get("validation", p) if isinstance(p, dict) else None
                                            except Exception:
                                                try:
                                                    p = ast.literal_eval(raw_text)
                                                    cand_val = p.get("validation", p) if isinstance(p, dict) else None
                                                except Exception:
                                                    pass
                                            if not cand_val:
                                                cand_val = {}
                                                is_suff = re.search(r"['\"]sufficient['\"]\s*:\s*(True|true|False|false)", raw_text)
                                                if is_suff:
                                                    cand_val["sufficient"] = (is_suff.group(1).lower() == "true")
                                                conf_m = re.search(r"['\"]confidence['\"]\s*:\s*([0-9.]+)", raw_text)
                                                if conf_m:
                                                    cand_val["confidence"] = float(conf_m.group(1))
                                                crit_m = re.search(r"['\"]critique['\"]\s*:\s*['\"]([^'\"]+)['\"]", raw_text)
                                                if crit_m:
                                                    cand_val["critique"] = crit_m.group(1)
                                elif isinstance(step_out, str):
                                    raw_text = step_out.strip()
                                    if raw_text not in ("__end__", "agent", "tools"):
                                        try:
                                            p = json.loads(raw_text)
                                            cand_val = p.get("validation", p) if isinstance(p, dict) else None
                                        except Exception:
                                            try:
                                                p = ast.literal_eval(raw_text)
                                                cand_val = p.get("validation", p) if isinstance(p, dict) else None
                                            except Exception:
                                                pass
                                        if not cand_val:
                                            cand_val = {}
                                            is_suff = re.search(r"['\"]sufficient['\"]\s*:\s*(True|true|False|false)", raw_text)
                                            if is_suff:
                                                cand_val["sufficient"] = (is_suff.group(1).lower() == "true")
                                            conf_m = re.search(r"['\"]confidence['\"]\s*:\s*([0-9.]+)", raw_text)
                                            if conf_m:
                                                cand_val["confidence"] = float(conf_m.group(1))
                                            crit_m = re.search(r"['\"]critique['\"]\s*:\s*['\"]([^'\"]+)['\"]", raw_text)
                                            if crit_m:
                                                cand_val["critique"] = crit_m.group(1)

                                if isinstance(cand_val, dict) and "sufficient" in cand_val:
                                    validation_obj = {
                                        "sufficient": bool(cand_val.get("sufficient", True)),
                                        "confidence": float(cand_val.get("confidence", 1.0) if cand_val.get("confidence") is not None else 1.0),
                                        "missing_information": list(cand_val.get("missing_information", [])),
                                        "issues": list(cand_val.get("issues", [])),
                                        "critique": str(cand_val.get("critique", "Task completeness evaluation completed."))
                                    }

                    formatted_messages.append({
                        "id": m["id"],
                        "role": "assistant",
                        "content": m.get("content") or "",
                        "timestamp": time_str,
                        "toolCalls": tool_calls_items if tool_calls_items else None,
                        "validation": validation_obj
                    })

            return {
                "messages": formatted_messages,
                "events": formatted_events
            }

        except Exception as e:
            print(f"[ChatRepo] Error fetching conversation history: {e}")
            return {"messages": [], "events": []}

    @staticmethod
    async def get_conversation_messages(conversation_id: str) -> List[Dict[str, Any]]:
        client = get_supabase_client()
        if not client or not conversation_id or not is_valid_uuid(conversation_id):
            return []
        try:
            res = client.table("messages").select("*").eq("conversation_id", conversation_id).order("sequence_number", desc=False).execute()
            return res.data or []
        except Exception as e:
            print(f"[ChatRepo] Error fetching messages: {e}")
            return []

    @staticmethod
    async def save_message(conversation_id: str, role: str, content: str, sequence_number: int) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client or not conversation_id or not is_valid_uuid(conversation_id):
            return None
        try:
            res = client.table("messages").insert({
                "conversation_id": conversation_id,
                "role": role,
                "content": content,
                "sequence_number": sequence_number
            }).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            print(f"[ChatRepo] Error saving message: {e}")
            return None

    @staticmethod
    async def create_run(conversation_id: str, model: str = "gemini-2.5-flash", input_message_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client or not conversation_id or not is_valid_uuid(conversation_id):
            return None
        try:
            res = client.table("runs").insert({
                "conversation_id": conversation_id,
                "status": "running",
                "model": model,
                "input_message_id": input_message_id if is_valid_uuid(input_message_id) else None,
                "iteration_count": 0
            }).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            print(f"[ChatRepo] Error creating run: {e}")
            return None

    @staticmethod
    async def complete_run(run_id: str, status: str = "completed", total_latency_ms: Optional[int] = None, iteration_count: int = 1) -> None:
        client = get_supabase_client()
        if not client or not run_id or not is_valid_uuid(run_id):
            return
        try:
            client.table("runs").update({
                "status": status,
                "completed_at": "now()",
                "total_latency_ms": total_latency_ms,
                "iteration_count": iteration_count
            }).eq("id", run_id).execute()
        except Exception as e:
            print(f"[ChatRepo] Error completing run: {e}")

    @staticmethod
    async def save_execution_step(
        run_id: str,
        step_number: int,
        node: str,
        step_type: Optional[str],
        action: Optional[str],
        status: str = "success",
        input_data: Optional[Any] = None,
        output_data: Optional[Any] = None,
        latency_ms: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client or not run_id or not is_valid_uuid(run_id):
            return None
        try:
            clean_input = sanitize_for_json(input_data)
            clean_output = sanitize_for_json(output_data)
            res = client.table("execution_steps").insert({
                "run_id": run_id,
                "step_number": step_number,
                "node": node,
                "step_type": step_type,
                "action": action,
                "status": status,
                "input": clean_input if isinstance(clean_input, (dict, list)) else {"raw": str(clean_input)},
                "output": clean_output if isinstance(clean_output, (dict, list)) else {"raw": str(clean_output)},
                "latency_ms": latency_ms
            }).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            print(f"[ChatRepo] Error saving execution step: {e}")
            return None

    @staticmethod
    async def save_tool_call(
        run_id: str,
        tool_name: str,
        arguments: Optional[Any] = None,
        result: Optional[Any] = None,
        execution_step_id: Optional[str] = None,
        status: str = "completed",
        error: Optional[str] = None,
        latency_ms: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client or not run_id or not is_valid_uuid(run_id):
            return None
        try:
            clean_args = sanitize_for_json(arguments)
            clean_result = sanitize_for_json(result)
            res = client.table("tool_calls").insert({
                "run_id": run_id,
                "execution_step_id": execution_step_id if is_valid_uuid(execution_step_id) else None,
                "tool_name": tool_name,
                "arguments": clean_args if isinstance(clean_args, (dict, list)) else {"raw": str(clean_args)},
                "result": clean_result if isinstance(clean_result, (dict, list)) else {"raw": str(clean_result)},
                "status": status,
                "error": error,
                "latency_ms": latency_ms
            }).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            print(f"[ChatRepo] Error saving tool call: {e}")
            return None
