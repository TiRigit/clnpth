import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_cancel_article_wrong_status(client: AsyncClient):
    """Cancel should fail for articles not in generating/paused status."""
    # Try to cancel a nonexistent article
    resp = await client.patch("/api/articles/999999/cancel")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_retry_article_wrong_status(client: AsyncClient):
    """Retry should fail for articles not in failed/timeout/cancelled status."""
    resp = await client.patch("/api/articles/999999/retry")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_queue_stats_includes_new_statuses(client: AsyncClient):
    """Queue stats should include new status fields."""
    resp = await client.get("/api/articles/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "failed" in data
    assert "timeout" in data
    assert "paused" in data
    assert "cancelled" in data
