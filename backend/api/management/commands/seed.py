"""
python manage.py seed

Creates the 3 Lake Victoria focus counties and 5 demo users.
Safe to re-run — uses get_or_create so it won't duplicate data.

Demo accounts:
  ops@crisislens.go.ke          / Demo1234!  → national_ops
  kisumu@crisislens.go.ke       / Demo1234!  → county_officer  (Kisumu)
  siaya@crisislens.go.ke        / Demo1234!  → county_officer  (Siaya)
  responder@crisislens.go.ke    / Demo1234!  → responder       (Homa Bay)
  analyst@crisislens.go.ke      / Demo1234!  → analyst
  admin@crisislens.go.ke        / Admin1234! → super_admin  (is_staff=True)
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

COUNTIES = [
    {
        "name": "Kisumu", "code": "KSM", "region": "Nyanza",
        "population": 1155574, "centroid_lat": -0.0917, "centroid_lon": 34.7680,
        "subcounties": ["Kisumu East", "Kisumu West", "Kisumu Central", "Seme", "Nyando", "Muhoroni", "Nyakach"]
    },
    {
        "name": "Siaya", "code": "SIA", "region": "Nyanza",
        "population": 993183, "centroid_lat": 0.0626, "centroid_lon": 34.2878,
        "subcounties": ["Alego Usonga", "Bondo", "Gem", "Rarieda", "Ugenya", "Ugunja"]
    },
    {
        "name": "Homa Bay", "code": "HB", "region": "Nyanza",
        "population": 1131950, "centroid_lat": -0.5273, "centroid_lon": 34.4539,
        "subcounties": ["Homa Bay Town", "Kabondo Kasipul", "Karachuonyo", "Kasipul", "Mbita", "Ndhiwa", "Rangwe", "Suba North", "Suba South"]
    },
]

USERS = [
    {
        "email":        "ops@crisislens.go.ke",
        "username":     "national_ops",
        "first_name":   "National",
        "last_name":    "Operations",
        "role":         "national_ops",
        "county":       None,
        "organization": "National Disaster Operations Centre",
        "password":     "Demo1234!",
    },
    {
        "email":        "kisumu@crisislens.go.ke",
        "username":     "kisumu_officer",
        "first_name":   "Kisumu",
        "last_name":    "Officer",
        "role":         "county_officer",
        "county":       "Kisumu",
        "organization": "Kisumu County Government",
        "password":     "Demo1234!",
    },
    {
        "email":        "siaya@crisislens.go.ke",
        "username":     "siaya_officer",
        "first_name":   "Siaya",
        "last_name":    "Officer",
        "role":         "county_officer",
        "county":       "Siaya",
        "organization": "Siaya County Government",
        "password":     "Demo1234!",
    },
    {
        "email":        "responder@crisislens.go.ke",
        "username":     "field_responder",
        "first_name":   "Field",
        "last_name":    "Responder",
        "role":         "responder",
        "county":       "Homa Bay",
        "organization": "Kenya Red Cross",
        "password":     "Demo1234!",
    },
    {
        "email":        "analyst@crisislens.go.ke",
        "username":     "data_analyst",
        "first_name":   "Data",
        "last_name":    "Analyst",
        "role":         "analyst",
        "county":       None,
        "organization": "Kenya Meteorological Department",
        "password":     "Demo1234!",
    },
    {
        "email":        "admin@crisislens.go.ke",
        "username":     "superadmin",
        "first_name":   "System",
        "last_name":    "Admin",
        "role":         "super_admin",
        "county":       None,
        "organization": "CrisisLens",
        "password":     "Admin1234!",
        "is_staff":     True,
        "is_superuser": True,
    },
]


class Command(BaseCommand):
    help = "Seed the database with counties and demo users"

    def handle(self, *args, **options):
        from api.models import County, SubCounty, FloodObservation, FloodPrediction
        import random

        self.stdout.write(self.style.MIGRATE_HEADING("\nSeeding counties, subcounties, and risk predictions…"))
        county_map: dict[str, County] = {}
        for data in COUNTIES:
            subcounties_list = data.pop("subcounties")
            county, created = County.objects.get_or_create(
                code=data["code"],
                defaults={
                    "name": data["name"], 
                    "region": data["region"],
                    "population": data["population"],
                    "centroid_lat": data["centroid_lat"],
                    "centroid_lon": data["centroid_lon"],
                },
            )
            county_map[county.name] = county
            status = "created" if created else "exists "
            self.stdout.write(f"  [{status}] {county}")

            for sc_name in subcounties_list:
                sc, sc_created = SubCounty.objects.get_or_create(
                    county=county,
                    name=sc_name,
                    defaults={
                        "population": int(data["population"] / len(subcounties_list)),
                        "area_sqkm": 200.0,
                    }
                )
                
                # Mock some risk data if missing
                if not FloodObservation.objects.filter(sub_county=sc).exists():
                    obs = FloodObservation.objects.create(
                        sub_county=sc,
                        rainfall_accumulation=random.uniform(10, 150),
                        soil_moisture=random.uniform(0.3, 0.9),
                        elevation=random.uniform(1100, 1500),
                        past_flood_occurrence=random.choice([True, False]),
                    )
                    prob = random.uniform(10, 95)
                    FloodPrediction.objects.create(
                        observation=obs,
                        sub_county=sc,
                        flood_probability=round(prob, 2),
                        risk_category="Critical" if prob > 80 else "High" if prob > 60 else "Medium" if prob > 40 else "Low",
                        lead_time_days=random.randint(1, 5),
                        confidence=round(random.uniform(0.6, 0.9), 2),
                    )

        self.stdout.write(self.style.MIGRATE_HEADING("\nSeeding demo users…"))
        for data in USERS:
            county = county_map.get(data.pop("county"))  # type: ignore[arg-type]
            password = data.pop("password")

            user, created = User.objects.get_or_create(
                email=data["email"],
                defaults={
                    **data,
                    "county": county,
                    "is_staff":     data.get("is_staff", False),
                    "is_superuser": data.get("is_superuser", False),
                },
            )
            if created:
                user.set_password(password)
                user.save()

            status = "created" if created else "exists "
            role_label = user.get_role_display()
            self.stdout.write(f"  [{status}] {user.email:<38} ({role_label})")

        self.stdout.write(self.style.SUCCESS("\n✓ Seed complete.\n"))
