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
    password_changed_at = models.DateTimeField(null=True, blank=True)

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

    @property
    def totp_enabled(self) -> bool:
        return hasattr(self, 'totp_device') and self.totp_device.is_active


class TOTPDevice(models.Model):
    user = models.OneToOneField(
        'accounts.User', on_delete=models.CASCADE, related_name='totp_device'
    )
    secret = models.CharField(max_length=64)  # base32 pyotp secret
    is_active = models.BooleanField(default=False)
    backup_codes = models.JSONField(default=list)  # list of 8-char codes
    created_at = models.DateTimeField(auto_now_add=True)

    def verify_code(self, code: str) -> bool:
        import pyotp
        if not code:
            return False
        # Check TOTP (±1 window = 90s tolerance)
        totp = pyotp.TOTP(self.secret)
        if totp.verify(code.strip(), valid_window=1):
            return True
        # Check backup codes
        if code.strip() in self.backup_codes:
            self.backup_codes = [c for c in self.backup_codes if c != code.strip()]
            self.save(update_fields=['backup_codes'])
            return True
        return False

    def get_provisioning_uri(self, email: str) -> str:
        import pyotp
        return pyotp.TOTP(self.secret).provisioning_uri(
            name=email, issuer_name='CrisisLens GOK'
        )

    def __str__(self):
        return f"TOTP({self.user.email}, active={self.is_active})"
