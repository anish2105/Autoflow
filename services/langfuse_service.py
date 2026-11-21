"""
Langfuse Observability & Evaluation Service.

Provides seamless OpenTelemetry tracing and evaluation scoring for AutoFlow:
- Traces end-to-end conversation runs across LangGraph nodes, LLM calls, and tool executions.
- Records input/output tokens, execution latency, and per-query costs in Langfuse.
- Automatically scores traces with the Completeness Validator results (Phase 3).
- Supports user feedback collection (thumbs-up / thumbs-down).
"""

import os
import uuid
from typing import Optional, Dict, Any, List, Tuple
from config import settings

_CLIENT_INITIALIZED = False
_LANGFUSE_CLIENT = None


class LangfuseService:
    """Manages Langfuse Client, Langchain CallbackHandler, and Trace Scoring."""

    @classmethod
    def is_enabled(cls) -> bool:
        """Returns True if valid Langfuse public and secret keys are configured."""
        pub = (getattr(settings, "LANGFUSE_PUBLIC_KEY", "") or "").strip()
        sec = (getattr(settings, "LANGFUSE_SECRET_KEY", "") or "").strip()
        if not pub or not sec:
            return False
        if "xxxx" in pub.lower() or "xxxx" in sec.lower():
            return False
        return True

    @classmethod
    def get_client(cls):
        """Returns singleton Langfuse client instance if enabled, else None."""
        global _CLIENT_INITIALIZED, _LANGFUSE_CLIENT
        if not cls.is_enabled():
            return None

        if not _CLIENT_INITIALIZED:
            try:
                from langfuse import Langfuse
                # Export to environment for global OpenTelemetry context propagation
                os.environ["LANGFUSE_PUBLIC_KEY"] = settings.LANGFUSE_PUBLIC_KEY.strip()
                os.environ["LANGFUSE_SECRET_KEY"] = settings.LANGFUSE_SECRET_KEY.strip()
                if getattr(settings, "LANGFUSE_HOST", None):
                    os.environ["LANGFUSE_HOST"] = settings.LANGFUSE_HOST.strip()

                _LANGFUSE_CLIENT = Langfuse(
                    public_key=settings.LANGFUSE_PUBLIC_KEY.strip(),
                    secret_key=settings.LANGFUSE_SECRET_KEY.strip(),
                    host=settings.LANGFUSE_HOST.strip() if getattr(settings, "LANGFUSE_HOST", None) else "https://cloud.langfuse.com",
                )
                _CLIENT_INITIALIZED = True
                print("[Langfuse Service] Successfully initialized Langfuse client.")
            except Exception as e:
                print(f"[Langfuse Service] Initialization note: {e}")
                _CLIENT_INITIALIZED = True
                _LANGFUSE_CLIENT = None

        return _LANGFUSE_CLIENT

    @classmethod
    def create_trace_id(cls) -> str:
        """Generates a valid 32-character lowercase hex trace ID for OpenTelemetry."""
        return uuid.uuid4().hex

    @classmethod
    def get_callback_handler(
        cls,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> Tuple[Optional[Any], str]:
        """
        Creates a LangChain CallbackHandler tied to a specific trace_id.
        Returns: (callback_handler_instance_or_none, trace_id)
        """
        tid = trace_id or cls.create_trace_id()
        if not cls.is_enabled():
            return None, tid

        client = cls.get_client()
        if not client:
            return None, tid

        try:
            from langfuse.langchain import CallbackHandler
            handler = CallbackHandler(
                public_key=settings.LANGFUSE_PUBLIC_KEY.strip(),
                trace_context={"trace_id": tid},
            )
            return handler, tid
        except Exception as e:
            print(f"[Langfuse Service] CallbackHandler error: {e}")
            return None, tid

    @classmethod
    def record_validation_score(
        cls,
        trace_id: str,
        completeness_score: float,
        critique: str = "",
        session_id: Optional[str] = None,
        issues: Optional[List[str]] = None,
    ) -> bool:
        """
        Records the Task Completeness Validator score (0.0 to 1.0) on the trace in Langfuse.
        This provides automated quality metrics across all conversations.
        """
        if not cls.is_enabled() or not trace_id:
            return False

        client = cls.get_client()
        if not client:
            return False

        try:
            # Normalize 0..100 score to 0.0..1.0
            normalized_value = round(max(0.0, min(100.0, float(completeness_score))) / 100.0, 3)
            # Langfuse API requires exactly one of trace_id OR session_id.
            # Passing trace_id attaches the score directly to the trace (and inherits the session).
            client.create_score(
                name="completeness",
                value=normalized_value,
                trace_id=trace_id,
                comment=critique[:500] if critique else None,
                data_type="NUMERIC",
                metadata={
                    "raw_score": completeness_score,
                    "session_id": session_id or "",
                    "issues": issues or [],
                },
            )
            print(f"[Langfuse Service] Recorded trace evaluation score: {normalized_value * 100:.1f}% for trace `{trace_id[:8]}...`")
            return True
        except Exception as e:
            print(f"[Langfuse Service] Note: Could not record validation score: {e}")
            return False

    @classmethod
    def record_feedback_score(
        cls,
        trace_id: str,
        value: float,
        comment: Optional[str] = None,
    ) -> bool:
        """
        Records human user feedback (1.0 for thumbs-up, 0.0 for thumbs-down) on a trace.
        """
        if not cls.is_enabled() or not trace_id:
            return False

        client = cls.get_client()
        if not client:
            return False

        try:
            client.create_score(
                name="user_feedback",
                value=float(value),
                trace_id=trace_id,
                comment=comment,
                data_type="NUMERIC",
            )
            client.flush()
            return True
        except Exception as e:
            print(f"[Langfuse Service] Note: Could not record user feedback: {e}")
            return False

    @classmethod
    def flush(cls):
        """Flushes buffered traces and scores to Langfuse."""
        if not cls.is_enabled():
            return
        client = cls.get_client()
        if client:
            try:
                client.flush()
            except Exception:
                pass
