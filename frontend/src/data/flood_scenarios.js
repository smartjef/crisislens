/**
 * flood_scenarios.js
 *
 * Pre-scored flood risk data for all 21 sub-counties across the three Lake
 * Victoria focus counties: Kisumu, Siaya, and Homa Bay.
 *
 * Values are derived from score_flood() using the FLOOD_INDICATORS dictionary
 * in backend/api/services.py, representing March-May 2024 long-rain conditions.
 *
 * Keys: "CountyName::SubCountyName"
 * Values: { flood_probability, risk_category, lead_time_days, confidence, indicators }
 *
 * This module makes the frontend fully self-contained for offline demos — the
 * app can render all sub-county risk data without the Django server running.
 *
 * To regenerate: POST each indicators set to /api/flood/predict/ and capture output.
 */

export const FLOOD_SCENARIOS = {
  // ── Kisumu (7 sub-counties) ──────────────────────────────────────────────
  "Kisumu::Nyando": {
    flood_probability: 82.1,
    risk_category:    "High",
    lead_time_days:   3,
    confidence:       0.79,
    indicators: { rainfall_accumulation: 165, soil_moisture: 0.87, elevation: 1134, past_flood_occurrence: true }
  },
  "Kisumu::Nyakach": {
    flood_probability: 76.4,
    risk_category:    "High",
    lead_time_days:   3,
    confidence:       0.77,
    indicators: { rainfall_accumulation: 148, soil_moisture: 0.81, elevation: 1145, past_flood_occurrence: true }
  },
  "Kisumu::Kisumu West": {
    flood_probability: 71.2,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.75,
    indicators: { rainfall_accumulation: 141, soil_moisture: 0.79, elevation: 1135, past_flood_occurrence: true }
  },
  "Kisumu::Kisumu Central": {
    flood_probability: 67.0,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.73,
    indicators: { rainfall_accumulation: 130, soil_moisture: 0.73, elevation: 1140, past_flood_occurrence: true }
  },
  "Kisumu::Kisumu East": {
    flood_probability: 63.1,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.72,
    indicators: { rainfall_accumulation: 125, soil_moisture: 0.71, elevation: 1148, past_flood_occurrence: false }
  },
  "Kisumu::Seme": {
    flood_probability: 65.4,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.73,
    indicators: { rainfall_accumulation: 138, soil_moisture: 0.75, elevation: 1138, past_flood_occurrence: true }
  },
  "Kisumu::Muhoroni": {
    flood_probability: 54.2,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.69,
    indicators: { rainfall_accumulation: 112, soil_moisture: 0.65, elevation: 1157, past_flood_occurrence: false }
  },

  // ── Siaya (6 sub-counties) ───────────────────────────────────────────────
  "Siaya::Rarieda": {
    flood_probability: 74.3,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.76,
    indicators: { rainfall_accumulation: 152, soil_moisture: 0.83, elevation: 1136, past_flood_occurrence: true }
  },
  "Siaya::Bondo": {
    flood_probability: 69.0,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.74,
    indicators: { rainfall_accumulation: 145, soil_moisture: 0.80, elevation: 1137, past_flood_occurrence: true }
  },
  "Siaya::Alego Usonga": {
    flood_probability: 57.8,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.70,
    indicators: { rainfall_accumulation: 122, soil_moisture: 0.70, elevation: 1149, past_flood_occurrence: true }
  },
  "Siaya::Gem": {
    flood_probability: 52.1,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.68,
    indicators: { rainfall_accumulation: 118, soil_moisture: 0.68, elevation: 1155, past_flood_occurrence: false }
  },
  "Siaya::Ugenya": {
    flood_probability: 47.9,
    risk_category:    "Low",
    lead_time_days:   7,
    confidence:       0.67,
    indicators: { rainfall_accumulation: 110, soil_moisture: 0.63, elevation: 1162, past_flood_occurrence: false }
  },
  "Siaya::Ugunja": {
    flood_probability: 44.8,
    risk_category:    "Low",
    lead_time_days:   7,
    confidence:       0.66,
    indicators: { rainfall_accumulation: 108, soil_moisture: 0.61, elevation: 1168, past_flood_occurrence: false }
  },

  // ── Homa Bay (8 sub-counties) ────────────────────────────────────────────
  "Homa Bay::Suba South": {
    flood_probability: 78.3,
    risk_category:    "High",
    lead_time_days:   3,
    confidence:       0.77,
    indicators: { rainfall_accumulation: 158, soil_moisture: 0.85, elevation: 1133, past_flood_occurrence: true }
  },
  "Homa Bay::Suba North": {
    flood_probability: 73.1,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.76,
    indicators: { rainfall_accumulation: 155, soil_moisture: 0.84, elevation: 1134, past_flood_occurrence: true }
  },
  "Homa Bay::Karachuonyo": {
    flood_probability: 65.9,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.73,
    indicators: { rainfall_accumulation: 140, soil_moisture: 0.77, elevation: 1141, past_flood_occurrence: true }
  },
  "Homa Bay::Homa Bay": {
    flood_probability: 61.7,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.72,
    indicators: { rainfall_accumulation: 133, soil_moisture: 0.74, elevation: 1136, past_flood_occurrence: true }
  },
  "Homa Bay::Kabondo Kasipul": {
    flood_probability: 57.4,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.70,
    indicators: { rainfall_accumulation: 128, soil_moisture: 0.72, elevation: 1143, past_flood_occurrence: false }
  },
  "Homa Bay::Kasipul": {
    flood_probability: 54.6,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.69,
    indicators: { rainfall_accumulation: 121, soil_moisture: 0.69, elevation: 1151, past_flood_occurrence: false }
  },
  "Homa Bay::Rangwe": {
    flood_probability: 50.2,
    risk_category:    "Moderate",
    lead_time_days:   5,
    confidence:       0.68,
    indicators: { rainfall_accumulation: 115, soil_moisture: 0.66, elevation: 1155, past_flood_occurrence: false }
  },
  "Homa Bay::Ndhiwa": {
    flood_probability: 46.1,
    risk_category:    "Low",
    lead_time_days:   7,
    confidence:       0.67,
    indicators: { rainfall_accumulation: 109, soil_moisture: 0.62, elevation: 1163, past_flood_occurrence: false }
  }
};

/**
 * Convenience helper: look up a scenario by county and sub-county name.
 * Returns null if the combination is not in the dataset.
 *
 * @param {string} county  - e.g. "Kisumu"
 * @param {string} area    - e.g. "Nyando"
 * @returns {object|null}
 */
export function getFloodScenario(county, area) {
  return FLOOD_SCENARIOS[`${county}::${area}`] || null;
}

/** All Lake Victoria focus counties covered by this dataset. */
export const FOCUS_COUNTIES = ["Kisumu", "Siaya", "Homa Bay"];
