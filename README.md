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

### Data

data/

* raw: Original downloaded datasets
* processed: Cleaned and merged datasets ready for analysis

### Notebooks

notebooks/

* 01_explore_data.ipynb: Initial data exploration and validation
* 02_feature_engineering.ipynb: Feature creation and experimentation

### Source Code

src/

* ingestion/

  * rainfall.py: Rainfall data collection and parsing
  * ndvi.py: Vegetation index ingestion
  * food_prices.py: Market price data ingestion

* processing/

  * drought_features.py: Feature engineering for drought indicators

* models/

  * drought_model.py: Machine learning model definition and training

* api/

  * main.py: API entry point for serving predictions

### Root Files

* requirements.txt: Python dependencies
* README.md: Project documentation

---

## Getting Started

### Prerequisites

* Python 3.9+
* pip or virtualenv

### Installation

```bash
pip install -r requirements.txt
```

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

