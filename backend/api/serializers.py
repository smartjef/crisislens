"""Serializers for the CrisisLens API."""
from __future__ import annotations

from rest_framework import serializers
from api.models import (
    County, SubCounty, FloodObservation, FloodPrediction, FloodAlert, Report, AIChatMessage,
    Incident, IncidentUpdate, FieldUnit, FieldUnitPing,
    CameraFeed, SocialIntelItem, WeatherObservation,
    BroadcastRecipient, EarlyWarningBroadcast, AnnotatedZone,
)

class DroughtPredictionRequest(serializers.Serializer):
    rainfall_deviation = serializers.FloatField(
        help_text="Percent deviation from historical rainfall average (negative is drier)."
    )
    ndvi_stress = serializers.FloatField(min_value=0, max_value=1)
    price_volatility = serializers.FloatField(help_text="Percent volatility in staple prices.")
    historical_phase = serializers.ChoiceField(
        choices=["Normal", "Alert", "Alarm", "Emergency"],
        help_text="Most recent NDMA drought phase.",
    )


class DroughtPredictionResponse(serializers.Serializer):
    drought_risk_score = serializers.FloatField()
    projected_phase = serializers.CharField()
    lead_time_weeks = serializers.IntegerField()
    confidence = serializers.FloatField()


class FloodPredictionRequest(serializers.Serializer):
    rainfall_accumulation = serializers.FloatField(help_text="Recent rainfall total in mm.")
    soil_moisture = serializers.FloatField(min_value=0, max_value=1)
    elevation = serializers.FloatField(help_text="Elevation in meters.")
    past_flood_occurrence = serializers.BooleanField()


class FloodPredictionResponse(serializers.Serializer):
    flood_probability = serializers.FloatField()
    risk_category = serializers.CharField()
    lead_time_days = serializers.IntegerField()
    confidence = serializers.FloatField()


class AIFeedbackRequest(serializers.Serializer):
    county = serializers.CharField()
    area = serializers.CharField(allow_blank=True, required=False)
    risk_type = serializers.ChoiceField(choices=["drought", "flood", "all"])
    question = serializers.CharField()


class AIFeedbackResponse(serializers.Serializer):
    response = serializers.CharField()


class AIChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIChatMessage
        fields = ["id", "message", "is_ai", "timestamp"]


class AIChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField()
    county = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    area = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class FloodObservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FloodObservation
        fields = [
            "rainfall_accumulation", "soil_moisture", "elevation",
            "past_flood_occurrence", "observed_at", "source"
        ]


class FloodPredictionSerializer(serializers.ModelSerializer):
    source = serializers.CharField(source="observation.source", read_only=True)

    class Meta:
        model = FloodPrediction
        fields = [
            "flood_probability", "risk_category", "lead_time_days",
            "confidence", "predicted_at", "source"
        ]


class SubCountyListSerializer(serializers.ModelSerializer):
    flood_probability = serializers.SerializerMethodField()
    risk_category = serializers.SerializerMethodField()
    lead_time_days = serializers.SerializerMethodField()
    confidence = serializers.SerializerMethodField()

    class Meta:
        model = SubCounty
        fields = [
            "id", "name", "population", "flood_probability",
            "risk_category", "lead_time_days", "confidence"
        ]

    def _get_latest_pred(self, obj):
        if not hasattr(obj, "_latest_pred"):
            obj._latest_pred = obj.floodprediction_set.order_by("-predicted_at").first()
        return obj._latest_pred

    def get_flood_probability(self, obj):
        pred = self._get_latest_pred(obj)
        return pred.flood_probability if pred else 0.0

    def get_risk_category(self, obj):
        pred = self._get_latest_pred(obj)
        return pred.risk_category if pred else "Normal"

    def get_lead_time_days(self, obj):
        pred = self._get_latest_pred(obj)
        return pred.lead_time_days if pred else 7

    def get_confidence(self, obj):
        pred = self._get_latest_pred(obj)
        return pred.confidence if pred else 0.0


class SubCountyDetailSerializer(SubCountyListSerializer):
    latest_prediction = serializers.SerializerMethodField()
    latest_observation = serializers.SerializerMethodField()
    county_name = serializers.CharField(source="county.name", read_only=True)

    class Meta(SubCountyListSerializer.Meta):
        fields = SubCountyListSerializer.Meta.fields + [
            "area_sqkm", "latest_prediction", "latest_observation", "county_name"
        ]

    def get_latest_prediction(self, obj):
        prediction = obj.floodprediction_set.order_by("-predicted_at").first()
        return FloodPredictionSerializer(prediction).data if prediction else None

    def get_latest_observation(self, obj):
        observation = obj.floodobservation_set.order_by("-observed_at").first()
        return FloodObservationSerializer(observation).data if observation else None


class SubCountyTopRiskSerializer(serializers.ModelSerializer):
    flood_probability = serializers.FloatField(read_only=True)
    risk_category = serializers.CharField(read_only=True)

    class Meta:
        model = SubCounty
        fields = ["id", "name", "flood_probability", "risk_category"]


class CountyListSerializer(serializers.ModelSerializer):
    flood_probability = serializers.SerializerMethodField()
    risk_category = serializers.SerializerMethodField()
    lead_time_days = serializers.SerializerMethodField()

    class Meta:
        model = County
        fields = [
            "id", "name", "code", "population",
            "flood_probability", "risk_category", "lead_time_days"
        ]

    def _get_aggregated(self, obj):
        if hasattr(obj, "_aggregated_risk"):
            return obj._aggregated_risk
            
        subs = list(obj.sub_counties.all())
        max_prob = 0.0
        min_lead = 7
        cats = []
        
        for sub in subs:
            pred = sub.floodprediction_set.order_by("-predicted_at").first()
            if pred:
                max_prob = max(max_prob, pred.flood_probability)
                min_lead = min(min_lead, pred.lead_time_days)
                cats.append(pred.risk_category)
                
        if max_prob >= 75 or "High" in cats:
            cat = "High"
        elif max_prob >= 50 or "Moderate" in cats:
            cat = "Moderate"
        elif cats:
            cat = "Low"
        else:
            cat = "Normal"
            
        obj._aggregated_risk = {
            "flood_probability": max_prob,
            "risk_category": cat,
            "lead_time_days": min_lead,
        }
        return obj._aggregated_risk

    def get_flood_probability(self, obj):
        return self._get_aggregated(obj)["flood_probability"]

    def get_risk_category(self, obj):
        return self._get_aggregated(obj)["risk_category"]

    def get_lead_time_days(self, obj):
        return self._get_aggregated(obj)["lead_time_days"]


class CountyDetailSerializer(serializers.ModelSerializer):
    top_sub_counties = serializers.SerializerMethodField()

    class Meta:
        model = County
        fields = [
            "id", "name", "code", "region", "population",
            "centroid_lat", "centroid_lon", "top_sub_counties"
        ]

    def get_top_sub_counties(self, obj):
        # We assume the queryset passed to this serializer has prefetched predictions,
        # but for simplicity we can query directly or rely on the view's query.
        subs = list(obj.sub_counties.all())
        for sub in subs:
            pred = sub.floodprediction_set.order_by("-predicted_at").first()
            sub.flood_probability = pred.flood_probability if pred else 0.0
            sub.risk_category = pred.risk_category if pred else "Normal"
        subs.sort(key=lambda s: s.flood_probability, reverse=True)
        return SubCountyTopRiskSerializer(subs[:3], many=True).data


class FloodAlertSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source="county.name", read_only=True)
    sub_county_name = serializers.CharField(source="sub_county.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = FloodAlert
        fields = [
            "id", "county", "county_name", "sub_county", "sub_county_name",
            "severity", "title", "description", "status",
            "created_by", "created_by_name", "created_at",
            "acknowledged_at", "acknowledged_by", "resolved_at"
        ]
        read_only_fields = [
            "status", "created_by", "created_at",
            "acknowledged_at", "acknowledged_by", "resolved_at"
        ]

class ReportSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source="county.name", read_only=True)
    generated_by_name = serializers.CharField(source="generated_by.get_full_name", read_only=True)
    report_type_display = serializers.CharField(source="get_report_type_display", read_only=True)

    class Meta:
        model = Report
        fields = [
            "id", "title", "report_type", "report_type_display", "county", "county_name",
            "generated_by", "generated_by_name", "risk_summary",
            "recommendations", "created_at"
        ]
        read_only_fields = ["generated_by", "created_at", "risk_summary", "recommendations"]


# ── Enterprise serializers ────────────────────────────────────────────────────

class IncidentUpdateSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = IncidentUpdate
        fields = ["id", "author", "author_name", "body", "timestamp", "is_system"]
        read_only_fields = ["author", "timestamp", "is_system"]


class IncidentSerializer(serializers.ModelSerializer):
    county_name      = serializers.CharField(source="county.name", read_only=True)
    sub_county_name  = serializers.CharField(source="sub_county.name", read_only=True)
    opened_by_name   = serializers.CharField(source="opened_by.get_full_name", read_only=True)
    updates          = IncidentUpdateSerializer(many=True, read_only=True)
    update_count     = serializers.IntegerField(source="updates.count", read_only=True)

    class Meta:
        model = Incident
        fields = [
            "id", "title", "incident_type", "status", "severity",
            "county", "county_name", "sub_county", "sub_county_name",
            "lat", "lon", "description", "affected_population",
            "opened_by", "opened_by_name", "created_at", "updated_at",
            "closed_at", "updates", "update_count",
        ]
        read_only_fields = ["opened_by", "created_at", "updated_at"]


class FieldUnitPingSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldUnitPing
        fields = ["id", "lat", "lon", "speed_kmh", "heading", "battery_pct", "timestamp"]


class FieldUnitSerializer(serializers.ModelSerializer):
    county_name    = serializers.CharField(source="county.name", read_only=True)
    operator_name  = serializers.CharField(source="operator.get_full_name", read_only=True)
    incident_title = serializers.CharField(source="incident.title", read_only=True)
    latest_ping    = serializers.SerializerMethodField()

    class Meta:
        model = FieldUnit
        fields = [
            "id", "name", "unit_type", "status",
            "county", "county_name", "operator", "operator_name",
            "incident", "incident_title",
            "current_lat", "current_lon", "last_ping", "created_at",
            "latest_ping",
        ]
        read_only_fields = ["last_ping", "created_at"]

    def get_latest_ping(self, obj):
        ping = obj.pings.first()
        return FieldUnitPingSerializer(ping).data if ping else None


class CameraFeedSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source="county.name", read_only=True)

    class Meta:
        model = CameraFeed
        fields = [
            "id", "name", "location_label", "lat", "lon",
            "county", "county_name", "stream_url", "feed_type",
            "status", "is_public", "last_checked", "created_at",
        ]
        read_only_fields = ["last_checked", "created_at"]


class SocialIntelItemSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source="county.name", read_only=True)
    flagged_by_name = serializers.CharField(source="flagged_by.get_full_name", read_only=True)

    class Meta:
        model = SocialIntelItem
        fields = [
            "id", "source", "url", "title", "snippet",
            "sentiment", "county", "county_name",
            "extracted_lat", "extracted_lon", "tags",
            "flag", "flagged_by", "flagged_by_name",
            "ingested_at", "source_published_at",
        ]
        read_only_fields = [
            "source", "url", "title", "snippet", "sentiment",
            "county", "extracted_lat", "extracted_lon", "tags",
            "ingested_at", "source_published_at",
        ]


class WeatherObservationSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source="county.name", read_only=True)
    centroid_lat = serializers.FloatField(source="county.centroid_lat", read_only=True)
    centroid_lon = serializers.FloatField(source="county.centroid_lon", read_only=True)

    class Meta:
        model = WeatherObservation
        fields = [
            "id", "county", "county_name", "centroid_lat", "centroid_lon",
            "station_id", "station_name",
            "rainfall_mm", "temperature_c", "humidity_pct",
            "wind_speed_kmh", "river_level_cm",
            "source", "observed_at", "ingested_at",
        ]
        read_only_fields = ["ingested_at"]


class BroadcastRecipientSerializer(serializers.ModelSerializer):
    county_name     = serializers.CharField(source="county.name", read_only=True)
    sub_county_name = serializers.CharField(source="sub_county.name", read_only=True)

    class Meta:
        model = BroadcastRecipient
        fields = [
            "id", "county", "county_name", "sub_county", "sub_county_name",
            "name", "phone", "email", "channel", "is_active", "created_at",
        ]
        read_only_fields = ["created_at"]


class EarlyWarningBroadcastSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.CharField(source="sent_by.get_full_name", read_only=True)
    counties_list = serializers.SerializerMethodField()

    class Meta:
        model = EarlyWarningBroadcast
        fields = [
            "id", "alert", "incident", "channel", "message",
            "counties", "counties_list",
            "sent_by", "sent_by_name", "status",
            "recipient_count", "delivered_count", "failed_count",
            "created_at", "sent_at",
        ]
        read_only_fields = [
            "sent_by", "status", "recipient_count",
            "delivered_count", "failed_count", "created_at", "sent_at",
        ]

    def get_counties_list(self, obj):
        return [{"id": c.id, "name": c.name} for c in obj.counties.all()]


class AnnotatedZoneSerializer(serializers.ModelSerializer):
    county_name  = serializers.CharField(source="county.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = AnnotatedZone
        fields = [
            "id", "label", "zone_type", "geojson_geometry",
            "incident", "county", "county_name",
            "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]
