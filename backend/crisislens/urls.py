"""URL configuration for CrisisLens MVP."""
from __future__ import annotations

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/",    admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/",      include("api.urls")),
]

admin.site.site_header = "CrisisLens Admin"
admin.site.site_title = "CrisisLens"
