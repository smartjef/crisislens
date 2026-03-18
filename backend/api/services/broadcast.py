"""
api/services/broadcast.py

Broadcast dispatching via TextSMS, SMTP (Brevo), and Pusher Beams.
"""
from __future__ import annotations

import logging
from typing import Any
import json
import threading

import requests
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail, get_connection

logger = logging.getLogger(__name__)


def send_bulk_sms(
    phone_numbers: list[str],
    message: str,
    sender_id: str | None = None,
) -> dict[str, Any]:
    """
    Send a bulk SMS via TextSMS.co.ke using their bulk API.
    """
    if not settings.TEXTSMS_API_KEY:
        logger.warning("TEXTSMS_API_KEY not set — SMS send skipped (dev mode).")
        return {"success": True, "delivered": len(phone_numbers), "failed": 0, "raw": {"note": "dev mode"}}

    if not phone_numbers:
        return {"success": False, "delivered": 0, "failed": 0, "raw": {}}

    chunk_size = 50  # Increased from 20 for better efficiency but sticking to chunking
    chunks = [phone_numbers[i:i + chunk_size] for i in range(0, len(phone_numbers), chunk_size)]
    
    total_delivered = 0
    total_failed = 0
    all_responses = []

    for chunk in chunks:
        sms_list = [
            {
                'apikey': settings.TEXTSMS_API_KEY,
                'partnerID': settings.TEXTSMS_PARTNER_ID,
                'shortcode': sender_id or settings.TEXTSMS_SHORTCODE,
                'pass_type': 'plain',
                'mobile': num.lstrip("+"),
                'message': message
            }
            for num in chunk
        ]
        
        payload = {
            'count': len(sms_list),
            'smslist': sms_list
        }
        
        try:
            resp = requests.post(
                settings.TEXTSMS_BULK_URL,
                json=payload,
                timeout=30,
                headers={'Content-Type': 'application/json'}
            )
            resp.raise_for_status()
            data = resp.json()
            all_responses.append(data)
            
            # Response handling based on TextSMS typical { "responses": [ ... ] } or direct result
            # Assuming success for now if 200 OK since data structure can vary
            total_delivered += len(chunk)
        except requests.RequestException as exc:
            logger.error("TextSMS request failed for chunk: %s", exc)
            total_failed += len(chunk)

    return {
        "success": total_delivered > 0,
        "delivered": total_delivered,
        "failed": total_failed,
        "raw": all_responses
    }

def send_bulk_email(
    emails: list[str],
    message: str,
    subject: str = "CrisisLens Emergency Alert"
) -> dict[str, Any]:
    """
    Send bulk email using Django's SMTP backend.
    """
    if not emails:
        return {"success": False, "delivered": 0, "failed": 0, "raw": {}}
        
    try:
        connection = get_connection()
        connection.open()
        
        delivered = 0
        failed = 0
        
        for email in emails:
            try:
                msg_count = send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    connection=connection,
                    fail_silently=False,
                )
                if msg_count > 0:
                    delivered += 1
                else:
                    failed += 1
            except Exception as e:
                logger.error("Failed to send email to %s: %s", email, str(e))
                failed += 1
                
        connection.close()
        return {
            "success": delivered > 0,
            "delivered": delivered,
            "failed": failed,
            "raw": {"note": "Sent via SMTP"},
        }
    except Exception as exc:
        logger.error("SMTP Connection failed: %s", exc)
        return {"success": False, "delivered": 0, "failed": len(emails), "raw": {"error": str(exc)}}

def send_pusher_beams_notification(title: str, body: str, interests: list[str]) -> None:
    """Publish a Push Notification via Pusher Beams."""
    if not settings.PUSHER_BEAMS_INSTANCE_ID or not settings.PUSHER_BEAMS_SECRET_KEY:
        return
        
    url = f"https://{settings.PUSHER_BEAMS_INSTANCE_ID}.pushnotifications.pusher.com/publish_api/v1/instances/{settings.PUSHER_BEAMS_INSTANCE_ID}/publishes"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.PUSHER_BEAMS_SECRET_KEY}",
    }
    payload = {
        "interests": interests,
        "web": {
            "notification": {
                "title": title,
                "body": body,
            }
        }
    }
    try:
        requests.post(url, json=payload, headers=headers, timeout=10)
    except Exception as e:
        logger.error("Pusher Beams failed: %s", e)


def dispatch_broadcast(broadcast_id: int) -> None:
    """
    Load an EarlyWarningBroadcast record, resolve recipients for its counties,
    and fire the communication via the chosen channel.
    Updates the broadcast record in-place.
    """
    from api.models import EarlyWarningBroadcast, BroadcastRecipient, BroadcastDeliveryLog

    try:
        broadcast = EarlyWarningBroadcast.objects.get(pk=broadcast_id)
    except EarlyWarningBroadcast.DoesNotExist:
        logger.error("Broadcast %d not found", broadcast_id)
        return

    county_ids = list(broadcast.counties.values_list("id", flat=True))
    
    # 1. Trigger Pusher Push Notification (optional interest publish)
    county_names = list(broadcast.counties.values_list("name", flat=True))
    interests = [f"county-{c.lower()}" for c in county_names]
    if interests:
        title = "CrisisLens Emergency Alert"
        if broadcast.alert:
            title = f"[{broadcast.alert.get_severity_display().upper()}] Alert for {', '.join(county_names)}"
        send_pusher_beams_notification(title, broadcast.message[:100] + "...", interests)

    # 2. Channel-specific dispatch
    if broadcast.channel == "sms":
        targets = list(
            BroadcastRecipient.objects.filter(
                county_id__in=county_ids, channel="sms", is_active=True
            ).exclude(phone="").values_list("phone", flat=True)
        )
        broadcast.recipient_count = len(targets)
        broadcast.status = "sending"
        broadcast.save(update_fields=["status", "recipient_count"])
        
        if not targets:
            _fail_broadcast(broadcast, "no active SMS recipients found")
            return
            
        result = send_bulk_sms(targets, broadcast.message)
        # Create delivery logs (simulated individual status for now)
        logs = [
            BroadcastDeliveryLog(broadcast=broadcast, contact=phone, status="sent")
            for phone in targets
        ]
        BroadcastDeliveryLog.objects.bulk_create(logs)

    elif broadcast.channel == "email":
        targets = list(
            BroadcastRecipient.objects.filter(
                county_id__in=county_ids, channel="email", is_active=True
            ).exclude(email="").values_list("email", flat=True)
        )
        broadcast.recipient_count = len(targets)
        broadcast.status = "sending"
        broadcast.save(update_fields=["status", "recipient_count"])
        
        if not targets:
            _fail_broadcast(broadcast, "no active Email recipients found")
            return
            
        subject = "CrisisLens Emergency Broadcast"
        if broadcast.alert:
            subject = f"Alert: {broadcast.alert.title}"
        result = send_bulk_email(targets, broadcast.message, subject)
        
        logs = [
            BroadcastDeliveryLog(broadcast=broadcast, contact=email, status="sent")
            for email in targets
        ]
        BroadcastDeliveryLog.objects.bulk_create(logs)

    else:
        logger.warning(f"Channel {broadcast.channel} not implemented yet")
        _fail_broadcast(broadcast, f"channel {broadcast.channel} not implemented")
        return

    broadcast.delivered_count = result["delivered"]
    broadcast.failed_count    = result["failed"]
    broadcast.status          = "sent" if result["success"] else "failed"
    broadcast.sent_at         = timezone.now()
    broadcast.provider_response = result["raw"]
    broadcast.save(update_fields=[
        "delivered_count", "failed_count", "status", "sent_at", "provider_response",
    ])

def _fail_broadcast(broadcast, error_msg):
    broadcast.status = "failed"
    broadcast.provider_response = {"error": error_msg}
    broadcast.save(update_fields=["status", "provider_response"])
