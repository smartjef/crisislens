crisislens/
│
├── data/
│   ├── raw/              # Original downloaded datasets
│   ├── processed/        # Cleaned & merged data
│
├── notebooks/
│   ├── 01_explore_data.ipynb
│   ├── 02_feature_engineering.ipynb
│
├── src/
│   ├── ingestion/
│   │   ├── rainfall.py
│   │   ├── ndvi.py
│   │   └── food_prices.py
│   │
│   ├── processing/
│   │   └── drought_features.py
│   │
│   ├── models/
│   │   └── drought_model.py
│   │
│   ├── api/
│   │   └── main.py
│
├── requirements.txt
└── README.md
 
