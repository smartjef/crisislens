# CrisisLens — Full Application Plan

> **Scope:** Flood early warning for Kisumu, Siaya & Homa Bay (Lake Victoria basin)
> **Timeline:** 14 days
> **Stack:** Django 5 · PostgreSQL · DRF + SimpleJWT · React 18 · Vite · Tailwind CSS v3 · IBM Plex Sans

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Repo** | `OGURI254/CrisisLens` |
| **Tagline** | National Predictive Risk & Early Warning System |
| **Description** | AI-powered flood intelligence platform for Kenya's Lake Victoria basin — real-time risk prediction, role-based dashboards, and actionable early alerts for Kisumu, Siaya & Homa Bay. |
| **Primary colour** | Flood cyan `#0891b2` (Tailwind `cyan-600`) |
| **Font** | IBM Plex Sans (body) · IBM Plex Sans Condensed (labels/badges) · IBM Plex Mono (numbers/data) |
| **Theme** | Light + Dark (Tailwind `darkMode: 'class'`, persisted to localStorage) |

---

## 2. Non-Technical Requirements (from project brief)

| # | Requirement | Source |
|---|---|---|
| NTR-1 | Provide early warnings **days before** a flood peaks — not after damage begins | PDF p.1 |
| NTR-2 | Make risk signals **highly visible, actionable, and timely** for decision-makers | PDF p.2 |
| NTR-3 | Support **National Disaster Operations Centers** with countrywide heatmaps | PDF p.4 |
| NTR-4 | Support **County Governments** with localized action plans and deployment guidance | PDF p.4 |
| NTR-5 | Support **Emergency Response Teams** with real-time impact maps and evacuation zone overlays | PDF p.4 |
| NTR-6 | Support **Analysts** with scenario simulation and AI-generated briefings | PDF p.3 |
| NTR-7 | Shift governance from **reaction → prevention** | PDF p.2 |
| NTR-8 | Platform must work for **non-technical users** — no jargon, clear visual language | PDF p.1 |
| NTR-9 | Alerts must reach the **right role** at the right time (role-specific escalation) | PDF p.3 |
| NTR-10 | System must inspire **public trust** through transparency and foresight | PDF p.4 |

---

## 3. Technical Requirements

### 3.1 Backend

| # | Requirement |
|---|---|
| TR-B1 | PostgreSQL database — no SQLite in any environment |
| TR-B2 | Custom `User` model with `role` field (5 roles) and `county` FK |
| TR-B3 | JWT authentication (access 15 min, refresh 7 days) via djangorestframework-simplejwt |
| TR-B4 | Role-based permission classes enforced on every protected endpoint |
| TR-B5 | Django models for: County, SubCounty, FloodObservation, FloodPrediction, FloodAlert, AuditLog |
| TR-B6 | Management command to seed the 3 counties, 21 sub-counties, and initial flood observations |
| TR-B7 | REST API for counties, sub-counties, flood risk, alerts (CRUD), reports, AI feedback |
| TR-B8 | Environment config via django-environ (.env file — no hardcoded secrets) |
| TR-B9 | CORS configured per environment (dev: all origins; prod: whitelist frontend URL) |
| TR-B10 | AuditLog middleware — every write action is logged with user + timestamp |
| TR-B11 | Pagination on all list endpoints (page size 20) |
| TR-B12 | Rate limiting on AI endpoint (10 req/user/hour) |

### 3.2 Frontend

| # | Requirement |
|---|---|
| TR-F1 | Tailwind CSS v3 with custom design tokens — zero inline `style` props |
| TR-F2 | IBM Plex Sans loaded via Google Fonts CDN |
| TR-F3 | Dark mode via Tailwind `class` strategy, toggle persisted to localStorage |
| TR-F4 | React Router v6 with `PrivateRoute` — auth + role checks on every page |
| TR-F5 | Zustand for global state (auth, alerts count, selected county) |
| TR-F6 | Axios with JWT interceptor (auto-attach token, auto-refresh on 401) |
| TR-F7 | All map hardcoded data replaced with live API calls via custom hooks |
| TR-F8 | Responsive design — works on tablet (768px) and desktop (1280px+) |
| TR-F9 | App shell: collapsible sidebar + topbar with notification bell |
| TR-F10 | Component library: Button, Badge, Card, Modal, Alert, Spinner, Avatar, Table |

### 3.3 Infrastructure

| # | Requirement |
|---|---|
| TR-I1 | docker-compose.yml with postgres, django (gunicorn), react (nginx) services |
| TR-I2 | Dockerfiles for backend (python:3.12-slim) and frontend (node:20 + nginx) |
| TR-I3 | .env.example with all required variables documented |
| TR-I4 | Static files served via WhiteNoise (Django) |

---

## 4. User Roles

| Role | Code | Capabilities |
|---|---|---|
| **Super Admin** | `super_admin` | Full access, user management, system config |
| **National Ops** | `national_ops` | All counties, create/resolve alerts, view all dashboards |
| **County Officer** | `county_officer` | Own county only, create alerts, view county dashboard |
| **Responder** | `responder` | View active alerts, acknowledge alerts, view map |
| **Analyst** | `analyst` | AI panel, scenario simulation, reports, read-only alerts |

---

## 5. Data Models

```python
class County(Model):
    name: str          # "Kisumu"
    code: str          # "KSM"
    region: str        # "Nyanza"
    population: int    # 1_155_574
    centroid_lat: float
    centroid_lon: float
    is_active: bool    # True for Kisumu/Siaya/Homa Bay

class SubCounty(Model):
    county: FK(County)
    name: str          # "Nyando"
    population: int
    area_sqkm: float

class FloodObservation(Model):
    sub_county: FK(SubCounty)
    rainfall_accumulation: float   # mm
    soil_moisture: float           # 0-1
    elevation: float               # meters AMSL
    past_flood_occurrence: bool
    observed_at: datetime
    source: str                    # "hardcoded-2024" | "kmd-api" | "manual"

class FloodPrediction(Model):
    observation: FK(FloodObservation)
    sub_county: FK(SubCounty)
    flood_probability: float       # 0-100
    risk_category: str             # "Low" | "Moderate" | "High"
    lead_time_days: int
    confidence: float
    predicted_at: datetime

class FloodAlert(Model):
    county: FK(County)
    sub_county: FK(SubCounty, null=True)
    severity: str      # "critical" | "high" | "medium" | "low"
    title: str
    description: text
    status: str        # "active" | "acknowledged" | "resolved"
    created_by: FK(User)
    created_at: datetime
    acknowledged_at: datetime (null)
    acknowledged_by: FK(User, null=True)
    resolved_at: datetime (null)

class AuditLog(Model):
    user: FK(User, null=True)
    action: str        # "alert.create" | "alert.acknowledge" | "prediction.run"
    resource_type: str
    resource_id: int
    metadata: JSON
    timestamp: datetime
```

---

## 6. API Routes

```
Auth
  POST   /api/auth/login/            Login → access + refresh tokens
  POST   /api/auth/refresh/          Refresh access token
  POST   /api/auth/logout/           Blacklist refresh token
  GET    /api/auth/me/               Current user profile

Counties
  GET    /api/counties/              List active counties
  GET    /api/counties/{id}/         County detail
  GET    /api/counties/{id}/risk/    Latest flood prediction for county

Sub-Counties
  GET    /api/sub-counties/          List (filter: ?county=1)
  GET    /api/sub-counties/{id}/     Sub-county detail + latest prediction

Predictions
  POST   /api/flood/predict/         Score flood from raw indicators
  GET    /api/flood/scenario/        Pre-scored scenario (county + area params)

Alerts
  GET    /api/alerts/                List (filter: county, severity, status)
  POST   /api/alerts/                Create alert [county_officer, national_ops]
  GET    /api/alerts/{id}/           Alert detail
  PATCH  /api/alerts/{id}/acknowledge/   Acknowledge [responder+]
  PATCH  /api/alerts/{id}/resolve/       Resolve [county_officer+]

Reports
  GET    /api/reports/               List reports
  POST   /api/reports/               Generate report [analyst, national_ops]
  GET    /api/reports/{id}/download/ Download PDF

AI
  POST   /api/ai/feedback/           AI briefing (rate-limited)

Admin (super_admin only)
  GET    /api/users/                 List users
  PATCH  /api/users/{id}/role/       Update user role
```

---

## 7. Frontend Pages & Routing

```
/login                    → LoginPage          (public)
/dashboard                → DashboardRouter    (auth — redirects by role)
  /dashboard/national     → NationalOpsDashboard   (national_ops, super_admin)
  /dashboard/county       → CountyDashboard    (county_officer)
  /dashboard/responder    → ResponderDashboard (responder)
  /dashboard/analyst      → AnalystDashboard   (analyst)
/map                      → MapPage            (all authenticated)
/alerts                   → AlertsPage         (national_ops, county_officer, responder)
/alerts/:id               → AlertDetailPage    (same)
/reports                  → ReportsPage        (analyst, national_ops)
/settings                 → SettingsPage       (all authenticated)
/admin                    → AdminPage          (super_admin)
/unauthorized             → UnauthorizedPage   (public)
```

---

## 8. Design Tokens (Tailwind)

```js
// tailwind.config.js
colors: {
  flood: {                    // Primary — water/cyan
    50:  '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',           // PRIMARY ACTION
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
  danger:  { DEFAULT: '#ef4444', dark: '#b91c1c' },
  warning: { DEFAULT: '#f59e0b', dark: '#b45309' },
  success: { DEFAULT: '#10b981', dark: '#065f46' },
  surface: {                  // Dark theme surfaces
    DEFAULT: '#0f172a',       // slate-900
    raised:  '#1e293b',       // slate-800
    border:  '#334155',       // slate-700
  },
}
fontFamily: {
  sans:    ['IBM Plex Sans', 'ui-sans-serif', 'system-ui'],
  cond:    ['IBM Plex Sans Condensed', 'ui-sans-serif'],
  mono:    ['IBM Plex Mono', 'ui-monospace'],
}
```

---

## 9. 14-Day Sprint Plan

| Days | Milestone | Key Deliverable |
|---|---|---|
| 1–2 | M1: Foundation | Tailwind + IBM Plex + dark mode + app shell + routing |
| 2–4 | M2: Auth & Backend | JWT, User model with roles, permissions, login page |
| 3–6 | M3: Data Layer | DB models, seed command, counties/alerts API |
| 5–8 | M4: Map & Dashboards | Live map data, 4 role dashboards |
| 8–11 | M5: Alerts & AI | Alerts CRUD, notification bell, AI chat, scenario tool |
| 11–14 | M6: Reports & Ship | Reports, settings, Docker, README |

---

## 10. Demo Accounts (seed data)

| Email | Password | Role | County |
|---|---|---|---|
| admin@crisislens.ke | admin1234 | super_admin | — |
| ops@crisislens.ke | ops1234 | national_ops | — |
| officer@kisumu.ke | officer1234 | county_officer | Kisumu |
| responder@siaya.ke | responder1234 | responder | Siaya |
| analyst@crisislens.ke | analyst1234 | analyst | — |
