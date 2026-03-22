from langchain_core.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
from financial_assistant.db.client import get_supabase
from financial_assistant.db.user_context import current_user_id

_search = DuckDuckGoSearchRun()

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
