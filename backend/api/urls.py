"""API routes for CrisisLens MVP."""
from __future__ import annotations

from django.urls import path

from api import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("drought/predict/", views.drought_predict, name="drought_predict"),
    path("flood/predict/", views.flood_predict, name="flood_predict"),
    path("ai/feedback/", views.ai_feedback, name="ai_feedback"),
]
