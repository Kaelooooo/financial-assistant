from datetime import date
from dateutil.relativedelta import relativedelta
from langchain_core.tools import tool
from financial_assistant.db.client import get_supabase
from financial_assistant.db.user_context import current_user_id

@tool
def month_over_month(months_back: int = 3) -> list[dict]:
    """Compare monthly spending totals for the last N months. Returns list of {month, total_spent}."""
    db = get_supabase()
    uid = current_user_id.get()
    today = date.today()
    results = []
    for i in range(months_back, 0, -1):
        start = (today + relativedelta(months=-i)).replace(day=1)
        end = start + relativedelta(months=1) - relativedelta(days=1)
        rows = db.table("transactions").select("amount").eq(
            "type", "expense"
        ).eq("user_id", uid).gte("date", start.isoformat()).lte("date", end.isoformat()).execute()
        total = sum(float(r["amount"]) for r in (rows.data or []))
        results.append({"month": start.strftime("%Y-%m"), "total_spent": total})
    return results

@tool
def detect_spending_trends() -> str:
    """Detect whether spending is increasing, decreasing, or stable over the last 3 months."""
    monthly = month_over_month.invoke({"months_back": 3})
    if len(monthly) < 2:
        return "Not enough data to detect trends."
    totals = [m["total_spent"] for m in monthly]
    trend = totals[-1] - totals[0]
    pct = (trend / totals[0] * 100) if totals[0] else 0
    direction = "increased" if trend > 0 else "decreased" if trend < 0 else "stayed stable"
    monthly_str = ", ".join(f"{m['month']}: ₱{m['total_spent']:.2f}" for m in monthly)
    return (
        f"Spending has {direction} by ₱{abs(trend):.2f} ({abs(pct):.1f}%) "
        f"from {monthly[0]['month']} to {monthly[-1]['month']}. "
        f"Monthly totals: {monthly_str}"
    )

@tool
def find_anomalies() -> list[dict]:
    """Find transactions that are unusually large (>2x the average for their category this month)."""
    db = get_supabase()
    uid = current_user_id.get()
    today = date.today()
    start = today.replace(day=1)
    rows = db.table("transactions").select(
        "id, date, amount, description, categories(name)"
    ).eq("type", "expense").eq("user_id", uid).gte("date", start.isoformat()).execute().data or []

    by_category: dict[str, list[float]] = {}
    for r in rows:
        cat = (r.get("categories") or {}).get("name", "Uncategorized")
        by_category.setdefault(cat, []).append(float(r["amount"]))

    anomalies = []
    for r in rows:
        cat = (r.get("categories") or {}).get("name", "Uncategorized")
        amounts = by_category.get(cat, [])
        if len(amounts) < 2:
            continue
        current = float(r["amount"])
        others_sum = sum(amounts) - current
        avg = others_sum / (len(amounts) - 1)
        if current > avg * 2:
            anomalies.append({
                "date": r["date"],
                "description": r["description"],
                "amount": float(r["amount"]),
                "category": cat,
                "category_avg": avg,
            })
    return anomalies
