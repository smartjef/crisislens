# CrisisLens — Enterprise Upgrade Roadmap
**GOK National Predictive Risk & Early Warning System**
_Drafted: 2026-03-16 | Branch: jeff/core_

---

## Executive Summary

The current system is a functional prototype. To become a credible government enterprise platform it needs to close five gaps:

1. **Visual maturity** — UI reads like a student dashboard, not an ops command centre
2. **Real-time data** — cameras, sensors, and feeds are simulated or absent
3. **Advanced GIS/GPS** — Leaflet with static GeoJSON is not enough for a national ops platform
4. **Intelligence layer** — AI is chat-only; it needs to be embedded into every workflow
5. **Public-facing presence** — no external portal, no public API, no open data publishing

This document defines every change required to close those gaps. Items are grouped by **Epic** so they can be sprint-planned.

---

## Part 1 — What Must Change (existing code)

### 1.1 UI / Design System — "Corporate Command Centre"

The current UI has the right dark theme but wrong visual weight. A national ops platform should feel like Bloomberg Terminal meets Palantir Gotham.

| What | Change Required |
|---|---|
| Typography | Replace generic sans-serif with **IBM Plex Mono** for data, **IBM Plex Sans Condensed** for labels. Already in design tokens — enforce everywhere. |
| Grid layout | Move from single-column card stacks to **12-column CSS grid** with fixed data density. Every panel should show numbers, not whitespace. |
| Sidebar | Replace icon+label with a **collapsible icon-rail** (72px collapsed, 240px expanded). Add module indicators (badge counts per section). |
| Topbar | Add a persistent **mission status bar** below the topbar: current phase (MONITORING / ELEVATED / ACTION REQUIRED), active incident count, last data sync timestamp, operator on duty. |
| Dashboard panels | Replace generic recharts bar/line charts with **sparklines + big-number KPI blocks** at the top, detailed charts below. Each chart needs a "data as of" timestamp. |
| Alert cards | Current alert list looks like a todo app. Redesign as a **tabular incident board** with sortable columns, inline status chips, and row-level actions (acknowledge, assign, escalate). |
| Map panel | The map is a full page. It should also exist as an **embedded mini-map widget** on every dashboard (county centroid + risk heat overlay, clickable to expand). |
| Loading states | Remove generic spinners. Use **skeleton screens** that match the exact layout of each panel so the page doesn't jump. |
| Empty states | Every empty state needs a proper illustration + actionable text (e.g. "No alerts in Kisumu — last checked 2 min ago"). |
| ReportsPage | Currently 688 lines with embedded CSS. **Full rewrite** into the dark design system. Add a report builder wizard (step 1: scope → step 2: date range → step 3: AI summary → step 4: export). |

### 1.2 Map (LeafletMap.jsx) — Replace Core Engine

Leaflet + OpenStreetMap is consumer-grade. The map module needs to be rebuilt on a proper stack.

| What | Change |
|---|---|
| Base map | Replace OpenStreetMap tiles with **Mapbox GL JS** (or MapLibre GL as open-source alternative). This gives vector tiles, smooth zoom, satellite/hybrid toggle, and custom labelling. |
| Tile layers | Implement layer switcher: **Satellite**, **Terrain**, **Streets**, **Dark (default)**. |
| Risk overlay | Replace static GeoJSON polygon fill with a **dynamic choropleth** updated every 5 minutes via WebSocket. Probabilities → colour ramp (viridis or custom KDMF palette). |
| GPS tracking | Add a **live GPS asset layer** (see Section 2.3). Show field unit positions as moving dots. |
| Heatmap | Use **deck.gl HeatmapLayer** over the base map for rainfall density and flood probability density. |
| 3D terrain | Use **Mapbox GL terrain-3D** or DEM tiles to show topographic elevation for flood path modelling. This is the single biggest visual upgrade available. |
| Drawing tools | Add **@mapbox/mapbox-gl-draw** for responders to annotate evacuation routes, staging areas, and cordoned zones directly on the map. Annotations saved to backend. |
| Cluster markers | Replace custom clustering with **Supercluster** library for sub-county hotspot markers. |
| Time-slider | Add a **temporal slider** (bottom of map) to replay historical flood progression day by day. Uses FloodPrediction history from the DB. |
| Measurement tools | Distance + area measurement tools (standard in national ops GIS). |
| Print/export | One-click map export to PNG/PDF with legend and timestamp (standard for incident reports). |

### 1.3 Backend Models — Add Missing Entities

| New Model | Fields | Purpose |
|---|---|---|
| `Incident` | title, type, status, county, sub_county, lat, lon, severity, opened_by, closed_by, timestamps | Full incident lifecycle (distinct from alert) |
| `FieldUnit` | name, type (vehicle/boat/drone/foot), operator, county, current_lat, current_lon, status, last_ping | GPS asset tracking |
| `FieldUnitPing` | unit FK, lat, lon, speed, heading, battery, timestamp | Historical GPS trail |
| `CameraFeed` | name, location, lat, lon, county, stream_url, type (CCTV/drone/satellite), status, is_public | Camera registry |
| `AnnotatedZone` | type (evacuation/staging/cordon), geojson_geometry, created_by, incident FK, label | Map annotations |
| `SocialIntelItem` | source (twitter/facebook/news/radio), url, title, snippet, sentiment, lat (if extractable), county, tags, ingested_at | OSInt/media feed |
| `WeatherObservation` | county, station_id, rainfall_mm, temperature, humidity, wind_speed, timestamp, source | Real sensor data |
| `EarlyWarningBroadcast` | channel (SMS/radio/app_push), message, county, sub_county, sent_by, sent_at, status, recipient_count | Multi-channel alert dispatch |

### 1.4 API — Missing Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/incidents/` `POST /api/incidents/` | Incident management |
| `GET /api/field-units/` `PATCH /api/field-units/{id}/ping/` | GPS asset registry + live ping |
| `GET /api/cameras/` `GET /api/cameras/{id}/stream-token/` | Camera registry + signed stream token |
| `GET /api/social-intel/` | Filtered social/news feed |
| `POST /api/broadcasts/` | Send multi-channel early warning |
| `GET /api/weather/current/?county=` | Live weather per county |
| `WS /ws/risk/` | WebSocket: live risk score push |
| `WS /ws/units/` | WebSocket: live GPS positions |
| `WS /ws/alerts/` | WebSocket: new alert push |
| `GET /api/public/risk-summary/` | Public unauthenticated risk overview |
| `GET /api/public/active-alerts/` | Public active alerts (sanitised) |

### 1.5 Authentication — Enterprise Hardening

| Change | Detail |
|---|---|
| MFA / OTP | Add TOTP (Google Authenticator compatible) as optional second factor. Use `django-otp` or `pyotp`. |
| Session audit | Log every login: IP, device fingerprint, timestamp. Surface in Admin page. |
| API keys | Allow analyst/operator roles to generate API keys for external integrations (dashboards, data pipelines). |
| SSO stub | Prepare SAML/OAuth2 integration points for GoK single sign-on (ICTA uses Microsoft Entra). |
| Password policy | Enforce complexity + rotation reminder (90 days). |
| Inactive timeout | Auto-logout after 30 min inactivity (ops security requirement). |

---

## Part 2 — What Must Be Added (new capabilities)

### 2.1 Real-Time Camera Integration

**The drone modal is currently a simulation. This section makes it real.**

#### Architecture

```
Camera Source (RTSP/HLS/WebRTC)
        │
        ▼
  Media Server (MediaMTX / Mediasoup)
        │  ← transcodes to HLS/WebRTC
        ▼
  Backend: /api/cameras/{id}/stream-token/
        │  ← returns signed token + stream URL
        ▼
  Frontend: <VideoPlayer url={streamUrl} token={token} />
```

#### What to build

**Backend (`backend/cameras/`):**
- `CameraFeed` model (see Section 1.3)
- `CameraViewSet` — list, create, enable/disable feeds
- Stream token endpoint — generates a short-lived signed JWT for the stream URL (prevents public hotlinking)
- Health check poller — every 60s ping each stream URL, update `status` (online/offline/degraded)
- Admin can add cameras by RTSP URL or HLS URL

**Frontend (`components/camera/`):**
- `CameraGrid.jsx` — 2×2 or 3×3 grid of live feeds (like a CCTV wall). Uses `<video>` with HLS.js for HLS streams or native WebRTC.
- `CameraFeedCard.jsx` — Single feed: stream, camera name, county, last-seen timestamp, fullscreen button, snapshot button.
- `CameraDrawer.jsx` — Slide-in panel triggered from map marker. Shows the feed for the camera at that location.
- `DroneReconModal.jsx` — Rewrite to use a real stream URL if available; fall back to simulation if no stream assigned.
- `CameraManagement.jsx` (admin) — CRUD for camera registry.

**Camera sources to connect (real open sources for Kenya):**
| Source | Type | Integration |
|---|---|---|
| KMD (Kenya Met Dept) weather station cams | MJPEG/HLS | API or scrape |
| NTSA traffic cameras (Nairobi) | RTSP | Requires MOU but URLs exist |
| KenHA highway cameras (A104, A1) | HLS | Public embeds |
| Lake Victoria Basin Authority webcams | MJPEG | Public |
| Custom drone uplinks | WebRTC | Via MediaMTX relay |
| Satellite imagery tiles (Sentinel-2) | WMS/WMTS | Copernicus open API |

**For demo/staging without real cameras:**
- Use public HLS streams (airport webcams, traffic feeds)
- Use `ffmpeg` to re-stream a looping video as HLS locally
- Note in UI: "DEMO FEED — Replace with production RTSP endpoint"

---

### 2.2 Advanced GIS — Real-Time Geospatial Intelligence

#### Satellite Imagery Integration

| Layer | Source | Integration |
|---|---|---|
| Sentinel-2 optical (10m) | Copernicus Open Access Hub | OGC WMS endpoint → Leaflet/MapLibre WMS layer |
| Sentinel-1 SAR flood mapping | Copernicus Emergency Management Service | WMS tiles for flooded area detection |
| CHIRPS rainfall (daily) | UCSB Climate Hazards Group | GeoTIFF → render as raster overlay |
| MODIS NDVI | NASA Earthdata | WMS or pre-rendered tiles |
| DEM/Elevation | SRTM 30m (NASA) | Pre-process into Mapbox terrain tiles |

**Backend:** `backend/gis/` module
- `SatelliteScene` model: scene_id, source, date, county, cloud_cover, download_url, wms_layer_url
- Celery task: poll Copernicus API every 6 hours for new Sentinel scenes over Kenya
- WMS proxy endpoint (avoids CORS on frontend, adds auth)

**Frontend:**
- Layer panel on map: toggle each satellite layer on/off with opacity slider
- "Flooded area" toggle: when Sentinel-1 scene available, overlay detected water extent in blue

#### Real-Time Sensor Network

| Sensor | Data | Source |
|---|---|---|
| Rain gauges | Rainfall mm/hr | KMD stations (47 in Lake Victoria Basin) |
| River gauges | Water level cm | Water Resources Authority telemetry |
| Soil moisture | % saturation | FEWS NET / ISRIC |
| Lake Victoria level | cm above datum | LVBC telemetry |

**Backend:**
- `WeatherObservation` model (see 1.3) — time-series data per station
- Celery beat tasks: ingest data from KMD, WRA, FEWS NET APIs every 15 minutes
- Time-series API: `GET /api/sensors/timeseries/?station=&metric=&from=&to=`

**Frontend:**
- Sensor dot layer on map — colour-coded by current reading vs. threshold
- Click sensor dot → sparkline of last 48h readings in tooltip
- Alert badge if reading exceeds warning threshold

#### GPS Asset Tracking

- `FieldUnit` + `FieldUnitPing` models (see 1.3)
- Mobile app or browser-based GPS reporter: `navigator.geolocation.watchPosition()` → `PATCH /api/field-units/{id}/ping/`
- WebSocket push: backend broadcasts new pings to map clients
- Map layer: live positions as role-coloured dots (red=responder, blue=vehicle, yellow=drone)
- Historical trail: click unit → show last 24h path as polyline

---

### 2.3 Social Intelligence & News Extraction

**Goal:** Automatically surface social media posts, news articles, and community radio transcripts that mention flooding, displacement, or infrastructure damage in monitored counties.

#### Architecture

```
Sources:
  Twitter/X API v2  ──┐
  Facebook Graph API  ├──▶  Ingestion Worker (Celery)
  RSS/News feeds      ├──▶  ──▶  NLP Pipeline  ──▶  SocialIntelItem table
  KBC/Citizen Radio   ┘         (relevance + sentiment + geo-tagging)
                                       │
                                       ▼
                              /api/social-intel/  ──▶  IntelSidebar (frontend)
```

#### Backend (`backend/intel/`)

**Models:**
- `SocialIntelItem` (see 1.3)
- `IntelSource` — source name, type, api_key, last_fetched, is_active

**Celery tasks (`tasks.py`):**
- `ingest_twitter()` — Twitter API v2 filtered stream, keywords: `["flood", "mafuriko", "mvua", "displacement", "Kisumu", "Homa Bay", "Siaya", "river overflow"]`
- `ingest_rss()` — Parse RSS feeds: Nation Media, Standard, KBC, Citizen TV
- `ingest_facebook_pages()` — County government pages, disaster management pages
- `run_nlp_pipeline(item)` — Called after each ingest:
  - Relevance classifier (zero-shot with `fasttext` or OpenAI embedding similarity)
  - Sentiment: positive/neutral/negative/urgent
  - Geo-extraction: regex + NER → county/sub-county name → lat/lon
  - Dedup: hash of url+snippet, discard duplicates

**API endpoints:**
- `GET /api/social-intel/?county=&source=&sentiment=&from=&to=` — filtered feed
- `GET /api/social-intel/summary/?county=` — aggregated stats (post count, sentiment distribution, top keywords)
- `POST /api/social-intel/{id}/flag/` — analyst flags item as verified/false/escalated

**Frontend (`components/intel/`):**
- `SocialIntelFeed.jsx` — Scrollable feed of items, colour-coded by sentiment (red=urgent, orange=negative, grey=neutral)
- `IntelSidebar.jsx` — **Rewrite** the existing placeholder. Tabs: Live Feed | Verified | Flagged
- Each item: source logo, excerpt, county tag, timestamp, sentiment chip, "View source" link, flag button
- `IntelSummaryWidget.jsx` — Small widget for dashboard: "47 social mentions in Kisumu in last 6h — 12 urgent"
- Map integration: intel items with extracted coords shown as news-pin markers on map

---

### 2.4 Early Warning Broadcast System

**Current system creates alerts in the database. This epic sends them to real people.**

#### Channels

| Channel | Library/Service | Detail |
|---|---|---|
| SMS | Africa's Talking API | Bulk SMS to pre-registered numbers per sub-county |
| WhatsApp | Twilio WhatsApp Business API | Structured message + image |
| Email | SendGrid / AWS SES | HTML bulletin to registered users |
| App Push | Firebase Cloud Messaging | In-app push for mobile (Phase 2) |
| CAP Feed | OASIS Common Alerting Protocol | Machine-readable XML feed for partner agencies (WFP, UNHCR, KRC) |

#### Backend (`backend/broadcast/`)
- `EarlyWarningBroadcast` model (see 1.3)
- `RecipientList` model — pre-registered community contacts per sub-county
- `send_sms_broadcast(alert_id)` Celery task — calls Africa's Talking, logs delivery receipts
- `send_cap_feed(alert_id)` — generates CAP XML at `/api/public/cap/{alert_id}.xml`
- `BroadcastViewSet` — create, list, delivery status

#### Frontend
- `BroadcastComposer.jsx` — step-by-step wizard:
  1. Select alert / incident
  2. Choose counties / sub-counties
  3. Select channels
  4. Preview message (SMS ≤160 chars, WhatsApp ≤1024 chars)
  5. Confirm → send
- `BroadcastLog.jsx` — delivery reports table (sent/delivered/failed per recipient)

---

### 2.5 Public Portal (New Route: `/public`)

**A credibility anchor. Journalists, NGOs, and citizens should be able to access non-sensitive data without an account.**

#### Routes (no auth required)

```
/public                     → Landing page
/public/risk-map            → Embeddable public risk map
/public/alerts              → Active public alerts (sanitised)
/public/data                → Open data download portal
/public/situation-reports   → Published situation reports
/public/subscribe           → SMS/email subscription for alerts
```

#### Landing Page (`/public`)

Sections:
1. **Hero** — Full-width dark banner: "Kenya National Flood Early Warning System" + current system phase (MONITORING/ELEVATED/ACTION REQUIRED) + active alert count
2. **Risk Overview** — 7-county risk grid (county card, risk level, last updated)
3. **Active Alerts** — Public-facing alert list (no sensitive metadata)
4. **Live Risk Map** — Embeddable version of the map (read-only, no auth)
5. **Situation Reports** — Download links for published reports
6. **How It Works** — Simple 4-step explainer (for community understanding)
7. **Alert Subscription** — Enter phone/email → subscribe to county-level alerts
8. **Partner Logos** — GoK, NDMA, KMD, Lake Victoria Basin Commission, UN OCHA, WFP
9. **Footer** — Contact, Data Policy, Terms, API docs link

#### Open Data Portal (`/public/data`)

- Download GeoJSON of current county risk scores (updated every 15 min)
- Download CSV of last 30 days FloodPredictions (anonymised)
- REST API reference (Swagger/OpenAPI docs auto-generated from DRF)
- Live API endpoint: `GET /api/public/risk-summary/` (no auth, rate-limited to 60 req/hr by IP)

#### SEO & Accessibility

- Server-side rendered meta tags (for social sharing previews)
- WCAG 2.1 AA compliance (colour contrast, keyboard navigation, screen reader labels)
- Swahili / English toggle (i18n)

---

### 2.6 AI — From Chat to Embedded Intelligence

**Current:** AI is isolated in `/crisis-ai` chat page.
**Target:** AI is embedded in every workflow.

#### AI upgrades

| Feature | Implementation |
|---|---|
| **Risk narrative auto-generation** | When a prediction crosses a threshold, AI auto-drafts a situation report. Analyst reviews and publishes. |
| **Alert auto-classification** | When an officer creates an alert, AI suggests severity level based on current risk scores. |
| **Social intel triage** | AI ranks social intel items by urgency. Flags items needing immediate human review. |
| **Satellite change detection** | Compare current vs. previous Sentinel scene → AI summarises what changed (new water extent, road cut, etc.). |
| **Evacuation route optimiser** | Given flood zone + road network + population density → AI suggests optimal evacuation corridors. Output rendered on map. |
| **Situation report writer** | Analyst selects scope/date → AI drafts full report → analyst edits → publish to public portal. |
| **Briefing auto-email** | Daily 06:00 EAT email to national ops: AI-written overnight summary with risk highlights. |
| **Chat upgrade** | Upgrade from gpt-4o-mini to gpt-4o. Add tool calling so AI can query live DB, fetch sensor data, and retrieve social intel items during chat. Add citation: each claim links to the data source. |

#### Backend

- `AITask` model — task type, status, input, output, tokens_used, created_at
- `run_ai_task(task_type, context)` Celery task — async AI execution
- Tool calling schema: define `query_risk_data`, `get_sensor_readings`, `get_social_intel`, `get_camera_snapshot` as OpenAI function tools
- `GET /api/ai/tasks/` `GET /api/ai/tasks/{id}/` — poll task status

---

### 2.7 Incident Management (Full Lifecycle)

**Current:** Alerts exist in isolation. There is no concept of an "incident" that groups multiple alerts, resources, and actions.**

#### What to build

**Backend (`backend/incidents/`):**
- `Incident` model (see 1.3) — the container
- `IncidentUpdate` — timestamped log entries per incident (like a Slack thread)
- `IncidentResource` — link field units + cameras to an incident
- `IncidentTimeline` — computed from FloodAlert, IncidentUpdate, FieldUnitPing

**Frontend:**
- `IncidentBoard.jsx` — Kanban-style board: Open | Active | Contained | Closed
- `IncidentDetailPage.jsx` — Tabs: Overview | Timeline | Resources | Map | Intel | Broadcasts
- `IncidentCreateModal.jsx` — Declare an incident, link to existing alerts, assign units
- Timeline tab: combined feed of alert changes, field updates, intel items, AI assessments
- Resources tab: assigned field units with live GPS, assigned cameras with thumbnails

---

### 2.8 Notifications & Real-Time Push

**Current:** No real-time updates. User must refresh to see new alerts.**

#### Architecture

```
Django Channels (ASGI)
  ├── /ws/risk/      → broadcast risk score updates (every 5 min)
  ├── /ws/alerts/    → push new/updated alerts to subscribed users
  └── /ws/units/     → push GPS pings to map clients
```

- **Backend:** Replace WSGI with ASGI (`daphne` + `channels`). Add channel layer (Redis).
- **Frontend:** `useWebSocket.js` hook — connect on login, reconnect on drop.
- **Topbar:** Alert count auto-increments when new alert pushed via WebSocket.
- **Map:** GPS dots move in real-time without page refresh.
- **Toast notifications:** New alert → auto-toast with severity chip + county.

---

### 2.9 Reporting & Analytics Upgrade

#### New report types

| Report | Description |
|---|---|
| **Hydrological Bulletin** | Sensor data narrative: rainfall totals, river levels, lake level — generated daily |
| **Incident After-Action Report** | Post-incident summary: timeline, resources deployed, population affected, response time metrics |
| **Social Intelligence Digest** | Daily summary of social/news mentions, sentiment trend, top verified items |
| **CAP Feed** | Machine-readable XML for partner interoperability |
| **Situation Map Export** | Map snapshot + risk legend + metadata as PDF |

#### Analytics dashboard (AnalystDashboard upgrade)

- **Risk trend** — 30/60/90 day rolling probability per county
- **Sensor anomaly detection** — flag readings > 2σ from seasonal baseline
- **Model performance** — compare predicted vs. observed flood events (accuracy, false positive rate)
- **Response time metrics** — time from alert creation to acknowledgement to resolution per county
- **Broadcast reach** — SMS/WhatsApp delivery rate per alert

---

## Part 3 — Infrastructure & DevOps

These are not visible features but are required for a system that will be presented to GoK.

### 3.1 Deployment

| Item | Detail |
|---|---|
| Containerisation | `Dockerfile` for frontend (nginx) + backend (gunicorn/daphne). `docker-compose.prod.yml`. |
| Reverse proxy | Nginx: SSL termination, rate limiting, `/api` → backend, `/` → frontend, `/ws` → ASGI. |
| Database | PostgreSQL + **PostGIS extension** for native geospatial queries (replace lat/lon floats with `PointField`). |
| Cache | Redis for Django Channels channel layer + Celery broker + API response caching. |
| Task queue | Celery + Redis: all async tasks (AI, broadcasts, satellite ingestion, sensor polling). |
| Monitoring | Sentry for error tracking. Prometheus + Grafana for metrics. Uptime robot for public status page. |
| CI/CD | GitHub Actions: lint → test → build → deploy on merge to main. |

### 3.2 Database — PostGIS Migration

- `pip install django.contrib.gis` + `psycopg2`
- Migrate `County.centroid_lat/lon` → `PointField`
- Migrate `FieldUnit.lat/lon` → `PointField`
- Migrate `CameraFeed.lat/lon` → `PointField`
- `AnnotatedZone.geojson_geometry` → `MultiPolygonField` / `LineStringField`
- Enable `ST_Within`, `ST_Distance`, `ST_Intersects` queries for spatial filtering

### 3.3 Performance

| Concern | Solution |
|---|---|
| FloodPrediction queries | Index on `(county, created_at DESC)`. Add `TimescaleDB` for time-series if volume grows. |
| GeoJSON responses | Pre-simplify admin boundary GeoJSON at build time (topojson simplification). Cache in Redis with 5min TTL. |
| Map tiles | Self-host MapLibre + PMTiles for offline/intranet deployment (GoK networks may not reach Mapbox). |
| AI latency | Stream OpenAI responses via Server-Sent Events. Don't wait for full completion. |
| Sensor ingestion | Use bulk `insert_many` in Celery tasks. Never call `.save()` in a loop. |

---

## Part 4 — Sprint Plan (Suggested)

### Phase 1 — Foundation (Weeks 1–3)
- [ ] PostGIS migration
- [ ] Django Channels + Redis (WebSocket infrastructure)
- [ ] Celery + beat scheduler setup
- [ ] Mapbox/MapLibre swap + 3D terrain
- [ ] `FieldUnit` + GPS tracking (model + API + map layer)

### Phase 2 — Cameras & Sensors (Weeks 4–6)
- [ ] `CameraFeed` model + stream token endpoint
- [ ] MediaMTX media server deployment
- [ ] `CameraGrid` + `CameraFeedCard` frontend
- [ ] Sentinel-2 WMS layer on map
- [ ] `WeatherObservation` model + KMD ingestion task
- [ ] Sensor dot layer on map

### Phase 3 — Intelligence (Weeks 7–9)
- [ ] `SocialIntelItem` model + RSS/Twitter ingestion
- [ ] NLP pipeline (relevance + sentiment + geo)
- [ ] `IntelSidebar` rewrite
- [ ] AI tool calling upgrade (live DB + sensor + intel tools)
- [ ] Risk narrative auto-generation

### Phase 4 — Public Portal (Weeks 10–12)
- [ ] `/public` route + landing page
- [ ] Public risk map (read-only embed)
- [ ] SMS subscription system
- [ ] CAP feed XML endpoint
- [ ] Open data portal

### Phase 5 — Incident Management + Broadcast (Weeks 13–15)
- [ ] `Incident` model + full lifecycle
- [ ] `IncidentBoard` + `IncidentDetailPage`
- [ ] Africa's Talking SMS broadcast
- [ ] WhatsApp broadcast
- [ ] `BroadcastComposer` wizard

### Phase 6 — UI Polish + ReportsPage (Weeks 16–17)
- [ ] ReportsPage full rewrite
- [ ] 12-column grid layout system
- [ ] Mission status bar
- [ ] Skeleton screens everywhere
- [ ] All empty states
- [ ] i18n (English/Swahili)
- [ ] WCAG 2.1 AA audit

### Phase 7 — DevOps + Security (Weeks 18–19)
- [ ] Docker + docker-compose.prod
- [ ] Nginx reverse proxy + SSL
- [ ] MFA / TOTP
- [ ] Session audit log
- [ ] API key generation
- [ ] Sentry + Prometheus + Grafana

---

## Part 5 — Technology Additions Summary

### New Backend Packages

```
# Geo
django.contrib.gis
psycopg2-binary (with PostGIS)
djangorestframework-gis

# Real-time
channels
channels-redis
daphne

# Task queue
celery
celery[redis]
django-celery-beat

# AI / NLP
openai (upgrade to tool calling)
fasttext (relevance classifier)
spacy (NER for geo-extraction)

# Broadcasts
africastalking
twilio
sendgrid

# Monitoring
sentry-sdk
django-prometheus

# Security
django-otp
pyotp
```

### New Frontend Packages

```
# Map
maplibre-gl          # open-source Mapbox GL alternative
@mapbox/mapbox-gl-draw
deck.gl
supercluster

# Video
hls.js               # HLS stream playback
webrtc-adapter       # WebRTC normalisation

# Real-time
socket.io-client     # or native WebSocket hook

# i18n
react-i18next

# Charts (upgrade)
@visx/visx           # D3-based, more customisable than recharts

# Docs
swagger-ui-react     # embed OpenAPI docs in public portal
```

---

## Part 6 — Open Questions / Decisions Needed

| Question | Options | Recommendation |
|---|---|---|
| Map engine | Mapbox GL JS (paid) vs MapLibre GL JS (free/open-source) | **MapLibre** — no API key cost, self-hostable, identical API |
| Camera streaming | MediaMTX vs Wowza vs Nginx-RTMP | **MediaMTX** — free, Go binary, supports RTSP/HLS/WebRTC |
| SMS provider | Africa's Talking vs Twilio vs Safaricom BONGA API | **Africa's Talking** — Kenyan, M-Pesa integration possible, cheap local SMS |
| AI model | gpt-4o-mini (current) vs gpt-4o vs Claude Sonnet | **Claude Sonnet 4.6** — better at structured JSON, longer context for reports |
| Social intel | Twitter API v2 (paid Basic $100/mo) vs Nitter scrape vs CrowdTangle | **RSS + news first** (free), Twitter only if budget confirmed |
| Deployment | VPS (DigitalOcean/AWS EC2) vs GoK ICTA cloud vs local server | **AWS EC2 + S3** for initial; design for on-prem handover |

---

_End of roadmap. Total estimated new lines of code: ~15,000 frontend + ~8,000 backend._
_This document should be reviewed and prioritised with the product owner before sprint planning._
