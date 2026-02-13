import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import kenyaCountiesRaw from "./data/ken_admin1.geojson?raw";
import kenyaAreasRaw from "./data/ken_admin2.geojson?raw";

// --- Static MVP risk data (swap with backend API calls when ready) ---
const kenyaCounties = JSON.parse(kenyaCountiesRaw);
const kenyaAreas = JSON.parse(kenyaAreasRaw);
// --- County-level baseline risk data (augmented with deterministic fallbacks) ---
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

const RISK_EMOJI = {
  drought: "🌾",
  flood: "🌊",
  all: "✨"
};

// Nairobi sub-county labels to include major town names in tooltips/UI.
const NAIROBI_AREA_LABELS = {
  "Embakasi Central": "Embakasi Central",
  "Embakasi East": "Embakasi East",
  "Embakasi North": "Embakasi North",
  "Embakasi South": "Embakasi South",
  "Embakasi West": "Embakasi West",
  Starehe: "CBD (Starehe)",
  Langata: "Karen (Langata)",
  Makadara: "Buruburu (Makadara)",
  Mathare: "Huruma (Mathare)",
  Kamukunji: "Downtown (Kamukunji)",
  Westlands: "Westlands"
};

// Nairobi hotspot overrides to ensure key areas show higher severity in the MVP.
const NAIROBI_AREA_RISK = {
  "Embakasi Central": { riskPercent: 78, riskType: "flood" },
  "Embakasi East": { riskPercent: 74, riskType: "flood" },
  "Embakasi North": { riskPercent: 71, riskType: "flood" },
  "Embakasi South": { riskPercent: 69, riskType: "flood" },
  "Embakasi West": { riskPercent: 67, riskType: "flood" },
  Starehe: { riskPercent: 64, riskType: "flood" },
  Langata: { riskPercent: 58, riskType: "flood" },
  Makadara: { riskPercent: 61, riskType: "flood" },
  Mathare: { riskPercent: 62, riskType: "flood" },
  Kamukunji: { riskPercent: 60, riskType: "flood" },
  Westlands: { riskPercent: 56, riskType: "flood" }
};

// --- Helpers for map rendering ---
// --- Helpers for risk generation and styling ---
const hashString = (value) =>
  value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

const buildGeneratedRisk = (county) => {
  const seed = hashString(county);
  const riskType = seed % 2 === 0 ? "drought" : "flood";
  const riskPercent = 35 + (seed % 50);
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
    recommendations
  };
};

const COUNTY_RISK_DATA = kenyaCounties.features.map((feature) => {
  const countyName = feature.properties.adm1_name;
  const base = BASE_COUNTY_RISK[countyName];
  return base ? { ...base } : buildGeneratedRisk(countyName);
});

const formatFilterLabel = (riskType) =>
  riskType === "drought" ? "Drought & Food Insecurity" : "Flood & Extreme Weather";

const formatEmoji = (riskType) => RISK_EMOJI[riskType] || "✨";

const buildAreaRisk = (areaName, countyName) => {
  const override = countyName === "Nairobi" ? NAIROBI_AREA_RISK[areaName] : null;
  if (override) {
    return { area: areaName, county: countyName, ...override };
  }

  const seed = hashString(`${countyName}-${areaName}`);
  const riskType = seed % 2 === 0 ? "drought" : "flood";
  const riskPercent = 30 + (seed % 60);
  return { area: areaName, county: countyName, riskType, riskPercent };
};

  const buildAreaFillOpacity = (riskPercent, matchesFilter) => {
    if (!matchesFilter) return 0.12;
    return Math.min(0.85, Math.max(0.2, riskPercent / 100));
  };

const formatAreaLabel = (countyName, areaName) => {
  if (countyName === "Nairobi" && NAIROBI_AREA_LABELS[areaName]) {
    return NAIROBI_AREA_LABELS[areaName];
  }
  return areaName;
};

const fallbackResponse = (details, areaDetails) => {
  const areaLine = areaDetails
    ? `- Focus area: ${formatAreaLabel(areaDetails.county, areaDetails.area)} (${areaDetails.riskPercent}% affected).`
    : "- Focus area: countywide overview.";

  return `CrisisLens briefing for ${details.county}:

- Severity: ${details.riskPercent}% affected (${details.riskType}).
${areaLine}
- Timing: impacts expected within 2-4 weeks, with escalation possible two weeks later.
- Recommendations: ${details.recommendations}.
- Food security: price volatility likely within 4-6 weeks; advise stocking staples and coordinating relief.`;
};

function App() {
  // Track active filter, selections, and AI panel state.
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedCounty, setSelectedCounty] = useState(COUNTY_RISK_DATA[0].county);
  const [selectedArea, setSelectedArea] = useState("");
  const [mapInstance, setMapInstance] = useState(null);
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Build lookup tables for fast access during map rendering.
  const riskByCounty = useMemo(() => {
    return COUNTY_RISK_DATA.reduce((acc, entry) => {
      acc[entry.county] = entry;
      return acc;
    }, {});
  }, []);

  const areaRiskData = useMemo(() => {
    return kenyaAreas.features.map((feature) => {
      const areaName = feature.properties.adm2_name;
      const countyName = feature.properties.adm1_name;
      return buildAreaRisk(areaName, countyName);
    });
  }, []);

  const areaRiskByKey = useMemo(() => {
    return areaRiskData.reduce((acc, entry) => {
      acc[`${entry.county}::${entry.area}`] = entry;
      return acc;
    }, {});
  }, [areaRiskData]);

  const selectedDetails =
    COUNTY_RISK_DATA.find((entry) => entry.county === selectedCounty) || COUNTY_RISK_DATA[0];

  const selectedCountyAreas = useMemo(() => {
    return kenyaAreas.features.filter(
      (feature) => feature.properties.adm1_name === selectedCounty
    );
  }, [selectedCounty]);

  const selectedCountyAreaNames = useMemo(() => {
    return selectedCountyAreas.map((feature) => feature.properties.adm2_name);
  }, [selectedCountyAreas]);

  const selectedCountyAreaData = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: selectedCountyAreas
    };
  }, [selectedCountyAreas]);

  const topCountyAreas = useMemo(() => {
    return areaRiskData
      .filter((entry) => entry.county === selectedCounty)
      .sort((a, b) => b.riskPercent - a.riskPercent)
      .slice(0, 6);
  }, [areaRiskData, selectedCounty]);

  const selectedAreaEntry = selectedArea
    ? areaRiskByKey[`${selectedCounty}::${selectedArea}`]
    : null;

  useEffect(() => {
    if (!selectedArea && topCountyAreas.length > 0) {
      setSelectedArea(topCountyAreas[0].area);
    }
  }, [selectedArea, topCountyAreas]);

  useEffect(() => {
    setAiError("");
  }, [selectedCounty, selectedArea, activeFilter]);

  // Zoom into a county and reset area selection.
  const handleCountyClick = (countyName, bounds) => {
    setSelectedCounty(countyName);
    setSelectedArea("");
    if (mapInstance && bounds) {
      mapInstance.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  // Style counties based on overall risk and filter selection.
  const geoJsonStyle = (feature) => {
    const countyName = feature.properties.adm1_name;
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

  // Style areas/towns inside the selected county with blue intensity by severity.
  const areaGeoJsonStyle = (feature) => {
    const areaName = feature.properties.adm2_name;
    const countyName = feature.properties.adm1_name;
    const risk = areaRiskByKey[`${countyName}::${areaName}`];
    const matchesFilter =
      activeFilter === "all" || (risk && risk.riskType === activeFilter);
    const opacity = buildAreaFillOpacity(risk?.riskPercent || 20, matchesFilter);

    return {
      fillColor: "#1d4ed8",
      fillOpacity: opacity,
      color: matchesFilter ? "#0f172a" : "#94a3b8",
      weight: matchesFilter ? 1.5 : 1
    };
  };

  // Send a question to the AI backend with county/area context and hotspot hints.
  const handleAskAI = async (event) => {
    event.preventDefault();
    setAiLoading(true);
    setAiError("");

    if (!question.trim()) {
      return;
    }

    const nextMessages = [...chatMessages, { role: "user", content: question.trim() }];
    setChatMessages(nextMessages);

    const normalizedQuestion = question.trim().toLowerCase();
    const matchedArea =
      selectedCountyAreaNames.find((name) => normalizedQuestion.includes(name.toLowerCase())) ||
      "";

    if (matchedArea) {
      setSelectedArea(matchedArea);
    }

    const hotspotContext = topCountyAreas
      .map(
        (entry) =>
          `${formatAreaLabel(entry.county, entry.area)} (${entry.riskPercent}% ${
            entry.riskType
          })`
      )
      .join(", ");

    const conversationContext = nextMessages
      .map((entry) => `${entry.role === "user" ? "User" : "Assistant"}: ${entry.content}`)
      .join("\n");

    const fallbackAreaEntry = matchedArea
      ? areaRiskByKey[`${selectedCounty}::${matchedArea}`]
      : selectedAreaEntry;

    try {
      const response = await fetch("http://localhost:8000/api/ai/feedback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          county: selectedDetails.county,
          area: matchedArea || (selectedAreaEntry ? selectedAreaEntry.area : ""),
          risk_type: activeFilter,
          question:
            `User question: ${question.trim()}\n` +
            `County context: ${selectedDetails.county} (${activeFilter}).\n` +
            `Hotspots: ${hotspotContext}.\n` +
            `Conversation so far:\n${conversationContext}`
        })
      });

      if (!response.ok) {
        throw new Error("Unable to fetch AI feedback.");
      }

      const data = await response.json();
      setChatMessages((current) => [...current, { role: "assistant", content: data.response }]);
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: fallbackResponse(selectedDetails, fallbackAreaEntry) }
      ]);
      setAiError("Live AI response unavailable. Showing a local MVP summary instead.");
    } finally {
      setAiLoading(false);
      setQuestion("");
    }
  };

  return (
    <div className="page">
      {/* Hero section */}
      <header className="hero">
        <p className="tag">CRISISLENS MVP</p>
        <h1>Kenya early warning map for drought & flood risk.</h1>
        <p className="subhead">
          Click a county to zoom in and review the county risk summary. Area-level hotspots inside
          the county are shaded in blue, with darker tones indicating higher severity.
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
            {/* County boundaries with risk coloring and tooltips */}
            <GeoJSON
              key={`counties-${activeFilter}`}
              data={kenyaCounties}
              style={geoJsonStyle}
              onEachFeature={(feature, layer) => {
                const countyName = feature.properties.adm1_name;
                const risk = riskByCounty[countyName];
                const riskLabel = risk?.riskType === "flood" ? "Flood" : "Drought";
                const percentage = risk ? `${risk.riskPercent}% affected` : "N/A";
                const emoji = risk ? formatEmoji(risk.riskType) : formatEmoji("all");

                layer.bindTooltip(
                  `<strong>${countyName}</strong><br/>${emoji} ${riskLabel} · ${percentage}`,
                  { sticky: true }
                );
                layer.on({
                  click: () => handleCountyClick(countyName, layer.getBounds())
                });
              }}
            />
            {/* Area/town boundaries inside the selected county */}
            <GeoJSON
              key={`areas-${selectedCounty}-${activeFilter}`}
              data={selectedCountyAreaData}
              style={areaGeoJsonStyle}
              onEachFeature={(feature, layer) => {
                const areaName = feature.properties.adm2_name;
                const countyName = feature.properties.adm1_name;
                const risk = areaRiskByKey[`${countyName}::${areaName}`];
                const displayName = formatAreaLabel(countyName, areaName);
                const percentage = risk ? `${risk.riskPercent}% affected` : "N/A";
                const emoji = risk ? formatEmoji(risk.riskType) : formatEmoji("all");

                layer.bindTooltip(
                  `<strong>${displayName}</strong><br/>${emoji} ${percentage}`,
                  { sticky: true }
                );
                layer.on({
                  click: () => {
                    setSelectedCounty(countyName);
                    setSelectedArea(areaName);
                  }
                });
              }}
            />
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
              {formatEmoji(filter.id)} {filter.label}
            </button>
          ))}
        </div>
      </section>

      {/* Details panel */}
      <section className="details">
        <div className="details-header">
          <h2>{selectedDetails.county} County</h2>
          <span className={`badge ${selectedDetails.riskType}`}>
            {formatEmoji(selectedDetails.riskType)} {formatFilterLabel(selectedDetails.riskType)}
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
        {/* Highlight the selected area and top hotspots */}
        <div className="area-highlight">
          <p className="label">Selected area / hotspot</p>
          <p>
            {selectedArea
              ? `${formatAreaLabel(selectedCounty, selectedArea)} · ${
                  selectedAreaEntry?.riskPercent ?? "N/A"
                }% affected`
              : "Click a town/area to see its severity."}
          </p>
          <p className="label">Top affected areas</p>
          <ul>
            {topCountyAreas.map((entry) => (
              <li key={`${entry.county}-${entry.area}`}>
                {formatAreaLabel(entry.county, entry.area)} · {entry.riskPercent}% (
                {formatEmoji(entry.riskType)})
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Generative AI feedback panel */}
      <section className="ai-panel">
        <div className="details-header">
          <h2>Ask CrisisLens</h2>
          <span className="badge">AI Feedback</span>
        </div>
        <p className="ai-subhead">
          Ask about a county or area to get a detailed, actionable briefing. This panel is wired
          to the backend AI endpoint and falls back to local MVP guidance if the API is unavailable.
        </p>
        <p className="ai-subhead">
          Current focus: {selectedDetails.county}
          {selectedAreaEntry ? ` · ${formatAreaLabel(selectedCounty, selectedAreaEntry.area)}` : ""}.
        </p>
        <form className="ai-form" onSubmit={handleAskAI}>
          <textarea
            rows="3"
            placeholder="Ask about risks, timing, or recommendations..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button type="submit" disabled={aiLoading}>
            {aiLoading ? "Generating..." : "Send question"}
          </button>
        </form>
        {aiError && <p className="error">{aiError}</p>}
        <div className="ai-chat">
          {chatMessages.length === 0 ? (
            <p className="ai-empty">Ask a question to start the briefing.</p>
          ) : (
            chatMessages.map((entry, index) => (
              <div key={`${entry.role}-${index}`} className={`ai-message ${entry.role}`}>
                <span className="ai-role">{entry.role === "user" ? "You" : "CrisisLens"}</span>
                <p>{entry.content}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
