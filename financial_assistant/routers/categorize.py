import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from financial_assistant.config import settings
from financial_assistant.db.client import get_supabase
from financial_assistant.routers.deps import get_current_user

router = APIRouter()


class TransactionRow(BaseModel):
    row_id: int
    date: str
    amount: float
    description: str
    type: str


class CategorizeRequest(BaseModel):
    transactions: list[TransactionRow]


class CategoryResult(BaseModel):
    row_id: int
    suggested_category: str
    confidence: float


class CategorizeResponse(BaseModel):
    results: list[CategoryResult]


def _get_category_names(user_id: str) -> list[str]:
    db = get_supabase()
    rows = db.table("categories").select("name").eq("user_id", user_id).execute().data or []
    return [r["name"] for r in rows]


def _categorize_with_llm(transactions: list[TransactionRow], user_id: str) -> list[dict]:
    if not transactions:
        return []
    llm = ChatOpenAI(
        model=settings.nvidia_model,
        api_key=settings.nvidia_api_key,
        base_url=settings.nvidia_base_url,
    )
    categories = _get_category_names(user_id)
    rows_text = "\n".join(
        f"{t.row_id}: {t.description} | {t.type} | ₱{t.amount}" for t in transactions
    )
    prompt = f"""Categorize each transaction into one of these categories: {', '.join(categories)}.

Transactions (row_id: description | type | amount):
{rows_text}

Respond with a JSON array only, no markdown:
[{{"row_id": 0, "suggested_category": "...", "confidence": 0.0}}, ...]"""

    response = llm.invoke([HumanMessage(content=prompt)])
    raw = json.loads(response.content)
    if not isinstance(raw, list):
        return []
    return raw


@router.post("/categorize", response_model=CategorizeResponse)
def categorize(request: CategorizeRequest, user_id: str = Depends(get_current_user)):
    if not request.transactions:
        return CategorizeResponse(results=[])
    try:
        raw = _categorize_with_llm(request.transactions, user_id)
        results = [CategoryResult(**r) for r in raw if isinstance(r, dict)]
    except Exception:
        results = []
    return CategorizeResponse(results=results)
