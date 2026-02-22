"""Core scoring logic for CrisisLens MVP."""
from __future__ import annotations

import math

PHASE_SCORES = {
    "Normal": 0.1,
    "Alert": 0.35,
    "Alarm": 0.65,
    "Emergency": 0.9,
}


def _sigmoid(value: float) -> float:
    return 1 / (1 + math.exp(-value))


def score_drought(
    rainfall_deviation: float,
    ndvi_stress: float,
    price_volatility: float,
    historical_phase: str,
) -> dict[str, float | int | str]:
    phase_score = PHASE_SCORES.get(historical_phase, 0.35)
    rainfall_component = max(0.0, -rainfall_deviation) / 100
    price_component = max(0.0, price_volatility) / 100

    pressure = (
        1.4 * rainfall_component
        + 1.1 * ndvi_stress
        + 0.9 * price_component
        + 0.8 * phase_score
    )

    risk_score = _sigmoid(pressure * 2.2)

    if risk_score >= 0.8:
        phase = "Emergency"
    elif risk_score >= 0.6:
        phase = "Alarm"
    elif risk_score >= 0.4:
        phase = "Alert"
    else:
        phase = "Normal"

    lead_time = 4 if risk_score < 0.5 else 8
    confidence = round(min(0.95, 0.55 + (risk_score * 0.4)), 2)

    return {
        "drought_risk_score": round(risk_score * 100, 2),
        "projected_phase": phase,
        "lead_time_weeks": lead_time,
        "confidence": confidence,
    }


def score_flood(
    rainfall_accumulation: float,
    soil_moisture: float,
    elevation: float,
    past_flood_occurrence: bool,
) -> dict[str, float | int | str]:
    rainfall_component = rainfall_accumulation / 200
    elevation_component = max(0.0, (200 - elevation) / 200)
    history_component = 0.3 if past_flood_occurrence else 0.0

    pressure = (
        1.2 * rainfall_component
        + 1.4 * soil_moisture
        + 1.1 * elevation_component
        + history_component
    )

    probability = _sigmoid(pressure * 1.8)

    if probability >= 0.75:
        category = "High"
        lead_time = 3
    elif probability >= 0.5:
        category = "Moderate"
        lead_time = 5
    else:
        category = "Low"
        lead_time = 7

    confidence = round(min(0.92, 0.5 + probability * 0.35), 2)

    return {
        "flood_probability": round(probability * 100, 2),
        "risk_category": category,
        "lead_time_days": lead_time,
        "confidence": confidence,
    }
