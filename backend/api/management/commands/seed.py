"""
Master Seeding Command for CrisisLens.

Usage:
    python manage.py seed [--reset] [--offline]

Features:
    - Creates standard focus counties (7 core counties including HMB fixed).
    - Seeds all sub-counties from FLOOD_INDICATORS.
    - Seeds demo users (Superadmin, National Ops, County Officers, Responders, Analysts).
    - Seeds Celery Periodic Tasks (using django-celery-beat).
    - Seeds realistic Flood Incidents, Reports, and Camera Feeds.
    - Seeds Social Intel (News/Social media) items.
"""
import os
import random
import hashlib
from datetime import datetime, timedelta, timezone as dt_timezone

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from api.models import (
    County, SubCounty, FloodObservation, FloodPrediction, FloodAlert,
    Incident, IncidentUpdate, IncidentResource, CameraFeed, SocialIntelItem,
    Report
)
from api.services import FLOOD_INDICATORS, score_flood
from django_celery_beat.models import PeriodicTask, IntervalSchedule

User = get_user_model()

# ── Data definitions ─────────────────────────────────────────────────────────

COUNTIES_DATA = [
    {"name": "Kisumu", "code": "KSM", "population": 1155574, "centroid_lat": -0.1022, "centroid_lon": 34.7617},
    {"name": "Siaya", "code": "SIA", "population": 993183, "centroid_lat": 0.0626, "centroid_lon": 34.2878},
    {"name": "Homa Bay", "code": "HMB", "population": 1131950, "centroid_lat": -0.5273, "centroid_lon": 34.4539},
    {"name": "Nairobi", "code": "NBO", "population": 4397073, "centroid_lat": -1.2863, "centroid_lon": 36.8172},
    {"name": "Kiambu", "code": "KBU", "population": 2417735, "centroid_lat": -1.1462, "centroid_lon": 36.9541},
    {"name": "Machakos", "code": "MCK", "population": 1421932, "centroid_lat": -1.5177, "centroid_lon": 37.2622},
    {"name": "Kajiado", "code": "KJD", "population": 1117840, "centroid_lat": -2.0981, "centroid_lon": 36.7820},
]

USERS_DATA = [
    {
        "email": "admin@crisislens.go.ke",
        "username": "superadmin",
        "first_name": "System",
        "last_name": "Admin",
        "role": "super_admin",
        "is_staff": True,
        "is_superuser": True,
        "password": "Admin1234!"
    },
    {
        "email": "ops@crisislens.go.ke",
        "role": "national_ops",
        "county": None,
        "password": "Demo1234!"
    },
    {
        "email": "kisumu@crisislens.go.ke",
        "role": "county_officer",
        "county": "Kisumu",
        "password": "Demo1234!"
    },
    {
        "email": "siaya@crisislens.go.ke",
        "role": "county_officer",
        "county": "Siaya",
        "password": "Demo1234!"
    },
    {
        "email": "homabay@crisislens.go.ke",
        "role": "county_officer",
        "county": "Homa Bay",
        "password": "Demo1234!"
    },
    {
        "email": "responder@crisislens.go.ke",
        "role": "responder",
        "county": "Kisumu",
        "password": "Demo1234!"
    },
    {
        "email": "analyst@crisislens.go.ke",
        "role": "analyst",
        "county": None,
        "password": "Demo1234!"
    },
]

CAMERAS_DATA = [
    {
        "name": "Nyando Bridge Monitor",
        "location_label": "Ahero Bridge (Kisumu-Kericho Road)",
        "lat": -0.1712, "lon": 34.9214,
        "county": "Kisumu",
        "stream_url": "https://test-hls.crisislens.ke/nyando_bridge/index.m3u8",
        "feed_type": "river",
        "status": "online",
        "agency": "KenHA"
    },
    {
        "name": "Nairobi River - Githurai",
        "location_label": "Githurai 44 Bridge",
        "lat": -1.2064, "lon": 36.9126,
        "county": "Nairobi",
        "stream_url": "https://test-hls.crisislens.ke/nairobi_river_g44/index.m3u8",
        "feed_type": "cctv",
        "status": "online",
        "agency": "Nairobi County"
    },
    {
        "name": "Masinga Dam Spillway",
        "location_label": "Masinga Dam Overflow Control",
        "lat": -0.8879, "lon": 37.5956,
        "county": "Machakos",
        "stream_url": "https://test-hls.crisislens.ke/masinga_spillway/index.m3u8",
        "feed_type": "river",
        "status": "online",
        "agency": "KenGen"
    },
    {
        "name": "Ahero Rice Fields - Drone",
        "location_label": "Nyando Plains Rice Irrigation Board",
        "lat": -0.1416, "lon": 34.9312,
        "county": "Kisumu",
        "stream_url": "https://test-hls.crisislens.ke/ahero_drone/index.m3u8",
        "feed_type": "drone",
        "status": "offline",
        "agency": "CrisisLens Ops"
    },
]

SOCIAL_ITEMS = [
    {
        "title": "Flooding in Kisumu displaces hundreds along Nyando River banks",
        "snippet": "Hundreds of families have been displaced after the Nyando River burst its banks following heavy overnight rains in Kisumu County. Kenya Red Cross teams are on the ground.",
        "source": "news_rss",
        "sentiment": "urgent",
        "county": "Kisumu",
        "url": "https://nation.africa/kenya",
        "tags": ["flood", "displaced", "river"],
    },
    {
        "title": "Mathare River levels rising dangerously — Nairobi County",
        "snippet": "Nairobi County Disaster management has warned residents of Mathare North to move to higher ground immediately as water levels continue to surge.",
        "source": "twitter",
        "sentiment": "urgent",
        "county": "Nairobi",
        "url": "https://x.com/citycountynairobi/status/123456",
        "tags": ["flood", "evacuation", "nairobi"],
    },
    {
        "title": "Road blockage in Siaya due to flash floods",
        "snippet": "The main road between Bondo and Siaya town is currently impassable at Ugenya due to severe flash flooding and siltation.",
        "source": "news_rss",
        "sentiment": "negative",
        "county": "Siaya",
        "url": "https://www.standardmedia.co.ke",
        "tags": ["roads", "flood", "siaya"],
    },
]

PERIODIC_TASKS = [
    {"name": "Ingest Social Intel (15m)", "task": "api.tasks.ingest_social_intel_task", "interval": 15},
    {"name": "Push Risk Updates (5m)", "task": "api.tasks.push_risk_updates_task", "interval": 5},
    {"name": "Check Camera Health (10m)", "task": "api.tasks.check_camera_health_task", "interval": 10},
]

class Command(BaseCommand):
    help = "Master seed command: Standardizes data and adds flood-related demo content."

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Wipe all existing data before seeding')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write(self.style.WARNING("Wiping existing data..."))
            PeriodicTask.objects.all().delete()
            IntervalSchedule.objects.all().delete()
            IncidentResource.objects.all().delete()
            IncidentUpdate.objects.all().delete()
            Incident.objects.all().delete()
            Report.objects.all().delete()
            FloodAlert.objects.all().delete()
            FloodPrediction.objects.all().delete()
            FloodObservation.objects.all().delete()
            CameraFeed.objects.all().delete()
            SocialIntelItem.objects.all().delete()
            SubCounty.objects.all().delete()
            # Careful with County due to Cascades
            County.objects.all().delete()
            self.stdout.write("Database cleared.")

        # ── Step 1: Counties & Subcounties ───────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\nSeeding Counties…"))
        counties_map = {}
        for cdata in COUNTIES_DATA:
            county, created = County.objects.get_or_create(
                code=cdata["code"],
                defaults={
                    "name": cdata["name"],
                    "population": cdata["population"],
                    "centroid_lat": cdata["centroid_lat"],
                    "centroid_lon": cdata["centroid_lon"],
                    "region": "Kenya" if cdata["name"] in ["Nairobi", "Kiambu"] else "Lake Victoria Basin"
                }
            )
            # Fix if existing name is wrong or code was different (Homa Bay fix)
            if not created:
                county.name = cdata["name"]
                county.save()
            
            counties_map[county.name] = county
            status = "created" if created else "exists "
            self.stdout.write(f"  [{status}] {county.name} ({county.code})")

        self.stdout.write(self.style.MIGRATE_HEADING("\nSeeding Sub-Counties & Risk Data…"))
        for (county_name, sub_name), indicators in FLOOD_INDICATORS.items():
            county = counties_map.get(county_name)
            if not county: continue

            sub_county, created = SubCounty.objects.get_or_create(
                county=county,
                name=sub_name,
                defaults={"population": 0, "area_sqkm": random.uniform(50, 200)}
            )
            
            # Seed Observation & Prediction
            obs, _ = FloodObservation.objects.get_or_create(
                sub_county=sub_county,
                source="seed-2024",
                defaults={
                    "rainfall_accumulation": indicators["rainfall_accumulation"],
                    "soil_moisture": indicators["soil_moisture"],
                    "elevation": indicators["elevation"],
                    "past_flood_occurrence": indicators["past_flood_occurrence"]
                }
            )
            
            if not FloodPrediction.objects.filter(observation=obs).exists():
                res = score_flood(**indicators)
                FloodPrediction.objects.create(
                    observation=obs,
                    sub_county=sub_county,
                    flood_probability=res["flood_probability"],
                    risk_category=res["risk_category"],
                    lead_time_days=res["lead_time_days"],
                    confidence=res["confidence"],
                )

        # ── Step 2: Users ──────────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\nSeeding Users…"))
        for udata in USERS_DATA:
            email = udata["email"]
            county_name = udata.get("county")
            county = counties_map.get(county_name) if county_name else None
            role = udata.get("role")
            password = udata.get("password")

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": udata.get("username", email.split("@")[0]),
                    "first_name": udata.get("first_name", ""),
                    "last_name": udata.get("last_name", ""),
                    "role": role,
                    "county": county,
                    "is_staff": udata.get("is_staff", False),
                    "is_superuser": udata.get("is_superuser", False),
                }
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"  [created] {email} ({role})")
            else:
                self.stdout.write(f"  [exists ] {email}")

        # ── Step 3: Periodic Tasks ───────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\nSeeding Periodic Tasks…"))
        for tdata in PERIODIC_TASKS:
            schedule, _ = IntervalSchedule.objects.get_or_create(
                every=tdata["interval"],
                period=IntervalSchedule.MINUTES
            )
            ptask, created = PeriodicTask.objects.get_or_create(
                name=tdata["name"],
                defaults={
                    "task": tdata["task"],
                    "interval": schedule
                }
            )
            status = "created" if created else "exists "
            self.stdout.write(f"  [{status}] {tdata['name']}")

        # ── Step 4: Incidents & Alerts ────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\nSeeding Incidents & Alerts…"))
        admin_user = User.objects.filter(is_superuser=True).first()
        
        # Alerts
        alerts = [
            {"title": "Nyando Basin Flood WATCH", "county": "Kisumu", "severity": "high"},
            {"title": "Mathare River SPIKE Detected", "county": "Nairobi", "severity": "critical"},
            {"title": "Masinga Dam capacity warning", "county": "Machakos", "severity": "medium"},
        ]
        for a in alerts:
            c = counties_map.get(a["county"])
            if not c: continue
            FloodAlert.objects.get_or_create(
                title=a["title"],
                county=c,
                defaults={
                    "severity": a["severity"],
                    "status": "active",
                    "description": f"Automated alert for {c.name} based on predictive threshold crossings.",
                    "created_by": admin_user
                }
            )

        # Incidents
        incidents_data = [
            {
                "title": "Ahero Plains Displacement",
                "county": "Kisumu",
                "severity": "critical",
                "type": "displacement",
                "desc": "Ongoing evacuation of 400 households in Nyando plains."
            },
            {
                "title": "Githurai Bridge Damage",
                "county": "Nairobi",
                "severity": "high",
                "type": "infrastructure",
                "desc": "Partial collapse of pedestrian walkway due to high river velocity."
            }
        ]
        for i in incidents_data:
            c = counties_map.get(i["county"])
            inc, created = Incident.objects.get_or_create(
                title=i["title"],
                county=c,
                defaults={
                    "severity": i["severity"],
                    "incident_type": i["type"],
                    "description": i["desc"],
                    "opened_by": admin_user,
                    "status": "active"
                }
            )
            if created:
                IncidentUpdate.objects.create(
                    incident=inc,
                    author=admin_user,
                    body="Incident established. Command centre activated.",
                    is_system=True
                )

        # ── Step 5: Cameras & Social Intel ───────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\nSeeding Cameras & Intel…"))
        for cam in CAMERAS_DATA:
            c = counties_map.get(cam.pop("county"))
            if not c: continue
            CameraFeed.objects.get_or_create(
                name=cam["name"],
                county=c,
                defaults={**cam}
            )

        for item in SOCIAL_ITEMS:
            c = counties_map.get(item["county"])
            combined = f"{item['title']} {item['snippet']}"
            chash = hashlib.sha256(combined.encode()).hexdigest()
            SocialIntelItem.objects.get_or_create(
                content_hash=chash,
                defaults={
                    "title": item["title"],
                    "snippet": item["snippet"],
                    "source": item["source"],
                    "sentiment": item["sentiment"],
                    "url": item["url"],
                    "county": c,
                    "tags": item["tags"],
                    "flag": "verified",
                    "source_published_at": timezone.now()
                }
            )

        self.stdout.write(self.style.SUCCESS("\n✓ Master seed complete.\n"))
