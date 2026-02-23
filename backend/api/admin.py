from django.contrib import admin
from django.utils.html import format_html
from .models import County, SubCounty, FloodObservation, FloodPrediction, FloodAlert, AuditLog


@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "region", "population", "is_active")
    list_filter = ("region", "is_active")
    search_fields = ("name", "code")


@admin.register(SubCounty)
class SubCountyAdmin(admin.ModelAdmin):
    list_display = ("name", "county", "population", "area_sqkm")
    list_filter = ("county",)
    search_fields = ("name", "county__name")


@admin.register(FloodObservation)
class FloodObservationAdmin(admin.ModelAdmin):
    list_display = ("sub_county", "rainfall_accumulation", "soil_moisture", "source", "observed_at")
    list_filter = ("source", "past_flood_occurrence")
    search_fields = ("sub_county__name",)


@admin.register(FloodPrediction)
class FloodPredictionAdmin(admin.ModelAdmin):
    list_display = ("sub_county", "risk_category", "flood_probability", "lead_time_days", "predicted_at")
    list_filter = ("risk_category",)
    search_fields = ("sub_county__name",)


@admin.register(FloodAlert)
class FloodAlertAdmin(admin.ModelAdmin):
    list_display = ("title", "county", "sub_county", "colored_severity", "status", "created_at")
    list_filter = ("severity", "status", "county")
    search_fields = ("title", "description", "county__name")

    def colored_severity(self, obj):
        colors = {
            "critical": "red",
            "high": "orange",
            "medium": "goldenrod",
            "low": "green"
        }
        color = colors.get(obj.severity, "black")
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, obj.get_severity_display())
    colored_severity.short_description = "Severity"


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "resource_type", "resource_id", "timestamp")
    list_filter = ("action", "resource_type")
    search_fields = ("user__email", "action")
