import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException
from financial_assistant.config import settings

# Lazily initialised — only used for RS256 tokens (Supabase JWT Signing Keys)
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json")
    return _jwks_client


def get_current_user(authorization: str = Header(default="")) -> str:
    """Extract and verify the Supabase JWT from the Authorization header.
    Supports both HS256 (Legacy JWT Secret) and RS256 (JWT Signing Keys).
    Returns the user UUID (sub claim) or raises 401."""
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    try:
        alg = jwt.get_unverified_header(token).get("alg", "HS256")
        if alg == "HS256":
            signing_key = settings.supabase_jwt_secret
        else:
            # RS256 or other asymmetric — fetch public key from Supabase JWKS
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token).key
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=[alg],
            options={"verify_aud": False},
        )
        return payload["sub"]
    except jwt.PyJWTError as e:
        print(f"[deps] JWT error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
