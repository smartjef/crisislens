#!/usr/bin/env bash
# ============================================================
# CrisisLens — GitHub labels, milestones & issues setup
# Run AFTER:  gh auth login
# Usage:      bash gh-issues.sh
# ============================================================
set -euo pipefail

REPO="OGURI254/CrisisLens"

echo "🌊 Setting up CrisisLens GitHub project on $REPO ..."

# ─── Repo description ────────────────────────────────────────
gh repo edit "$REPO" \
  --description "AI-powered flood intelligence platform for Kenya's Lake Victoria basin — real-time risk prediction, role-based dashboards, and actionable early alerts for Kisumu, Siaya & Homa Bay." \
  --homepage "https://oguri254.github.io/CrisisLens" \
  --add-topic "early-warning" \
  --add-topic "flood-risk" \
  --add-topic "django" \
  --add-topic "react" \
  --add-topic "tailwindcss" \
  --add-topic "geospatial" \
  --add-topic "ai" \
  --add-topic "kenya"
echo "✅ Repo description updated."

# ─── Labels ──────────────────────────────────────────────────
echo "🏷️  Creating labels..."

create_label() {
  gh label create "$1" --color "$2" --description "$3" --repo "$REPO" --force
}

create_label "epic"           "7B2D8B" "Major feature group spanning multiple issues"
create_label "frontend"       "0075CA" "React / Vite / Tailwind UI work"
create_label "backend"        "008672" "Django / DRF / PostgreSQL work"
create_label "design"         "E4E669" "UI/UX design and component work"
create_label "auth"           "D93F0B" "Authentication and authorization"
create_label "data"           "FBCA04" "Data models, migrations, seed commands"
create_label "ai"             "0E8A16" "AI/ML features and OpenAI integration"
create_label "infra"          "BFD4F2" "Infrastructure, Docker, deployment"
create_label "week-1"         "F9D0C4" "Must be done in days 1–7"
create_label "week-2"         "C2E0C6" "Must be done in days 8–14"
create_label "priority: high" "B60205" "Blocker — needed before other work"
create_label "priority: med"  "E99695" "Important but not a blocker"
create_label "priority: low"  "F9D0C4" "Nice to have"

echo "✅ Labels created."

# ─── Milestones ───────────────────────────────────────────────
echo "📅 Creating milestones..."

M1=$(gh api repos/$REPO/milestones -f title="M1: Foundation" \
  -f description="Design system, app shell, Tailwind, routing" \
  -f due_on="$(date -u -v+3d +%Y-%m-%dT00:00:00Z 2>/dev/null || date -u -d '+3 days' +%Y-%m-%dT00:00:00Z)" \
  --jq '.number' 2>/dev/null || echo "")

M2=$(gh api repos/$REPO/milestones -f title="M2: Auth & Backend" \
  -f description="JWT, User model, roles, DB models, PostgreSQL" \
  -f due_on="$(date -u -v+6d +%Y-%m-%dT00:00:00Z 2>/dev/null || date -u -d '+6 days' +%Y-%m-%dT00:00:00Z)" \
  --jq '.number' 2>/dev/null || echo "")

M3=$(gh api repos/$REPO/milestones -f title="M3: Core Features" \
  -f description="Live map data, counties API, 4 role dashboards" \
  -f due_on="$(date -u -v+9d +%Y-%m-%dT00:00:00Z 2>/dev/null || date -u -d '+9 days' +%Y-%m-%dT00:00:00Z)" \
  --jq '.number' 2>/dev/null || echo "")

M4=$(gh api repos/$REPO/milestones -f title="M4: Alerts & AI" \
  -f description="Alerts CRUD, notification bell, AI chat, scenario sim" \
  -f due_on="$(date -u -v+11d +%Y-%m-%dT00:00:00Z 2>/dev/null || date -u -d '+11 days' +%Y-%m-%dT00:00:00Z)" \
  --jq '.number' 2>/dev/null || echo "")

M5=$(gh api repos/$REPO/milestones -f title="M5: Reports & Ship" \
  -f description="Reports, settings, Docker, README, demo accounts" \
  -f due_on="$(date -u -v+14d +%Y-%m-%dT00:00:00Z 2>/dev/null || date -u -d '+14 days' +%Y-%m-%dT00:00:00Z)" \
  --jq '.number' 2>/dev/null || echo "")

echo "✅ Milestones created: M1=$M1 M2=$M2 M3=$M3 M4=$M4 M5=$M5"

# ─── Helper ───────────────────────────────────────────────────
issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  local milestone="$4"
  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    --milestone "$milestone"
  echo "   ✔ $title"
}

echo "📝 Creating issues..."

# ════════════════════════════════════════════════════════════
# EPIC 1 — Design System & App Shell
# ════════════════════════════════════════════════════════════

issue \
"[EPIC] Design System & App Shell" \
"## Epic: Design System & App Shell

Replace the current \`styles.css\` monolith with a proper Tailwind CSS design system. Deliver an app shell with sidebar navigation, topbar, dark mode support, and IBM Plex Sans typography.

### Child issues
- #2 Install & configure Tailwind CSS v3 + design tokens
- #3 Build core component library
- #4 App shell — sidebar + topbar + dark mode toggle
- #5 Configure React Router v6 with protected routes" \
"epic,frontend,design,week-1,priority: high" "$M1"

issue \
"Install & configure Tailwind CSS v3 + IBM Plex Sans + design tokens" \
"## Goal
Replace inline styles and \`styles.css\` with a full Tailwind v3 design system.

## Tasks
- [ ] \`npm install -D tailwindcss postcss autoprefixer\` + \`npx tailwindcss init -p\`
- [ ] Configure \`tailwind.config.js\` with custom \`flood\` colour palette (primary: \`#0891b2\` cyan-600) and dark mode: \`'class'\`
- [ ] Add IBM Plex Sans, IBM Plex Sans Condensed, IBM Plex Mono via Google Fonts in \`index.html\`
- [ ] Define \`fontFamily\` in Tailwind config
- [ ] Create \`src/design/tokens.js\` — re-export Tailwind tokens as JS constants for use in Leaflet (which needs inline colours)
- [ ] Delete \`styles.css\` and replace with \`src/index.css\` containing only the Tailwind directives + one \`@layer base\` block for scroll/box-sizing resets

## Design Tokens
\`\`\`js
flood:   { 600: '#0891b2' }   // primary buttons, active states, badges
danger:  { DEFAULT: '#ef4444' }
warning: { DEFAULT: '#f59e0b' }
success: { DEFAULT: '#10b981' }
surface: { DEFAULT: '#0f172a', raised: '#1e293b', border: '#334155' } // dark theme
\`\`\`

## Acceptance Criteria
- [ ] \`npm run build\` produces no Tailwind warnings
- [ ] IBM Plex Sans renders on all pages
- [ ] Dark mode activates when \`dark\` class is on \`<html>\`" \
"frontend,design,week-1,priority: high" "$M1"

issue \
"Build core component library (Button, Badge, Card, Modal, Spinner, Avatar, Table)" \
"## Goal
A set of reusable, Tailwind-styled, dark-mode-aware components that every page uses.

## Components to Build

### Button
\`\`\`tsx
<Button variant=\"primary|ghost|danger|outline\" size=\"sm|md|lg\" loading={bool}>
\`\`\`
- Variants: primary (flood-600 bg), ghost (transparent), danger (red-600), outline (border)
- Loading state shows \`<Spinner />\` inline

### Badge
\`\`\`tsx
<Badge variant=\"high|moderate|low|critical|info\">
\`\`\`
- Critical: red · High: orange · Moderate: amber · Low: flood-600 · Info: slate

### Card
\`\`\`tsx
<Card header={<>...</>} footer={<>...</>}>body</Card>
\`\`\`
- White bg light / surface-raised bg dark
- Optional border + shadow variants

### Modal
- Backdrop blur, centred dialog, ESC to close, \`useEffect\` focus trap

### Spinner
- Animated SVG ring, size variants sm/md/lg

### Avatar
- Circular, shows initials from \`name\` prop when no \`src\`
- Size variants sm/md/lg

### Table
- Striped rows, sortable columns, empty state slot
- Responsive (horizontal scroll on mobile)

## Acceptance Criteria
- [ ] All components work in both light and dark mode
- [ ] No inline \`style\` props (Tailwind only)
- [ ] Components live in \`src/components/ui/\`" \
"frontend,design,week-1,priority: high" "$M1"

issue \
"App shell — collapsible sidebar, topbar, dark mode toggle" \
"## Goal
Replace the current single-page layout with a proper application shell. Every authenticated page renders inside this shell.

## Layout
\`\`\`
┌──────────────────────────────────────────────┐
│ TOPBAR: [≡] CrisisLens    [🔔 3] [avatar ▾] │
├────────┬─────────────────────────────────────┤
│        │                                     │
│ SIDE   │  PAGE CONTENT                       │
│ BAR    │                                     │
│        │                                     │
└────────┴─────────────────────────────────────┘
\`\`\`

## Sidebar
- Logo + wordmark at top
- Nav links (filtered by role — see #9):
  - 🗺 Map
  - 📊 Dashboard
  - 🔔 Alerts
  - 📄 Reports
  - ⚙️ Settings
  - 🛡 Admin (super_admin only)
- Collapse button (stores state in localStorage)
- User name + role chip at bottom

## Topbar
- Hamburger (mobile) / collapse toggle (desktop)
- Page title (set via React context)
- Notification bell with unread count badge (red dot)
- Avatar dropdown: Profile · Dark mode toggle · Logout

## Dark Mode
- Toggle button in topbar avatar dropdown
- Adds/removes \`dark\` class on \`document.documentElement\`
- Persisted to localStorage key \`cl-theme\`

## Files
- \`src/layouts/AppShell.jsx\`
- \`src/layouts/Sidebar.jsx\`
- \`src/layouts/Topbar.jsx\`
- \`src/hooks/useDarkMode.js\`

## Acceptance Criteria
- [ ] Sidebar collapses to icon-only on desktop
- [ ] Hamburger opens overlay sidebar on mobile (<768px)
- [ ] Dark mode toggle works and persists across refresh
- [ ] Notification bell shows unread count from Zustand store" \
"frontend,design,week-1,priority: high" "$M1"

issue \
"Configure React Router v6 with PrivateRoute and role guards" \
"## Goal
Replace the current pathname-sniffing hack in \`main.jsx\` with proper React Router v6 routing.

## Routes
\`\`\`
/login                     → <LoginPage>          (public)
/dashboard                 → <DashboardRouter>     (any auth → redirects by role)
/dashboard/national        → <NationalOpsDashboard> (national_ops, super_admin)
/dashboard/county          → <CountyDashboard>     (county_officer)
/dashboard/responder       → <ResponderDashboard>  (responder)
/dashboard/analyst         → <AnalystDashboard>    (analyst)
/map                       → <MapPage>             (any auth)
/alerts                    → <AlertsPage>          (national_ops, county_officer, responder)
/alerts/:id                → <AlertDetailPage>     (same)
/reports                   → <ReportsPage>         (analyst, national_ops)
/settings                  → <SettingsPage>        (any auth)
/admin                     → <AdminPage>           (super_admin)
/*                         → <NotFoundPage>
\`\`\`

## PrivateRoute component
\`\`\`jsx
// Checks: isAuthenticated AND (allowedRoles includes user.role)
// If not authenticated → redirect to /login
// If wrong role → redirect to /unauthorized
<PrivateRoute allowedRoles={['national_ops', 'super_admin']}>
  <NationalOpsDashboard />
</PrivateRoute>
\`\`\`

## Tasks
- [ ] \`npm install react-router-dom\`
- [ ] Create \`src/router/AppRouter.jsx\` with all routes
- [ ] Create \`src/router/PrivateRoute.jsx\`
- [ ] Create \`src/pages/\` folder with placeholder components for each page
- [ ] Delete route detection code from \`main.jsx\`

## Acceptance Criteria
- [ ] Unauthenticated user on /map → redirected to /login
- [ ] county_officer on /dashboard/national → redirected to /unauthorized
- [ ] Browser back/forward works correctly" \
"frontend,week-1,priority: high" "$M1"

# ════════════════════════════════════════════════════════════
# EPIC 2 — Authentication & Role System
# ════════════════════════════════════════════════════════════

issue \
"[EPIC] Authentication & Role System" \
"## Epic: Auth & Roles

Full JWT authentication with a custom Django User model, 5 roles, county assignment, and role-aware frontend navigation.

### Child issues
- #7 Backend — Custom User model with roles and county FK
- #8 Backend — JWT auth endpoints (login, refresh, logout, me)
- #9 Backend — Role-based permission classes
- #10 Frontend — Login page
- #11 Frontend — Auth context + Axios JWT interceptor
- #12 Frontend — Role-aware navigation" \
"epic,auth,backend,frontend,week-1,priority: high" "$M2"

issue \
"Backend — Custom User model with roles and county assignment" \
"## Goal
Replace Django's default User model with a custom model that includes a \`role\` field and \`county\` FK.

## Model
\`\`\`python
class User(AbstractUser):
    ROLES = [
        ('super_admin',    'Super Admin'),
        ('national_ops',   'National Operations'),
        ('county_officer', 'County Officer'),
        ('responder',      'Emergency Responder'),
        ('analyst',        'Analyst'),
    ]
    role    = models.CharField(max_length=20, choices=ROLES, default='responder')
    county  = models.ForeignKey('api.County', null=True, blank=True, on_delete=SET_NULL)
    phone   = models.CharField(max_length=20, blank=True)
    organization = models.CharField(max_length=100, blank=True)
\`\`\`

## Tasks
- [ ] Create new app \`accounts\` (or put in \`api\`)
- [ ] Define User model in \`accounts/models.py\`
- [ ] Set \`AUTH_USER_MODEL = 'accounts.User'\` in settings
- [ ] Create and run migration
- [ ] Register model in Django admin with role/county filter
- [ ] Update \`County\` and \`SubCounty\` models (see data epic)

## Acceptance Criteria
- [ ] \`python manage.py createsuperuser\` works with new model
- [ ] Admin shows role dropdown and county assignment
- [ ] Existing migrations are clean (fresh start — squash if needed)" \
"backend,auth,data,week-1,priority: high" "$M2"

issue \
"Backend — JWT auth endpoints (login, refresh, logout, me)" \
"## Goal
Secure JWT authentication endpoints using djangorestframework-simplejwt.

## Packages
\`\`\`
pip install djangorestframework-simplejwt
\`\`\`

## Endpoints
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | /api/auth/login/ | public | Returns access (15 min) + refresh (7 days) |
| POST | /api/auth/refresh/ | public | Returns new access token |
| POST | /api/auth/logout/ | required | Blacklists refresh token |
| GET  | /api/auth/me/ | required | Returns user profile + role + county |

## Token Payload (access token)
\`\`\`json
{ \"user_id\": 1, \"email\": \"x@y.com\", \"role\": \"county_officer\", \"county_id\": 2 }
\`\`\`

## Settings
\`\`\`python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
\`\`\`

## Tasks
- [ ] Install simplejwt + enable blacklist app
- [ ] Add custom token serializer to include role + county_id
- [ ] Create \`/api/auth/me/\` endpoint returning UserSerializer
- [ ] Add token URLs to \`api/urls.py\`
- [ ] Test all 4 endpoints with curl / Postman

## Acceptance Criteria
- [ ] Login returns both tokens
- [ ] Expired access token → 401
- [ ] Logout invalidates refresh token (blacklisted)" \
"backend,auth,week-1,priority: high" "$M2"

issue \
"Backend — Role-based permission classes" \
"## Goal
Create reusable DRF permission classes that enforce role checks on every protected endpoint.

## Permission Classes
\`\`\`python
class IsNationalOps(BasePermission):
    \"\"\"national_ops or super_admin\"\"\"

class IsCountyOfficer(BasePermission):
    \"\"\"county_officer, national_ops, or super_admin\"\"\"

class IsResponder(BasePermission):
    \"\"\"responder, county_officer, national_ops, or super_admin\"\"\"

class IsAnalyst(BasePermission):
    \"\"\"analyst, national_ops, or super_admin\"\"\"

class IsCountyMember(BasePermission):
    \"\"\"User's county matches the resource county (or user is national_ops+)\"\"\"
\`\`\`

## Apply to Views
| Endpoint | Permission |
|----------|-----------|
| GET /api/counties/ | IsAuthenticated |
| GET /api/sub-counties/ | IsAuthenticated |
| POST /api/alerts/ | IsCountyOfficer |
| PATCH /api/alerts/{id}/acknowledge/ | IsResponder |
| PATCH /api/alerts/{id}/resolve/ | IsCountyOfficer |
| POST /api/ai/feedback/ | IsAuthenticated |
| GET /api/reports/ | IsAnalyst |
| POST /api/reports/ | IsAnalyst |

## Acceptance Criteria
- [ ] Unauthenticated request → 401
- [ ] Wrong role → 403 with message \`{\"detail\": \"You do not have permission...\"}\`
- [ ] correct role → 200/201 as expected" \
"backend,auth,week-1,priority: high" "$M2"

issue \
"Frontend — Login page" \
"## Goal
A clean, professional login page using the new design system.

## Layout
\`\`\`
┌────────────────────────────────────────────────┐
│  Left 40%: brand panel (dark bg)               │
│  🌊 CrisisLens                                 │
│  National Predictive Risk &                    │
│  Early Warning System                          │
│                                                │
│  Right 60%: form panel (light/dark)            │
│  Sign in to your account                       │
│  [Email input          ]                       │
│  [Password input       ]                       │
│  [      Sign In        ]                       │
│  Error message area                            │
└────────────────────────────────────────────────┘
\`\`\`

## Tasks
- [ ] Create \`src/pages/LoginPage.jsx\`
- [ ] Form with email + password fields (Tailwind styled)
- [ ] POST to \`/api/auth/login/\` on submit
- [ ] Store access token in memory (Zustand) + refresh token in localStorage
- [ ] On success: call \`/api/auth/me/\` → populate auth store → redirect to /dashboard
- [ ] Show error message on 401 (\"Invalid email or password\")
- [ ] Loading state on Sign In button while fetching

## Acceptance Criteria
- [ ] Submitting with wrong credentials shows inline error
- [ ] Successful login redirects to /dashboard (which routes by role)
- [ ] Page is fully responsive on mobile" \
"frontend,auth,design,week-1,priority: high" "$M2"

issue \
"Frontend — Auth context + Axios JWT interceptor" \
"## Goal
Global auth state (Zustand) + Axios instance that auto-attaches tokens and handles refresh.

## Zustand Auth Store
\`\`\`js
// src/store/authStore.js
{
  user: null,        // { id, email, role, county, name }
  accessToken: null, // in memory only
  isAuthenticated: false,
  login(tokens, user): void,
  logout(): void,
  setToken(access): void,
}
\`\`\`

## Axios Instance
\`\`\`js
// src/api/client.js
- baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
- Request interceptor: attach Authorization: Bearer {accessToken}
- Response interceptor:
    - On 401: try POST /api/auth/refresh/ with refreshToken from localStorage
    - If refresh succeeds: retry original request with new access token
    - If refresh fails: logout() + redirect to /login
\`\`\`

## Tasks
- [ ] Install zustand: \`npm install zustand\`
- [ ] Create \`src/store/authStore.js\`
- [ ] Create \`src/api/client.js\` (axios instance)
- [ ] Create \`src/api/auth.js\` (login, logout, getMe functions)
- [ ] Wrap app in \`<AuthProvider>\` that rehydrates token on mount (from localStorage refresh token)

## Acceptance Criteria
- [ ] All API calls include Bearer token automatically
- [ ] Expired token → silent refresh → retry → success (user doesn't see a flicker)
- [ ] Invalid/missing refresh token → redirected to /login" \
"frontend,auth,week-1,priority: high" "$M2"

issue \
"Frontend — Role-aware navigation and DashboardRouter" \
"## Goal
The sidebar only shows links the user's role can access. /dashboard auto-redirects to the correct sub-dashboard.

## Nav Items by Role
| Link | national_ops | county_officer | responder | analyst |
|------|:---:|:---:|:---:|:---:|
| Map | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Alerts | ✅ | ✅ | ✅ | ❌ |
| Reports | ✅ | ❌ | ❌ | ✅ |
| Settings | ✅ | ✅ | ✅ | ✅ |
| Admin | super_admin only |

## DashboardRouter
\`\`\`jsx
// /dashboard → read role → redirect
national_ops / super_admin → /dashboard/national
county_officer             → /dashboard/county
responder                  → /dashboard/responder
analyst                    → /dashboard/analyst
\`\`\`

## Tasks
- [ ] Create \`src/router/DashboardRouter.jsx\`
- [ ] Update \`Sidebar.jsx\` to filter nav items using \`user.role\` from auth store
- [ ] Show role chip in sidebar footer (e.g. \`COUNTY OFFICER\` in cyan badge)

## Acceptance Criteria
- [ ] county_officer sees Alerts but not Reports
- [ ] analyst sees Reports but not Alerts
- [ ] /dashboard immediately redirects without a visible flash" \
"frontend,auth,week-1" "$M2"

# ════════════════════════════════════════════════════════════
# EPIC 3 — Backend Data Layer
# ════════════════════════════════════════════════════════════

issue \
"[EPIC] Backend Data Layer" \
"## Epic: Backend Data Layer

Proper Django ORM models replacing all hardcoded dicts. PostgreSQL database. Seed management command. REST API endpoints for counties, sub-counties, and predictions.

### Child issues
- #14 Django models — County, SubCounty, FloodObservation, FloodPrediction, FloodAlert, AuditLog
- #15 Management command: seed_counties
- #16 API: Counties and sub-counties endpoints
- #17 API: Alerts CRUD
- #18 Switch to PostgreSQL + django-environ" \
"epic,backend,data,week-1,priority: high" "$M2"

issue \
"Django models — County, SubCounty, FloodObservation, FloodPrediction, FloodAlert, AuditLog" \
"## Goal
Define all core domain models in the Django ORM.

## Models

### County
\`\`\`python
name: CharField(50)
code: CharField(5, unique=True)   # 'KSM'
region: CharField(50)              # 'Nyanza'
population: IntegerField
centroid_lat: FloatField
centroid_lon: FloatField
is_active: BooleanField(default=True)
\`\`\`

### SubCounty
\`\`\`python
county: FK(County, related_name='sub_counties')
name: CharField(100)
population: IntegerField(default=0)
area_sqkm: FloatField(default=0)
\`\`\`

### FloodObservation
\`\`\`python
sub_county: FK(SubCounty)
rainfall_accumulation: FloatField   # mm
soil_moisture: FloatField           # 0.0 – 1.0
elevation: FloatField               # m AMSL
past_flood_occurrence: BooleanField
observed_at: DateTimeField(auto_now_add=True)
source: CharField(50, default='manual')  # 'hardcoded-2024' | 'kmd-api' | 'manual'
\`\`\`

### FloodPrediction
\`\`\`python
observation: FK(FloodObservation, on_delete=CASCADE)
sub_county: FK(SubCounty)
flood_probability: FloatField
risk_category: CharField(20)      # 'Low' | 'Moderate' | 'High'
lead_time_days: IntegerField
confidence: FloatField
predicted_at: DateTimeField(auto_now_add=True)
\`\`\`

### FloodAlert
\`\`\`python
county: FK(County)
sub_county: FK(SubCounty, null=True, blank=True)
severity: CharField(choices=['critical','high','medium','low'])
title: CharField(200)
description: TextField
status: CharField(choices=['active','acknowledged','resolved'], default='active')
created_by: FK(User)
created_at: DateTimeField(auto_now_add=True)
acknowledged_at: DateTimeField(null=True)
acknowledged_by: FK(User, null=True)
resolved_at: DateTimeField(null=True)
\`\`\`

### AuditLog
\`\`\`python
user: FK(User, null=True)   # null for system actions
action: CharField(100)       # 'alert.create' | 'alert.acknowledge'
resource_type: CharField(50)
resource_id: IntegerField(null=True)
metadata: JSONField(default=dict)
timestamp: DateTimeField(auto_now_add=True)
\`\`\`

## Tasks
- [ ] Create all models
- [ ] Run \`makemigrations\` + \`migrate\`
- [ ] Register all models in \`admin.py\` with list_display, list_filter, search_fields
- [ ] Write model \`__str__\` methods
- [ ] Add indexes on frequently-queried fields (sub_county + observed_at)

## Acceptance Criteria
- [ ] \`python manage.py migrate\` runs cleanly on fresh DB
- [ ] All models visible and functional in Django admin" \
"backend,data,week-1,priority: high" "$M2"

issue \
"Management command: seed_counties (Kisumu, Siaya, Homa Bay + 21 sub-counties)" \
"## Goal
A runnable management command that populates the database with the 3 focus counties, their 21 sub-counties, initial FloodObservation records (from existing FLOOD_INDICATORS dict), and FloodPrediction records generated by \`score_flood()\`.

Also creates the 5 demo user accounts.

## Usage
\`\`\`bash
python manage.py seed_counties
python manage.py seed_counties --reset   # drops and re-seeds
\`\`\`

## Seed Data
Counties:
| Name | Code | Population |
|------|------|-----------|
| Kisumu | KSM | 1,155,574 |
| Siaya | SIA | 993,183 |
| Homa Bay | HMB | 1,131,950 |

Sub-counties and indicators come from the existing \`FLOOD_INDICATORS\` dict in \`services.py\`.

Demo users:
| Email | Role | County |
|-------|------|--------|
| admin@crisislens.ke | super_admin | — |
| ops@crisislens.ke | national_ops | — |
| officer@kisumu.ke | county_officer | Kisumu |
| responder@siaya.ke | responder | Siaya |
| analyst@crisislens.ke | analyst | — |

All demo passwords: from \`DEMO_PASSWORD\` env variable (default: \`CrisisLens2024!\`)

## Tasks
- [ ] Create \`api/management/commands/seed_counties.py\`
- [ ] Seed Counties, SubCounties using get_or_create
- [ ] For each sub-county: create FloodObservation from FLOOD_INDICATORS
- [ ] Call \`score_flood(**indicators)\` and save FloodPrediction
- [ ] Create 5 demo users with \`User.objects.get_or_create\`
- [ ] Create 3 initial FloodAlerts (Nyando River, Suba South, Rarieda)
- [ ] Print summary table at end

## Acceptance Criteria
- [ ] Idempotent: running twice doesn't create duplicates
- [ ] All 21 sub-county predictions exist after seed
- [ ] Demo login works: \`officer@kisumu.ke\` / \`CrisisLens2024!\`" \
"backend,data,week-1,priority: high" "$M2"

issue \
"API: Counties and sub-counties endpoints" \
"## Goal
REST endpoints for counties and sub-counties, replacing hardcoded frontend constants.

## Endpoints
\`\`\`
GET /api/counties/
  → list of active counties with latest risk summary
  Response: [{ id, name, code, population, flood_probability, risk_category, lead_time_days, sub_county_count }]

GET /api/counties/{id}/
  → county detail
  Response: { id, name, code, region, population, centroid_lat, centroid_lon, top_sub_counties: [...] }

GET /api/counties/{id}/risk/
  → latest FloodPrediction aggregated for county (max probability across sub-counties)
  Response: { flood_probability, risk_category, lead_time_days, confidence, predicted_at }

GET /api/sub-counties/?county={id}
  → list sub-counties for a county with their latest FloodPrediction
  Response: [{ id, name, population, flood_probability, risk_category, lead_time_days, confidence }]

GET /api/sub-counties/{id}/
  → sub-county detail + latest prediction + latest observation
\`\`\`

## Serializers
- \`CountyListSerializer\` — lightweight for list view
- \`CountyDetailSerializer\` — includes top sub-counties
- \`SubCountySerializer\` — includes latest prediction
- \`FloodPredictionSerializer\`

## Tasks
- [ ] Create \`CountyViewSet\` and \`SubCountyViewSet\` using DRF ModelViewSet
- [ ] Add \`risk/\` action on CountyViewSet
- [ ] Register in \`api/urls.py\` using DefaultRouter
- [ ] Add \`IsAuthenticated\` permission to all views

## Acceptance Criteria
- [ ] GET /api/counties/ returns all 3 counties with flood probabilities
- [ ] GET /api/sub-counties/?county=1 returns 7 Kisumu sub-counties
- [ ] Response fields match frontend expectations (check against useFloodRisk hook)" \
"backend,data,week-1,priority: high" "$M2"

issue \
"API: Alerts CRUD with role-based permissions" \
"## Goal
Full CRUD for FloodAlert model with role-gated write operations.

## Endpoints
\`\`\`
GET    /api/alerts/                   IsAuthenticated (county_officer sees own county only)
POST   /api/alerts/                   IsCountyOfficer | IsNationalOps
GET    /api/alerts/{id}/              IsAuthenticated
PATCH  /api/alerts/{id}/acknowledge/  IsResponder
PATCH  /api/alerts/{id}/resolve/      IsCountyOfficer
\`\`\`

## Query Filters
\`GET /api/alerts/?county=1&severity=high&status=active&page=2\`

## Serializer
\`\`\`python
class FloodAlertSerializer:
    id, county_name, sub_county_name, severity, title,
    description, status, created_by_name, created_at,
    acknowledged_at, acknowledged_by_name, resolved_at
\`\`\`

## Business Rules
- county_officer: can only see + create alerts for their own county
- national_ops: can see all counties, create alerts for any
- responder: read-only + acknowledge
- analyst: read-only

## Tasks
- [ ] Create \`FloodAlertViewSet\` with custom \`acknowledge\` and \`resolve\` actions
- [ ] Add county filtering in \`get_queryset()\` based on user role
- [ ] Write AuditLog entry on every create/acknowledge/resolve
- [ ] Pagination: page_size=20
- [ ] Order by \`-created_at\` by default

## Acceptance Criteria
- [ ] county_officer POST creates alert linked to their county
- [ ] responder PATCH /acknowledge returns 200 and sets acknowledged_at
- [ ] analyst GET /alerts returns 200 (read-only)
- [ ] analyst POST /alerts returns 403" \
"backend,data,auth,week-1,priority: high" "$M2"

issue \
"Switch from SQLite to PostgreSQL + configure django-environ" \
"## Goal
Production-ready database and environment configuration.

## Tasks

### docker-compose.yml (dev only)
\`\`\`yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: crisislens
      POSTGRES_USER: crisislens
      POSTGRES_PASSWORD: crisislens_dev
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
\`\`\`

### django-environ
\`\`\`bash
pip install django-environ psycopg2-binary
\`\`\`

### .env (gitignored)
\`\`\`
DEBUG=True
SECRET_KEY=replace-me-with-a-long-random-string
DATABASE_URL=postgres://crisislens:crisislens_dev@localhost:5432/crisislens
OPENAI_API_KEY=
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
DEMO_PASSWORD=CrisisLens2024!
\`\`\`

### .env.example (committed)
Same as .env but with placeholder values.

### settings.py update
\`\`\`python
import environ
env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
DATABASES = { 'default': env.db() }
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS')
\`\`\`

## Acceptance Criteria
- [ ] \`docker-compose up db\` starts PostgreSQL
- [ ] \`python manage.py migrate\` succeeds against PostgreSQL
- [ ] No secrets in \`settings.py\` or committed to git
- [ ] \`.env\` is in \`.gitignore\`" \
"backend,infra,week-1,priority: high" "$M2"

# ════════════════════════════════════════════════════════════
# EPIC 4 — Map & Core UI
# ════════════════════════════════════════════════════════════

issue \
"[EPIC] Core Map Rewrite" \
"## Epic: Core Map Rewrite

Replace monolithic App.jsx with a clean, API-driven MapPage. Live data from the counties/sub-counties API. Tailwind layout. No more hardcoded risk constants in the frontend.

### Child issues
- #20 MapPage layout with Tailwind (no inline styles)
- #21 Custom hooks: useFloodRisk + useSubCountyRisk
- #22 Sub-county slide-in detail panel
- #23 Map legend + controls" \
"epic,frontend,week-1,week-2,priority: high" "$M3"

issue \
"MapPage — Tailwind layout, no inline styles" \
"## Goal
Rewrite the map section as a proper \`MapPage\` component using Tailwind layout classes only.

## Layout
\`\`\`
MapPage
├── PageHeader (\"Lake Victoria Basin — Flood Risk Map\")
├── div.flex.gap-4
│   ├── div.flex-1           // map panel
│   │   ├── LeafletMap       // extracted component
│   │   └── CountySelector   // 3 pill buttons (Tailwind)
│   └── div.w-80             // detail panel (hidden until selection)
│       └── SubCountyPanel   // slide-in (see #22)
\`\`\`

## Tasks
- [ ] Create \`src/pages/MapPage.jsx\`
- [ ] Extract \`src/components/map/LeafletMap.jsx\` from App.jsx
- [ ] Extract \`src/components/map/CountySelector.jsx\`
- [ ] Move color interpolation helper to \`src/utils/floodColours.js\` (still needed for Leaflet inline styles since Leaflet doesn't support Tailwind)
- [ ] Remove ALL hardcoded LAKE_VICTORIA_AREA_RISK, BASE_COUNTY_RISK from frontend — these come from the API

## Acceptance Criteria
- [ ] Map renders with no inline \`style\` props (except LeafletMap itself which requires them)
- [ ] \`App.jsx\` is under 100 lines (just routes to MapPage)
- [ ] Page works inside the AppShell layout" \
"frontend,design,week-1,priority: high" "$M3"

issue \
"Custom hooks: useFloodRisk and useSubCountyRisk" \
"## Goal
Data-fetching hooks that replace all hardcoded frontend constants with live API calls.

## Hooks

### useFloodRisk(countyId)
\`\`\`js
// Fetches /api/counties/{countyId}/risk/
// Returns: { data, loading, error, refetch }
// data: { flood_probability, risk_category, lead_time_days, confidence }
\`\`\`

### useSubCountyRisk(countyId)
\`\`\`js
// Fetches /api/sub-counties/?county={countyId}
// Returns: { data, loading, error }
// data: [{ id, name, flood_probability, risk_category, lead_time_days }]
\`\`\`

### useAlerts(filters)
\`\`\`js
// Fetches /api/alerts/?county=X&severity=Y&status=Z
// Returns: { data, loading, error, total, refetch }
\`\`\`

## Tasks
- [ ] Create \`src/hooks/useFloodRisk.js\`
- [ ] Create \`src/hooks/useSubCountyRisk.js\`
- [ ] Create \`src/hooks/useAlerts.js\`
- [ ] All hooks use the Axios \`client\` instance from #11
- [ ] Loading state returns a skeleton placeholder
- [ ] Error state shows an ErrorCard with retry button

## Acceptance Criteria
- [ ] MapPage shows loading skeleton while data fetches
- [ ] Changing selected county refetches sub-county risk data
- [ ] Network error shows ErrorCard (not blank map)" \
"frontend,week-1,priority: high" "$M3"

issue \
"Sub-county slide-in detail panel" \
"## Goal
Replace the static side column with a slide-in panel that appears when a sub-county or county is clicked.

## Behaviour
- Default: panel is hidden (map takes full width)
- Click sub-county polygon: panel slides in from the right (300ms CSS transition)
- Panel shows: sub-county name, county, flood %, risk category badge, lead-time badge, indicator table (rainfall, soil moisture, elevation), top hotspots list
- X button closes the panel (map returns to full width)
- On mobile (<768px): panel is a bottom sheet (slides up from bottom)

## Component
\`\`\`jsx
<SubCountyPanel
  subCounty={selectedSubCounty}  // { id, name, county, flood_probability, ... }
  onClose={() => setSelected(null)}
/>
\`\`\`

## Tailwind Classes
\`\`\`
// desktop: translate-x-0 / translate-x-full transition-transform
// mobile: translate-y-0 / translate-y-full
\`\`\`

## Tasks
- [ ] Create \`src/components/map/SubCountyPanel.jsx\`
- [ ] Wire to LeafletMap click callback
- [ ] Include AI quick-question button at bottom of panel (opens AnalystDashboard AI chat or a modal)

## Acceptance Criteria
- [ ] Panel slides in smoothly on sub-county click
- [ ] Close button hides panel without page reload
- [ ] All data comes from useSubCountyRisk hook (no hardcoded values)" \
"frontend,design,week-2" "$M3"

issue \
"Map legend, controls, and last-updated timestamp" \
"## Goal
Professional map controls matching the new design system.

## Components
### Legend
- Horizontal gradient bar: pale blue → deep navy
- Labels: Low · Moderate · High
- Risk category icons (Droplets · Waves · TriangleAlert)

### Controls (top-right of map)
- 🔍 Reset view (zoom back to Lake Victoria)
- ⛶ Fullscreen toggle (Leaflet fullscreen plugin or manual)

### Last Updated Badge
- Bottom-left of map: \`Updated: Feb 22, 2026 14:30\`
- Pulled from the newest \`predicted_at\` in the sub-county risk data

## Tasks
- [ ] Create \`src/components/map/MapLegend.jsx\`
- [ ] Create \`src/components/map/MapControls.jsx\`
- [ ] Add last-updated badge to LeafletMap
- [ ] Style all with Tailwind (positioned as absolute overlays on map wrapper)

## Acceptance Criteria
- [ ] Legend renders correctly in both light and dark modes
- [ ] Reset view recentres map on Lake Victoria at zoom 9" \
"frontend,design,week-2" "$M3"

# ════════════════════════════════════════════════════════════
# EPIC 5 — Role-Based Dashboards
# ════════════════════════════════════════════════════════════

issue \
"[EPIC] Role-Based Dashboards" \
"## Epic: Role-Based Dashboards

Four distinct dashboards, each tailored to a user role. All data from live API.

### Child issues
- #25 National Ops Dashboard
- #26 County Officer Dashboard
- #27 Responder Dashboard
- #28 Analyst Dashboard" \
"epic,frontend,week-2,priority: high" "$M3"

issue \
"National Ops Dashboard" \
"## Goal
Overview dashboard for national_ops users. Countrywide risk picture, all 3 counties.

## Sections

### KPI Row (4 cards)
| KPI | Source |
|-----|--------|
| Active Alerts | GET /api/alerts/?status=active count |
| Counties at High Risk | flood_probability ≥ 75% |
| Estimated Affected Population | sum of sub-county populations where risk=High |
| Avg Lead Time | avg lead_time_days across active predictions |

### Risk Table
All 3 counties + top 3 sub-counties each. Columns: County · Sub-County · Probability · Category · Lead Time · Last Updated. Sortable.

### 30-Day Trend Chart
Line chart (Recharts AreaChart) showing flood_probability over time for each county. Data: last 30 FloodPrediction records per county ordered by predicted_at.

### Recent Alerts Feed
Last 10 alerts, all counties. Each row: severity badge · county · title · time ago · status chip.

## Tasks
- [ ] Create \`src/pages/dashboards/NationalOpsDashboard.jsx\`
- [ ] Fetch data using useFloodRisk, useAlerts hooks
- [ ] KPI cards use the Card + Badge components from #3
- [ ] Trend chart uses Recharts (already installed)

## Acceptance Criteria
- [ ] KPIs update when API data changes
- [ ] Risk table is sortable by probability
- [ ] Page renders without errors when no alerts exist yet" \
"frontend,week-2,priority: high" "$M3"

issue \
"County Officer Dashboard" \
"## Goal
Focused dashboard for county_officer role. Shows only their assigned county.

## Sections
### County Header
County name · Risk category badge · Lead time · Last updated

### Sub-County Risk Table
All sub-counties for the officer's county. Columns: Sub-County · Probability · Risk Bar · Category · Lead Time. Sorted by probability desc.

### Recommended Actions
Derived from risk data:
- High (≥75%): \"Issue evacuation advisory for [sub-county]\"
- Moderate (50-74%): \"Pre-position relief teams in [sub-county]\"
- Low (<50%): \"Monitor river levels in [sub-county]\"

### Create Alert Button
Opens a modal form → POST /api/alerts/

### County Alerts Feed
Alerts for this county only (last 20).

## Tasks
- [ ] Create \`src/pages/dashboards/CountyDashboard.jsx\`
- [ ] County ID comes from \`user.county_id\` in auth store
- [ ] Recommended actions derived from sub-county risk list (computed in component)
- [ ] Create Alert modal (see Epic 6 #30)

## Acceptance Criteria
- [ ] county_officer for Kisumu sees only Kisumu data
- [ ] Recommended actions list is non-empty when risk data is loaded
- [ ] Create Alert button opens modal" \
"frontend,week-2,priority: high" "$M3"

issue \
"Responder Dashboard" \
"## Goal
Action-focused dashboard for emergency responders. Prioritises active alerts and acknowledgement workflow.

## Sections
### Active Alerts Feed (primary)
Sorted by severity then created_at. Each card:
- Severity badge (colour coded: critical=red pulse, high=orange, medium=amber)
- County + Sub-county
- Title + description snippet
- Created by · Time ago
- [Acknowledge] button (calls PATCH /api/alerts/{id}/acknowledge/)

### Embedded Mini-Map
Small Leaflet map (non-interactive) showing sub-counties with active high/critical alerts highlighted in red. Read-only.

### County Risk Summary
Three county cards with flood_probability and lead time. Quick visual scan.

## Tasks
- [ ] Create \`src/pages/dashboards/ResponderDashboard.jsx\`
- [ ] Polling: refetch alerts every 60s (setInterval in useAlerts hook)
- [ ] Acknowledge action calls API + removes alert from Active feed (moves to Acknowledged)
- [ ] Pulsing red dot animation on Critical severity badge (Tailwind \`animate-pulse\`)

## Acceptance Criteria
- [ ] Acknowledging an alert removes it from the Active list immediately (optimistic update)
- [ ] Pulsing animation on critical severity badges
- [ ] Page auto-refreshes alerts every 60 seconds" \
"frontend,week-2" "$M3"

issue \
"Analyst Dashboard" \
"## Goal
Data exploration and AI briefing dashboard for analysts.

## Sections
### AI Briefing Panel (full-width, primary)
Full chat interface — see Epic 7 #33.

### Scenario Simulation Form
Adjust indicators → recalculate flood probability in real time.
- Sub-county selector
- Sliders: Rainfall (0–300mm), Soil Moisture (0–1), Elevation (1100–1400m)
- [Run Scenario] → POST /api/flood/predict/ → shows new probability, category, lead time
- Compare: \"Current: 82% High\" vs \"Simulated: 67% Moderate\"

### Prediction History Table
Recent FloodPrediction records (GET /api/sub-counties/{id}/). Shows how predictions changed over time for a selected sub-county.

## Tasks
- [ ] Create \`src/pages/dashboards/AnalystDashboard.jsx\`
- [ ] Slider components from Tailwind (range input styled)
- [ ] Scenario form POSTs to existing \`/api/flood/predict/\` endpoint

## Acceptance Criteria
- [ ] Running a scenario shows updated probability in <2 seconds
- [ ] AI chat loads without error (falls back gracefully if no OPENAI_API_KEY)
- [ ] Prediction history shows at least 1 record after seed command" \
"frontend,ai,week-2" "$M3"

# ════════════════════════════════════════════════════════════
# EPIC 6 — Alerts System
# ════════════════════════════════════════════════════════════

issue \
"[EPIC] Alerts System" \
"## Epic: Alerts System

Full alerts management with severity levels, status workflow, in-app notifications, and role-gated creation.

### Child issues
- #30 Alerts list page with filters
- #31 Alert detail modal
- #32 Alert creation form (modal)
- #33 Notification bell (in-app)" \
"epic,frontend,backend,week-2,priority: high" "$M4"

issue \
"Alerts list page with filters and pagination" \
"## Goal
A dedicated /alerts page showing all alerts the user can see, with filters and pagination.

## Layout
\`\`\`
[County ▾] [Severity ▾] [Status ▾] [Date range]    [+ New Alert] (county_officer only)
──────────────────────────────────────────────────────────────
⬤  CRITICAL  Kisumu · Nyando      Nyando River overflow warning    2h ago  Active [View]
⬤  HIGH      Homa Bay · Suba S.   Lake level rise 0.8m            5h ago  Acknowledged [View]
○  MEDIUM    Siaya · Rarieda      Shoreline flooding possible      1d ago  Resolved [View]
──────────────────────────────────────────────────────────────
Page 1 of 3  [← Prev]  [Next →]
\`\`\`

## Severity Colour Coding
- Critical: red (pulsing dot)
- High: orange
- Medium: amber
- Low: flood-600 (cyan)

## Tasks
- [ ] Create \`src/pages/AlertsPage.jsx\`
- [ ] Filter dropdowns (county, severity, status) update URL query params
- [ ] Pagination controls
- [ ] Each row links to AlertDetailPage OR opens AlertDetailModal

## Acceptance Criteria
- [ ] county_officer only sees their county's alerts
- [ ] Filters update the list without page reload
- [ ] Empty state shows helpful message (\"No active alerts in your county\")" \
"frontend,week-2,priority: high" "$M4"

issue \
"Alert detail modal with activity timeline" \
"## Goal
Clicking an alert opens a modal (or navigates to /alerts/:id) showing full detail and the activity timeline.

## Content
- Severity badge + status chip (large, prominent)
- County + Sub-county
- Title (h2)
- Description (full text)
- Indicators if available (rainfall, risk %)
- **Activity Timeline:**
  - 🟢 Created by [name] on [date time]
  - 🟡 Acknowledged by [name] on [date time] *(if acknowledged)*
  - ✅ Resolved on [date time] *(if resolved)*
- Action buttons (role-gated):
  - Responder: [Acknowledge] button (if status=active)
  - County Officer: [Resolve] button (if status=acknowledged)

## Tasks
- [ ] Create \`src/components/alerts/AlertDetailModal.jsx\`
- [ ] Fetch single alert GET /api/alerts/{id}/
- [ ] Acknowledge / Resolve call API then refetch + close modal
- [ ] Timeline rendered as vertical list with colour-coded dots

## Acceptance Criteria
- [ ] Acknowledging an alert updates status to 'acknowledged' and shows the timestamp
- [ ] Resolve button only appears for county_officer when status=acknowledged
- [ ] Timeline entries appear in correct order" \
"frontend,week-2,priority: med" "$M4"

issue \
"Alert creation form (modal)" \
"## Goal
county_officer and national_ops users can create new alerts via a modal form.

## Form Fields
- Severity (select): Critical · High · Medium · Low
- County (select, pre-filled for county_officer, selectable for national_ops)
- Sub-county (select, dependent on county)
- Title (text, required, max 200 chars)
- Description (textarea, required)

## Behaviour
- Opens via [+ New Alert] button on AlertsPage or CountyDashboard
- On submit: POST /api/alerts/ → close modal → refetch alerts list → show success toast
- Validation: all required fields highlighted if empty

## Tasks
- [ ] Create \`src/components/alerts/AlertCreateModal.jsx\`
- [ ] Sub-county options load dynamically based on selected county (GET /api/sub-counties/?county={id})
- [ ] Toast notification on success (simple Tailwind fixed-corner div, auto-dismiss after 3s)
- [ ] [+ New Alert] button hidden for responder and analyst roles

## Acceptance Criteria
- [ ] county_officer cannot change the county dropdown (locked to their county)
- [ ] Submitting empty form shows field validation errors
- [ ] Newly created alert appears in the list without page refresh" \
"frontend,week-2,priority: med" "$M4"

issue \
"Notification bell — in-app unread alerts" \
"## Goal
Bell icon in the topbar with unread count badge. Clicking opens a dropdown of recent unread alerts.

## Behaviour
- Bell icon with red badge showing unread count
- Click → dropdown showing last 5 unread alerts (by created_at desc)
- Each item: severity dot · title · county · time ago
- Click item → opens AlertDetailModal
- [Mark all read] button → clears the badge (stores read timestamp in localStorage; backend doesn't need a read model for MVP)
- Auto-polls GET /api/alerts/?status=active every 60s to update count

## Zustand Store
\`\`\`js
// alertStore.js
{ unreadCount: 0, recentAlerts: [], setAlerts(alerts): void }
\`\`\`

## Tasks
- [ ] Create \`src/components/layout/NotificationBell.jsx\`
- [ ] Add to Topbar (see #4)
- [ ] Zustand \`alertStore\` for unread count
- [ ] Polling in a top-level effect in AppShell

## Acceptance Criteria
- [ ] Badge shows correct unread count after seed (3 alerts seeded)
- [ ] Dropdown opens/closes cleanly
- [ ] \"Mark all read\" zeroes the badge" \
"frontend,week-2,priority: med" "$M4"

# ════════════════════════════════════════════════════════════
# EPIC 7 — AI Analyst Panel
# ════════════════════════════════════════════════════════════

issue \
"[EPIC] AI Analyst Panel" \
"## Epic: AI Analyst Panel

Refactored, role-aware AI chat panel with conversation history, pre-set question chips, and scenario simulation.

### Child issues
- #35 Backend — Structured AI endpoint with role context
- #36 Frontend — Full AI chat UI with typing indicator
- #37 Frontend — Scenario simulation form" \
"epic,ai,frontend,backend,week-2,priority: med" "$M4"

issue \
"Backend — Structured AI endpoint with role context and rate limiting" \
"## Goal
Improve the AI feedback endpoint with role-aware prompting and basic rate limiting.

## Changes to /api/ai/feedback/

### New request fields
\`\`\`python
class AIFeedbackRequest(Serializer):
    county: CharField
    area: CharField (optional)
    risk_type: ChoiceField
    question: CharField
    conversation_history: ListField (optional)  # [{ role, content }]
    user_role: CharField (optional)  # populated from JWT token in view
\`\`\`

### Role-aware prompt adjustment
- \`responder\`: Focus on evacuation routes, immediate actions, safe zones
- \`county_officer\`: Focus on resource deployment and coordination
- \`national_ops\`: Focus on multi-county escalation patterns
- \`analyst\`: Full technical depth, include confidence intervals

### Rate limiting
- 10 requests per user per hour using Django's cache framework (LocMemCache for dev)
- Return 429 with message \"Rate limit reached. Try again in X minutes.\" if exceeded

### Conversation history
- Pass previous messages as context to GPT
- Limit to last 10 messages to control token count

## Tasks
- [ ] Update \`AIFeedbackRequest\` serializer
- [ ] Add role detection from \`request.user.role\`
- [ ] Add role suffix to prompt
- [ ] Add rate limiting check using \`django.core.cache\`
- [ ] Pass \`conversation_history\` in messages list to OpenAI

## Acceptance Criteria
- [ ] responder gets evacuation-focused responses
- [ ] 11th request in an hour returns 429
- [ ] Conversation history is included in OpenAI messages" \
"backend,ai,week-2,priority: med" "$M4"

issue \
"Frontend — Full AI chat UI with typing indicator and quick-question chips" \
"## Goal
Replace the basic textarea + response with a proper chat interface.

## Layout
\`\`\`
┌─ Ask CrisisLens ─────────────────────────────── [AI Analyst] ┐
│ Current focus: Kisumu · Nyando · High (82%)                   │
│ ─────────────────────────────────────────────────────────────│
│ 💬 Which areas to evacuate?          → chip                   │
│ 💬 What's the 1-week outlook?        → chip                   │
│ 💬 How many people at risk?          → chip                   │
│ ─────────────────────────────────────────────────────────────│
│ [You] Which areas should be evacuated first?                  │
│ [CrisisLens] •••  (typing indicator)                          │
│ [CrisisLens] • Nyando sub-county is highest priority (82%)... │
│ ─────────────────────────────────────────────────────────────│
│ [Ask about this area...          ] [Send ▶]                   │
└───────────────────────────────────────────────────────────────┘
\`\`\`

## Tasks
- [ ] Update \`src/components/ai/AIChatPanel.jsx\`
- [ ] Message bubbles: user (right, flood-100 bg) / assistant (left, surface-raised bg)
- [ ] Typing indicator: 3 animated dots while \`aiLoading=true\`
- [ ] Quick-question chips: click fills textarea + auto-submits
- [ ] [Copy] button on each assistant message
- [ ] Scroll to bottom on new message (useEffect + ref)
- [ ] Conversation history passed to backend on each message

## Acceptance Criteria
- [ ] Typing indicator appears immediately after sending
- [ ] Quick-question chips auto-submit
- [ ] Conversation context is maintained across multiple messages" \
"frontend,ai,week-2,priority: med" "$M4"

issue \
"Frontend — Scenario simulation form (what-if flood modelling)" \
"## Goal
A form that lets analysts adjust flood indicators and immediately see the recalculated probability.

## Layout
\`\`\`
Scenario Simulation
──────────────────────────────────────────────────────
Sub-county: [Nyando ▾]
Rainfall:     [━━━━━━━━●───] 165 mm
Soil moisture:[━━━━━━━━●───] 0.87
Elevation:    [━━━●────────] 1134 m

[Run Scenario]

Current:   82% · High · 3-day lead time
Simulated: 67% · Moderate · 5-day lead time  ← after submit
Δ Change:  -15%  ↓ Downgraded to Moderate
──────────────────────────────────────────────────────
\`\`\`

## Tasks
- [ ] Create \`src/components/ai/ScenarioForm.jsx\`
- [ ] Range sliders (Tailwind range input, styled)
- [ ] On [Run Scenario]: POST to /api/flood/predict/ with form values
- [ ] Compare current prediction (from useSubCountyRisk hook) vs simulated result
- [ ] Show delta (+ or - %) with colour (green = less risk, red = more risk)

## Acceptance Criteria
- [ ] Sliding rainfall to 200mm and submitting shows higher probability
- [ ] Simulated result shows lead time change
- [ ] Form resets to current observed values when sub-county changes" \
"frontend,ai,week-2,priority: low" "$M4"

# ════════════════════════════════════════════════════════════
# EPIC 8 — Reports
# ════════════════════════════════════════════════════════════

issue \
"[EPIC] Reports" \
"## Epic: Reports

Report listing, generation, and download for analyst and national_ops users.

### Child issues
- #40 Reports list page
- #41 Report generation (PDF export)" \
"epic,frontend,backend,week-2,priority: low" "$M5"

issue \
"Reports list page" \
"## Goal
/reports page showing all generated reports with filters and download links.

## Layout
\`\`\`
[Type ▾]  [County ▾]  [Date range]           [+ Generate Report]
────────────────────────────────────────────────────────────────
📄 Flood Risk Bulletin — Kisumu   analyst@crisislens.ke  Feb 22 [↓]
📄 Situation Report — All Counties  ops@crisislens.ke  Feb 20   [↓]
────────────────────────────────────────────────────────────────
\`\`\`

## Tasks
- [ ] Create \`src/pages/ReportsPage.jsx\`
- [ ] Fetch GET /api/reports/
- [ ] Filter by type + county + date
- [ ] Download button triggers GET /api/reports/{id}/download/ → opens in new tab

## Acceptance Criteria
- [ ] Empty state shows \"No reports yet. Generate one above.\"
- [ ] Download opens the report file in a new browser tab" \
"frontend,week-2,priority: low" "$M5"

issue \
"Report generation — create and download flood risk briefing" \
"## Goal
Analysts can generate a PDF-style report from the current risk data.

## Backend
\`\`\`python
POST /api/reports/
Body: { county_id, report_type: 'flood_bulletin' | 'situation_report' }
→ Creates Report record
→ Generates HTML/text content from current FloodPrediction data
→ Returns report id

GET /api/reports/{id}/download/
→ Returns Content-Type: text/html (browser prints to PDF)
   OR Returns application/pdf if reportlab is available
\`\`\`

## Report Content (Flood Bulletin)
- Header: CrisisLens · Date · County
- County risk summary (probability, category, lead time)
- Sub-county risk table (all 21)
- Active alerts for county
- Recommended actions
- Footnote: Data source + confidence

## Tasks
- [ ] Add \`Report\` model: county FK, type, content TextField, created_by FK, created_at
- [ ] Create report generation view
- [ ] Frontend [+ Generate Report] button opens simple modal (county selector + type)
- [ ] On generate: POST + show success + add to list
- [ ] Download link opens report in new tab

## Acceptance Criteria
- [ ] Generated report contains correct county data
- [ ] Download link works in browser" \
"backend,frontend,week-2,priority: low" "$M5"

# ════════════════════════════════════════════════════════════
# EPIC 9 — Settings & Admin
# ════════════════════════════════════════════════════════════

issue \
"[EPIC] Settings & Admin" \
"## Epic: Settings, Profile, and Admin

User settings page, password change, and Django admin configuration.

### Child issues
- #43 User profile and settings page
- #44 Django admin configuration" \
"epic,frontend,backend,week-2,priority: low" "$M5"

issue \
"User profile and settings page" \
"## Goal
/settings page where users can update their profile and change their password.

## Sections

### Profile
- Full name, email (read-only), phone, organization
- Save button → PATCH /api/auth/me/

### Security
- Current password · New password · Confirm new password
- Save → POST /api/auth/change-password/

### Preferences
- Dark mode toggle (same as topbar toggle, persists to localStorage)
- Notification preference: All alerts / High+Critical only / None

## Tasks
- [ ] Create \`src/pages/SettingsPage.jsx\`
- [ ] Add \`PATCH /api/auth/me/\` endpoint to backend
- [ ] Add \`POST /api/auth/change-password/\` endpoint
- [ ] Show success/error toast after each save

## Acceptance Criteria
- [ ] Saving profile with valid data shows success toast
- [ ] Changing password with wrong current password shows error
- [ ] Dark mode preference persists across sessions" \
"frontend,backend,week-2,priority: low" "$M5"

issue \
"Django admin configuration" \
"## Goal
Configure Django admin to be the internal tool for super_admin users.

## Admin Registration

### UserAdmin
- list_display: email, role, county, is_active, date_joined
- list_filter: role, county, is_active
- search_fields: email, first_name, last_name
- Admin action: Reset password to default

### CountyAdmin
- list_display: name, code, region, population, is_active
- list_filter: region, is_active

### SubCountyAdmin
- list_display: name, county, population
- list_filter: county
- raw_id_fields: county

### FloodPredictionAdmin
- list_display: sub_county__name, flood_probability, risk_category, lead_time_days, predicted_at
- list_filter: risk_category, sub_county__county
- Admin action: Regenerate predictions for all sub-counties

### FloodAlertAdmin
- list_display: title, county, severity, status, created_by, created_at
- list_filter: severity, status, county
- Admin action: Mark all active as acknowledged

### AuditLogAdmin
- list_display: user, action, resource_type, timestamp
- list_filter: action, resource_type
- Read-only (no add/change)

## Tasks
- [ ] Update \`api/admin.py\` with all registrations
- [ ] Add custom admin actions
- [ ] Set \`site.site_header = \"CrisisLens Admin\"\`
- [ ] Restrict admin access to is_staff=True (set for super_admin on creation)

## Acceptance Criteria
- [ ] admin@crisislens.ke can log into /admin/
- [ ] All models visible with correct list displays and filters
- [ ] AuditLog is read-only (no add/change buttons)" \
"backend,week-2,priority: low" "$M5"

# ════════════════════════════════════════════════════════════
# EPIC 10 — Infrastructure & Deployment
# ════════════════════════════════════════════════════════════

issue \
"[EPIC] Infrastructure & Deployment Readiness" \
"## Epic: Infrastructure

Docker Compose setup, environment config, production settings, and documentation.

### Child issues
- #46 Docker Compose (postgres + django + react)
- #47 README rewrite with architecture, setup, and API docs" \
"epic,infra,week-2,priority: med" "$M5"

issue \
"Docker Compose — postgres, django (gunicorn), react (nginx)" \
"## Goal
A single \`docker-compose.yml\` that spins up the full stack.

## Services

### db (postgres:16-alpine)
- Env: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
- Volume: pgdata
- Health check: pg_isready

### backend (Django + Gunicorn)
- Dockerfile: python:3.12-slim
- Runs: gunicorn crisislens.wsgi -b 0.0.0.0:8000 --workers 2
- Depends on: db (healthy)
- Env from: .env file
- Runs migrations + seed on startup

### frontend (React build + Nginx)
- Dockerfile: node:20-alpine build stage + nginx:alpine serve stage
- Nginx config: serves /dist, proxies /api/ to backend:8000
- Port: 80

## Usage
\`\`\`bash
docker-compose up --build
# App at http://localhost:80
# API at http://localhost:80/api/
# Admin at http://localhost:80/admin/
\`\`\`

## Tasks
- [ ] Write \`docker-compose.yml\`
- [ ] Write \`backend/Dockerfile\`
- [ ] Write \`frontend/Dockerfile\` (multi-stage)
- [ ] Write \`frontend/nginx.conf\`
- [ ] Write \`backend/entrypoint.sh\` (wait for db + migrate + seed + gunicorn)
- [ ] Test: \`docker-compose up\` from clean state produces working app

## Acceptance Criteria
- [ ] \`docker-compose up --build\` succeeds from a clean clone
- [ ] All 5 demo accounts work at http://localhost
- [ ] Admin at /admin/ works" \
"infra,week-2,priority: med" "$M5"

issue \
"README rewrite — architecture, setup, API docs, demo" \
"## Goal
Replace the current README with a comprehensive document that covers the full application.

## Sections
1. **What is CrisisLens** — 2-sentence pitch
2. **Architecture** — text diagram (backend → postgres, frontend → nginx, leaflet map, OpenAI)
3. **Tech Stack** — table (Django, DRF, SimpleJWT, PostgreSQL, React, Vite, Tailwind, Recharts, Lucide, Leaflet)
4. **Quick Start (Local)**
   - Clone, create .env from .env.example
   - docker-compose up --build
   - OR manual: backend venv + pip install + migrate + seed; frontend npm install + dev
5. **Demo Accounts** — table of all 5 users with role and county
6. **API Reference** — table of all endpoints with method, path, auth, description
7. **User Roles** — table
8. **Contributing** — branch naming, PR process
9. **License** — MIT

## Tasks
- [ ] Write new README.md
- [ ] Add screenshot placeholder section (update with actual screenshots after UI is done)
- [ ] Verify all setup commands are accurate

## Acceptance Criteria
- [ ] A new developer can get the app running following only the README
- [ ] All 5 demo accounts are documented" \
"infra,week-2,priority: med" "$M5"

echo ""
echo "✅ All done! CrisisLens GitHub project is fully set up."
echo ""
echo "Summary:"
echo "  • Repo description updated"
echo "  • 13 labels created"
echo "  • 5 milestones created (M1–M5)"
echo "  • 37 issues created across 10 epics"
echo ""
echo "Next steps:"
echo "  1. Go to https://github.com/$REPO/milestones to review milestones"
echo "  2. Go to https://github.com/$REPO/issues to see all issues"
echo "  3. Create a GitHub Project board and link the milestones"
echo "  4. Assign issues to team members"
echo "  5. Start with M1: Foundation — run:  git checkout -b feat/foundation"
