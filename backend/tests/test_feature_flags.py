import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_includes_features(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "features" in data
    features = data["features"]
    assert "image" in features
    assert "translation" in features
    assert "social" in features
    assert "rss" in features
    assert "crosslinking" in features
    assert "bulk_input" in features


@pytest.mark.asyncio
async def test_require_feature_disabled(client: AsyncClient):
    """Disabled features should return 404."""
    # rss is disabled by default
    resp = await client.post("/api/rss/parse", json={"url": "https://example.com/feed.xml"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_active_features():
    from services.feature_flags import get_active_features
    features = get_active_features()
    assert isinstance(features, dict)
    assert features["image"] is True
    assert features["social"] is False
