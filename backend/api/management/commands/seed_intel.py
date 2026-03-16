"""
python manage.py seed_intel

Pulls real RSS headlines from Kenyan news sources, classifies them, saves to
SocialIntelItem, then auto-verifies urgent and negative items so they surface
on the public portal immediately.

If RSS feeds are unreachable (e.g. no internet in dev), falls back to a set of
realistic hardcoded items.

Usage:
    python manage.py seed_intel            # pull live + verify
    python manage.py seed_intel --offline  # hardcoded items only
    python manage.py seed_intel --verify-all  # also verify neutral items
"""
import hashlib
from datetime import datetime, timezone

from django.core.management.base import BaseCommand


# ── Fallback items (used when feeds are unreachable) ─────────────────────────
FALLBACK_ITEMS = [
    {
        "title": "Flooding in Kisumu displaces hundreds along Nyando River banks",
        "snippet": "Hundreds of families have been displaced after the Nyando River burst its banks "
                   "following heavy overnight rains in Kisumu County. Kenya Red Cross teams are on the ground.",
        "source": "news_rss",
        "sentiment": "urgent",
        "county": "Kisumu",
        "url": "https://nation.africa/kenya",
        "tags": ["flood", "displaced", "river"],
    },
    {
        "title": "KMD warns of heavy rainfall across Lake Victoria basin this week",
        "snippet": "The Kenya Meteorological Department has issued a heavy rainfall advisory for counties "
                   "bordering Lake Victoria, including Kisumu, Siaya, Homa Bay, Migori and Kisii.",
        "source": "news_rss",
        "sentiment": "urgent",
        "county": "Kisumu",
        "url": "https://meteo.go.ke",
        "tags": ["rain", "warning", "alert"],
    },
    {
        "title": "Siaya roads blocked as flash floods sweep Ugenya sub-county",
        "snippet": "Several roads in Ugenya sub-county are impassable after flash floods destroyed "
                   "two culverts. County works officials have been alerted.",
        "source": "news_rss",
        "sentiment": "urgent",
        "county": "Siaya",
        "url": "https://www.standardmedia.co.ke",
        "tags": ["flood", "roads", "blocked"],
    },
    {
        "title": "Homa Bay County activates emergency response teams ahead of storms",
        "snippet": "The Homa Bay County Disaster Management Committee has been activated and "
                   "pre-positioned rescue boats along the Lake Victoria shoreline.",
        "source": "news_rss",
        "sentiment": "urgent",
        "county": "Homa Bay",
        "url": "https://www.kbc.co.ke",
        "tags": ["emergency", "rescue", "disaster"],
    },
    {
        "title": "Evacuation order issued for low-lying estates near Nairobi River",
        "snippet": "Nairobi County has ordered residents of Mathare North and Kiamaiko estates "
                   "to evacuate as the Nairobi River levels rise dangerously.",
        "source": "news_rss",
        "sentiment": "urgent",
        "county": "Nairobi",
        "url": "https://nation.africa/kenya",
        "tags": ["evacuation", "flood", "nairobi river"],
    },
    {
        "title": "Kajiado cattle herders lose livestock to flooding in Amboseli basin",
        "snippet": "Pastoralists in Kajiado's Amboseli region have lost an estimated 200 cattle "
                   "to sudden flooding following three days of consecutive rainfall.",
        "source": "news_rss",
        "sentiment": "negative",
        "county": "Kajiado",
        "url": "https://www.the-star.co.ke",
        "tags": ["flood", "livestock", "damage"],
    },
    {
        "title": "Kiambu River monitoring stations record highest water levels since 2019",
        "snippet": "WRA monitoring stations on the Ruiru and Thiririka rivers in Kiambu County "
                   "have recorded peak water levels, triggering downstream flood warnings.",
        "source": "news_rss",
        "sentiment": "negative",
        "county": "Kiambu",
        "url": "https://www.standardmedia.co.ke",
        "tags": ["river", "warning", "rain"],
    },
    {
        "title": "Mombasa drainage system overwhelmed by 48-hour rainfall event",
        "snippet": "Several neighbourhoods in Mombasa including Changamwe and Likoni have reported "
                   "standing water following a prolonged rain event. KURA teams are assessing damage.",
        "source": "news_rss",
        "sentiment": "negative",
        "county": "Mombasa",
        "url": "https://www.kbc.co.ke",
        "tags": ["rain", "damage", "submerged"],
    },
    {
        "title": "Turkana County facing severe drought after failed short rains",
        "snippet": "Food security analysts warn that Turkana County is entering a critical drought "
                   "phase with below-normal rainfall expected through to May 2026.",
        "source": "news_rss",
        "sentiment": "urgent",
        "county": "Turkana",
        "url": "https://nation.africa/kenya",
        "tags": ["drought", "shortage", "famine"],
    },
    {
        "title": "Garissa floodplains expanding as Tana River peaks — early warning issued",
        "snippet": "The Tana River in Garissa County has reached near-bank-full levels. "
                   "NDMU has issued an early warning for riverside communities to move to higher ground.",
        "source": "news_rss",
        "sentiment": "urgent",
        "county": "Garissa",
        "url": "https://www.the-star.co.ke",
        "tags": ["flood", "alert", "emergency"],
    },
    # ── Video / Social media items ─────────────────────────────────────────────
    {
        "title": "WATCH: Families wade through floodwaters in Kisumu's Nyalenda estate",
        "snippet": "Residents of Nyalenda informal settlement in Kisumu are seen navigating chest-deep "
                   "floodwaters after overnight rains. Children and elderly residents being assisted by neighbours.",
        "source": "tiktok",
        "sentiment": "urgent",
        "county": "Kisumu",
        # TikTok URL — platform badge rendered in frontend
        "url": "https://www.tiktok.com/@ntvkenya/video/7364000000000000000",
        "tags": ["flood", "video", "kisumu", "tiktok"],
    },
    {
        "title": "Kenya floods 2024: Aerial view of Lake Victoria overflow in Kisumu County",
        "snippet": "Drone footage showing the scale of Lake Victoria flooding around Kisumu County. "
                   "Over 40,000 people displaced across the Lake Victoria basin.",
        "source": "youtube",
        "sentiment": "urgent",
        "county": "Kisumu",
        # Replace with a real YouTube video ID of Kenya flood coverage — e.g. NTV Kenya or KTN
        "url": "https://www.youtube.com/watch?v=ZEjMbvL3FvE",
        "tags": ["flood", "video", "aerial", "lake victoria"],
    },
    {
        "title": "Nairobi residents share harrowing flood evacuation moments on social media",
        "snippet": "Residents of Mathare, Mukuru and Kibra have been sharing video footage of rising waters "
                   "on X (formerly Twitter), with many calling for urgent government intervention.",
        "source": "twitter",
        "sentiment": "negative",
        "county": "Nairobi",
        # X/Twitter URL — platform badge rendered
        "url": "https://x.com/search?q=nairobi+floods+2024",
        "tags": ["flood", "social media", "evacuation", "nairobi"],
    },
    {
        "title": "Red Cross Kenya distributes relief supplies to displaced Siaya families",
        "snippet": "Kenya Red Cross volunteers distribute food, tarpaulins and clean water to over 2,000 "
                   "displaced families in Siaya County. Donations open via M-Pesa Paybill 501900.",
        "source": "youtube",
        "sentiment": "positive",
        "county": "Siaya",
        # Real NTV Kenya flood relief video — update ID as needed
        "url": "https://www.youtube.com/watch?v=j6WPdPHLAaE",
        "tags": ["relief", "red cross", "displaced", "positive"],
    },
    {
        "title": "Instagram: Masinga Dam spillway running at maximum capacity",
        "snippet": "An Instagram Reel posted by a local photographer shows the Masinga Dam spillway "
                   "in full discharge mode. Water levels above 97% capacity for third consecutive day.",
        "source": "instagram",
        "sentiment": "urgent",
        "county": "Machakos",
        # Instagram Reel URL — platform badge rendered
        "url": "https://www.instagram.com/p/masinga_dam_flood_2024/",
        "tags": ["dam", "spillway", "video", "instagram"],
    },
]


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


class Command(BaseCommand):
    help = "Pull RSS intel + auto-verify urgent/negative items for the public portal"

    def add_arguments(self, parser):
        parser.add_argument(
            "--offline",
            action="store_true",
            help="Skip live RSS fetch; seed with hardcoded fallback items only",
        )
        parser.add_argument(
            "--verify-all",
            action="store_true",
            help="Also verify neutral sentiment items (default: only urgent + negative)",
        )

    def handle(self, *args, **options):
        from api.models import County, SocialIntelItem
        from api.services.intel import ingest_rss_feeds

        offline = options["offline"]
        verify_all = options["verify_all"]

        # ── Step 1: ingest live RSS ───────────────────────────────────────────
        live_count = 0
        if not offline:
            self.stdout.write(self.style.MIGRATE_HEADING("\n── Fetching live RSS feeds…"))
            try:
                live_count = ingest_rss_feeds()
                self.stdout.write(self.style.SUCCESS(f"  ✓ {live_count} new items ingested from RSS feeds"))
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f"  ⚠ RSS fetch failed: {exc}"))
                self.stdout.write("    Falling back to hardcoded items…")
                offline = True  # trigger fallback below

        # ── Step 2: seed fallback items if offline or nothing came in ─────────
        if offline or live_count == 0:
            self.stdout.write(self.style.MIGRATE_HEADING("\n── Seeding hardcoded intel items…"))
            county_cache: dict[str, County | None] = {}
            seeded = 0

            for item in FALLBACK_ITEMS:
                combined = f"{item['title']} {item['snippet']}"
                content_hash = _sha256(combined[:500])

                if SocialIntelItem.objects.filter(content_hash=content_hash).exists():
                    self.stdout.write(f"  [exists ] {item['title'][:60]}…")
                    continue

                # Resolve county
                county_name = item["county"]
                if county_name not in county_cache:
                    try:
                        county_cache[county_name] = County.objects.get(name__iexact=county_name)
                    except County.DoesNotExist:
                        county_cache[county_name] = None
                county_obj = county_cache[county_name]

                SocialIntelItem.objects.create(
                    source=item["source"],
                    url=item["url"],
                    title=item["title"],
                    snippet=item["snippet"],
                    sentiment=item["sentiment"],
                    county=county_obj,
                    tags=item["tags"],
                    content_hash=content_hash,
                    source_published_at=datetime.now(tz=timezone.utc),
                    # Mark as verified immediately so they hit the public portal
                    flag="verified",
                )
                seeded += 1
                self.stdout.write(f"  [created] {item['title'][:65]}…")

            self.stdout.write(self.style.SUCCESS(f"  ✓ {seeded} hardcoded items seeded"))

        # ── Step 3: auto-verify urgent / negative items ───────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n── Marking items as verified…"))

        sentiments = ["urgent", "negative"]
        if verify_all:
            sentiments.append("neutral")

        qs = SocialIntelItem.objects.filter(
            sentiment__in=sentiments,
            flag="unreviewed",
        )
        updated = qs.update(flag="verified")
        self.stdout.write(
            self.style.SUCCESS(
                f"  ✓ {updated} item(s) marked verified "
                f"(sentiments: {', '.join(sentiments)})"
            )
        )

        # ── Summary ───────────────────────────────────────────────────────────
        total_verified = SocialIntelItem.objects.filter(flag="verified").count()
        urgent_verified = SocialIntelItem.objects.filter(flag="verified", sentiment="urgent").count()
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ Done. {total_verified} verified items total "
                f"({urgent_verified} urgent) — public portal ready.\n"
            )
        )
