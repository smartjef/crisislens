"""Serializers for the CrisisLens MVP API."""
from __future__ import annotations

from rest_framework import serializers


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
