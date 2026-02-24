"""API routes for CrisisLens MVP."""
from __future__ import annotations

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from api import views

router = DefaultRouter()
router.register(r"counties", views.CountyViewSet, basename="county")
router.register(r"sub-counties", views.SubCountyViewSet, basename="subcounty")
router.register(r"alerts", views.FloodAlertViewSet, basename="alert")
router.register(r"reports", views.ReportViewSet, basename="report")


urlpatterns = [
    path("", include(router.urls)),
    path("health/", views.health, name="health"),
    path("drought/predict/", views.drought_predict, name="drought_predict"),
    path("flood/predict/", views.flood_predict, name="flood_predict"),
    path("flood/scenario/", views.flood_scenario, name="flood_scenario"),
    path("ai/feedback/", views.ai_feedback, name="ai_feedback"),
]
