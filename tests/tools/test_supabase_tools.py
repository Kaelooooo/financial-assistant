from unittest.mock import MagicMock, patch
from financial_assistant.tools.supabase_tools import (
    query_transactions,
    get_account_balances,
    summarize_spending,
)

def test_query_transactions_returns_list():
    mock_data = [{"id": "abc", "date": "2026-03-01", "amount": 50.0, "description": "Groceries", "type": "expense"}]
    with patch("financial_assistant.tools.supabase_tools.get_supabase") as mock_client:
        # New chain: .select().eq(user_id).gte().lte().order().execute().data
        mock_client.return_value.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.order.return_value.execute.return_value.data = mock_data
        result = query_transactions.invoke({"start_date": "2026-03-01", "end_date": "2026-03-31"})
    assert isinstance(result, list)
    assert result[0]["description"] == "Groceries"

def test_summarize_spending_groups_by_category():
    mock_data = [
        {"amount": 50.0, "categories": {"name": "Groceries"}},
        {"amount": 30.0, "categories": {"name": "Groceries"}},
        {"amount": 100.0, "categories": {"name": "Transport"}},
    ]
    with patch("financial_assistant.tools.supabase_tools.get_supabase") as mock_client:
        # New chain: .select().eq(user_id).eq(type).gte().lte().execute().data
        mock_client.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value.data = mock_data
        result = summarize_spending.invoke({"start_date": "2026-03-01", "end_date": "2026-03-31"})
    assert result["Groceries"] == 80.0
    assert result["Transport"] == 100.0
