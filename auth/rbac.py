from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, status
from auth.supabase_auth import get_optional_user
from db.tier_repository import TierRepository, ACE_EMAILS


async def get_user_profile(
    user: Dict[str, Any] = Depends(get_optional_user)
) -> Dict[str, Any]:
    """FastAPI dependency resolving the authenticated user's tier, quotas, and current usage."""
    user_id = user.get("user_id") if user.get("authenticated") else None
    email = user.get("email")
    return TierRepository.get_user_profile(user_id=user_id, email=email)


async def require_ace_user(
    profile: Dict[str, Any] = Depends(get_user_profile)
) -> Dict[str, Any]:
    """Dependency that enforces Ace (Super Admin / Application Owner) privileges."""
    if profile.get("tier") != "ace":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Ace administrator privileges required to perform this action."
        )
    return profile


def check_chat_quota_allowed(profile: Dict[str, Any], has_image: bool = False):
    """Enforces chat input and vision image limits strictly at the backend level."""
    tier = profile.get("tier", "pleasant")
    max_msgs = profile.get("max_messages", 5)
    consumed_msgs = profile.get("consumed_messages", 0)

    # Check message limit (-1 = unlimited)
    if max_msgs != -1 and consumed_msgs >= max_msgs:
        tier_title = profile.get("tier_name", tier.capitalize())
        if tier == "pleasant":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You have used all 5 demo chat messages for the Pleasant guest tier. Please register for a Jack or King account to continue chatting."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Message limit reached ({consumed_msgs}/{max_msgs}) for {tier_title}. Please request a tier upgrade to continue."
            )

    # Check image vision limit (-1 = unlimited)
    if has_image:
        max_imgs = profile.get("max_images", 1)
        consumed_imgs = profile.get("consumed_images", 0)
        if max_imgs != -1 and consumed_imgs >= max_imgs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Vision image processing quota reached ({consumed_imgs}/{max_imgs}) for tier '{tier}'. Upgrade to Jack or King for more image analyses."
            )


def check_document_quota_allowed(profile: Dict[str, Any]):
    """Enforces document upload and parsing limits strictly at the backend level."""
    tier = profile.get("tier", "pleasant")
    max_docs = profile.get("max_documents", 1)
    consumed_docs = profile.get("consumed_documents", 0)

    if max_docs != -1 and consumed_docs >= max_docs:
        tier_title = profile.get("tier_name", tier.capitalize())
        if tier == "pleasant":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Document limit reached (1/1) for Pleasant demo guest tier. Please register for a Jack account (3 documents) or King account (15 documents) to process more files."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Document upload limit reached ({consumed_docs}/{max_docs}) for {tier_title}. Please request an upgrade from the application owner (Ace) to expand your quota."
            )


def filter_tools_for_user_tier(profile: Dict[str, Any], requested_tools: Optional[List[str]]) -> List[str]:
    """Filters requested tools down strictly to the user's tier permissions."""
    allowed = set(profile.get("allowed_tools", []))
    if requested_tools is None:
        return list(allowed)
    return [t for t in requested_tools if t in allowed]

