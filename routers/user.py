from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from auth.rbac import get_user_profile
from db.tier_repository import TierRepository

router = APIRouter(prefix="/api/user", tags=["User Profile & Quotas"])


class UpgradeRequestPayload(BaseModel):
    requested_tier: str = Field(..., description="Target tier to request ('king' or 'ace')")
    reason: Optional[str] = Field(default="", description="Reason or business justification for upgrade")


@router.get("/profile", summary="Get Current User Profile, Tier & Quotas")
async def get_current_user_profile_endpoint(
    profile: Dict[str, Any] = Depends(get_user_profile)
):
    """
    Returns the resolved user profile with active tier, limits, and resource consumption counters.
    Available for both authenticated users and Pleasant guest demo sessions.
    """
    return {
        "success": True,
        "profile": profile,
    }


@router.post("/upgrade-request", summary="Submit Tier Upgrade Request")
async def submit_upgrade_request_endpoint(
    payload: UpgradeRequestPayload,
    profile: Dict[str, Any] = Depends(get_user_profile),
):
    """
    Allows Jack and King users to submit an upgrade request to the Ace Super Admin.
    """
    user_id = profile.get("user_id")
    email = profile.get("email")

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You must be registered and logged in to request an account upgrade."
        )

    current_tier = profile.get("tier", "jack")
    target_tier = payload.requested_tier.lower().strip()

    if target_tier not in ("king", "ace"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid requested tier. Can only request 'king' or 'ace'."
        )

    if current_tier == target_tier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already in tier '{current_tier}'."
        )

    req = TierRepository.create_upgrade_request(
        user_id=user_id,
        user_email=email,
        current_tier=current_tier,
        requested_tier=target_tier,
        reason=payload.reason,
    )

    return {
        "success": True,
        "message": f"Upgrade request to {target_tier.upper()} submitted successfully. The application owner (Ace) will review your request.",
        "request": req,
    }


class UserToolsPayload(BaseModel):
    tools: List[Dict[str, Any]] = Field(..., description="List of user tool configuration items")


@router.get("/tools", summary="Get User Saved Tool Configurations")
async def get_user_tools_endpoint(
    profile: Dict[str, Any] = Depends(get_user_profile),
):
    """
    Retrieves the user's saved enabled/disabled tool configuration.
    """
    user_id = profile.get("user_id")
    tools = TierRepository.get_user_tools(user_id)
    return {
        "success": True,
        "tools": tools,
        "allowed_tools": profile.get("allowed_tools", []),
    }


@router.put("/tools", summary="Update User Tool Configurations")
async def update_user_tools_endpoint(
    payload: UserToolsPayload,
    profile: Dict[str, Any] = Depends(get_user_profile),
):
    """
    Saves the user's enabled/disabled tool configuration in their profile.
    """
    user_id = profile.get("user_id")
    allowed_tools = set(profile.get("allowed_tools", []))
    sanitized_tools = []
    for t in payload.tools:
        tid = t.get("id")
        is_enabled = bool(t.get("enabled", False))
        if tid not in allowed_tools:
            is_enabled = False
        sanitized_tools.append({**t, "enabled": is_enabled})

    TierRepository.update_user_tools(user_id, sanitized_tools)
    return {
        "success": True,
        "message": "Tool configuration saved successfully.",
        "tools": sanitized_tools,
    }


