"""
accounts/models.py

Extends Django's built-in AbstractUser — we only add what Django doesn't already
provide: an application-level role, a county assignment, phone and organisation.
All password hashing, session auth, admin integration, groups and permissions
come from Django for free.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model.  Use email as the primary login identifier.
    Django's AbstractUser already supplies:
      username, email, password, first_name, last_name,
      is_staff, is_superuser, is_active, date_joined,
      groups, user_permissions  (full permissions framework)
    We add only the CrisisLens-specific fields below.
    """

    ROLES = [
        ("super_admin",    "Super Admin"),
        ("national_ops",   "National Operations"),
        ("county_officer", "County Officer"),
        ("responder",      "Emergency Responder"),
        ("analyst",        "Analyst"),
    ]

    # Use email as the primary login identifier (simplejwt reads USERNAME_FIELD)
    # Must be unique when used as USERNAME_FIELD (Django auth.E003)
    email = models.EmailField(unique=True)
    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["username"]   # createsuperuser still prompts for username

    role = models.CharField(
        max_length=20,
        choices=ROLES,
        default="responder",
        db_index=True,
    )
    county = models.ForeignKey(
        "api.County",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="officers",
    )
    phone        = models.CharField(max_length=20, blank=True)
    organization = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name        = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return f"{self.email} ({self.get_role_display()})"

    # ── Convenience helpers ─────────────────────────────────────────────────
    @property
    def is_admin(self) -> bool:
        return self.role == "super_admin" or self.is_superuser

    @property
    def is_national(self) -> bool:
        return self.role in {"national_ops", "super_admin"} or self.is_superuser
