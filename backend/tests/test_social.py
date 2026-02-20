import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_social_feature_disabled(client: AsyncClient):
    """Should return 404 when social feature is disabled."""
    resp = await client.post("/api/articles/1/social/generate")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_social_get_feature_disabled(client: AsyncClient):
    """Should return 404 when social feature is disabled."""
    resp = await client.get("/api/articles/1/social/")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_social_generate_nonexistent_article(client: AsyncClient):
    """Should return 404 for nonexistent article."""
    from config import settings
    original = settings.feature_social
    settings.feature_social = True
    try:
        resp = await client.post("/api/articles/999999/social/generate")
        assert resp.status_code == 404
    finally:
        settings.feature_social = original
