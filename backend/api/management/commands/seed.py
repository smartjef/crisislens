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
    {"name": "Kisumu",   "code": "KSM", "region": "Nyanza"},
    {"name": "Siaya",    "code": "SIA", "region": "Nyanza"},
    {"name": "Homa Bay", "code": "HB",  "region": "Nyanza"},
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
        from api.models import County

        self.stdout.write(self.style.MIGRATE_HEADING("\nSeeding counties…"))
        county_map: dict[str, County] = {}
        for data in COUNTIES:
            county, created = County.objects.get_or_create(
                code=data["code"],
                defaults={"name": data["name"], "region": data["region"]},
            )
            county_map[county.name] = county
            status = "created" if created else "exists "
            self.stdout.write(f"  [{status}] {county}")

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
