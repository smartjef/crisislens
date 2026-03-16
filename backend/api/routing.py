"""WebSocket URL routing for CrisisLens."""
from __future__ import annotations

from django.urls import re_path

from api import consumers

websocket_urlpatterns = [
    re_path(r"ws/alerts/$",              consumers.AlertConsumer.as_asgi()),
    re_path(r"ws/risk/$",                consumers.RiskUpdateConsumer.as_asgi()),
    re_path(r"ws/gps/(?P<county_id>\d+)/$", consumers.GPSConsumer.as_asgi()),
    re_path(r"ws/incidents/$",           consumers.IncidentConsumer.as_asgi()),
]
