import { useMemo, useState } from "react";
import { GeoJSON, MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import kenyaCounties from "./data/kenyaCounties.json";

// --- Static MVP risk data (swap with backend API calls when ready) ---
const BASE_COUNTY_RISK = {
  Turkana: {
    county: "Turkana",
    riskType: "drought",
    riskPercent: 78,
    expectedEvent: "Severe vegetation stress and below-average rainfall",
    measurement: "Rainfall deviation -28%",
    effects: "Pasture loss, reduced water access, rising food prices",
    recommendations: "Pre-position food relief and expand water trucking"
  },
  Nairobi: {
    county: "Nairobi",
    riskType: "flood",
    riskPercent: 42,
    expectedEvent: "Localized flash floods in low-lying wards",
    measurement: "Rainfall accumulation 120mm",
    effects: "Transport disruption and drainage overflow",
    recommendations: "Clear drainage channels and issue urban flood alerts"
  },
  Kisumu: {
    county: "Kisumu",
    riskType: "flood",
    riskPercent: 66,
    expectedEvent: "Lake basin overflow risk",
    measurement: "Soil moisture 0.82",
    effects: "Flooding near shoreline settlements",
    recommendations: "Prepare evacuation sites and deploy early warnings"
  },
  Mombasa: {
    county: "Mombasa",
    riskType: "flood",
    riskPercent: 58,
    expectedEvent: "Coastal storm surge warning",
    measurement: "Tide + rainfall 95mm",
    effects: "Coastal inundation and road washouts",
    recommendations: "Issue coastal alerts and pre-stage response teams"
  },
  Garissa: {
    county: "Garissa",
    riskType: "drought",
    riskPercent: 52,
    expectedEvent: "Rangeland stress and water shortages",
    measurement: "NDVI stress 0.64",
    effects: "Livestock migration and reduced crop yields",
    recommendations: "Scale borehole support and fodder distribution"
  }
};

// --- Area-level shading (sample towns/areas for MVP) ---
const AREA_RISK_DATA = {
  Nairobi: [
    {
      name: "Embakasi",
      riskType: "flood",
      riskPercent: 78,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [36.94, -1.28],
            [37.02, -1.28],
            [37.02, -1.36],
            [36.94, -1.36],
            [36.94, -1.28]
          ]
        ]
      }
    },
    {
      name: "CBD",
      riskType: "flood",
      riskPercent: 55,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [36.82, -1.27],
            [36.86, -1.27],
            [36.86, -1.30],
            [36.82, -1.30],
            [36.82, -1.27]
          ]
        ]
      }
    },
    {
      name: "Karen",
      riskType: "flood",
      riskPercent: 34,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [36.70, -1.38],
            [36.78, -1.38],
            [36.78, -1.43],
            [36.70, -1.43],
            [36.70, -1.38]
          ]
        ]
      }
    },
    {
      name: "Westlands",
      riskType: "flood",
      riskPercent: 47,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [36.79, -1.25],
            [36.84, -1.25],
            [36.84, -1.29],
            [36.79, -1.29],
            [36.79, -1.25]
          ]
        ]
      }
    }
  ],
  Turkana: [
    {
      name: "Lodwar",
      riskType: "drought",
      riskPercent: 82,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [35.45, 4.2],
            [35.55, 4.2],
            [35.55, 4.1],
            [35.45, 4.1],
            [35.45, 4.2]
          ]
        ]
      }
    },
    {
      name: "Kakuma",
      riskType: "drought",
      riskPercent: 64,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [34.82, 4.32],
            [34.92, 4.32],
            [34.92, 4.22],
            [34.82, 4.22],
            [34.82, 4.32]
          ]
        ]
      }
    }
  ],
  Kisumu: [
    {
      name: "Nyamasaria",
      riskType: "flood",
      riskPercent: 72,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [34.78, -0.22],
            [34.86, -0.22],
            [34.86, -0.30],
            [34.78, -0.30],
            [34.78, -0.22]
          ]
        ]
      }
    },
    {
      name: "Kondele",
      riskType: "flood",
      riskPercent: 58,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [34.75, -0.16],
            [34.83, -0.16],
            [34.83, -0.22],
            [34.75, -0.22],
            [34.75, -0.16]
          ]
        ]
      }
    }
  ],
  Mombasa: [
    {
      name: "Nyali",
      riskType: "flood",
      riskPercent: 61,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [39.67, -3.98],
            [39.77, -3.98],
            [39.77, -4.05],
            [39.67, -4.05],
            [39.67, -3.98]
          ]
        ]
      }
    },
    {
      name: "Likoni",
      riskType: "flood",
      riskPercent: 49,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [39.58, -4.09],
            [39.66, -4.09],
            [39.66, -4.16],
            [39.58, -4.16],
            [39.58, -4.09]
          ]
        ]
      }
    }
  ],
  Garissa: [
    {
      name: "Garissa Town",
      riskType: "drought",
      riskPercent: 56,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [39.62, -0.42],
            [39.70, -0.42],
            [39.70, -0.50],
            [39.62, -0.50],
            [39.62, -0.42]
          ]
        ]
      }
    },
    {
      name: "Dadaab",
      riskType: "drought",
      riskPercent: 63,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [40.08, 0.05],
            [40.18, 0.05],
            [40.18, -0.05],
            [40.08, -0.05],
            [40.08, 0.05]
          ]
        ]
      }
    }
  ]
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "drought", label: "Drought & Food Insecurity" },
  { id: "flood", label: "Flood & Extreme Weather" }
];

const RISK_COLORS = {
  drought: "#f97316",
  flood: "#2563eb",
  muted: "#cbd5f5"
};

// --- Helpers for map rendering ---
const hashString = (value) =>
  value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

const buildGeneratedRisk = (county) => {
  const seed = hashString(county);
  const riskType = seed % 2 === 0 ? "drought" : "flood";
  const riskPercent = 35 + (seed % 50);
  const emoji = riskType === "drought" ? "🍲" : "🌊";
  const expectedEvent =
    riskType === "drought"
      ? "Below-average rainfall and declining vegetation health"
      : "Elevated rainfall intensity with localized flood exposure";
  const measurement =
    riskType === "drought"
      ? `Rainfall deviation -${15 + (seed % 20)}%`
      : `Rainfall accumulation ${90 + (seed % 70)}mm`;
  const effects =
    riskType === "drought"
      ? "Water stress, pasture decline, and elevated food price pressure"
      : "Surface flooding risk, drainage stress, and transport disruption";
  const recommendations =
    riskType === "drought"
      ? "Scale water access support and pre-position food relief"
      : "Issue flood alerts and prepare evacuation corridors";

  return {
    county,
    riskType,
    riskPercent,
    expectedEvent,
    measurement,
    effects,
    recommendations,
    emoji
  };
};

const COUNTY_RISK_DATA = kenyaCounties.features.map((feature) => {
  const countyName = feature.properties.name;
  const base = BASE_COUNTY_RISK[countyName];
  const entry = base ? { ...base } : buildGeneratedRisk(countyName);
  return { ...entry, emoji: entry.riskType === "drought" ? "🍲" : "🌊" };
});

const createEmojiIcon = (emoji) =>
  L.divIcon({
    html: `<span style="font-size:18px">${emoji}</span>`,
    className: "emoji-icon",
    iconSize: [20, 20]
  });

const getCentroid = (coordinates) => {
  const [firstRing] = coordinates;
  const total = firstRing.reduce(
    (acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng, count: acc.count + 1 }),
    { lat: 0, lng: 0, count: 0 }
  );
  return [total.lat / total.count, total.lng / total.count];
};

const buildAreaGeoJson = (areas = []) => ({
  type: "FeatureCollection",
  features: areas.map((area) => ({
    type: "Feature",
    properties: {
      name: area.name,
      riskType: area.riskType,
      riskPercent: area.riskPercent
    },
    geometry: area.geometry
  }))
});

const formatFilterLabel = (riskType) =>
  riskType === "drought" ? "Drought & Food Insecurity" : "Flood & Extreme Weather";

const fallbackResponse = (details, area) => {
  const location = area ? `${area} (${details.county})` : `${details.county}`;
  return `CrisisLens briefing for ${location}:

- Severity: ${details.riskPercent}% affected (${details.riskType}).
- Timing: impacts expected within 2-4 weeks, with escalation possible two weeks later.
- Affected areas: ${area || "key wards and market centers"}.
- Recommendations: ${details.recommendations}.
- Food security: price volatility likely within 4-6 weeks; advise stocking staples and coordinating relief.`;
};

function App() {
  // Track active filter and selected county/area for the details panel.
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedCounty, setSelectedCounty] = useState(COUNTY_RISK_DATA[0].county);
  const [selectedArea, setSelectedArea] = useState("");
  const [mapInstance, setMapInstance] = useState(null);
  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Build lookup tables for fast access during map rendering.
  const riskByCounty = useMemo(() => {
    return COUNTY_RISK_DATA.reduce((acc, entry) => {
      acc[entry.county] = entry;
      return acc;
    }, {});
  }, []);

  const filteredCounties = useMemo(() => {
    if (activeFilter === "all") return COUNTY_RISK_DATA;
    return COUNTY_RISK_DATA.filter((entry) => entry.riskType === activeFilter);
  }, [activeFilter]);

  const selectedDetails =
    COUNTY_RISK_DATA.find((entry) => entry.county === selectedCounty) || COUNTY_RISK_DATA[0];

  const selectedAreas = AREA_RISK_DATA[selectedCounty] || [];
  const areaGeoJson = buildAreaGeoJson(selectedAreas);

  const handleCountyClick = (countyName, bounds) => {
    setSelectedCounty(countyName);
    setSelectedArea("");
    if (mapInstance && bounds) {
      mapInstance.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  const handleAreaClick = (areaName) => {
    setSelectedArea(areaName);
  };

  const geoJsonStyle = (feature) => {
    const countyName = feature.properties.name;
    const risk = riskByCounty[countyName];
    const matchesFilter =
      activeFilter === "all" || (risk && risk.riskType === activeFilter);

    const fillColor = matchesFilter && risk ? RISK_COLORS[risk.riskType] : RISK_COLORS.muted;
    const intensity = risk ? Math.min(0.85, Math.max(0.25, risk.riskPercent / 100)) : 0.15;

    return {
      fillColor,
      fillOpacity: matchesFilter ? intensity : 0.2,
      color: "#1f2937",
      weight: 1
    };
  };

  const areaStyle = (feature) => {
    const { riskType, riskPercent } = feature.properties;
    const matchesFilter = activeFilter === "all" || riskType === activeFilter;
    const intensity = Math.min(0.85, Math.max(0.2, riskPercent / 100));

    return {
      fillColor: "#1d4ed8",
      fillOpacity: matchesFilter ? intensity : 0.15,
      color: matchesFilter ? "#0f172a" : "#94a3b8",
      weight: 1
    };
  };

  const handleAskAI = async (event) => {
    event.preventDefault();
    setAiLoading(true);
    setAiError("");

    try {
      const response = await fetch("http://localhost:8000/api/ai/feedback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          county: selectedDetails.county,
          area: selectedArea,
          risk_type: activeFilter,
          question: question || `Summarize risks for ${selectedDetails.county}.`
        })
      });

      if (!response.ok) {
        throw new Error("Unable to fetch AI feedback.");
      }

      const data = await response.json();
      setAiAnswer(data.response);
    } catch (error) {
      setAiAnswer(fallbackResponse(selectedDetails, selectedArea));
      setAiError("Live AI response unavailable. Showing a local MVP summary instead.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="page">
      {/* Hero section */}
      <header className="hero">
        <p className="tag">CRISISLENS MVP</p>
        <h1>Kenya early warning map for drought & flood risk.</h1>
        <p className="subhead">
          Click a county to zoom in and review affected areas. Ask a question below to generate a
          narrative briefing powered by the AI feedback panel.
        </p>
      </header>

      {/* Map section */}
      <section className="map-section">
        <div className="map-wrapper">
          <MapContainer
            center={[0.5, 37.8]}
            zoom={6}
            scrollWheelZoom
            className="map"
            whenCreated={setMapInstance}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              key={activeFilter}
              data={kenyaCounties}
              style={geoJsonStyle}
              onEachFeature={(feature, layer) => {
                const countyName = feature.properties.name;
                const risk = riskByCounty[countyName];
                const riskLabel = risk?.riskType === "flood" ? "Flood" : "Drought";
                const emoji = risk?.emoji ?? "";
                const percentage = risk ? `${risk.riskPercent}% affected` : "N/A";

                layer.bindTooltip(
                  `<strong>${countyName}</strong><br/>${emoji} ${riskLabel} · ${percentage}`,
                  { sticky: true }
                );
                layer.on({
                  click: () => handleCountyClick(countyName, layer.getBounds())
                });
              }}
            />
            {/* Area/town shading inside the selected county */}
            {selectedAreas.length > 0 && (
              <GeoJSON
                key={`${selectedCounty}-${activeFilter}`}
                data={areaGeoJson}
                style={areaStyle}
                onEachFeature={(feature, layer) => {
                  const { name, riskPercent } = feature.properties;
                  layer.bindTooltip(`<strong>${name}</strong><br/>${riskPercent}% affected`, {
                    sticky: true
                  });
                  layer.on({
                    click: () => handleAreaClick(name)
                  });
                }}
              />
            )}
            {/* Emoji markers for every county */}
            {filteredCounties.map((entry) => {
              const feature = kenyaCounties.features.find(
                (item) => item.properties.name === entry.county
              );
              if (!feature) return null;
              const centroid = getCentroid(feature.geometry.coordinates);
              return (
                <Marker
                  key={entry.county}
                  position={centroid}
                  icon={createEmojiIcon(entry.emoji)}
                />
              );
            })}
          </MapContainer>
        </div>

        {/* Filter menu */}
        <div className="filters">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={activeFilter === filter.id ? "filter active" : "filter"}
              onClick={() => {
                setActiveFilter(filter.id);
                if (filter.id !== "all") {
                  const next = COUNTY_RISK_DATA.find((entry) => entry.riskType === filter.id);
                  if (next) setSelectedCounty(next.county);
                }
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {/* Details panel */}
      <section className="details">
        <div className="details-header">
          <h2>{selectedDetails.county} County</h2>
          <span className={`badge ${selectedDetails.riskType}`}>
            {formatFilterLabel(selectedDetails.riskType)}
          </span>
        </div>
        <div className="details-grid">
          <div>
            <p className="label">Expected event</p>
            <p>{selectedDetails.expectedEvent}</p>
          </div>
          <div>
            <p className="label">Measurement</p>
            <p>{selectedDetails.measurement}</p>
          </div>
          <div>
            <p className="label">Likely effects</p>
            <p>{selectedDetails.effects}</p>
          </div>
          <div>
            <p className="label">Recommendations</p>
            <p>{selectedDetails.recommendations}</p>
          </div>
        </div>
        {selectedArea && (
          <p className="area-highlight">
            Selected area: <strong>{selectedArea}</strong>
          </p>
        )}
      </section>

      {/* Generative AI feedback panel */}
      <section className="ai-panel">
        <div className="details-header">
          <h2>Ask CrisisLens</h2>
          <span className="badge">AI Feedback</span>
        </div>
        <p className="ai-subhead">
          Ask about a county or area to get a detailed, actionable briefing. This panel is wired to
          the backend AI endpoint and falls back to local MVP guidance if the API is unavailable.
        </p>
        <form className="ai-form" onSubmit={handleAskAI}>
          <input
            type="text"
            placeholder="Ask about risks, timing, or recommendations..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button type="submit" disabled={aiLoading}>
            {aiLoading ? "Generating..." : "Generate briefing"}
          </button>
        </form>
        {aiError && <p className="error">{aiError}</p>}
        {aiAnswer && <pre className="ai-response">{aiAnswer}</pre>}
      </section>
    </div>
  );
}

export default App;
