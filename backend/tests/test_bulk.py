import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_bulk_feature_disabled(client: AsyncClient):
    """Should return 404 when bulk_input feature is disabled."""
    resp = await client.post("/api/articles/bulk", json={
        "topics": ["Thema 1", "Thema 2"]
    })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_bulk_limit_exceeded(client: AsyncClient):
    """Should reject more than 50 topics."""
    from config import settings
    original = settings.feature_bulk_input
    settings.feature_bulk_input = True
    try:
        topics = [f"Thema {i}" for i in range(51)]
        resp = await client.post("/api/articles/bulk", json={
            "topics": topics
        })
        assert resp.status_code == 400
        assert "50" in resp.json()["detail"]
    finally:
        settings.feature_bulk_input = original


@pytest.mark.asyncio
async def test_bulk_empty_topics(client: AsyncClient):
    """Should reject empty topics list."""
    from config import settings
    original = settings.feature_bulk_input
    settings.feature_bulk_input = True
    try:
        resp = await client.post("/api/articles/bulk", json={
            "topics": []
        })
        assert resp.status_code == 400
    finally:
        settings.feature_bulk_input = original
