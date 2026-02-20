"""RSS feed parser."""

import feedparser


def parse_feed(url: str, max_items: int = 50) -> dict:
    """Parse an RSS feed URL. Returns {feed_title, items: [{title, link, summary, published}]}."""
    feed = feedparser.parse(url)

    if feed.bozo and not feed.entries:
        raise ValueError(f"Invalid or unreachable feed: {url}")

    items = []
    for entry in feed.entries[:max_items]:
        items.append({
            "title": entry.get("title", ""),
            "link": entry.get("link", ""),
            "summary": entry.get("summary", "")[:500],
            "published": entry.get("published", ""),
        })

    return {
        "feed_title": feed.feed.get("title", "Unknown Feed"),
        "items": items,
    }
