import json
import logging
import uuid
from datetime import date
from typing import AsyncGenerator
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from financial_assistant.agents.orchestrator import route_and_stream
from financial_assistant.db.client import get_supabase
from financial_assistant.db.user_context import current_user_id
from financial_assistant.routers.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    conversation_id: str | None
    message: str


def _inject_date(message: str) -> str:
    today = date.today().strftime("%A, %B %d, %Y")
    return f"[Today is {today}]\n\n{message}"


def _load_history(conversation_id: str, user_id: str) -> list[dict]:
    """Load previous messages from Supabase as simple dicts for LangChain."""
    db = get_supabase()
    conv = db.table("ai_conversations").select("id").eq("id", conversation_id).eq("user_id", user_id).execute()
    if not conv.data:
        return []
    result = db.table("ai_messages").select("role, content").eq(
        "conversation_id", conversation_id
    ).order("created_at").execute()
    return [{"role": row["role"], "content": row["content"]} for row in (result.data or [])]


async def stream_response(message: str, history: list[dict]) -> AsyncGenerator[str, None]:
    dated_message = _inject_date(message)
    async for chunk in route_and_stream(dated_message, history):
        # The agent yields full responses at once. Break into small pieces
        # so the frontend gets a smooth typing animation. Each piece is
        # JSON-encoded to safely handle newlines within SSE frames.
        chunk_size = 16
        for i in range(0, len(chunk), chunk_size):
            piece = chunk[i:i + chunk_size]
            yield f"data: {json.dumps(piece)}\n\n"
    yield "data: [DONE]\n\n"


async def _save_messages(
    conversation_id: str,
    user_message: str,
    assistant_message: str,
    is_new: bool,
    title: str,
    user_id: str,
):
    db = get_supabase()
    if is_new:
        db.table("ai_conversations").insert({
            "id": conversation_id,
            "title": title[:60],
            "user_id": user_id,
        }).execute()
    db.table("ai_messages").insert([
        {"conversation_id": conversation_id, "role": "user", "content": user_message},
        {"conversation_id": conversation_id, "role": "assistant", "content": assistant_message},
    ]).execute()


@router.post("/chat")
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    is_new = request.conversation_id is None
    conversation_id = request.conversation_id or str(uuid.uuid4())
    collected: list[str] = []

    # Load conversation history before entering the async generator
    history = _load_history(conversation_id, user_id) if not is_new else []

    async def generate():
        token = current_user_id.set(user_id)
        try:
            async for chunk in stream_response(request.message, history):
                if chunk != "data: [DONE]\n\n":
                    raw = chunk.removeprefix("data: ").strip()
                    try:
                        collected.append(json.loads(raw))
                    except (json.JSONDecodeError, ValueError):
                        collected.append(raw)
                yield chunk
            assistant_text = "".join(collected)
            try:
                await _save_messages(
                    conversation_id, request.message, assistant_text,
                    is_new, request.message, user_id,
                )
            except Exception:
                logger.exception("Failed to save messages for conversation %s", conversation_id)
        finally:
            current_user_id.reset(token)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"X-Conversation-Id": conversation_id},
    )
