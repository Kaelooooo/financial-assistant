from datetime import date
from financial_assistant.tools.budget_tools import get_period_window

def test_monthly_window_start_of_month():
    anchor = date(2026, 1, 1)
    window_start, window_end = get_period_window(anchor, "monthly", date(2026, 3, 15))
    assert window_start == date(2026, 3, 1)
    assert window_end == date(2026, 3, 31)

def test_monthly_window_end_of_month():
    anchor = date(2026, 1, 1)
    window_start, window_end = get_period_window(anchor, "monthly", date(2026, 2, 28))
    assert window_start == date(2026, 2, 1)
    assert window_end == date(2026, 2, 28)

def test_weekly_window():
    anchor = date(2026, 1, 5)  # Monday
    window_start, window_end = get_period_window(anchor, "weekly", date(2026, 1, 8))
    assert window_start == date(2026, 1, 5)
    assert window_end == date(2026, 1, 11)
