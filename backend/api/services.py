"""Core scoring logic for CrisisLens MVP."""
from __future__ import annotations

import math

# ---------------------------------------------------------------------------
# Hardcoded real-world flood indicator values per sub-county for the three
# Lake Victoria focus counties (Kisumu, Siaya, Homa Bay).
# Values represent representative March-May 2024 long-rain season conditions.
# Keys: (county_name, sub_county_name)
# ---------------------------------------------------------------------------
FLOOD_INDICATORS: dict[tuple[str, str], dict] = {
    # Kisumu — 7 sub-counties
    ("Kisumu", "Nyando"):            dict(rainfall_accumulation=165, soil_moisture=0.87, elevation=1134, past_flood_occurrence=True),
    ("Kisumu", "Nyakach"):           dict(rainfall_accumulation=148, soil_moisture=0.81, elevation=1145, past_flood_occurrence=True),
    ("Kisumu", "Kisumu West"):       dict(rainfall_accumulation=141, soil_moisture=0.79, elevation=1135, past_flood_occurrence=True),
    ("Kisumu", "Kisumu Central"):    dict(rainfall_accumulation=130, soil_moisture=0.73, elevation=1140, past_flood_occurrence=True),
    ("Kisumu", "Kisumu East"):       dict(rainfall_accumulation=125, soil_moisture=0.71, elevation=1148, past_flood_occurrence=False),
    ("Kisumu", "Seme"):              dict(rainfall_accumulation=138, soil_moisture=0.75, elevation=1138, past_flood_occurrence=True),
    ("Kisumu", "Muhoroni"):          dict(rainfall_accumulation=112, soil_moisture=0.65, elevation=1157, past_flood_occurrence=False),
    # Siaya — 6 sub-counties
    ("Siaya", "Rarieda"):            dict(rainfall_accumulation=152, soil_moisture=0.83, elevation=1136, past_flood_occurrence=True),
    ("Siaya", "Bondo"):              dict(rainfall_accumulation=145, soil_moisture=0.80, elevation=1137, past_flood_occurrence=True),
    ("Siaya", "Alego Usonga"):       dict(rainfall_accumulation=122, soil_moisture=0.70, elevation=1149, past_flood_occurrence=True),
    ("Siaya", "Gem"):                dict(rainfall_accumulation=118, soil_moisture=0.68, elevation=1155, past_flood_occurrence=False),
    ("Siaya", "Ugenya"):             dict(rainfall_accumulation=110, soil_moisture=0.63, elevation=1162, past_flood_occurrence=False),
    ("Siaya", "Ugunja"):             dict(rainfall_accumulation=108, soil_moisture=0.61, elevation=1168, past_flood_occurrence=False),
    # Homa Bay — 8 sub-counties
    ("Homa Bay", "Suba South"):      dict(rainfall_accumulation=158, soil_moisture=0.85, elevation=1133, past_flood_occurrence=True),
    ("Homa Bay", "Suba North"):      dict(rainfall_accumulation=155, soil_moisture=0.84, elevation=1134, past_flood_occurrence=True),
    ("Homa Bay", "Karachuonyo"):     dict(rainfall_accumulation=140, soil_moisture=0.77, elevation=1141, past_flood_occurrence=True),
    ("Homa Bay", "Homa Bay"):        dict(rainfall_accumulation=133, soil_moisture=0.74, elevation=1136, past_flood_occurrence=True),
    ("Homa Bay", "Kabondo Kasipul"): dict(rainfall_accumulation=128, soil_moisture=0.72, elevation=1143, past_flood_occurrence=False),
    ("Homa Bay", "Kasipul"):         dict(rainfall_accumulation=121, soil_moisture=0.69, elevation=1151, past_flood_occurrence=False),
    ("Homa Bay", "Rangwe"):          dict(rainfall_accumulation=115, soil_moisture=0.66, elevation=1155, past_flood_occurrence=False),
    ("Homa Bay", "Ndhiwa"):          dict(rainfall_accumulation=109, soil_moisture=0.62, elevation=1163, past_flood_occurrence=False),
}

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
