"""
api/consumers.py

Django Channels WebSocket consumers.

Groups:
  - "alerts"       → pushed whenever a FloodAlert is created/updated
  - "risk_updates" → pushed when flood predictions update (every 5 min via Celery)
  - "gps_<county_id>" → pushed on every FieldUnitPing for that county
  - "incidents"    → pushed on Incident create / status change
"""
from __future__ import annotations

import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class AlertConsumer(AsyncJsonWebsocketConsumer):
    """Broadcasts live FloodAlert events to subscribed clients."""

    GROUP = "alerts"

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    # Handler — called by channel layer when a message is sent to the group
    async def alert_event(self, event):
        await self.send_json(event["payload"])


class RiskUpdateConsumer(AsyncJsonWebsocketConsumer):
    """Broadcasts county-level risk score updates."""

    GROUP = "risk_updates"

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def risk_update(self, event):
        await self.send_json(event["payload"])


class GPSConsumer(AsyncJsonWebsocketConsumer):
    """
    Streams GPS pings for field units within a specific county.
    URL pattern: ws/gps/<county_id>/
    """

    async def connect(self):
        self.county_id = self.scope["url_route"]["kwargs"]["county_id"]
        self.group_name = f"gps_{self.county_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def gps_ping(self, event):
        await self.send_json(event["payload"])


class IncidentConsumer(AsyncJsonWebsocketConsumer):
    """Broadcasts incident lifecycle events (create, status change, new update)."""

    GROUP = "incidents"

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def incident_event(self, event):
        await self.send_json(event["payload"])
