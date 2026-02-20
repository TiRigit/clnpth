import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_related_articles_feature_disabled(client: AsyncClient):
    """Should return 404 when crosslinking feature is disabled."""
    resp = await client.get("/api/articles/1/related")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_related_articles_nonexistent(client: AsyncClient):
    """Should return 404 or 400 for nonexistent article."""
    # Enable the feature temporarily for this test
    from config import settings
    original = settings.feature_crosslinking
    settings.feature_crosslinking = True
    try:
        resp = await client.get("/api/articles/999999/related")
        # Either 400 (no embedding) or 404 (not found)
        assert resp.status_code in (400, 404)
    finally:
        settings.feature_crosslinking = original
