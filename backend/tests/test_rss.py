import pytest
from unittest.mock import patch

from services.rss_client import parse_feed


def test_parse_feed_invalid_url():
    """Should raise ValueError for invalid feed."""
    with pytest.raises(ValueError):
        parse_feed("not-a-url-at-all")


def test_parse_feed_mock():
    """Should parse a mock feed correctly."""
    mock_feed = type("Feed", (), {
        "bozo": False,
        "entries": [
            {"title": "Article 1", "link": "https://example.com/1", "summary": "Summary 1", "published": "2024-01-01"},
            {"title": "Article 2", "link": "https://example.com/2", "summary": "Summary 2", "published": "2024-01-02"},
        ],
        "feed": {"title": "Test Feed"},
    })()

    with patch("services.rss_client.feedparser.parse", return_value=mock_feed):
        result = parse_feed("https://example.com/feed.xml")
        assert result["feed_title"] == "Test Feed"
        assert len(result["items"]) == 2
        assert result["items"][0]["title"] == "Article 1"


def test_parse_feed_limit():
    """Should respect max_items limit."""
    entries = [{"title": f"Item {i}", "link": f"https://example.com/{i}"} for i in range(100)]
    mock_feed = type("Feed", (), {
        "bozo": False,
        "entries": entries,
        "feed": {"title": "Big Feed"},
    })()

    with patch("services.rss_client.feedparser.parse", return_value=mock_feed):
        result = parse_feed("https://example.com/feed.xml", max_items=10)
        assert len(result["items"]) == 10
