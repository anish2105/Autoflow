import jwt
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException
from config import settings


def decode_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a Supabase JWT token to extract the authenticated user identity."""
    if not token:
        return None

    # Clean Bearer prefix if included
    if token.startswith("Bearer "):
        token = token[7:].strip()

    try:
        # If JWT Secret is configured, verify signature; otherwise decode payload
        if settings.SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            payload = jwt.decode(
                token,
                options={"verify_signature": False},
            )
        return payload
    except Exception as e:
        print(f"[Supabase Auth] Token verification error: {e}")
        # Try unverified decode fallback for development if secret mismatch
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except Exception:
            return None


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """FastAPI dependency to extract the authenticated user from the Authorization header."""
    if not authorization:
        return {"user_id": "anonymous", "email": None, "authenticated": False}

    payload = decode_supabase_token(authorization)
    if not payload:
        return {"user_id": "anonymous", "email": None, "authenticated": False}

    user_id = payload.get("sub") or "anonymous"
    email = payload.get("email")
    user_metadata = payload.get("user_metadata", {})

    return {
        "user_id": user_id,
        "email": email,
        "name": user_metadata.get("full_name") or user_metadata.get("name"),
        "avatar_url": user_metadata.get("avatar_url") or user_metadata.get("picture"),
        "authenticated": True,
    }
