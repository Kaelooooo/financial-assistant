from fastapi.testclient import TestClient
from unittest.mock import patch
from financial_assistant.main import app
from financial_assistant.routers.deps import get_current_user

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"

app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
client = TestClient(app)


def test_categorize_returns_results_with_row_ids():
    payload = {
        "transactions": [
            {"row_id": 0, "date": "2026-03-01", "amount": 42.50, "description": "WHOLEFDS #123", "type": "expense"},
            {"row_id": 1, "date": "2026-03-02", "amount": 3.50, "description": "COFFEE SHOP", "type": "expense"},
        ]
    }
    with patch("financial_assistant.routers.categorize._categorize_with_llm") as mock_llm:
        mock_llm.return_value = [
            {"row_id": 0, "suggested_category": "Groceries", "confidence": 0.95},
            {"row_id": 1, "suggested_category": "Food & Dining", "confidence": 0.88},
        ]
        response = client.post("/categorize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 2
    assert data["results"][0]["row_id"] == 0
    assert data["results"][1]["row_id"] == 1


def test_categorize_empty_list_returns_empty():
    response = client.post("/categorize", json={"transactions": []})
    assert response.status_code == 200
    assert response.json()["results"] == []
