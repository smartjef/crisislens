"""URL configuration for CrisisLens MVP."""
from __future__ import annotations

from django.urls import include, path

urlpatterns = [
    path("api/", include("api.urls")),
]
