import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from db.chat_repository import get_supabase_client, is_valid_uuid

# Optional environment-configured Ace accounts (e.g. ACE_EMAILS in .env); Supabase DB tier column is primary source of truth
ACE_EMAILS = {
    e.strip().lower()
    for e in os.getenv("ACE_EMAILS", "").split(",")
    if e.strip()
}

TIER_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "pleasant": {
        "tier": "pleasant",
        "name": "Pleasant (Guest / Demo)",
        "max_messages": 5,
        "max_documents": 1,
        "max_images": 1,
        "allowed_tools": ["calculate", "get_current_time"],
        "can_upgrade": False,
        "can_access_admin": False,
    },
    "jack": {
        "tier": "jack",
        "name": "Jack (Registered User)",
        "max_messages": 25,
        "max_documents": 3,
        "max_images": 5,
        "allowed_tools": ["calculate", "get_current_time", "web_search", "retrieve_document_context"],
        "can_upgrade": True,
        "can_access_admin": False,
    },
    "king": {
        "tier": "king",
        "name": "King (Premium)",
        "max_messages": -1,  # -1 represents unlimited
        "max_documents": 15,
        "max_images": -1,
        "allowed_tools": [
            "calculate", "get_current_time", "web_search", "web_scrape",
            "retrieve_document_context", "export_chat_pdf", "export_chat_excel", "export_chat_txt"
        ],
        "can_upgrade": True,
        "can_access_admin": False,
    },
    "ace": {
        "tier": "ace",
        "name": "Ace (Owner / Super Admin)",
        "max_messages": -1,  # unlimited
        "max_documents": -1,  # unlimited
        "max_images": -1,  # unlimited
        "allowed_tools": [
            "calculate", "get_current_time", "web_search", "web_scrape",
            "retrieve_document_context", "export_chat_pdf", "export_chat_excel", "export_chat_txt"
        ],
        "can_upgrade": False,
        "can_access_admin": True,
    },
}

# In-memory stores for offline fallback / guest sessions
_IN_MEMORY_USERS: Dict[str, Dict[str, Any]] = {}
_IN_MEMORY_USAGE: Dict[str, Dict[str, int]] = {}
_IN_MEMORY_UPGRADE_REQUESTS: List[Dict[str, Any]] = []
_supabase_tier_table_missing: bool = False


class TierRepository:
    """Manages User Roles, Tier-based Quotas, Usage Counters, and Upgrade Requests

    with seamless Supabase PostgreSQL persistence and in-memory fallback.
    """

    @staticmethod
    def get_tier_defaults(tier_name: str) -> Dict[str, Any]:
        """Returns standard quota specifications for a given tier."""
        clean = (tier_name or "pleasant").lower().strip()
        return dict(TIER_DEFAULTS.get(clean, TIER_DEFAULTS["pleasant"]))

    @classmethod
    def get_user_profile(
        cls,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Resolves complete user tier profile, effective limits, and consumed usage."""
        clean_email = (email or "").strip().lower()

        # 1. Check if user is an authorized Ace Account
        is_ace_email = clean_email in ACE_EMAILS
        is_authenticated = bool(user_id or clean_email)
        valid_user_id = user_id if (user_id and is_valid_uuid(user_id)) else None

        # Guest / Unauthenticated session
        if not is_authenticated:
            guest_id = "pleasant_guest"
            usage = _IN_MEMORY_USAGE.get(guest_id, {"messages": 0, "documents": 0, "images": 0})
            defaults = cls.get_tier_defaults("pleasant")
            return {
                "user_id": None,
                "email": None,
                "tier": "pleasant",
                "tier_name": defaults["name"],
                "max_messages": defaults["max_messages"],
                "max_documents": defaults["max_documents"],
                "max_images": defaults["max_images"],
                "consumed_messages": usage.get("messages", 0),
                "consumed_documents": usage.get("documents", 0),
                "consumed_images": usage.get("images", 0),
                "allowed_tools": defaults["allowed_tools"],
                "can_access_admin": False,
                "can_upgrade": False,
                "custom_overrides": False,
            }

        # Authenticated user
        assigned_tier = "ace" if is_ace_email else "jack"
        custom_doc_limit = None
        custom_msg_limit = None
        custom_tools = None

        # Fetch from Supabase
        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing and valid_user_id:
            client = get_supabase_client()
            if client:
                try:
                    res = client.table("users").select(
                        "id, email, tier, custom_doc_limit, custom_msg_limit, custom_tools"
                    ).eq("id", valid_user_id).limit(1).execute()

                    if res.data and len(res.data) > 0:
                        db_user = res.data[0]
                        if is_ace_email:
                            assigned_tier = "ace"
                        else:
                            assigned_tier = db_user.get("tier") or "jack"
                        custom_doc_limit = db_user.get("custom_doc_limit")
                        custom_msg_limit = db_user.get("custom_msg_limit")
                        custom_tools = db_user.get("custom_tools")
                except Exception as e:
                    if "PGRST205" in str(e) or "column" in str(e).lower() or "table" in str(e).lower():
                        _supabase_tier_table_missing = True
                    print(f"[Supabase DB] Note: users tier query fallback to memory ({e})")

        # Fallback check in memory
        uid_key = valid_user_id or user_id
        if uid_key and uid_key in _IN_MEMORY_USERS:
            mem_user = _IN_MEMORY_USERS[uid_key]
            if not is_ace_email:
                assigned_tier = mem_user.get("tier") or assigned_tier
            if custom_doc_limit is None:
                custom_doc_limit = mem_user.get("custom_doc_limit")
            if custom_msg_limit is None:
                custom_msg_limit = mem_user.get("custom_msg_limit")
            if custom_tools is None:
                custom_tools = mem_user.get("custom_tools")

        tier_def = cls.get_tier_defaults(assigned_tier)

        # Calculate effective limits with custom overrides
        eff_doc_limit = custom_doc_limit if custom_doc_limit is not None else tier_def["max_documents"]
        eff_msg_limit = custom_msg_limit if custom_msg_limit is not None else tier_def["max_messages"]
        eff_tools = custom_tools if custom_tools is not None else tier_def["allowed_tools"]

        # Fetch usage
        usage = cls.get_user_usage(valid_user_id or clean_email)

        has_custom = (
            custom_doc_limit is not None
            or custom_msg_limit is not None
            or custom_tools is not None
        )

        return {
            "user_id": valid_user_id,
            "email": clean_email,
            "tier": assigned_tier,
            "tier_name": tier_def["name"],
            "max_messages": eff_msg_limit,
            "max_documents": eff_doc_limit,
            "max_images": tier_def["max_images"],
            "consumed_messages": usage.get("messages", 0),
            "consumed_documents": usage.get("documents", 0),
            "consumed_images": usage.get("images", 0),
            "allowed_tools": eff_tools,
            "can_access_admin": assigned_tier == "ace",
            "can_upgrade": assigned_tier in ("jack", "king") and not is_ace_email,
            "custom_overrides": has_custom,
        }

    @classmethod
    def get_user_usage(cls, user_key: Optional[str]) -> Dict[str, int]:
        """Fetches resource consumption counts for a user."""
        if not user_key:
            return _IN_MEMORY_USAGE.get("pleasant_guest", {"messages": 0, "documents": 0, "images": 0})

        # Check DB first if valid uuid
        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing and is_valid_uuid(user_key):
            client = get_supabase_client()
            if client:
                try:
                    res = client.table("user_usage").select("*").eq("user_id", user_key).limit(1).execute()
                    if res.data and len(res.data) > 0:
                        d = res.data[0]
                        return {
                            "messages": d.get("message_count", 0),
                            "documents": d.get("doc_count", 0),
                            "images": d.get("image_count", 0),
                        }
                except Exception as e:
                    if "PGRST205" in str(e) or "table" in str(e).lower():
                        _supabase_tier_table_missing = True

        # Check memory
        if user_key not in _IN_MEMORY_USAGE:
            _IN_MEMORY_USAGE[user_key] = {"messages": 0, "documents": 0, "images": 0}
        return _IN_MEMORY_USAGE[user_key]

    @classmethod
    def increment_usage(
        cls,
        user_id: Optional[str],
        resource: str = "messages",
        amount: int = 1,
    ) -> Dict[str, int]:
        """Increments usage counter for messages, documents, or images."""
        key = user_id if (user_id and is_valid_uuid(user_id)) else "pleasant_guest"

        if key not in _IN_MEMORY_USAGE:
            _IN_MEMORY_USAGE[key] = {"messages": 0, "documents": 0, "images": 0}

        _IN_MEMORY_USAGE[key][resource] = _IN_MEMORY_USAGE[key].get(resource, 0) + amount
        new_val = _IN_MEMORY_USAGE[key][resource]

        # Sync to Supabase
        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing and key != "pleasant_guest":
            client = get_supabase_client()
            if client:
                try:
                    field_map = {
                        "messages": "message_count",
                        "documents": "doc_count",
                        "images": "image_count",
                    }
                    col = field_map.get(resource, "message_count")
                    # Upsert usage record
                    payload = {
                        "user_id": key,
                        col: new_val,
                        "last_active_at": datetime.now().isoformat(),
                    }
                    client.table("user_usage").upsert(payload, on_conflict="user_id").execute()
                except Exception as e:
                    if "PGRST205" in str(e):
                        _supabase_tier_table_missing = True
                    print(f"[Supabase DB] Error syncing usage: {e}")

        return _IN_MEMORY_USAGE[key]

    @classmethod
    def update_user_tier(cls, user_id: str, new_tier: str) -> bool:
        """Promotes or downgrades a user's tier (Admin action)."""
        clean_tier = new_tier.lower().strip()
        if clean_tier not in TIER_DEFAULTS:
            return False

        # In-memory update
        if user_id not in _IN_MEMORY_USERS:
            _IN_MEMORY_USERS[user_id] = {}
        _IN_MEMORY_USERS[user_id]["tier"] = clean_tier

        # Supabase update
        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing and is_valid_uuid(user_id):
            client = get_supabase_client()
            if client:
                try:
                    client.table("users").update({"tier": clean_tier}).eq("id", user_id).execute()
                    return True
                except Exception as e:
                    print(f"[Supabase DB] Error updating tier: {e}")

        return True

    @classmethod
    def update_user_custom_limits(
        cls,
        user_id: str,
        custom_doc_limit: Optional[int] = None,
        custom_msg_limit: Optional[int] = None,
        custom_tools: Optional[List[str]] = None,
    ) -> bool:
        """Sets custom resource limit overrides for an individual account (Admin action)."""
        if user_id not in _IN_MEMORY_USERS:
            _IN_MEMORY_USERS[user_id] = {}

        _IN_MEMORY_USERS[user_id]["custom_doc_limit"] = custom_doc_limit
        _IN_MEMORY_USERS[user_id]["custom_msg_limit"] = custom_msg_limit
        if custom_tools is not None:
            _IN_MEMORY_USERS[user_id]["custom_tools"] = custom_tools

        # Supabase update
        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing and is_valid_uuid(user_id):
            client = get_supabase_client()
            if client:
                try:
                    update_dict: Dict[str, Any] = {
                        "custom_doc_limit": custom_doc_limit,
                        "custom_msg_limit": custom_msg_limit,
                    }
                    if custom_tools is not None:
                        update_dict["custom_tools"] = custom_tools

                    client.table("users").update(update_dict).eq("id", user_id).execute()
                    return True
                except Exception as e:
                    print(f"[Supabase DB] Error updating custom limits: {e}")

        return True

    @classmethod
    def get_user_tools(cls, user_id: Optional[str]) -> Optional[Any]:
        """Retrieves custom user tool configurations from Supabase or in-memory fallback."""
        key = user_id or "pleasant_guest"
        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing and is_valid_uuid(user_id):
            client = get_supabase_client()
            if client:
                try:
                    res = client.table("users").select("custom_tools").eq("id", user_id).limit(1).execute()
                    if res.data and len(res.data) > 0:
                        return res.data[0].get("custom_tools")
                except Exception as e:
                    print(f"[Supabase DB] Error getting custom tools: {e}")

        return _IN_MEMORY_USERS.get(key, {}).get("custom_tools")

    @classmethod
    def update_user_tools(cls, user_id: Optional[str], custom_tools: Any) -> bool:
        """Saves user-specific enabled/disabled tool configuration."""
        key = user_id or "pleasant_guest"
        if key not in _IN_MEMORY_USERS:
            _IN_MEMORY_USERS[key] = {}
        _IN_MEMORY_USERS[key]["custom_tools"] = custom_tools

        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing and is_valid_uuid(user_id):
            client = get_supabase_client()
            if client:
                try:
                    client.table("users").update({"custom_tools": custom_tools}).eq("id", user_id).execute()
                    return True
                except Exception as e:
                    print(f"[Supabase DB] Error saving user tools: {e}")

        return True

    @classmethod
    def create_upgrade_request(
        cls,
        user_id: str,
        user_email: str,
        current_tier: str,
        requested_tier: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Submits an upgrade request from Jack or King user."""
        req_id = str(uuid.uuid4())
        now_iso = datetime.now().isoformat()
        record = {
            "id": req_id,
            "user_id": user_id,
            "user_email": user_email,
            "current_tier": current_tier,
            "requested_tier": requested_tier,
            "reason": reason or "",
            "status": "pending",
            "reviewed_by": None,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        _IN_MEMORY_UPGRADE_REQUESTS.append(record)

        # Supabase insert
        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing and is_valid_uuid(user_id):
            client = get_supabase_client()
            if client:
                try:
                    client.table("upgrade_requests").insert(record).execute()
                except Exception as e:
                    print(f"[Supabase DB] Error saving upgrade request: {e}")

        return record

    @classmethod
    def get_upgrade_requests(cls) -> List[Dict[str, Any]]:
        """Retrieves list of upgrade requests for Ace admin dashboard."""
        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    res = client.table("upgrade_requests").select("*").order("created_at", desc=True).execute()
                    if res.data is not None:
                        return res.data
                except Exception as e:
                    print(f"[Supabase DB] Error fetching upgrade requests: {e}")

        return sorted(_IN_MEMORY_UPGRADE_REQUESTS, key=lambda r: r.get("created_at", ""), reverse=True)

    @classmethod
    def review_upgrade_request(
        cls,
        request_id: str,
        status: str,
        reviewer_id: Optional[str] = None,
    ) -> bool:
        """Approves or rejects an upgrade request. If approved, user tier is updated."""
        now_iso = datetime.now().isoformat()
        clean_status = "approved" if status.lower() == "approved" else "rejected"

        target_req = None
        for req in _IN_MEMORY_UPGRADE_REQUESTS:
            if req.get("id") == request_id:
                req["status"] = clean_status
                req["reviewed_by"] = reviewer_id
                req["updated_at"] = now_iso
                target_req = req
                break

        # Supabase update
        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    client.table("upgrade_requests").update({
                        "status": clean_status,
                        "reviewed_by": reviewer_id,
                        "updated_at": now_iso,
                    }).eq("id", request_id).execute()
                except Exception as e:
                    print(f"[Supabase DB] Error reviewing upgrade request: {e}")

        # If approved, promote the user tier immediately
        if clean_status == "approved" and target_req:
            user_id = target_req.get("user_id")
            requested_tier = target_req.get("requested_tier")
            if user_id and requested_tier:
                cls.update_user_tier(user_id, requested_tier)

        return True

    @classmethod
    def get_all_users(cls) -> List[Dict[str, Any]]:
        """Retrieves all registered users with their tier, limits, and usage counts for Ace Dashboard."""
        all_users: List[Dict[str, Any]] = []

        # 1. Fetch from Supabase
        global _supabase_tier_table_missing
        if not _supabase_tier_table_missing:
            client = get_supabase_client()
            if client:
                try:
                    u_res = client.table("users").select(
                        "id, email, name, avatar_url, tier, custom_doc_limit, custom_msg_limit, custom_tools, created_at"
                    ).order("created_at", desc=True).execute()

                    if u_res.data:
                        # Fetch usage table
                        usage_res = client.table("user_usage").select("*").execute()
                        usage_map = {row["user_id"]: row for row in (usage_res.data or [])}

                        for u in u_res.data:
                            uid = u["id"]
                            u_email = (u.get("email") or "").lower().strip()
                            is_ace = u_email in ACE_EMAILS
                            tier = "ace" if is_ace else (u.get("tier") or "jack")

                            tier_def = cls.get_tier_defaults(tier)
                            use = usage_map.get(uid, {})

                            all_users.append({
                                "id": uid,
                                "email": u_email,
                                "name": u.get("name") or u_email.split("@")[0],
                                "avatar_url": u.get("avatar_url"),
                                "tier": tier,
                                "tier_name": tier_def["name"],
                                "created_at": u.get("created_at") or datetime.now().isoformat(),
                                "max_messages": u.get("custom_msg_limit") if u.get("custom_msg_limit") is not None else tier_def["max_messages"],
                                "max_documents": u.get("custom_doc_limit") if u.get("custom_doc_limit") is not None else tier_def["max_documents"],
                                "max_images": tier_def["max_images"],
                                "consumed_messages": use.get("message_count", 0),
                                "consumed_documents": use.get("doc_count", 0),
                                "consumed_images": use.get("image_count", 0),
                                "custom_doc_limit": u.get("custom_doc_limit"),
                                "custom_msg_limit": u.get("custom_msg_limit"),
                                "custom_tools": u.get("custom_tools"),
                                "status": "active",
                            })
                        return all_users
                except Exception as e:
                    print(f"[Supabase DB] Error getting all users: {e}")

        # 2. In-memory fallback
        for uid, mem_u in _IN_MEMORY_USERS.items():
            u_email = (mem_u.get("email") or uid).lower().strip()
            is_ace = u_email in ACE_EMAILS
            tier = "ace" if is_ace else (mem_u.get("tier") or "jack")
            tier_def = cls.get_tier_defaults(tier)
            use = _IN_MEMORY_USAGE.get(uid, {})

            all_users.append({
                "id": uid,
                "email": u_email,
                "name": mem_u.get("name") or u_email.split("@")[0],
                "avatar_url": None,
                "tier": tier,
                "tier_name": tier_def["name"],
                "created_at": mem_u.get("created_at") or datetime.now().isoformat(),
                "max_messages": mem_u.get("custom_msg_limit") if mem_u.get("custom_msg_limit") is not None else tier_def["max_messages"],
                "max_documents": mem_u.get("custom_doc_limit") if mem_u.get("custom_doc_limit") is not None else tier_def["max_documents"],
                "max_images": tier_def["max_images"],
                "consumed_messages": use.get("messages", 0),
                "consumed_documents": use.get("documents", 0),
                "consumed_images": use.get("images", 0),
                "custom_doc_limit": mem_u.get("custom_doc_limit"),
                "custom_msg_limit": mem_u.get("custom_msg_limit"),
                "custom_tools": mem_u.get("custom_tools"),
                "status": "active",
            })

        return all_users
