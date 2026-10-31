from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from auth.rbac import require_ace_user
from db.tier_repository import TierRepository

router = APIRouter(prefix="/api/admin", tags=["Ace Super Admin Dashboard"])


class UpdateTierPayload(BaseModel):
    tier: str = Field(..., description="Target tier: 'pleasant', 'jack', 'king', or 'ace'")


class UpdateLimitsPayload(BaseModel):
    custom_doc_limit: Optional[int] = Field(default=None, description="Custom document limit override (null to reset)")
    custom_msg_limit: Optional[int] = Field(default=None, description="Custom message limit override (null to reset)")
    custom_tools: Optional[List[str]] = Field(default=None, description="List of allowed tools override (null to reset)")


class ReviewUpgradePayload(BaseModel):
    status: str = Field(..., description="'approved' or 'rejected'")


@router.get("/metrics", summary="Get System Aggregated Metrics for Ace Dashboard")
async def get_admin_metrics(
    admin_profile: Dict[str, Any] = Depends(require_ace_user)
):
    """Returns overview count metrics for registered users, tiers, and pending requests."""
    users = TierRepository.get_all_users()
    upgrade_requests = TierRepository.get_upgrade_requests()

    total_users = len(users)
    king_count = sum(1 for u in users if u.get("tier") == "king")
    jack_count = sum(1 for u in users if u.get("tier") == "jack")
    ace_count = sum(1 for u in users if u.get("tier") == "ace")
    pending_upgrades = sum(1 for r in upgrade_requests if r.get("status") == "pending")

    total_docs = sum(u.get("consumed_documents", 0) for u in users)
    total_msgs = sum(u.get("consumed_messages", 0) for u in users)

    return {
        "success": True,
        "metrics": {
            "total_users": total_users,
            "king_users": king_count,
            "jack_users": jack_count,
            "ace_users": ace_count,
            "pending_upgrades": pending_upgrades,
            "total_documents_consumed": total_docs,
            "total_messages_consumed": total_msgs,
        }
    }


@router.get("/users", summary="Get All Users with Tier Quotas and Usage")
async def list_admin_users(
    admin_profile: Dict[str, Any] = Depends(require_ace_user)
):
    """Retrieves all registered users with their assigned tier, consumed quotas, and override limits."""
    users = TierRepository.get_all_users()
    return {
        "success": True,
        "users": users,
        "count": len(users),
    }


@router.put("/users/{user_id}/tier", summary="Promote or Downgrade User Tier")
async def update_user_tier_endpoint(
    user_id: str,
    payload: UpdateTierPayload,
    admin_profile: Dict[str, Any] = Depends(require_ace_user),
):
    """Allows Ace admin to upgrade or downgrade any account's tier."""
    clean_tier = payload.tier.lower().strip()
    if clean_tier not in ("pleasant", "jack", "king", "ace"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tier. Must be one of: 'pleasant', 'jack', 'king', 'ace'."
        )

    success = TierRepository.update_user_tier(user_id=user_id, new_tier=clean_tier)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user tier in database."
        )

    return {
        "success": True,
        "message": f"User tier updated to '{clean_tier.upper()}' successfully.",
        "user_id": user_id,
        "new_tier": clean_tier,
    }


@router.put("/users/{user_id}/limits", summary="Set Custom Quota Allocations")
async def update_user_custom_limits_endpoint(
    user_id: str,
    payload: UpdateLimitsPayload,
    admin_profile: Dict[str, Any] = Depends(require_ace_user),
):
    """
    Configures individual user quota overrides (documents, messages, tools)
    independently of tier defaults, without changing their assigned tier.
    """
    success = TierRepository.update_user_custom_limits(
        user_id=user_id,
        custom_doc_limit=payload.custom_doc_limit,
        custom_msg_limit=payload.custom_msg_limit,
        custom_tools=payload.custom_tools,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update custom limits in database."
        )

    return {
        "success": True,
        "message": "Custom limits updated successfully.",
        "user_id": user_id,
        "custom_doc_limit": payload.custom_doc_limit,
        "custom_msg_limit": payload.custom_msg_limit,
        "custom_tools": payload.custom_tools,
    }


@router.get("/upgrade-requests", summary="Get Pending and Historical Tier Upgrade Requests")
async def list_upgrade_requests_endpoint(
    admin_profile: Dict[str, Any] = Depends(require_ace_user)
):
    """Lists all upgrade requests submitted by users for Ace review."""
    requests = TierRepository.get_upgrade_requests()
    return {
        "success": True,
        "requests": requests,
        "count": len(requests),
    }


@router.post("/upgrade-requests/{request_id}/review", summary="Approve or Reject Tier Upgrade Request")
async def review_upgrade_request_endpoint(
    request_id: str,
    payload: ReviewUpgradePayload,
    admin_profile: Dict[str, Any] = Depends(require_ace_user),
):
    """Approves (promotes user tier immediately) or rejects an upgrade request."""
    reviewer_id = admin_profile.get("user_id")
    status_choice = payload.status.lower().strip()
    if status_choice not in ("approved", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either 'approved' or 'rejected'."
        )

    success = TierRepository.review_upgrade_request(
        request_id=request_id,
        status=status_choice,
        reviewer_id=reviewer_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to review upgrade request."
        )

    return {
        "success": True,
        "message": f"Upgrade request marked as {status_choice.upper()}.",
        "request_id": request_id,
        "status": status_choice,
    }

