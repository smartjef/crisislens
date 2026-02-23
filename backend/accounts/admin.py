from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Extends Django's built-in UserAdmin — only adds CrisisLens fields."""

    list_display  = ["email", "username", "role", "county", "is_active", "date_joined"]
    list_filter   = ["role", "county", "is_active", "is_staff"]
    search_fields = ["email", "username", "first_name", "last_name"]
    ordering      = ["-date_joined"]

    # Add CrisisLens fields to the existing fieldset sections
    fieldsets = BaseUserAdmin.fieldsets + (
        ("CrisisLens Profile", {
            "fields": ("role", "county", "phone", "organization"),
        }),
    )

    # Add CrisisLens fields to the "Add user" form
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("CrisisLens Profile", {
            "fields": ("email", "role", "county", "phone", "organization"),
        }),
    )
