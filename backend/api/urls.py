"""API routes for CrisisLens."""
from __future__ import annotations

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from api import views

router = DefaultRouter()
# ── Existing ──────────────────────────────────────────────────────────────────
router.register(r"counties",      views.CountyViewSet,          basename="county")
router.register(r"sub-counties",  views.SubCountyViewSet,       basename="subcounty")
router.register(r"alerts",        views.FloodAlertViewSet,      basename="alert")
router.register(r"reports",       views.ReportViewSet,          basename="report")
router.register(r"ai/chat",       views.AIChatViewSet,          basename="ai-chat")
router.register(r"ai/simulate",   views.FloodSimulationViewSet, basename="ai-simulate")
# ── Enterprise ────────────────────────────────────────────────────────────────
router.register(r"incidents",            views.IncidentViewSet,          basename="incident")
router.register(r"incident-resources",   views.IncidentResourceViewSet,  basename="incident-resource")
router.register(r"field-units",          views.FieldUnitViewSet,         basename="field-unit")
router.register(r"cameras",              views.CameraFeedViewSet,        basename="camera")
router.register(r"social-intel",         views.SocialIntelViewSet,       basename="social-intel")
router.register(r"broadcasts",           views.BroadcastViewSet,         basename="broadcast")
router.register(r"broadcast-recipients", views.BroadcastRecipientViewSet, basename="broadcast-recipient")
router.register(r"broadcast-delivery-logs", views.BroadcastDeliveryLogViewSet, basename="broadcast-delivery-log")
router.register(r"weather",              views.WeatherObservationViewSet, basename="weather")
router.register(r"annotated-zones",      views.AnnotatedZoneViewSet,     basename="annotated-zone")
router.register(r"api-keys",             views.APIKeyViewSet,            basename="api-key")

urlpatterns = [
    path("", include(router.urls)),
    # ── Function-based views ──────────────────────────────────────────────────
    path("health/",           views.health,            name="health"),
    path("drought/predict/",  views.drought_predict,   name="drought_predict"),
    path("flood/predict/",    views.flood_predict,     name="flood_predict"),
    path("flood/scenario/",   views.flood_scenario,    name="flood_scenario"),
    path("ai/feedback/",      views.ai_feedback,       name="ai_feedback"),
    # ── Public (no auth required) ─────────────────────────────────────────────
    path("public/counties/",      views.public_counties,      name="public_counties"),
    path("public/summary/",       views.public_summary,       name="public_summary"),
    path("public/cameras/",       views.public_cameras,       name="public_cameras"),
    path("public/active-alerts/", views.public_active_alerts, name="public_active_alerts"),
    path("public/cap/",                       views.cap_feed,        name="cap_feed"),
    path("public/cap/<int:alert_id>/",        views.cap_feed,        name="cap_feed_detail"),
    path("public/subscribe/",                 views.public_subscribe, name="public_subscribe"),
    # ── Intel ─────────────────────────────────────────────────────────────────
    path("intel/summary/",        views.intel_summary,        name="intel_summary"),
    # ── Sensor summary (latest obs per county) ────────────────────────────────
    path("sensors/summary/",      views.sensor_summary,       name="sensor_summary"),
]
