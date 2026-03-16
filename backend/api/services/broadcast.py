"""
api/services/broadcast.py

OnfonMedia bulk SMS integration.
Docs: https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS
"""
from __future__ import annotations

import logging
from typing import Any

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def _build_recipients(phone_numbers: list[str]) -> list[dict]:
    """Convert a list of E.164 phone numbers to the OnfonMedia recipient format."""
    return [{"MobileNumber": num} for num in phone_numbers]


def send_bulk_sms(
    phone_numbers: list[str],
    message: str,
    sender_id: str | None = None,
) -> dict[str, Any]:
    """
    Send a bulk SMS via OnfonMedia.

    Args:
        phone_numbers: List of E.164 numbers e.g. ["+254712345678", ...]
        message:       SMS body text (max 160 chars per segment)
        sender_id:     Override the default CRISISLENS sender ID

    Returns:
        dict with keys:
          - success (bool)
          - message_id (str | None)
          - delivered (int)
          - failed (int)
          - raw (dict)  — full provider response
    """
    if not settings.ONFON_API_KEY:
        logger.warning("ONFON_API_KEY not set — SMS send skipped (dev mode).")
        return {
            "success": True,
            "message_id": "DEV-NO-KEY",
            "delivered": len(phone_numbers),
            "failed": 0,
            "raw": {"note": "dev mode, key not set"},
        }

    if not phone_numbers:
        return {"success": False, "message_id": None, "delivered": 0, "failed": 0, "raw": {}}

    payload = {
        "ApiKey": settings.ONFON_API_KEY,
        "ClientId": settings.ONFON_SENDER_ID,
        "SenderId": sender_id or settings.ONFON_SENDER_ID,
        "MessageParameters": [
            {
                "Number": num.lstrip("+"),   # OnfonMedia expects digits without leading +
                "Text":   message,
            }
            for num in phone_numbers
        ],
    }

    try:
        resp = requests.post(
            settings.ONFON_SMS_URL,
            json=payload,
            timeout=30,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()

        # OnfonMedia returns a list of per-message results
        results = data if isinstance(data, list) else data.get("Data", [])
        delivered = sum(1 for r in results if str(r.get("MessageErrorCode", "1")) == "0")
        failed    = len(phone_numbers) - delivered

        logger.info(
            "OnfonMedia SMS: %d delivered, %d failed out of %d",
            delivered, failed, len(phone_numbers),
        )
        return {
            "success": True,
            "message_id": str(resp.headers.get("X-Message-Id", "")),
            "delivered": delivered,
            "failed": failed,
            "raw": data,
        }

    except requests.RequestException as exc:
        logger.error("OnfonMedia SMS request failed: %s", exc)
        return {
            "success": False,
            "message_id": None,
            "delivered": 0,
            "failed": len(phone_numbers),
            "raw": {"error": str(exc)},
        }


def dispatch_broadcast(broadcast_id: int) -> None:
    """
    Load an EarlyWarningBroadcast record, resolve recipients for its counties,
    and fire the SMS via OnfonMedia.  Updates the broadcast record in-place.

    Called by the Celery task `api.tasks.send_broadcast_task`.
    """
    from api.models import EarlyWarningBroadcast, BroadcastRecipient

    try:
        broadcast = EarlyWarningBroadcast.objects.get(pk=broadcast_id)
    except EarlyWarningBroadcast.DoesNotExist:
        logger.error("Broadcast %d not found", broadcast_id)
        return

    if broadcast.channel != "sms":
        logger.warning("Non-SMS channels not yet implemented (broadcast %d)", broadcast_id)
        broadcast.status = "failed"
        broadcast.provider_response = {"error": "channel not implemented"}
        broadcast.save(update_fields=["status", "provider_response"])
        return

    county_ids = list(broadcast.counties.values_list("id", flat=True))
    phones = list(
        BroadcastRecipient.objects.filter(
            county_id__in=county_ids,
            channel="sms",
            is_active=True,
        ).exclude(phone="").values_list("phone", flat=True)
    )

    broadcast.status = "sending"
    broadcast.recipient_count = len(phones)
    broadcast.save(update_fields=["status", "recipient_count"])

    if not phones:
        broadcast.status = "failed"
        broadcast.provider_response = {"error": "no active SMS recipients found"}
        broadcast.save(update_fields=["status", "provider_response"])
        return

    result = send_bulk_sms(phones, broadcast.message)

    broadcast.delivered_count = result["delivered"]
    broadcast.failed_count    = result["failed"]
    broadcast.status          = "sent" if result["success"] else "failed"
    broadcast.sent_at         = timezone.now()
    broadcast.provider_response = result["raw"]
    broadcast.save(update_fields=[
        "delivered_count", "failed_count", "status", "sent_at", "provider_response",
    ])
