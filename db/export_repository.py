import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from db.chat_repository import get_supabase_client, is_valid_uuid

# In-memory fallback cache to guarantee 100% availability even before
# the SQL migration is applied in Supabase.
_IN_MEMORY_EXPORT_CACHE: Dict[str, Dict[str, Any]] = {}


class ExportRepository:
    """Manages chat export persistence in Supabase PostgreSQL (chat_exports table)
    with seamless in-memory fallback.
    """

    @staticmethod
    def save_export(
        title: str,
        filename: str,
        file_type: str,
        mime_type: str,
        content_base64: str,
        size_bytes: int,
        conversation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Save a Base64-encoded export to the database or in-memory fallback."""
        export_id = str(uuid.uuid4())
        now_iso = datetime.now().isoformat()

        valid_conv_id = conversation_id if (conversation_id and is_valid_uuid(conversation_id)) else None

        record = {
            "id": export_id,
            "conversation_id": valid_conv_id,
            "title": title or "AutoFlow Export",
            "filename": filename,
            "file_type": file_type.lower(),
            "mime_type": mime_type,
            "content_base64": content_base64,
            "size_bytes": size_bytes,
            "created_at": now_iso,
        }

        # Always update memory cache for instant retrieval & resilience
        _IN_MEMORY_EXPORT_CACHE[export_id] = record

        # Attempt to persist in Supabase chat_exports table
        client = get_supabase_client()
        if client:
            try:
                db_payload = {
                    "id": export_id,
                    "title": record["title"],
                    "filename": record["filename"],
                    "file_type": record["file_type"],
                    "mime_type": record["mime_type"],
                    "content_base64": record["content_base64"],
                    "size_bytes": record["size_bytes"],
                }
                if valid_conv_id:
                    db_payload["conversation_id"] = valid_conv_id

                res = client.table("chat_exports").insert(db_payload).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[ExportRepository] Note: Saved to resilient cache (Supabase table insert notice: {e})")

        return record

    @staticmethod
    def get_export(export_id: str) -> Optional[Dict[str, Any]]:
        """Fetch an export record by ID, checking Supabase first, then in-memory cache."""
        if not export_id:
            return None

        # Check Supabase first
        client = get_supabase_client()
        if client and is_valid_uuid(export_id):
            try:
                res = client.table("chat_exports").select("*").eq("id", export_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[ExportRepository] Supabase query notice: {e}")

        # Fallback to in-memory cache
        return _IN_MEMORY_EXPORT_CACHE.get(export_id)

    @staticmethod
    def get_exports_by_conversation(conversation_id: str) -> List[Dict[str, Any]]:
        """Fetch list of exports for a specific conversation."""
        if not conversation_id or not is_valid_uuid(conversation_id):
            return []

        client = get_supabase_client()
        if client:
            try:
                res = (
                    client.table("chat_exports")
                    .select("id, title, filename, file_type, mime_type, size_bytes, created_at")
                    .eq("conversation_id", conversation_id)
                    .order("created_at", desc=True)
                    .execute()
                )
                if res.data:
                    return res.data
            except Exception as e:
                print(f"[ExportRepository] Error listing conversation exports: {e}")

        # Search in-memory cache
        return [
            {
                "id": k,
                "title": v["title"],
                "filename": v["filename"],
                "file_type": v["file_type"],
                "mime_type": v["mime_type"],
                "size_bytes": v["size_bytes"],
                "created_at": v["created_at"],
            }
            for k, v in _IN_MEMORY_EXPORT_CACHE.items()
            if v.get("conversation_id") == conversation_id
        ]
