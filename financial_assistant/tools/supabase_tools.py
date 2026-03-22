from langchain_core.tools import tool
from financial_assistant.db.client import get_supabase
from financial_assistant.db.user_context import current_user_id


@tool
def query_transactions(start_date: str, end_date: str, category: str = "", account_id: str = "") -> list[dict]:
    """Query transactions between two dates (YYYY-MM-DD). Optionally filter by category name or account_id."""
    db = get_supabase()
    uid = current_user_id.get()
    q = db.table("transactions").select(
        "id, date, amount, description, type, notes, categories(name), accounts!account_id(name)"
    ).eq("user_id", uid).gte("date", start_date).lte("date", end_date).order("date", desc=True)
    if account_id:
        q = q.eq("account_id", account_id)
    result = q.execute()
    rows = result.data or []
    if category:
        rows = [r for r in rows if (r.get("categories") or {}).get("name", "").lower() == category.lower()]
    return rows


@tool
def get_account_balances() -> list[dict]:
    """Return current balance for all accounts, computed from transaction history."""
    db = get_supabase()
    uid = current_user_id.get()
    result = db.table("account_balances").select("*").eq("user_id", uid).execute()
    return result.data or []


@tool
def summarize_spending(start_date: str, end_date: str) -> dict[str, float]:
    """Return total spending grouped by category name for a date range (YYYY-MM-DD)."""
    db = get_supabase()
    uid = current_user_id.get()
    result = db.table("transactions").select(
        "amount, categories(name)"
    ).eq("user_id", uid).eq("type", "expense").gte("date", start_date).lte("date", end_date).execute()
    totals: dict[str, float] = {}
    for row in (result.data or []):
        cat_name = (row.get("categories") or {}).get("name", "Uncategorized")
        totals[cat_name] = totals.get(cat_name, 0.0) + float(row["amount"])
    return totals
