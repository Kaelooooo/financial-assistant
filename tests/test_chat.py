from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from financial_assistant.main import app
from financial_assistant.routers.deps import get_current_user

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"

app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
client = TestClient(app)


def test_chat_missing_message_returns_422():
    response = client.post("/chat", json={"conversation_id": None})
    assert response.status_code == 422


def test_chat_returns_event_stream_content_type():
    async def mock_stream(*args, **kwargs):
        yield "Hello"
        yield " world"

    with patch("financial_assistant.routers.chat.stream_response", new=mock_stream):
        with client.stream("POST", "/chat", json={"conversation_id": None, "message": "hi"}) as r:
            assert "text/event-stream" in r.headers.get("content-type", "")
