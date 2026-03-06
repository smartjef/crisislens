from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import County, SubCounty, FloodObservation, FloodPrediction, FloodAlert, AuditLog, Report
from .services import score_flood

@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "region", "population", "is_active"]
    list_filter  = ["region", "is_active"]
    search_fields = ("name", "code")


@admin.register(SubCounty)
class SubCountyAdmin(admin.ModelAdmin):
    list_display    = ["name", "county", "population"]
    list_filter     = ["county"]
    search_fields   = ("name", "county__name")
    raw_id_fields   = ["county"]


@admin.register(FloodObservation)
class FloodObservationAdmin(admin.ModelAdmin):
    list_display = ("sub_county", "rainfall_accumulation", "soil_moisture", "source", "observed_at")
    list_filter = ("source", "past_flood_occurrence")
    search_fields = ("sub_county__name",)


@admin.register(FloodPrediction)
class FloodPredictionAdmin(admin.ModelAdmin):
    list_display = ["sub_county", "flood_probability", "risk_category", "lead_time_days", "predicted_at"]
    list_filter  = ["risk_category", "sub_county__county"]
    search_fields = ("sub_county__name",)
    actions      = ["regenerate_all_predictions"]

    @admin.action(description="Regenerate all predictions based on latest observations")
    def regenerate_all_predictions(self, request, queryset):
        observations = FloodObservation.objects.all()
        count = 0
        for obs in observations:
            scores = score_flood(
                obs.rainfall_accumulation,
                obs.soil_moisture,
                obs.elevation,
                obs.past_flood_occurrence
            )
            FloodPrediction.objects.create(
                observation=obs,
                sub_county=obs.sub_county,
                flood_probability=scores["flood_probability"],
                risk_category=scores["risk_category"],
                lead_time_days=scores["lead_time_days"],
                confidence=scores["confidence"]
            )
            count += 1
        self.message_user(request, f"Generated {count} new predictions.")


@admin.register(FloodAlert)
class FloodAlertAdmin(admin.ModelAdmin):
    list_display = ["title", "county", "severity", "status", "created_by", "created_at"]
    list_filter  = ["severity", "status", "county"]
    search_fields = ("title", "description", "county__name")
    actions      = ["mark_all_acknowledged"]

    def severity_badge(self, obj):
        colors = {
            "critical": "#ef4444", # red-500
            "high":     "#f59e0b", # amber-500
            "medium":   "#3b82f6", # blue-500
            "low":      "#10b981", # emerald-500
        }
        color = colors.get(obj.severity, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px;">{}</span>',
            color, obj.get_severity_display()
        )
    severity_badge.short_description = "Severity"

    # Swap colored_severity for requirements' list_display
    @admin.action(description="Mark all selected alerts as acknowledged")
    def mark_all_acknowledged(self, request, queryset):
        count = queryset.update(status="acknowledged", acknowledged_at=timezone.now())
        self.message_user(request, f"Successfully marked {count} alerts as acknowledged.")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["user", "action", "resource_type", "timestamp"]
    list_filter  = ["action", "resource_type"]
    search_fields = ("user__email", "action")
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["title", "report_type", "county", "generated_by", "created_at"]
    list_filter  = ["report_type", "county"]
    search_fields = ("title", "generated_by__email")
