import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
from db.chat_repository import get_supabase_client, is_valid_uuid

_WORKFLOWS_FILE = Path(__file__).resolve().parent / "workflows_store.json"


def _load_workflows_from_file() -> Dict[str, Dict[str, Any]]:
    if _WORKFLOWS_FILE.exists():
        try:
            with open(_WORKFLOWS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[WorkflowRepository] Error reading local workflows file: {e}")
            return {}
    return {}


def _save_workflows_to_file(data: Dict[str, Dict[str, Any]]):
    try:
        with open(_WORKFLOWS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[WorkflowRepository] Failed to save to local workflows file: {e}")


def ensure_uuid(val: Any) -> str:
    """Ensures a string is a valid UUID, deterministically converting custom IDs if needed."""
    try:
        return str(uuid.UUID(str(val)))
    except Exception:
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, str(val))) if val else str(uuid.uuid4())


_IN_MEMORY_WORKFLOWS: Dict[str, Dict[str, Any]] = _load_workflows_from_file()
_supabase_table_missing: bool = False


class WorkflowRepository:
    """Manages visual agent workflows with Supabase persistence and disk-backed cache fallback."""

    @staticmethod
    def get_user_workflows(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves all workflows owned by user (or global guest workflows if user_id is None)."""
        valid_user_id = user_id if (user_id and is_valid_uuid(user_id)) else None
        global _supabase_table_missing

        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    query = client.table("workflows").select("*")
                    if valid_user_id:
                        query = query.eq("user_id", valid_user_id)
                    else:
                        query = query.is_("user_id", "null")
                    
                    res = query.order("updated_at", desc=True).execute()
                    if res.data:
                        # Update cache & disk
                        for item in res.data:
                            _IN_MEMORY_WORKFLOWS[item["id"]] = item
                        _save_workflows_to_file(_IN_MEMORY_WORKFLOWS)
                        return res.data
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[WorkflowRepository] Fallback to local store on get_user_workflows: {e}")

        # Local disk-backed fallback
        results = []
        for wf in _IN_MEMORY_WORKFLOWS.values():
            if valid_user_id and wf.get("user_id") == valid_user_id:
                results.append(wf)
            elif not valid_user_id and not wf.get("user_id"):
                results.append(wf)
        results.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return results

    @staticmethod
    def create_workflow(
        user_id: Optional[str],
        name: str = "Untitled Workflow",
        description: str = "",
        system_prompt_prefix: str = "",
        nodes: Optional[List[Dict[str, Any]]] = None,
        edges: Optional[List[Dict[str, Any]]] = None,
        mermaid_code: str = "",
        workflow_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates and stores a new workflow definition."""
        wid = workflow_id or str(uuid.uuid4())
        db_wid = ensure_uuid(wid)
        now_iso = datetime.now().isoformat()
        valid_user_id = user_id if (user_id and is_valid_uuid(user_id)) else None

        record: Dict[str, Any] = {
            "id": wid,
            "user_id": valid_user_id,
            "name": name.strip() or "Untitled Workflow",
            "description": description.strip(),
            "system_prompt_prefix": system_prompt_prefix.strip(),
            "nodes": nodes or [],
            "edges": edges or [],
            "mermaid_code": mermaid_code.strip(),
            "is_active": True,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        # Keep cache & disk store updated
        _IN_MEMORY_WORKFLOWS[wid] = record
        if wid != db_wid:
            _IN_MEMORY_WORKFLOWS[db_wid] = record
        _save_workflows_to_file(_IN_MEMORY_WORKFLOWS)

        global _supabase_table_missing
        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    db_payload = {
                        "id": db_wid,
                        "name": record["name"],
                        "description": record["description"],
                        "system_prompt_prefix": record["system_prompt_prefix"],
                        "nodes": record["nodes"],
                        "edges": record["edges"],
                        "mermaid_code": record["mermaid_code"],
                        "is_active": record["is_active"],
                    }
                    if valid_user_id:
                        db_payload["user_id"] = valid_user_id
                    client.table("workflows").insert(db_payload).execute()
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[WorkflowRepository] Fallback to local store on create_workflow: {e}")

        return record

    @staticmethod
    def get_workflow(workflow_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Retrieves a single workflow by ID."""
        db_wid = ensure_uuid(workflow_id)
        global _supabase_table_missing
        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    res = client.table("workflows").select("*").eq("id", db_wid).execute()
                    if res.data and len(res.data) > 0:
                        _IN_MEMORY_WORKFLOWS[workflow_id] = res.data[0]
                        _save_workflows_to_file(_IN_MEMORY_WORKFLOWS)
                        return res.data[0]
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[WorkflowRepository] Fallback to local store on get_workflow: {e}")

        return _IN_MEMORY_WORKFLOWS.get(workflow_id) or _IN_MEMORY_WORKFLOWS.get(db_wid)

    @staticmethod
    def update_workflow(
        workflow_id: str,
        user_id: Optional[str],
        updates: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Updates an existing workflow."""
        existing = WorkflowRepository.get_workflow(workflow_id, user_id)
        if not existing:
            # If not in store, create it
            return WorkflowRepository.create_workflow(
                user_id=user_id,
                name=updates.get("name", "Untitled Workflow"),
                description=updates.get("description", ""),
                system_prompt_prefix=updates.get("system_prompt_prefix", ""),
                nodes=updates.get("nodes", []),
                edges=updates.get("edges", []),
                mermaid_code=updates.get("mermaid_code", ""),
                workflow_id=workflow_id,
            )

        now_iso = datetime.now().isoformat()
        allowed_fields = {"name", "description", "system_prompt_prefix", "nodes", "edges", "mermaid_code", "is_active"}
        clean_updates = {k: v for k, v in updates.items() if k in allowed_fields}
        clean_updates["updated_at"] = now_iso

        existing.update(clean_updates)
        db_wid = ensure_uuid(workflow_id)
        _IN_MEMORY_WORKFLOWS[workflow_id] = existing
        _IN_MEMORY_WORKFLOWS[db_wid] = existing
        _save_workflows_to_file(_IN_MEMORY_WORKFLOWS)

        global _supabase_table_missing
        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    client.table("workflows").update(clean_updates).eq("id", db_wid).execute()
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[WorkflowRepository] Fallback to local store on update_workflow: {e}")

        return existing

    @staticmethod
    def delete_workflow(workflow_id: str, user_id: Optional[str] = None) -> bool:
        """Deletes a workflow."""
        db_wid = ensure_uuid(workflow_id)
        _IN_MEMORY_WORKFLOWS.pop(workflow_id, None)
        _IN_MEMORY_WORKFLOWS.pop(db_wid, None)
        _save_workflows_to_file(_IN_MEMORY_WORKFLOWS)

        global _supabase_table_missing
        if not _supabase_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    client.table("workflows").delete().eq("id", db_wid).execute()
                    return True
                except Exception as e:
                    if "PGRST205" in str(e) or "Could not find the table" in str(e):
                        _supabase_table_missing = True
                    print(f"[WorkflowRepository] Fallback to local store on delete_workflow: {e}")

        return True

