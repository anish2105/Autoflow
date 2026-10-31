import uuid
import base64
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional
from db.chat_repository import get_supabase_client, is_valid_uuid

# In-memory fallback cache to guarantee 100% availability even before
# the SQL migration is applied in Supabase or during offline development.
_IN_MEMORY_DOCUMENT_CACHE: Dict[str, Dict[str, Any]] = {}
_supabase_table_missing: bool = False


class DocumentRepository:
    """Manages digitized document persistence in Supabase PostgreSQL (user_documents table)
    with seamless in-memory fallback.
    """

    @staticmethod
    def save_document(
        filename: str,
        content_base64: str,
        size_bytes: int,
        file_type: str = "pdf",
        mime_type: str = "application/pdf",
        tier: str = "fast",
        source: str = "upload",
        user_id: Optional[str] = None,
        doc_id: Optional[str] = None,
        content_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Save a new document record with initial status 'uploaded'."""
        document_id = doc_id or str(uuid.uuid4())
        now_iso = datetime.now().isoformat()
        valid_user_id = user_id if (user_id and is_valid_uuid(user_id)) else None

        # Compute SHA-256 hash if not provided
        computed_hash = content_hash
        if not computed_hash and content_base64:
            try:
                raw_b64 = content_base64
                if "," in raw_b64:
                    raw_b64 = raw_b64.split(",", 1)[1]
                computed_hash = hashlib.sha256(base64.b64decode(raw_b64)).hexdigest()
            except Exception:
                computed_hash = None

        record: Dict[str, Any] = {
            "id": document_id,
            "user_id": valid_user_id,
            "filename": filename,
            "file_type": file_type.lower(),
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "tier": tier if tier in ("fast", "agentic") else "fast",
            "status": "uploaded",
            "digitized": False,
            "content_base64": content_base64,
            "content_hash": computed_hash,
            "parsed_markdown": None,
            "parsed_pages": [],
            "error_message": None,
            "source": source if source in ("upload", "chat") else "upload",
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        # Keep in-memory cache updated
        _IN_MEMORY_DOCUMENT_CACHE[document_id] = record

        # Attempt to persist in Supabase user_documents table
        global _supabase_table_missing
        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    db_payload = {
                        "id": document_id,
                        "filename": record["filename"],
                        "file_type": record["file_type"],
                        "mime_type": record["mime_type"],
                        "size_bytes": record["size_bytes"],
                        "tier": record["tier"],
                        "status": record["status"],
                        "digitized": record["digitized"],
                        "content_base64": record["content_base64"],
                        "source": record["source"],
                    }
                    if computed_hash:
                        db_payload["content_hash"] = computed_hash
                    if valid_user_id:
                        db_payload["user_id"] = valid_user_id

                    client.table("user_documents").insert(db_payload).execute()
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[Supabase DB] Note: user_documents insert fallback to memory ({e})")

        return record

    @staticmethod
    def find_duplicate_document(
        filename: str,
        tier: str,
        content_hash: str,
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Deduplication rule: If a file has the same filename, same tier (fast, agentic),
        and the same content hash (SHA-256), return the existing digitized/processing document.
        If any character in content, filename, or tier differs, return None.
        """
        clean_name = filename.strip().lower()
        clean_tier = tier.strip().lower() if tier else "fast"
        valid_user_id = user_id if (user_id and is_valid_uuid(user_id)) else None

        # 1. Search in-memory cache first
        for doc in _IN_MEMORY_DOCUMENT_CACHE.values():
            doc_name = (doc.get("filename") or "").strip().lower()
            doc_tier = (doc.get("tier") or "fast").strip().lower()
            doc_status = doc.get("status")

            if doc_name == clean_name and doc_tier == clean_tier and doc_status in ("digitized", "processing", "uploaded"):
                # Compute or retrieve content hash
                doc_hash = doc.get("content_hash")
                if not doc_hash and doc.get("content_base64"):
                    try:
                        raw_b64 = doc["content_base64"]
                        if "," in raw_b64:
                            raw_b64 = raw_b64.split(",", 1)[1]
                        doc_hash = hashlib.sha256(base64.b64decode(raw_b64)).hexdigest()
                        doc["content_hash"] = doc_hash
                    except Exception:
                        doc_hash = None

                if doc_hash and doc_hash == content_hash:
                    return doc

        # 2. Search Supabase database if available
        global _supabase_table_missing
        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    query = client.table("user_documents").select("*").eq("tier", clean_tier)
                    if valid_user_id:
                        query = query.eq("user_id", valid_user_id)
                    res = query.execute()
                    if res.data:
                        for d in res.data:
                            d_name = (d.get("filename") or "").strip().lower()
                            if d_name != clean_name:
                                continue
                            d_status = d.get("status")
                            if d_status not in ("digitized", "processing", "uploaded"):
                                continue

                            d_hash = d.get("content_hash")
                            if not d_hash and d.get("content_base64"):
                                try:
                                    raw_b64 = d["content_base64"]
                                    if "," in raw_b64:
                                        raw_b64 = raw_b64.split(",", 1)[1]
                                    d_hash = hashlib.sha256(base64.b64decode(raw_b64)).hexdigest()
                                except Exception:
                                    d_hash = None

                            if d_hash and d_hash == content_hash:
                                _IN_MEMORY_DOCUMENT_CACHE[d["id"]] = d
                                return d
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[Supabase DB] Note: duplicate check query error ({e})")

        return None

    @staticmethod
    def update_document_status(
        doc_id: str,
        status: str,
        parsed_markdown: Optional[str] = None,
        parsed_pages: Optional[List[Dict[str, Any]]] = None,
        error_message: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update processing status ('processing', 'digitized', 'failed') and OCR outputs."""
        now_iso = datetime.now().isoformat()
        digitized = (status == "digitized")

        # Update in memory
        record = _IN_MEMORY_DOCUMENT_CACHE.get(doc_id)
        if record:
            record["status"] = status
            record["digitized"] = digitized
            record["updated_at"] = now_iso
            if parsed_markdown is not None:
                record["parsed_markdown"] = parsed_markdown
            if parsed_pages is not None:
                record["parsed_pages"] = parsed_pages
            if error_message is not None:
                record["error_message"] = error_message

        # Update in Supabase
        global _supabase_table_missing
        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    update_payload: Dict[str, Any] = {
                        "status": status,
                        "digitized": digitized,
                        "updated_at": now_iso,
                    }
                    if parsed_markdown is not None:
                        update_payload["parsed_markdown"] = parsed_markdown
                    if parsed_pages is not None:
                        update_payload["parsed_pages"] = parsed_pages
                    if error_message is not None:
                        update_payload["error_message"] = error_message

                    client.table("user_documents").update(update_payload).eq("id", doc_id).execute()
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[Supabase DB] Note: user_documents update fallback to memory ({e})")

        return record

    @staticmethod
    def get_user_documents(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve all documents belonging to a user (or all anonymous guest documents)."""
        valid_user_id = user_id if (user_id and is_valid_uuid(user_id)) else None

        global _supabase_table_missing
        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    query = client.table("user_documents").select(
                        "id, user_id, filename, file_type, mime_type, size_bytes, tier, status, digitized, source, error_message, created_at, updated_at"
                    ).order("created_at", desc=True)

                    if valid_user_id:
                        query = query.eq("user_id", valid_user_id)
                    else:
                        query = query.is_("user_id", "null")

                    res = query.execute()
                    if res.data is not None and len(res.data) > 0:
                        # Sync into memory cache metadata
                        for doc in res.data:
                            if doc["id"] in _IN_MEMORY_DOCUMENT_CACHE:
                                _IN_MEMORY_DOCUMENT_CACHE[doc["id"]].update(doc)
                            else:
                                _IN_MEMORY_DOCUMENT_CACHE[doc["id"]] = doc
                        return res.data
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[Supabase DB] Note: user_documents select fallback to memory ({e})")


        # Fallback to in-memory cache
        matching = []
        for doc in sorted(_IN_MEMORY_DOCUMENT_CACHE.values(), key=lambda d: d.get("created_at", ""), reverse=True):
            if valid_user_id:
                # Include docs matching valid_user_id or any session/unassigned docs
                if doc.get("user_id") == valid_user_id or not doc.get("user_id"):
                    matching.append(doc)
            else:
                matching.append(doc)
        return matching

    @staticmethod
    def get_document_by_id(doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve complete document details including content_base64 and parsed_pages."""
        # Check in memory first
        if doc_id in _IN_MEMORY_DOCUMENT_CACHE:
            return _IN_MEMORY_DOCUMENT_CACHE[doc_id]

        global _supabase_table_missing
        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    res = client.table("user_documents").select("*").eq("id", doc_id).limit(1).execute()
                    if res.data and len(res.data) > 0:
                        doc = res.data[0]
                        _IN_MEMORY_DOCUMENT_CACHE[doc_id] = doc
                        return doc
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[Supabase DB] Error fetching document by ID: {e}")

        return _IN_MEMORY_DOCUMENT_CACHE.get(doc_id)

    @staticmethod
    def delete_document(doc_id: str, user_id: Optional[str] = None) -> bool:
        """Delete document from database and in-memory cache."""
        valid_user_id = user_id if (user_id and is_valid_uuid(user_id)) else None

        _IN_MEMORY_DOCUMENT_CACHE.pop(doc_id, None)

        global _supabase_table_missing
        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    query = client.table("user_documents").delete().eq("id", doc_id)
                    if valid_user_id:
                        query = query.eq("user_id", valid_user_id)
                    query.execute()
                    return True
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[Supabase DB] Error deleting document: {e}")
                    return False
        return True
