import time
import jwt
import pytest
from fastapi import HTTPException
from financial_assistant.routers.deps import get_current_user

SECRET = "test-jwt-secret-minimum-32-chars-long!!"
USER_ID = "00000000-0000-0000-0000-000000000001"

def make_token(sub: str = USER_ID, secret: str = SECRET, exp_offset: int = 3600) -> str:
    return jwt.encode(
        {"sub": sub, "exp": int(time.time()) + exp_offset, "aud": "authenticated"},
        secret,
        algorithm="HS256",
    )

def test_valid_token_returns_user_id():
    token = make_token()
    result = get_current_user(authorization=f"Bearer {token}")
    assert result == USER_ID

def test_missing_token_raises_401():
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization="")
    assert exc.value.status_code == 401

def test_invalid_token_raises_401():
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization="Bearer not-a-real-token")
    assert exc.value.status_code == 401

def test_expired_token_raises_401():
    token = make_token(exp_offset=-1)
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization=f"Bearer {token}")
    assert exc.value.status_code == 401

def test_wrong_secret_raises_401():
    token = make_token(secret="wrong-secret-but-still-32-chars-long!")
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization=f"Bearer {token}")
    assert exc.value.status_code == 401
