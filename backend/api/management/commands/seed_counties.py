import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import County, SubCounty, FloodObservation, FloodPrediction, FloodAlert
from api.services import FLOOD_INDICATORS, score_flood
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database with Counties, SubCounties, Users, Observations, Predictions, and Alerts."

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Wipe existing data before seeding')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write(self.style.WARNING("Wiping existing data..."))
            FloodAlert.objects.all().delete()
            FloodPrediction.objects.all().delete()
            FloodObservation.objects.all().delete()
            SubCounty.objects.all().delete()
            County.objects.all().delete()
            User.objects.filter(is_superuser=False, email__in=[
                "admin@crisislens.ke", "ops@crisislens.ke", "officer@kisumu.ke", 
                "responder@siaya.ke", "analyst@crisislens.ke"
            ]).delete()

        # Seed Counties
        counties_data = [
            {"name": "Kisumu", "code": "KSM", "population": 1155574, "centroid_lat": -0.102, "centroid_lon": 34.762},
            {"name": "Siaya", "code": "SIA", "population": 993183, "centroid_lat": 0.061, "centroid_lon": 34.288},
            {"name": "Homa Bay", "code": "HMB", "population": 1131950, "centroid_lat": -0.527, "centroid_lon": 34.457},
            {"name": "Nairobi", "code": "NBO", "population": 4397073, "centroid_lat": -1.286, "centroid_lon": 36.817},
            {"name": "Kiambu", "code": "KBU", "population": 2417735, "centroid_lat": -1.146, "centroid_lon": 36.954},
            {"name": "Machakos", "code": "MCK", "population": 1421932, "centroid_lat": -1.517, "centroid_lon": 37.262},
            {"name": "Kajiado", "code": "KJD", "population": 1117840, "centroid_lat": -2.098, "centroid_lon": 36.782},
        ]
        
        counties_created = 0
        counties_mapped = {}
        for cdata in counties_data:
            county, created = County.objects.get_or_create(
                code=cdata["code"],
                defaults={
                    "name": cdata["name"],
                    "population": cdata["population"],
                    "centroid_lat": cdata["centroid_lat"],
                    "centroid_lon": cdata["centroid_lon"],
                    "region": "Lake Victoria Basin"
                }
            )
            counties_mapped[county.name] = county
            if created: counties_created += 1

        # Seed SubCounties, Observations and Predictions
        subcounties_created = 0
        predictions_created = 0
        sub_counties_mapped = {}

        for (county_name, sub_name), indicators in FLOOD_INDICATORS.items():
            county = counties_mapped.get(county_name)
            if not county: continue

            sub_county, created = SubCounty.objects.get_or_create(
                county=county,
                name=sub_name,
                defaults={"population": 0, "area_sqkm": 0.0}
            )
            sub_counties_mapped[f"{county_name}/{sub_name}"] = sub_county
            if created: subcounties_created += 1

            # Seed Observation
            obs, obs_created = FloodObservation.objects.get_or_create(
                sub_county=sub_county,
                source="hardcoded-2024",
                defaults={
                    "rainfall_accumulation": indicators["rainfall_accumulation"],
                    "soil_moisture": indicators["soil_moisture"],
                    "elevation": indicators["elevation"],
                    "past_flood_occurrence": indicators["past_flood_occurrence"]
                }
            )

            # Seed Prediction
            if obs_created or not FloodPrediction.objects.filter(observation=obs).exists():
                predicted = score_flood(**indicators)
                FloodPrediction.objects.get_or_create(
                    observation=obs,
                    sub_county=sub_county,
                    defaults={
                        "flood_probability": predicted["flood_probability"],
                        "risk_category": predicted["risk_category"],
                        "lead_time_days": predicted["lead_time_days"],
                        "confidence": predicted["confidence"],
                    }
                )
                predictions_created += 1

        # Seed Users
        demo_password = os.environ.get("DEMO_PASSWORD", "CrisisLens2024!")
        users_data = [
            {"email": "admin@crisislens.ke", "role": "super_admin", "county_name": None},
            {"email": "ops@crisislens.ke", "role": "national_ops", "county_name": None},
            {"email": "officer@kisumu.ke", "role": "county_officer", "county_name": "Kisumu"},
            {"email": "responder@siaya.ke", "role": "responder", "county_name": "Siaya"},
            {"email": "analyst@crisislens.ke", "role": "analyst", "county_name": None},
        ]

        users_created = 0
        users_mapped = {}
        for udata in users_data:
            county = counties_mapped.get(udata["county_name"]) if udata["county_name"] else None
            user, created = User.objects.get_or_create(
                email=udata["email"],
                defaults={
                    "username": udata["email"].split("@")[0],
                    "role": udata["role"],
                    "county": county
                }
            )
            if created:
                user.set_password(demo_password)
                if udata["role"] == "super_admin":
                    user.is_superuser = True
                    user.is_staff = True
                user.save()
                users_created += 1
            users_mapped[user.role] = user

        # Seed Alerts
        admin_user = users_mapped.get("super_admin") or User.objects.first()
        
        alerts_data = [
            {
                "county": "Kisumu", "sub": "Nyando", "severity": "critical",
                "title": "Nyando River at 91% capacity — evacuation advisory imminent"
            },
            {
                "county": "Homa Bay", "sub": "Suba South", "severity": "high",
                "title": "Lake Victoria level 0.8m above seasonal average"
            },
            {
                "county": "Siaya", "sub": "Rarieda", "severity": "high",
                "title": "Winam Gulf shoreline flooding reported"
            }
        ]

        alerts_created = 0
        for adata in alerts_data:
            c = counties_mapped.get(adata["county"])
            sc = sub_counties_mapped.get(f"{adata['county']}/{adata['sub']}")
            
            if c:
                _, created = FloodAlert.objects.get_or_create(
                    title=adata["title"],
                    defaults={
                        "county": c,
                        "sub_county": sc,
                        "severity": adata["severity"],
                        "description": "Seeded alert for demo purposes.",
                        "created_by": admin_user,
                    }
                )
                if created: alerts_created += 1

        self.stdout.write(self.style.SUCCESS(
            "\n--- CrisisLens DB Seed Summary ---\n"
            f"Counties ✓: {counties_created} created, {County.objects.count()} total.\n"
            f"Sub-counties ✓: {subcounties_created} created, {SubCounty.objects.count()} total.\n"
            f"Predictions ✓: {predictions_created} created, {FloodPrediction.objects.count()} total.\n"
            f"Users ✓: {users_created} created, {User.objects.count()} total.\n"
            f"Alerts ✓: {alerts_created} created, {FloodAlert.objects.count()} total.\n"
        ))
