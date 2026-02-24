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
