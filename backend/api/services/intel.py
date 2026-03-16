"""
api/services/intel.py

Social intelligence ingestion.

Sources ingested:
  - Nation Africa RSS    https://nation.africa/kenya/rss.xml
  - Standard Media RSS   https://www.standardmedia.co.ke/rss/headlines.php
  - KBC RSS              https://www.kbc.co.ke/feed/
  - The Star RSS         https://www.the-star.co.ke/rss/
  - KMD Press Releases   https://meteo.go.ke/feed (public)

NLP: keyword scoring (no external API needed).
     Pluggable — swap for OpenAI classification when budget allows.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any

import feedparser
import requests

logger = logging.getLogger(__name__)

# ── Keyword sets ──────────────────────────────────────────────────────────────

URGENT_KEYWORDS = {
    "flood", "flooding", "inundation", "overflow", "burst", "evacuate",
    "evacuation", "rescue", "displaced", "washed away", "deaths", "fatalities",
    "emergency", "disaster", "landslide", "collapse",
}
NEGATIVE_KEYWORDS = {
    "rain", "heavy rain", "storm", "alert", "warning", "risk",
    "damage", "destroyed", "submerged", "blocked", "disrupted",
    "drought", "shortage", "dry spell", "famine",
}
KENYA_COUNTIES = {
    "kisumu", "siaya", "homa bay", "nairobi", "kiambu", "machakos",
    "kajiado", "mombasa", "nakuru", "nyeri", "eldoret", "uasin gishu",
    "bungoma", "kakamega", "vihiga", "migori", "kericho", "bomet",
    "garissa", "wajir", "mandera", "turkana", "west pokot", "samburu",
    "marsabit", "isiolo", "meru", "nyando", "muhoroni",
}

RSS_FEEDS = [
    {"name": "Nation Africa",   "url": "https://nation.africa/kenya/rss.xml"},
    {"name": "Standard Media",  "url": "https://www.standardmedia.co.ke/rss/headlines.php"},
    {"name": "KBC",             "url": "https://www.kbc.co.ke/feed/"},
    {"name": "The Star",        "url": "https://www.the-star.co.ke/rss/"},
]


# ── NLP helpers ───────────────────────────────────────────────────────────────

def _classify_sentiment(text: str) -> str:
    lower = text.lower()
    if any(kw in lower for kw in URGENT_KEYWORDS):
        return "urgent"
    if any(kw in lower for kw in NEGATIVE_KEYWORDS):
        return "negative"
    return "neutral"


def _extract_tags(text: str) -> list[str]:
    lower = text.lower()
    tags: list[str] = []
    for kw in URGENT_KEYWORDS | NEGATIVE_KEYWORDS:
        if kw in lower:
            tags.append(kw)
    return list(set(tags))[:10]  # cap at 10


def _extract_county_name(text: str) -> str | None:
    lower = text.lower()
    for county in KENYA_COUNTIES:
        if county in lower:
            return county.title()
    return None


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _parse_date(entry: Any) -> datetime | None:
    try:
        if hasattr(entry, "published"):
            return parsedate_to_datetime(entry.published).replace(tzinfo=timezone.utc)
    except Exception:
        pass
    return None


# ── Main ingestion function ───────────────────────────────────────────────────

def ingest_rss_feeds() -> int:
    """
    Fetch all configured RSS feeds and persist new items to SocialIntelItem.
    Returns the count of new items saved.
    """
    from api.models import SocialIntelItem, County

    county_cache: dict[str, County | None] = {}
    saved = 0

    for feed_conf in RSS_FEEDS:
        try:
            feed = feedparser.parse(
                feed_conf["url"],
                request_headers={"User-Agent": "CrisisLens/1.0 (GoK Early Warning System)"},
            )
        except Exception as exc:
            logger.warning("Failed to parse %s: %s", feed_conf["name"], exc)
            continue

        for entry in feed.entries:
            title   = getattr(entry, "title", "").strip()
            summary = getattr(entry, "summary", getattr(entry, "description", "")).strip()
            url     = getattr(entry, "link", "").strip()

            combined = f"{title} {summary}"
            sentiment = _classify_sentiment(combined)

            # Skip entirely neutral items with no disaster relevance
            if sentiment == "neutral" and not any(
                kw in combined.lower() for kw in {"kenya", "flood", "rain", "drought"}
            ):
                continue

            content_hash = _sha256(combined[:500])
            if SocialIntelItem.objects.filter(content_hash=content_hash).exists():
                continue

            tags = _extract_tags(combined)
            county_name = _extract_county_name(combined)

            # Resolve county FK (cached)
            county_obj: County | None = None
            if county_name:
                if county_name not in county_cache:
                    try:
                        county_cache[county_name] = County.objects.get(name__iexact=county_name)
                    except County.DoesNotExist:
                        county_cache[county_name] = None
                county_obj = county_cache[county_name]

            SocialIntelItem.objects.create(
                source="news_rss",
                url=url,
                title=title[:300],
                snippet=summary[:2000],
                sentiment=sentiment,
                county=county_obj,
                tags=tags,
                content_hash=content_hash,
                source_published_at=_parse_date(entry),
            )
            saved += 1

    logger.info("Social intel ingest: %d new items saved", saved)
    return saved
