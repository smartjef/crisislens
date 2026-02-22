import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import kenyaCountiesRaw from "./data/ken_admin1.geojson?raw";
import kenyaAreasRaw from "./data/ken_admin2.geojson?raw";
import { Bot, Clock, Droplets, MapPin, TriangleAlert, Waves } from "lucide-react";

// --- Focus scope: only these 3 Lake Victoria counties are shown on the map ---
const FOCUS_COUNTY_NAMES = new Set(["Kisumu", "Siaya", "Homa Bay"]);

// --- Static MVP risk data (swap with backend API calls when ready) ---
const kenyaCounties = JSON.parse(kenyaCountiesRaw);
const kenyaAreas = JSON.parse(kenyaAreasRaw);

// GeoJSON slices containing only the 3 focus counties and their sub-counties.
const focusCountiesGeoJSON = {
  ...kenyaCounties,
  features: kenyaCounties.features.filter(
    (f) => FOCUS_COUNTY_NAMES.has(f.properties.adm1_name)
  )
};
const focusAreasGeoJSON = {
  ...kenyaAreas,
  features: kenyaAreas.features.filter(
    (f) => FOCUS_COUNTY_NAMES.has(f.properties.adm1_name)
  )
};
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
    riskPercent: 71,
    expectedEvent: "Nyando River overflow and Lake Victoria shoreline inundation",
    measurement: "Rainfall accumulation 165mm · Soil moisture 0.87",
    effects: "Nyando & Nyakach floodplains inundated, urban lake-edge flooding in Kisumu West",
    recommendations: "Issue Nyando River level alerts, prepare evacuation sites along lake shore"
  },
  Siaya: {
    county: "Siaya",
    riskType: "flood",
    riskPercent: 74,
    expectedEvent: "Yala River overflow and Winam Gulf shoreline flooding",
    measurement: "Rainfall accumulation 152mm · Soil moisture 0.83",
    effects: "Agricultural land inundation in Rarieda and Bondo, community displacement",
    recommendations: "Pre-position relief at Bondo town, issue Yala River level alerts"
  },
  "Homa Bay": {
    county: "Homa Bay",
    riskType: "flood",
    riskPercent: 78,
    expectedEvent: "Lake Victoria level rise with island and shoreline inundation",
    measurement: "Rainfall accumulation 158mm · Soil moisture 0.85",
    effects: "Suba South island communities cut off, crop loss in lake basin villages",
    recommendations: "Deploy boats for Suba evacuation, alert Homa Bay town drainage teams"
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

// Flood fill palette — used only by getFloodFillColor interpolation (see below).
// County outline colour for the dashed border layer.
const COUNTY_BORDER = "#0f172a";

// Lake Victoria focus counties — Kisumu, Siaya, Homa Bay.
// Sub-county flood risk values derived from score_flood() using FLOOD_INDICATORS.
const LAKE_VICTORIA_AREA_RISK = {
  // Kisumu sub-counties
  "Nyando":            { riskPercent: 82, riskType: "flood" },
  "Nyakach":           { riskPercent: 76, riskType: "flood" },
  "Kisumu West":       { riskPercent: 71, riskType: "flood" },
  "Kisumu Central":    { riskPercent: 67, riskType: "flood" },
  "Kisumu East":       { riskPercent: 63, riskType: "flood" },
  "Seme":              { riskPercent: 65, riskType: "flood" },
  "Muhoroni":          { riskPercent: 54, riskType: "flood" },
  // Siaya sub-counties
  "Rarieda":           { riskPercent: 74, riskType: "flood" },
  "Bondo":             { riskPercent: 69, riskType: "flood" },
  "Alego Usonga":      { riskPercent: 58, riskType: "flood" },
  "Gem":               { riskPercent: 52, riskType: "flood" },
  "Ugenya":            { riskPercent: 48, riskType: "flood" },
  "Ugunja":            { riskPercent: 45, riskType: "flood" },
  // Homa Bay sub-counties
  "Suba South":        { riskPercent: 78, riskType: "flood" },
  "Suba North":        { riskPercent: 73, riskType: "flood" },
  "Karachuonyo":       { riskPercent: 66, riskType: "flood" },
  "Homa Bay":          { riskPercent: 62, riskType: "flood" },
  "Kabondo Kasipul":   { riskPercent: 58, riskType: "flood" },
  "Kasipul":           { riskPercent: 55, riskType: "flood" },
  "Rangwe":            { riskPercent: 50, riskType: "flood" },
  "Ndhiwa":            { riskPercent: 46, riskType: "flood" }
};
// FOCUS_COUNTY_NAMES is defined at the top of the file and used here for area lookups.
const LAKE_VICTORIA_COUNTIES = FOCUS_COUNTY_NAMES;

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

// Only build risk entries for the 3 focus counties — no fallback generation needed.
const COUNTY_RISK_DATA = focusCountiesGeoJSON.features.map((feature) => {
  const countyName = feature.properties.adm1_name;
  const base = BASE_COUNTY_RISK[countyName];
  return base ? { ...base } : buildGeneratedRisk(countyName);
});

const formatFilterLabel = (riskType) =>
  riskType === "drought" ? "Drought & Food Insecurity" : "Flood & Extreme Weather";

const buildAreaRisk = (areaName, countyName) => {
  if (countyName === "Nairobi" && NAIROBI_AREA_RISK[areaName]) {
    return { area: areaName, county: countyName, ...NAIROBI_AREA_RISK[areaName] };
  }
  if (LAKE_VICTORIA_COUNTIES.has(countyName) && LAKE_VICTORIA_AREA_RISK[areaName]) {
    return { area: areaName, county: countyName, ...LAKE_VICTORIA_AREA_RISK[areaName] };
  }

  const seed = hashString(`${countyName}-${areaName}`);
  const riskType = seed % 2 === 0 ? "drought" : "flood";
  const riskPercent = 30 + (seed % 60);
  return { area: areaName, county: countyName, riskType, riskPercent };
};

// Interpolate between pale blue (low risk) and deep navy (high risk).
// Input range normalised: 40 % → t=0 (#bfdbfe), 90 % → t=1 (#1e3a8a)
const getFloodFillColor = (riskPercent) => {
  const t = Math.max(0, Math.min(1, (riskPercent - 40) / 50));
  const r = Math.round(191 + (30 - 191) * t);   // 191 → 30
  const g = Math.round(219 + (58 - 219) * t);   // 219 → 58
  const b = Math.round(254 + (138 - 254) * t);  // 254 → 138
  return `rgb(${r},${g},${b})`;
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
  // Default to flood filter and Kisumu for the Lake Victoria focus demo.
  const [activeFilter, setActiveFilter] = useState("flood");
  const [selectedCounty, setSelectedCounty] = useState("Kisumu");
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

  // Only compute risk data for the 21 sub-counties within the 3 focus counties.
  const areaRiskData = useMemo(() => {
    return focusAreasGeoJSON.features.map((feature) => {
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

  // Sub-county names for the selected county — used for AI question matching.
  const selectedCountyAreaNames = useMemo(() => {
    return focusAreasGeoJSON.features
      .filter((f) => f.properties.adm1_name === selectedCounty)
      .map((f) => f.properties.adm2_name);
  }, [selectedCounty]);

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

  // County outlines — transparent fill so sub-county color shading shows through.
  // A thick dashed border distinguishes county boundaries from sub-county borders.
  const geoJsonStyle = () => ({
    fillColor: "transparent",
    fillOpacity: 0,
    color: "#0f172a",
    weight: 2.5,
    dashArray: "6 4"
  });

  // Sub-county polygons — color-interpolated from pale blue (low) to deep navy (high).
  // This gives immediate visual contrast between high and low-risk sub-counties.
  const areaGeoJsonStyle = (feature) => {
    const areaName = feature.properties.adm2_name;
    const countyName = feature.properties.adm1_name;
    const risk = areaRiskByKey[`${countyName}::${areaName}`];

    return {
      fillColor: getFloodFillColor(risk?.riskPercent || 40),
      fillOpacity: 0.78,
      color: "#1e3a8a",
      weight: 1
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
        <h1>Lake Victoria basin flood early warning — Kisumu, Siaya & Homa Bay.</h1>
        <p className="subhead">
          Click a county or sub-county to see flood risk details and get an AI briefing.
          Darker blue indicates higher flood probability. All 21 sub-counties are visible.
        </p>
      </header>

      {/* Map section */}
      <section className="map-section">
        <div className="map-wrapper">
          <MapContainer
            center={[-0.2, 34.6]}
            zoom={9}
            scrollWheelZoom
            className="map"
            whenCreated={setMapInstance}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* County outlines for the 3 Lake Victoria focus counties */}
            <GeoJSON
              key={`counties-${activeFilter}`}
              data={focusCountiesGeoJSON}
              style={geoJsonStyle}
              onEachFeature={(feature, layer) => {
                const countyName = feature.properties.adm1_name;
                const risk = riskByCounty[countyName];
                const riskLabel = risk?.riskType === "flood" ? "Flood" : "Drought";
                const percentage = risk ? `${risk.riskPercent}% affected` : "N/A";

                layer.bindTooltip(
                  `<strong>${countyName}</strong><br/>&#128167; ${riskLabel} &middot; ${percentage}`,
                  { sticky: true }
                );
                layer.on({
                  click: () => handleCountyClick(countyName, layer.getBounds())
                });
              }}
            />
            {/* All 21 sub-county polygons across the 3 focus counties — always visible */}
            <GeoJSON
              key={`areas-focus-${activeFilter}`}
              data={focusAreasGeoJSON}
              style={areaGeoJsonStyle}
              onEachFeature={(feature, layer) => {
                const areaName = feature.properties.adm2_name;
                const countyName = feature.properties.adm1_name;
                const risk = areaRiskByKey[`${countyName}::${areaName}`];
                const displayName = formatAreaLabel(countyName, areaName);
                const percentage = risk ? `${risk.riskPercent}% affected` : "N/A";

                layer.bindTooltip(
                  `<strong>${displayName}</strong><br/>Flood risk: ${percentage}`,
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

        {/* County selector — quick-switch between the 3 focus counties */}
        <div className="filters">
          {COUNTY_RISK_DATA.map((entry) => (
            <button
              key={entry.county}
              type="button"
              className={selectedCounty === entry.county ? "filter active" : "filter"}
              onClick={() => {
                setSelectedCounty(entry.county);
                setSelectedArea("");
              }}
            >
              <Droplets className="w-3 h-3" /> {entry.county} · {entry.riskPercent}%
            </button>
          ))}
        </div>
      </section>

      {/* Details panel */}
      <section className="details">
        <div className="details-header">
          <h2>{selectedDetails.county} County</h2>
          <span className={`badge ${selectedDetails.riskType}`}>
            <Waves className="w-3 h-3" /> {formatFilterLabel(selectedDetails.riskType)}
          </span>
          {selectedDetails.riskType === "flood" && (() => {
            const leadTimeDays =
              selectedDetails.riskPercent >= 75 ? 3
              : selectedDetails.riskPercent >= 50 ? 5
              : 7;
            return (
              <span className="badge lead-time">
                <Clock className="w-3 h-3" /> {leadTimeDays}-day alert
              </span>
            );
          })()}
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
              <li key={`${entry.county}-${entry.area}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {entry.riskPercent >= 75
                  ? <TriangleAlert className="w-3 h-3" style={{ color: "#dc2626", flexShrink: 0 }} />
                  : <Droplets className="w-3 h-3" style={{ color: "#2563eb", flexShrink: 0 }} />}
                {formatAreaLabel(entry.county, entry.area)} · {entry.riskPercent}%
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Generative AI feedback panel */}
      <section className="ai-panel">
        <div className="details-header">
          <h2>Ask CrisisLens</h2>
          <span className="badge">
            <Bot className="w-3 h-3" /> AI Analyst
          </span>
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
