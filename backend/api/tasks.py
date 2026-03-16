"""
api/tasks.py

Celery tasks for CrisisLens.

Schedule (set up via django-celery-beat admin or management command):
  - ingest_social_intel_task  : every 15 minutes
  - push_risk_updates_task    : every 5 minutes
  - check_camera_health_task  : every 10 minutes
"""
from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_broadcast_task(self, broadcast_id: int):
    """
    Dispatch an EarlyWarningBroadcast over the configured channel.
    Retries up to 3 times on transient network errors.
    """
    try:
        from api.services.broadcast import dispatch_broadcast
        dispatch_broadcast(broadcast_id)
    except Exception as exc:
        logger.error("send_broadcast_task failed for broadcast %d: %s", broadcast_id, exc)
        raise self.retry(exc=exc)


@shared_task
def ingest_social_intel_task():
    """Fetch RSS feeds and save new SocialIntelItems."""
    from api.services.intel import ingest_rss_feeds
    count = ingest_rss_feeds()
    return {"new_items": count}


@shared_task
def push_risk_updates_task():
    """
    Recompute flood risk scores for all active sub-counties and push
    updated scores to the 'risk_updates' WebSocket group.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from api.models import SubCounty, County
        from api.services.scoring import score_flood, FLOOD_INDICATORS

        channel_layer = get_channel_layer()
        counties = County.objects.filter(is_active=True).prefetch_related("sub_counties")

        scores = []
        for county in counties:
            for sc in county.sub_counties.all():
                key = (county.name, sc.name)
                indicators = FLOOD_INDICATORS.get(key)
                if not indicators:
                    continue
                result = score_flood(**indicators)
                scores.append({
                    "county_id":   county.id,
                    "county_name": county.name,
                    "sub_county":  sc.name,
                    **result,
                })

        payload = {"type": "risk_update", "scores": scores, "ts": timezone.now().isoformat()}
        async_to_sync(channel_layer.group_send)(
            "risk_updates",
            {"type": "risk_update", "payload": payload},
        )
        return {"counties_processed": len(scores)}
    except Exception as exc:
        logger.error("push_risk_updates_task failed: %s", exc)
        return {"error": str(exc)}


@shared_task
def check_camera_health_task():
    """
    Ping each registered camera feed URL.
    Updates CameraFeed.status and CameraFeed.last_checked.
    """
    import requests as req
    from api.models import CameraFeed

    feeds = CameraFeed.objects.all()
    updated = 0
    for feed in feeds:
        try:
            resp = req.head(feed.stream_url, timeout=5, allow_redirects=True)
            new_status = "online" if resp.status_code < 400 else "degraded"
        except req.RequestException:
            new_status = "offline"

        if feed.status != new_status:
            feed.status = new_status
            feed.last_checked = timezone.now()
            feed.save(update_fields=["status", "last_checked"])
            updated += 1
        else:
            feed.last_checked = timezone.now()
            feed.save(update_fields=["last_checked"])

    return {"cameras_checked": feeds.count(), "status_changes": updated}


@shared_task
def broadcast_alert_to_websocket(alert_id: int):
    """
    Push a FloodAlert event to all connected WebSocket clients.
    Called from FloodAlertViewSet.perform_create signal.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from api.models import FloodAlert

        alert = FloodAlert.objects.select_related("county").get(pk=alert_id)
        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            "alerts",
            {
                "type": "alert_event",
                "payload": {
                    "id":       alert.id,
                    "title":    alert.title,
                    "severity": alert.severity,
                    "county":   alert.county.name,
                    "status":   alert.status,
                    "ts":       alert.created_at.isoformat(),
                },
            },
        )
    except Exception as exc:
        logger.error("broadcast_alert_to_websocket failed: %s", exc)
