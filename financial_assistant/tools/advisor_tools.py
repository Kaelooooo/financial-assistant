from datetime import date
from langchain_core.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
from financial_assistant.db.client import get_supabase
from financial_assistant.db.user_context import current_user_id

_search = DuckDuckGoSearchRun()


def _period_window(anchor_date: str, period: str, query_date: date | None = None):
    """Compute the current budget window start/end for the given anchor and period."""
    from datetime import timedelta
    qd = query_date or date.today()
    anchor = date.fromisoformat(anchor_date)

    if period == "monthly":
        months = (qd.year - anchor.year) * 12 + (qd.month - anchor.month)
        ws = anchor.replace(year=anchor.year + (anchor.month + months - 1) // 12,
                            month=(anchor.month + months - 1) % 12 + 1)
        if ws > qd:
            months -= 1
            ws = anchor.replace(year=anchor.year + (anchor.month + months - 1) // 12,
                                month=(anchor.month + months - 1) % 12 + 1)
        we_month = ws.month % 12 + 1
        we_year = ws.year + (1 if we_month == 1 else 0)
        we = date(we_year, we_month, ws.day) - timedelta(days=1)
    elif period == "weekly":
        days_diff = (qd - anchor).days
        weeks = days_diff // 7
        ws = anchor + timedelta(days=weeks * 7)
        if ws > qd:
            ws -= timedelta(days=7)
        we = ws + timedelta(days=6)
    else:  # yearly
        years = qd.year - anchor.year
        ws = anchor.replace(year=anchor.year + years)
        if ws > qd:
            ws = ws.replace(year=ws.year - 1)
        we = ws.replace(year=ws.year + 1) - timedelta(days=1)

    return ws.isoformat(), we.isoformat()

@tool
def web_search(query: str) -> str:
    """Search the web for general financial advice, tax information, or financial concepts."""
    return _search.run(query)

@tool
def calculate_savings_rate(start_date: str = "", end_date: str = "") -> dict:
    """Calculate the user's savings rate: (income - expenses) / income for a date range.

    Both dates are YYYY-MM-DD. If omitted, defaults to the current month so far.
    Pass start_date='YYYY-01-01' and end_date=today for a year-to-date calculation.
    """
    from datetime import date
    today = date.today()
    start = start_date or today.replace(day=1).isoformat()
    end = end_date or today.isoformat()
    db = get_supabase()
    uid = current_user_id.get()

    income_rows = db.table("transactions").select("amount").eq(
        "type", "income"
    ).eq("user_id", uid).gte("date", start).lte("date", end).execute().data or []
    expense_rows = db.table("transactions").select("amount").eq(
        "type", "expense"
    ).eq("user_id", uid).gte("date", start).lte("date", end).execute().data or []

    total_income = sum(float(r["amount"]) for r in income_rows)
    total_expenses = sum(float(r["amount"]) for r in expense_rows)
    savings = total_income - total_expenses
    rate = (savings / total_income * 100) if total_income else 0

    return {
        "period": f"{start} to {end}",
        "income": total_income,
        "expenses": total_expenses,
        "savings": savings,
        "savings_rate_pct": round(rate, 1),
    }


@tool
def get_budget_status() -> list[dict]:
    """Get all active budgets and how much has been spent in the current period.

    Returns a list of budgets with: category, budget_amount, spent, remaining,
    percent_used, period, window_start, window_end, and over_budget flag.
    Call this when the user asks about budgets, spending limits, or whether
    they're on track with their spending categories.
    """
    db = get_supabase()
    uid = current_user_id.get()

    budgets = db.table("budgets").select(
        "id, category_id, amount, period, anchor_date, categories(name)"
    ).eq("user_id", uid).eq("active", True).execute().data or []

    results = []
    for b in budgets:
        ws, we = _period_window(b["anchor_date"], b["period"])
        spent_rows = db.table("transactions").select("amount").eq(
            "type", "expense"
        ).eq("user_id", uid).eq("category_id", b["category_id"]).gte(
            "date", ws
        ).lte("date", we).execute().data or []

        spent = sum(float(r["amount"]) for r in spent_rows)
        cat = b.get("categories")
        cat_name = cat["name"] if isinstance(cat, dict) else (cat[0]["name"] if isinstance(cat, list) and cat else "Unknown")

        results.append({
            "category": cat_name,
            "budget_amount": b["amount"],
            "spent": round(spent, 2),
            "remaining": round(b["amount"] - spent, 2),
            "percent_used": round(spent / b["amount"] * 100, 1) if b["amount"] else 0,
            "period": b["period"],
            "window": f"{ws} to {we}",
            "over_budget": spent > b["amount"],
        })

    return results
