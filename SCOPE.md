# CrisisLens MVP Scope

## Chosen Crisis: Flooding

CrisisLens v1 focuses exclusively on **flood early warning** across the Lake Victoria basin in western Kenya.

### Why Flooding?

Flooding was selected over drought/food shortage for the following reasons:

| Criterion | Flooding | Drought / Food Shortage |
|---|---|---|
| Lead time for early warning | **3–7 days** — urgent, operationally actionable | 4–8 weeks — harder to convey urgency |
| Map compactness (3 counties) | **158 × 131 km** — clean viewport at zoom level 9 | 360 × 701 km — sub-counties too small to interact |
| Visual map anchor | **Lake Victoria shoreline** as a natural hero element | Featureless arid landscape |
| Sub-county drill-down | **21 polygons** across 3 counties | 16 across 3 ASAL counties |
| Model input measurability | 4 directly measurable inputs (rainfall, soil moisture, elevation, past occurrence) | NDVI stress requires satellite vegetation index |
| Existing code base | Kisumu already coded at 66% flood risk in `App.jsx` | Turkana/Garissa appear in dashboard only |

The flood prediction model (`/backend/api/services.py → score_flood()`) outputs:
- `flood_probability` — percentage risk
- `risk_category` — Low / Moderate / High
- `lead_time_days` — 3 to 7 days
- `confidence` — model confidence score

This makes for compelling, time-sensitive AI briefings from the `/api/ai/feedback/` endpoint.

---

## Chosen Counties: Kisumu, Siaya, and Homa Bay

These three counties were selected because:

1. They share confirmed land borders with each other and all three border **Lake Victoria**.
2. Their combined footprint (158 km × 131 km) fills a map panel compactly at zoom level 8–9, with Lake Victoria visible at the center of the cluster.
3. Together they contain **21 sub-counties**, providing rich admin2 drill-down data.
4. They are Kenya's most chronically flood-affected lake basin counties, with documented displacement events in 2018, 2020, and 2024.
5. **Kisumu city** (population ~500,000) provides an urban flooding narrative alongside the rural agricultural impact in Siaya and Homa Bay.
6. Kisumu was already hardcoded in the app — Siaya and Homa Bay require minimal additions.

| County | Population | Admin2 Count | Key Flood Driver |
|---|---|---|---|
| **Kisumu** | ~1,155,574 | 7 sub-counties | Nyando River overflow + lake shoreline |
| **Siaya** | ~993,183 | 6 sub-counties | Yala River + Winam Gulf shoreline |
| **Homa Bay** | ~1,131,950 | 8 sub-counties | Lake Victoria level rise + island communities |
| **Combined** | **~3,280,707** | **21 sub-counties** | — |

**Geographic bounding box:** lon 33.917°–35.343°E, lat 0.313°N–0.866°S

---

## Geographic and Humanitarian Rationale

The **Winam Gulf** arm of Lake Victoria sits at the center of this cluster. During the March–May long rains (and October–November short rains), three rivers overflow their banks:

- **Nyando River** (Kisumu) — one of the most flood-prone rivers in Kenya; annual displacement
- **Yala River** (Siaya) — drains into Yala Swamp and Lake Victoria, flooding Rarieda and Bondo
- **Sondu River** (Homa Bay) — drains highlands into Winam Gulf

Soil saturation from the lake's persistently high water table means that even moderate rainfall triggers widespread surface flooding. The Lake Victoria basin has been at record-high levels since 2019, raising the baseline flood risk for all shoreline communities.

**Key humanitarian facts:**
- Combined population at risk in a high-flood season: approximately **1.5–2.0 million people**
- Primary impacts: displacement, crop loss, livestock death, road inaccessibility, cholera risk from contaminated water sources
- Kenya Red Cross and OCHA regularly pre-position relief in Kisumu and Homa Bay before each rainy season — validating the early warning use case
- Most recent major event: April–May 2024 floods displaced over 40,000 people in Kisumu and Siaya counties

---

## Sub-County Hotspots (Priority for Visualization)

| Sub-County | County | Flood Risk % | Key Rationale |
|---|---|---|---|
| Nyando | Kisumu | 82% | Nyando River — annual displacement of thousands |
| Nyakach | Kisumu | 76% | Lake shore floodplain, low elevation |
| Kisumu West | Kisumu | 71% | Urban lake-edge flooding, dense settlement |
| Rarieda | Siaya | 74% | Winam Gulf shoreline, historically flooded |
| Bondo | Siaya | 69% | Large lakeside floodplain |
| Suba South | Homa Bay | 78% | Rusinga Island — lake-level exposure, limited evacuation |
| Suba North | Homa Bay | 73% | Remote lake basin, minimal infrastructure |
| Karachuonyo | Homa Bay | 66% | River flooding from inland highlands |

---

## Data Indicators Used

| Indicator | Source / Proxy | Model Input Field |
|---|---|---|
| 7-day rainfall accumulation | KMD (Kenya Met. Dept.) bulletins | `rainfall_accumulation` (mm) |
| Soil moisture | CHIRPS / Sentinel-1 SAR proxy | `soil_moisture` (0–1 normalized) |
| Sub-county elevation | SRTM 30m DEM (static per sub-county) | `elevation` (metres) |
| Past flood occurrence | OCHA Kenya Flood Reports historical data | `past_flood_occurrence` (boolean) |
| AI briefing context | County + sub-county name + risk data | Payload to `/api/ai/feedback/` |

For the MVP demonstration, all indicator values are **hardcoded per sub-county** with representative real-world values from the 2024 long-rain season. The architecture supports live API ingestion from KMD and CHIRPS without structural changes.

---

## What the MVP Demonstrates

1. **National map view** — All 47 Kenya counties shaded by crisis type; Kisumu, Siaya, and Homa Bay highlighted in deep blue as active flood zones.

2. **3-county drill-down** — Clicking any of the three counties zooms the map to Lake Victoria, overlaying 7–8 sub-county polygons with intensity shading proportional to `flood_probability` from the scoring model.

3. **Risk panel** — County-level details panel shows expected event, soil moisture reading, likely effects, and recommendations sourced from backend scoring output.

4. **Sub-county hotspot list** — Top sub-counties ranked by flood probability with one-click selection to focus the AI analyst panel.

5. **Lead-time badge** — "High risk · 3 days" badge rendered per county, sourced directly from `score_flood()` return value, making the urgency immediately visible.

6. **AI analyst panel** — Ask CrisisLens questions like "Which Siaya sub-counties should evacuate first?" and receive GPT-4o-mini briefings with county-specific flood context, or the structured fallback if the API key is absent.

7. **Operations Dashboard** (`/dashboard`) — Shows the 3 focus counties in the flood ranking table, live alerts for Nyando River, Suba South, and Rarieda, and 6-month risk trend charts.

---

## Why This Scope Wins in a Demo

- **Tight geography** → The entire focus area fits in one map panel with Lake Victoria as a stunning centerpiece
- **Short lead times** → "Flood alert — 3 days" beats "drought outlook — 8 weeks" for demo impact
- **Real data, real places** → Every sub-county hotspot is documented in OCHA and KRC reports
- **End-to-end flow** → Map → click county → drill to sub-county → AI briefing → operations dashboard, all working seamlessly
- **Offline capable** → Static `flood_scenarios.js` ensures the demo works even without the Django server running
