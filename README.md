# CrisisLens

CrisisLens is an AI-driven early warning and intelligence platform designed to detect, analyze, and anticipate humanitarian and climate-related crises such as drought and food insecurity. The system integrates multiple data sources, transforms them into meaningful indicators, and applies machine learning models to support timely, data-informed decisions.

---

## What Problem CrisisLens Solves

Across many regions, especially in climate-vulnerable areas, early signals of drought and food stress exist but are scattered across datasets, institutions, and formats. By the time impacts are visible, response is often late and costly.

CrisisLens addresses this gap by:

* Aggregating environmental and economic signals (rainfall, vegetation health, food prices)
* Converting raw data into interpretable drought risk features
* Enabling predictive modeling and downstream integrations via an API

---

## Core Capabilities

* **Data Ingestion**: Automated collection of rainfall, NDVI, and food price data
* **Data Processing**: Cleaning, normalization, and feature engineering
* **Modeling**: Machine learning models for drought risk estimation
* **API Layer**: Programmatic access to predictions and indicators
* **Research-Ready**: Notebook-based exploration and experimentation

---

## Project Structure

The repository is organized into clear, modular components that reflect the full data-to-decision pipeline.

### Backend (Django)

backend/

* crisislens/: Django project settings and routing
* api/: REST API endpoints and scoring logic

### Frontend (React)

frontend/

* src/: React UI for drought and flood risk scoring
* src/data/kenyaCounties.json: Placeholder GeoJSON grid for 47 counties (swap with official boundaries)
* index.html: Vite entry point

### Root Files

* requirements.txt: Python dependencies
* README.md: Project documentation

---

## Getting Started

### Prerequisites

* Python 3.9+
* Node.js 18+

### Installation

```bash
pip install -r requirements.txt
```

If you run the backend from inside the `backend/` folder on Windows, you can also use:

```bash
pip install -r backend/requirements.txt
```

### Run the API (Django)

```bash
cd backend
python manage.py migrate
python manage.py runserver 8000
```

### Run the Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

The React app expects the Django API to be running on `http://localhost:8000`.

The backend enables CORS via `django-cors-headers` for local development, so the React
app can call the API without browser blocking.

### Troubleshooting Vite parse errors

If Vite reports `import`/`export` only allowed at the top level, ensure `frontend/src/App.jsx`
has a single component definition and has not been duplicated by a merge conflict. Replacing
your local file with the repo version should resolve the error.

### AI feedback setup

The generative feedback panel calls `POST /api/ai/feedback/` on the backend. Set the API
key in your shell before running Django:

```bash
export OPENAI_API_KEY=your_key_here
```

### Sample API requests

Then request a drought prediction:

```bash
curl -X POST http://localhost:8000/api/drought/predict/ \
  -H "Content-Type: application/json" \
  -d '{"rainfall_deviation": -22, "ndvi_stress": 0.58, "price_volatility": 18, "historical_phase": "Alert"}'
```

Flood prediction example:

```bash
curl -X POST http://localhost:8000/api/flood/predict/ \
  -H "Content-Type: application/json" \
  -d '{"rainfall_accumulation": 140, "soil_moisture": 0.7, "elevation": 120, "past_flood_occurrence": true}'
```

The responses return percentage risk scores alongside projected phase or lead time.

---

## Workflow Overview

1. Ingest raw environmental and economic data
2. Clean and merge datasets into a unified format
3. Engineer drought-related features
4. Train and evaluate predictive models
5. Serve insights through an API or downstream systems

---

## Use Cases

* Early warning systems for drought and food insecurity
* Decision support for humanitarian organizations
* Research and policy analysis
* Integration into national or regional monitoring platforms

---

## Roadmap

* Add real-time data pipelines
* Expand models to multi-hazard risk scoring
* Integrate geospatial visualization
* Deploy scalable API infrastructure

---
