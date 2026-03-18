"""
api/models.py

Stub County model — required by accounts.User.county FK.
Full data models (SubCounty, FloodObservation, etc.) come in Epic 2 / Issue #14.
"""
from django.db import models
from django.conf import settings


class County(models.Model):
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=5, unique=True)
    region = models.CharField(max_length=50)
    population = models.IntegerField()
    centroid_lat = models.FloatField()
    centroid_lon = models.FloatField()
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Counties"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

class SubCounty(models.Model):
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name="sub_counties")
    name = models.CharField(max_length=100)
    population = models.IntegerField(default=0)
    area_sqkm = models.FloatField()

    class Meta:
        verbose_name_plural = "Sub Counties"
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.county.name})"

class FloodObservation(models.Model):
    sub_county = models.ForeignKey(SubCounty, on_delete=models.CASCADE)
    rainfall_accumulation = models.FloatField()
    soil_moisture = models.FloatField()
    elevation = models.FloatField()
    past_flood_occurrence = models.BooleanField()
    observed_at = models.DateTimeField(auto_now_add=True)
    source = models.CharField(max_length=50, default="manual")

    class Meta:
        indexes = [
            models.Index(fields=["sub_county", "observed_at"])
        ]

    def __str__(self) -> str:
        return f"Observation for {self.sub_county.name} at {self.observed_at}"

class FloodPrediction(models.Model):
    observation = models.ForeignKey(FloodObservation, on_delete=models.CASCADE)
    sub_county = models.ForeignKey(SubCounty, on_delete=models.CASCADE)
    flood_probability = models.FloatField()
    risk_category = models.CharField(max_length=20)
    lead_time_days = models.IntegerField()
    confidence = models.FloatField()
    predicted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Prediction for {self.sub_county.name}: {self.risk_category}"

class FloodAlert(models.Model):
    SEVERITY_CHOICES = [
        ("critical", "Critical"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("acknowledged", "Acknowledged"),
        ("resolved", "Resolved"),
    ]
    county = models.ForeignKey(County, on_delete=models.CASCADE)
    sub_county = models.ForeignKey(SubCounty, on_delete=models.CASCADE, null=True, blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_alerts")
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="acknowledged_alerts")
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["severity", "status"])
        ]

    def __str__(self) -> str:
        return f"[{self.get_severity_display()}] {self.title}"

class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=50)
    resource_id = models.IntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    @classmethod
    def log(cls, user, action, resource):
        return cls.objects.create(
            user=user if user and user.is_authenticated else None,
            action=action,
            resource_type=resource.__class__.__name__ if resource else "",
            resource_id=resource.pk if hasattr(resource, 'pk') else None,
        )

    def __str__(self) -> str:
        user_email = self.user.email if self.user else "System"
        return f"{user_email} {self.action} {self.resource_type} {self.resource_id}"

class Report(models.Model):
    REPORT_TYPES = [
        ("bulletin", "Flood Risk Bulletin"),
        ("situation", "Situation Report"),
        ("ai_brief", "AI Briefing Summary"),
    ]

    title = models.CharField(max_length=200)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES, default="bulletin")
    county = models.ForeignKey(County, on_delete=models.CASCADE, null=True, blank=True)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    risk_summary = models.JSONField(default=dict)
    recommendations = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.title

class AIChatMessage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    is_ai = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self) -> str:
        sender = "AI" if self.is_ai else self.user.email
        return f"{sender}: {self.message[:50]}..."

class AIRequestLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.user.email} at {self.timestamp}"


# ── Enterprise models ─────────────────────────────────────────────────────────

class Incident(models.Model):
    TYPE_CHOICES = [
        ("flood", "Flood"),
        ("drought", "Drought"),
        ("landslide", "Landslide"),
        ("infrastructure", "Infrastructure Damage"),
        ("displacement", "Mass Displacement"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("open", "Open"),
        ("active", "Active"),
        ("contained", "Contained"),
        ("closed", "Closed"),
    ]
    SEVERITY_CHOICES = [
        ("critical", "Critical"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]

    title = models.CharField(max_length=200)
    incident_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default="flood")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="medium")
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name="incidents")
    sub_county = models.ForeignKey(SubCounty, on_delete=models.SET_NULL, null=True, blank=True, related_name="incidents")
    lat = models.FloatField(null=True, blank=True)
    lon = models.FloatField(null=True, blank=True)
    description = models.TextField(blank=True)
    affected_population = models.IntegerField(default=0)
    opened_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="opened_incidents")
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="closed_incidents")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "severity", "county"])]

    def __str__(self) -> str:
        return f"[{self.get_severity_display()}] {self.title}"


class IncidentUpdate(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name="updates")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    body = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_system = models.BooleanField(default=False)  # True for auto-generated timeline entries

    class Meta:
        ordering = ["timestamp"]

    def __str__(self) -> str:
        return f"Update on {self.incident.title} at {self.timestamp}"


class FieldUnit(models.Model):
    TYPE_CHOICES = [
        ("vehicle", "Vehicle"),
        ("boat", "Boat"),
        ("drone", "Drone"),
        ("foot", "Foot Patrol"),
        ("helicopter", "Helicopter"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("standby", "Standby"),
        ("offline", "Offline"),
    ]

    name = models.CharField(max_length=100)
    unit_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="vehicle")
    operator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name="field_units")
    incident = models.ForeignKey(Incident, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_units")
    current_lat = models.FloatField(null=True, blank=True)
    current_lon = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="standby")
    last_ping = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_unit_type_display()})"


class FieldUnitPing(models.Model):
    unit = models.ForeignKey(FieldUnit, on_delete=models.CASCADE, related_name="pings")
    lat = models.FloatField()
    lon = models.FloatField()
    speed_kmh = models.FloatField(default=0)
    heading = models.FloatField(default=0)  # degrees 0-360
    battery_pct = models.IntegerField(default=100)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [models.Index(fields=["unit", "timestamp"])]

    def __str__(self) -> str:
        return f"{self.unit.name} ping at {self.timestamp}"


class CameraFeed(models.Model):
    TYPE_CHOICES = [
        ("cctv", "CCTV"),
        ("drone", "Drone"),
        ("satellite", "Satellite"),
        ("weather", "Weather Station"),
        ("river", "River Gauge Camera"),
    ]
    STATUS_CHOICES = [
        ("online", "Online"),
        ("offline", "Offline"),
        ("degraded", "Degraded"),
    ]

    name = models.CharField(max_length=150)
    location_label = models.CharField(max_length=200, blank=True)
    lat = models.FloatField()
    lon = models.FloatField()
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name="cameras")
    stream_url = models.URLField(max_length=500)  # RTSP, HLS, or MJPEG URL
    feed_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="cctv")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="offline")
    is_public = models.BooleanField(default=False)
    last_checked = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    agency = models.CharField(max_length=50, blank=True, default='Other')
    notes  = models.TextField(blank=True)

    class Meta:
        ordering = ["county", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_feed_type_display()}) — {self.county}"


class SocialIntelItem(models.Model):
    SOURCE_CHOICES = [
        ("twitter", "Twitter/X"),
        ("facebook", "Facebook"),
        ("news_rss", "News RSS"),
        ("radio", "Radio Transcript"),
        ("manual", "Manual Entry"),
    ]
    SENTIMENT_CHOICES = [
        ("urgent", "Urgent"),
        ("negative", "Negative"),
        ("neutral", "Neutral"),
        ("positive", "Positive"),
    ]
    FLAG_CHOICES = [
        ("unreviewed", "Unreviewed"),
        ("verified", "Verified"),
        ("false", "False/Irrelevant"),
        ("escalated", "Escalated"),
    ]

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="news_rss")
    url = models.URLField(max_length=500, blank=True)
    title = models.CharField(max_length=300, blank=True)
    snippet = models.TextField()
    sentiment = models.CharField(max_length=20, choices=SENTIMENT_CHOICES, default="neutral")
    county = models.ForeignKey(County, on_delete=models.SET_NULL, null=True, blank=True, related_name="intel_items")
    extracted_lat = models.FloatField(null=True, blank=True)
    extracted_lon = models.FloatField(null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    flag = models.CharField(max_length=20, choices=FLAG_CHOICES, default="unreviewed")
    flagged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    ingested_at = models.DateTimeField(auto_now_add=True)
    source_published_at = models.DateTimeField(null=True, blank=True)
    content_hash = models.CharField(max_length=64, unique=True)  # SHA-256 for dedup

    class Meta:
        ordering = ["-ingested_at"]
        indexes = [models.Index(fields=["county", "sentiment", "ingested_at"])]

    def __str__(self) -> str:
        return f"[{self.get_source_display()}] {self.title[:60]}"


class WeatherObservation(models.Model):
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name="weather_observations")
    station_id = models.CharField(max_length=50)
    station_name = models.CharField(max_length=100, blank=True)
    rainfall_mm = models.FloatField(default=0)
    temperature_c = models.FloatField(null=True, blank=True)
    humidity_pct = models.FloatField(null=True, blank=True)
    wind_speed_kmh = models.FloatField(null=True, blank=True)
    river_level_cm = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=50, default="kmd")  # kmd, wra, manual
    observed_at = models.DateTimeField()
    ingested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-observed_at"]
        indexes = [models.Index(fields=["county", "station_id", "observed_at"])]

    def __str__(self) -> str:
        return f"{self.station_name or self.station_id} — {self.observed_at.date()}"


class BroadcastRecipient(models.Model):
    CHANNEL_CHOICES = [
        ("sms", "SMS"),
        ("whatsapp", "WhatsApp"),
        ("email", "Email"),
    ]

    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name="broadcast_recipients")
    sub_county = models.ForeignKey(SubCounty, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)  # E.164 format e.g. +254712345678
    email = models.EmailField(blank=True)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="sms")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["county", "name"]
        constraints = [
            # Same phone can't be on the same channel twice
            models.UniqueConstraint(
                fields=["phone", "channel"],
                condition=models.Q(phone__gt=""),
                name="unique_recipient_phone_channel",
            ),
            # Same email can't be on the same channel twice
            models.UniqueConstraint(
                fields=["email", "channel"],
                condition=models.Q(email__gt=""),
                name="unique_recipient_email_channel",
            ),
        ]

    @staticmethod
    def normalize_phone(phone: str) -> str:
        """Normalize Kenyan phone numbers to E.164 (+254XXXXXXXXX)."""
        import re
        if not phone:
            return phone
        p = re.sub(r"[\s\-\(\)]", "", phone.strip())
        if re.match(r"^0[17]\d{8}$", p):      # 07XXXXXXXX / 01XXXXXXXX
            p = "+254" + p[1:]
        elif re.match(r"^254\d{9}$", p):       # 2547XXXXXXXX (no +)
            p = "+" + p
        return p

    def save(self, *args, **kwargs):
        self.phone = self.normalize_phone(self.phone)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} ({self.phone or self.email})"


class EarlyWarningBroadcast(models.Model):
    CHANNEL_CHOICES = [
        ("sms", "SMS"),
        ("whatsapp", "WhatsApp"),
        ("email", "Email"),
    ]
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("sending", "Sending"),
        ("sent", "Sent"),
        ("failed", "Failed"),
    ]

    alert = models.ForeignKey(FloodAlert, on_delete=models.SET_NULL, null=True, blank=True, related_name="broadcasts")
    incident = models.ForeignKey(Incident, on_delete=models.SET_NULL, null=True, blank=True, related_name="broadcasts")
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="sms")
    message = models.TextField()
    counties = models.ManyToManyField(County, related_name="broadcasts")
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    recipient_count = models.IntegerField(default=0)
    delivered_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    provider_response = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.get_channel_display()}] Broadcast {self.id} — {self.status}"


class AnnotatedZone(models.Model):
    TYPE_CHOICES = [
        ("evacuation_route", "Evacuation Route"),
        ("staging_area", "Staging Area"),
        ("cordon", "Cordon Zone"),
        ("flood_extent", "Estimated Flood Extent"),
        ("safe_zone", "Safe Zone"),
    ]

    label = models.CharField(max_length=200)
    zone_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    geojson_geometry = models.JSONField()  # GeoJSON geometry object
    incident = models.ForeignKey(Incident, on_delete=models.SET_NULL, null=True, blank=True, related_name="annotated_zones")
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name="annotated_zones")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.label} ({self.get_zone_type_display()})"


class AlertSubscription(models.Model):
    CHANNEL_CHOICES = [
        ("sms", "SMS"),
        ("email", "Email"),
    ]
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='sms')
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name='subscriptions', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('phone', 'county'), ('email', 'county')]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.phone or self.email} — {self.county}"


import secrets as _secrets


class APIKey(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100)  # e.g. "Dashboard integration"
    key = models.CharField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)
    last_used = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} — {self.name}"

    @classmethod
    def generate(cls, user, name):
        key = _secrets.token_hex(32)
        return cls.objects.create(user=user, name=name, key=key)
