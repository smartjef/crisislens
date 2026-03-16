"""
python manage.py create_admin

Creates (or resets) the default superuser account for local development.

    username : admin
    password : 1234
    email    : admin@crisislens.local

Safe to run multiple times — if the user already exists it will update the
password and ensure is_staff / is_superuser flags are set.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or reset the default admin superuser (username=admin, password=1234)"

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        username = "admin"
        email = "admin@crisislens.local"
        password = "1234"

        user, created = User.objects.get_or_create(username=username)
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        verb = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ {verb} superuser — username: {username!r}  password: {password!r}\n"
                f"  Django Admin: http://localhost:8000/admin/\n"
            )
        )
