# financial_assistant/tools/budget_tools.py
from datetime import date
from dateutil.relativedelta import relativedelta
from langchain_core.tools import tool
from financial_assistant.db.client import get_supabase
from financial_assistant.db.user_context import current_user_id

def get_period_window(anchor_date: date, period: str, query_date: date) -> tuple[date, date]:
    """Return (window_start, window_end) for the period slot containing query_date."""
    if period == "monthly":
        months = (query_date.year - anchor_date.year) * 12 + (query_date.month - anchor_date.month)
        window_start = anchor_date + relativedelta(months=months)
        if window_start > query_date:
            window_start -= relativedelta(months=1)
        window_end = window_start + relativedelta(months=1) - relativedelta(days=1)
    elif period == "weekly":
        days = (query_date - anchor_date).days
        weeks = days // 7
        window_start = anchor_date + relativedelta(weeks=weeks)
        if window_start > query_date:
            window_start -= relativedelta(weeks=1)
        window_end = window_start + relativedelta(weeks=1) - relativedelta(days=1)
    elif period == "yearly":
        years = query_date.year - anchor_date.year
        window_start = anchor_date + relativedelta(years=years)
        if window_start > query_date:
            window_start -= relativedelta(years=1)
        window_end = window_start + relativedelta(years=1) - relativedelta(days=1)
    else:
        raise ValueError(f"Unknown period: {period}")
    return window_start, window_end

@tool
def get_budget_status(query_date: str = "") -> list[dict]:
    """Return all active budgets with their current period's spent amount and remaining balance.
    query_date is YYYY-MM-DD, defaults to today."""
    from datetime import date as date_cls
    today = date_cls.fromisoformat(query_date) if query_date else date_cls.today()
    db = get_supabase()
    uid = current_user_id.get()
    budgets = db.table("budgets").select(
        "id, category_id, amount, period, anchor_date, categories(name)"
    ).eq("active", True).eq("user_id", uid).execute().data or []

    results = []
    for b in budgets:
        anchor = date_cls.fromisoformat(b["anchor_date"])
        window_start, window_end = get_period_window(anchor, b["period"], today)
        spent_result = db.table("transactions").select("amount").eq(
            "type", "expense"
        ).eq("user_id", uid).eq("category_id", b["category_id"]).gte(
            "date", window_start.isoformat()
        ).lte("date", window_end.isoformat()).execute()
        spent = sum(float(r["amount"]) for r in (spent_result.data or []))
        results.append({
            "category": (b.get("categories") or {}).get("name", ""),
            "budget_amount": float(b["amount"]),
            "spent": spent,
            "remaining": float(b["amount"]) - spent,
            "period": b["period"],
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
        })
    return results

@tool
def compare_budget_vs_actual(query_date: str = "") -> str:
    """Return a text summary comparing each budget to actual spending for the current period."""
    statuses = get_budget_status.invoke({"query_date": query_date})
    lines = []
    for s in statuses:
        pct = (s["spent"] / s["budget_amount"] * 100) if s["budget_amount"] else 0
        status = "OVER" if s["remaining"] < 0 else "OK"
        lines.append(
            f"{s['category']}: spent ₱{s['spent']:.2f} of ₱{s['budget_amount']:.2f} "
            f"({pct:.0f}%) [{status}]"
        )
    return "\n".join(lines) if lines else "No active budgets found."

@tool
def suggest_budget_changes() -> str:
    """Analyze budget performance over the past 3 months and suggest adjustments."""
    from datetime import date as date_cls
    today = date_cls.today()
    three_months_ago = today + relativedelta(months=-3)
    db = get_supabase()
    uid = current_user_id.get()
    result = db.table("transactions").select(
        "amount, date, categories(name)"
    ).eq("type", "expense").eq("user_id", uid).gte("date", three_months_ago.isoformat()).execute()
    rows_data = result.data or []
    months_with_data = len({row["date"][:7] for row in rows_data}) or 1
    totals: dict[str, list[float]] = {}
    for row in rows_data:
        cat = (row.get("categories") or {}).get("name", "Uncategorized")
        totals.setdefault(cat, []).append(float(row["amount"]))
    suggestions = []
    for cat, amounts in totals.items():
        monthly_avg = sum(amounts) / months_with_data
        suggestions.append(f"{cat}: average ₱{monthly_avg:.2f}/month over last {months_with_data} month(s)")
    return "\n".join(suggestions) if suggestions else "Not enough data to suggest changes."
