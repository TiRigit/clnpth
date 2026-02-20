import pytest
from unittest.mock import patch, AsyncMock

from services.embedding_client import build_article_text, generate_embedding


def test_build_article_text_all_fields():
    result = build_article_text("Titel", "Lead text", "Body text hier")
    assert "Titel" in result
    assert "Lead text" in result
    assert "Body text hier" in result


def test_build_article_text_missing_fields():
    result = build_article_text("Nur Titel", None, None)
    assert result == "Nur Titel"


def test_build_article_text_truncates_body():
    long_body = "x" * 3000
    result = build_article_text("T", "L", long_body)
    # Body should be truncated to 2000 chars
    assert len(result.split("\n\n")[2]) == 2000


@pytest.mark.asyncio
async def test_generate_embedding_no_api_key():
    """Should return None when no API key is configured."""
    with patch("services.embedding_client.settings") as mock_settings:
        mock_settings.mistral_api_key = ""
        result = await generate_embedding("test text")
        assert result is None


@pytest.mark.asyncio
async def test_generate_embedding_success():
    """Should return embedding vector on success."""
    fake_embedding = [0.1] * 1024

    async def mock_post(self, url, **kwargs):
        resp = AsyncMock()
        resp.status_code = 200
        resp.raise_for_status = lambda: None
        resp.json = lambda: {"data": [{"embedding": fake_embedding}]}
        return resp

    with patch("services.embedding_client.settings") as mock_settings:
        mock_settings.mistral_api_key = "test-key"
        with patch("httpx.AsyncClient.post", mock_post):
            result = await generate_embedding("test text")
            assert result is not None
            assert len(result) == 1024
