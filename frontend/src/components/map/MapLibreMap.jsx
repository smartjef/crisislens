/**
 * MapLibreMap.jsx
 *
 * Hardware-accelerated WebGL map using MapLibre GL JS via react-map-gl.
 * Replaces LeafletMap — same external props, richer feature set:
 *
 *   • CARTO Dark Matter basemap (matches dark design system)
 *   • County + sub-county fill/outline GeoJSON layers
 *   • Live GPS field-unit tracking markers (WebSocket-pushed via props.fieldUnits)
 *   • Camera feed markers (props.cameras) — click opens camera modal
 *   • Critical-event hotspot pulse markers
 *   • Flood spread simulation circles (animated)
 *   • Annotated zone polygons (evacuation routes, cordons, etc.)
 *   • Right-click → drop tactical pin
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import Map, { Layer, Marker, NavigationControl, Popup, ScaleControl, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { getFloodFillColor } from "../../utils/floodColours";

// ── Basemap ───────────────────────────────────────────────────────────────────
const BASEMAP_DARK  = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const BASEMAP_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// ── Layer style builders ──────────────────────────────────────────────────────
const countyFill = (dark) => ({
  id: "county-fill",
  type: "fill",
  source: "counties",
  paint: {
    "fill-color": dark ? "#334155" : "#cbd5e1",
    "fill-opacity": dark ? 0.25 : 0.35,
  },
});

const countyOutline = (dark) => ({
  id: "county-outline",
  type: "line",
  source: "counties",
  paint: {
    "line-color": dark ? "#64748b" : "#94a3b8",
    "line-width": 1.5,
    "line-dasharray": [4, 3],
  },
});

const countySelected = (dark) => ({
  id: "county-selected",
  type: "fill",
  source: "counties",
  paint: {
    "fill-color": "transparent",
    "fill-opacity": 0,
  },
  filter: ["in", "adm1_name", ""],
});

const subFill = {
  id: "sub-fill",
  type: "fill",
  source: "sub-counties",
  paint: {
    "fill-color": ["get", "_fillColor"],
    "fill-opacity": 0.78,
  },
};

const subOutline = {
  id: "sub-outline",
  type: "line",
  source: "sub-counties",
  paint: {
    "line-color": "#1e3a8a",
    "line-width": 1,
  },
};

const subSelectedOutline = {
  id: "sub-selected",
  type: "line",
  source: "sub-counties",
  paint: {
    "line-color": "#facc15",
    "line-width": 3,
  },
  filter: ["==", "adm2_name", ""],
};

const zoneLayer = {
  id: "annotated-zones",
  type: "fill",
  source: "zones",
  paint: {
    "fill-color": ["get", "_fillColor"],
    "fill-opacity": 0.35,
    "fill-outline-color": ["get", "_strokeColor"],
  },
};

// ── Helper: inject fill colours into GeoJSON features ─────────────────────────
function injectAreaColors(geoJSON, areaRiskByKey) {
  if (!geoJSON?.features) return geoJSON;
  return {
    ...geoJSON,
    features: geoJSON.features.map((f) => {
      const area = f.properties.adm2_name;
      const county = f.properties.adm1_name;
      const risk = areaRiskByKey[`${county}::${area}`];
      return {
        ...f,
        properties: {
          ...f.properties,
          _fillColor: getFloodFillColor(risk?.riskPercent || 40),
        },
      };
    }),
  };
}

const ZONE_COLORS = {
  evacuation_route: { fill: "#22c55e", stroke: "#16a34a" },
  staging_area:     { fill: "#3b82f6", stroke: "#1d4ed8" },
  cordon:           { fill: "#ef4444", stroke: "#b91c1c" },
  flood_extent:     { fill: "#06b6d4", stroke: "#0891b2" },
  safe_zone:        { fill: "#84cc16", stroke: "#65a30d" },
};

function injectZoneColors(zones) {
  if (!zones?.features) return zones;
  return {
    ...zones,
    features: zones.features.map((f) => {
      const c = ZONE_COLORS[f.properties.zone_type] || { fill: "#94a3b8", stroke: "#64748b" };
      return {
        ...f,
        properties: { ...f.properties, _fillColor: c.fill, _strokeColor: c.stroke },
      };
    }),
  };
}

// ── Unit-type icons (emoji fallback — swap for SVG sprites in production) ──────
const UNIT_ICONS = {
  vehicle:    "🚗",
  boat:       "🚤",
  drone:      "🚁",
  foot:       "🦺",
  helicopter: "🚁",
};

export default function MapLibreMap({
  focusCountiesGeoJSON,
  focusAreasGeoJSON,
  riskByCounty,
  areaRiskByKey,
  onCountyClick,
  onAreaClick,
  onHotspotClick,
  onCustomPinDrop,
  selectedCounties = [],
  selectedArea = null,
  isSimulating = false,
  selectedCustomPin = null,
  // New enterprise props
  fieldUnits = [],          // [{ id, name, unit_type, current_lat, current_lon, status }]
  cameras = [],             // [{ id, name, lat, lon, status, stream_url, feed_type }]
  annotatedZones = null,    // GeoJSON FeatureCollection
  onCameraClick = null,     // (camera) => void
  darkMode = true,
  showRadar = false,
  radarOpacity = 0.4,
}) {
  const mapRef = useRef(null);
  const [popup, setPopup] = useState(null);
  const [simRadius, setSimRadius] = useState(1);
  const [radarTs, setRadarTs] = useState(null);

  // ── Radar timestamp fetch ─────────────────────────────────────────────────
  useEffect(() => {
    if (!showRadar) return;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then(r => r.json())
      .then(data => {
        const past = data.radar?.past;
        if (past?.length) setRadarTs(past[past.length - 1].path);
      })
      .catch(() => {});
    // refresh radar timestamp every 10 min
    const id = setInterval(() => {
      fetch("https://api.rainviewer.com/public/weather-maps.json")
        .then(r => r.json())
        .then(data => {
          const past = data.radar?.past;
          if (past?.length) setRadarTs(past[past.length - 1].path);
        })
        .catch(() => {});
    }, 600_000);
    return () => clearInterval(id);
  }, [showRadar]);

  // ── Flood simulation animation ───────────────────────────────────────────
  useEffect(() => {
    if (!isSimulating) { setSimRadius(1); return; }
    const id = setInterval(() => {
      setSimRadius((r) => (r >= 3.5 ? 3.5 : r + 0.15));
    }, 2000);
    return () => clearInterval(id);
  }, [isSimulating]);

  // ── Fly-to when county selection changes ─────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (selectedCounties.length === 0) {
      mapRef.current.flyTo({ center: [36.82, -0.28], zoom: 6.5, duration: 1200 });
    }
  }, [selectedCounties]);

  // ── Inject colours into sub-county GeoJSON ───────────────────────────────
  const coloredAreas = injectAreaColors(focusAreasGeoJSON, areaRiskByKey);

  const filteredAreas = {
    ...coloredAreas,
    features: (coloredAreas?.features || []).filter((f) =>
      selectedCounties.includes(f.properties.adm1_name)
    ),
  };

  const coloredZones = annotatedZones ? injectZoneColors(annotatedZones) : null;

  // ── Click handlers ────────────────────────────────────────────────────────
  const handleMapClick = useCallback(
    (e) => {
      const map = mapRef.current;
      if (!map) return;

      // Check county layer
      const countyFeatures = map.queryRenderedFeatures(e.point, { layers: ["county-fill"] });
      if (countyFeatures.length > 0) {
        const name = countyFeatures[0].properties.adm1_name;
        if (onCountyClick) onCountyClick(name);
        return;
      }

      // Check sub-county layer
      const subFeatures = map.queryRenderedFeatures(e.point, { layers: ["sub-fill"] });
      if (subFeatures.length > 0) {
        const { adm1_name, adm2_name } = subFeatures[0].properties;
        if (onAreaClick) onAreaClick(adm1_name, adm2_name);
        return;
      }
    },
    [onCountyClick, onAreaClick]
  );

  const handleContextMenu = useCallback(
    (e) => {
      if (onCustomPinDrop) {
        onCustomPinDrop({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    },
    [onCustomPinDrop]
  );

  // Hotspot data (static fallback — real data comes from incidents endpoint)
  const hotspots = [
    { id: "hs-1", title: "Bridge Washout",        lon: 36.96, lat: -1.15, county: "Kiambu",   area: "Juja" },
    { id: "hs-2", title: "Levee Breach",           lon: 34.85, lat: -0.15, county: "Kisumu",   area: "Nyando" },
    { id: "hs-3", title: "Power Failure",          lon: 36.82, lat: -1.28, county: "Nairobi",  area: "Nairobi Central" },
    { id: "hs-4", title: "Evacuation Route Cut",   lon: 37.26, lat: -1.55, county: "Machakos", area: "Machakos Town" },
  ];

  const simOrigins = [
    { id: "s1", lon: 34.75, lat: -0.17, name: "Lake Victoria Surge",    r: 6000 },
    { id: "s2", lon: 36.88, lat: -1.22, name: "Nairobi River Overflow",  r: 2000 },
    { id: "s3", lon: 37.01, lat: -1.10, name: "Athi River Swell",        r: 3500 },
  ];

  return (
    <div className={`h-[500px] w-full rounded-sm overflow-hidden border ${darkMode ? 'border-surface-border' : 'border-slate-300'} relative`}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 36.82, latitude: -0.28, zoom: 6.5 }}
        mapStyle={darkMode ? BASEMAP_DARK : BASEMAP_LIGHT}
        onClick={handleMapClick}
        onContextMenu={handleContextMenu}
        cursor="crosshair"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" unit="metric" />

        {/* ── County fills / outlines ─────────────────────────────────── */}
        {focusCountiesGeoJSON && (
          <Source id="counties" type="geojson" data={focusCountiesGeoJSON}>
            <Layer {...countyFill(darkMode)} />
            <Layer {...countyOutline(darkMode)} />
          </Source>
        )}

        {/* ── Sub-county risk choropleth ──────────────────────────────── */}
        {selectedCounties.length > 0 && filteredAreas?.features?.length > 0 && (
          <Source id="sub-counties" type="geojson" data={filteredAreas}>
            <Layer {...subFill} />
            <Layer {...subOutline} />
            <Layer
              {...subSelectedOutline}
              filter={["==", "adm2_name", selectedArea || ""]}
            />
          </Source>
        )}

        {/* ── Annotated zones ─────────────────────────────────────────── */}
        {coloredZones && (
          <Source id="zones" type="geojson" data={coloredZones}>
            <Layer {...zoneLayer} />
          </Source>
        )}

        {/* ── Flood simulation circles ────────────────────────────────── */}
        {isSimulating && simOrigins.map((sim) => (
          <Marker key={sim.id} longitude={sim.lon} latitude={sim.lat} anchor="center">
            <div
              style={{
                width:  sim.r * simRadius * 0.006,
                height: sim.r * simRadius * 0.006,
                borderRadius: "50%",
                background: "rgba(59,130,246,0.25)",
                border: "2px dashed #2563eb",
                animation: "pulse 2s infinite",
                pointerEvents: "none",
              }}
              title={sim.name}
            />
          </Marker>
        ))}

        {/* ── Hotspot markers ─────────────────────────────────────────── */}
        {hotspots
          .filter((h) => selectedCounties.length === 0 || selectedCounties.includes(h.county))
          .map((hs) => (
            <Marker
              key={hs.id}
              longitude={hs.lon}
              latitude={hs.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopup({ type: "hotspot", data: hs, lon: hs.lon, lat: hs.lat });
                if (onHotspotClick) onHotspotClick(hs);
              }}
            >
              <div className="relative cursor-pointer">
                <div className="w-4 h-4 bg-red-600 border-2 border-white rounded-sm animate-pulse shadow-[0_0_12px_rgba(220,38,38,0.8)]" />
                <div className="absolute -inset-1 border border-red-500 rounded-sm animate-ping opacity-50" />
              </div>
            </Marker>
          ))}

        {/* ── Live field-unit GPS markers ─────────────────────────────── */}
        {fieldUnits
          .filter((u) => u.current_lat && u.current_lon)
          .map((unit) => (
            <Marker
              key={`unit-${unit.id}`}
              longitude={unit.current_lon}
              latitude={unit.current_lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopup({ type: "unit", data: unit, lon: unit.current_lon, lat: unit.current_lat });
              }}
            >
              <div className="relative cursor-pointer" title={unit.name}>
                <div
                  className={`w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold
                    ${unit.status === "active" ? "bg-cyan-500 shadow-cyan-500/50" : unit.status === "offline" ? "bg-slate-600" : "bg-amber-500"}`}
                >
                  {UNIT_ICONS[unit.unit_type] || "●"}
                </div>
                {unit.status === "active" && (
                  <div className="absolute -inset-1 rounded-full border border-cyan-400 animate-ping opacity-40" />
                )}
              </div>
            </Marker>
          ))}

        {/* ── Camera markers ──────────────────────────────────────────── */}
        {cameras
          .filter((c) => c.lat && c.lon)
          .map((cam) => (
            <Marker
              key={`cam-${cam.id}`}
              longitude={cam.lon}
              latitude={cam.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                if (onCameraClick) onCameraClick(cam);
                setPopup({ type: "camera", data: cam, lon: cam.lon, lat: cam.lat });
              }}
            >
              <div
                className={`w-5 h-5 rounded border-2 border-white shadow flex items-center justify-center text-[10px] cursor-pointer
                  ${cam.status === "online" ? "bg-emerald-500 shadow-emerald-500/40" : cam.status === "degraded" ? "bg-amber-500" : "bg-slate-600"}`}
                title={cam.name}
              >
                📷
              </div>
            </Marker>
          ))}

        {/* ── Tactical custom pin ─────────────────────────────────────── */}
        {selectedCustomPin && (
          <Marker longitude={selectedCustomPin.lng} latitude={selectedCustomPin.lat} anchor="center">
            <div className="w-4 h-4 bg-purple-600 border-2 border-white rounded-full shadow-[0_0_10px_rgba(147,51,234,0.6)]" />
          </Marker>
        )}

        {/* ── RainViewer radar overlay ────────────────────────────────── */}
        {showRadar && radarTs && (
          <Source
            id="rainviewer-radar"
            type="raster"
            tiles={[`https://tilecache.rainviewer.com${radarTs}/256/{z}/{x}/{y}/8/1_1.png`]}
            tileSize={256}
            minzoom={0}
            maxzoom={6}
            attribution="© RainViewer"
          >
            <Layer
              id="radar-layer"
              type="raster"
              minzoom={0}
              maxzoom={22}
              paint={{ "raster-opacity": radarOpacity }}
            />
          </Source>
        )}

        {/* ── Popup ───────────────────────────────────────────────────── */}
        {popup && (
          <Popup
            longitude={popup.lon}
            latitude={popup.lat}
            closeOnClick={false}
            onClose={() => setPopup(null)}
            className="text-slate-900 text-xs font-mono"
            maxWidth="240px"
          >
            {popup.type === "hotspot" && (
              <div>
                <p className="font-bold text-red-600 uppercase tracking-wide">{popup.data.title}</p>
                <p className="text-slate-600">{popup.data.area}, {popup.data.county}</p>
                <p className="text-slate-400 text-[10px] mt-1">CRITICAL — click for details</p>
              </div>
            )}
            {popup.type === "unit" && (
              <div>
                <p className="font-bold uppercase tracking-wide">{popup.data.name}</p>
                <p className="text-slate-500">{popup.data.unit_type} · <span className={popup.data.status === "active" ? "text-cyan-600" : "text-amber-600"}>{popup.data.status}</span></p>
                {popup.data.last_ping && (
                  <p className="text-slate-400 text-[10px] mt-1">Last ping: {new Date(popup.data.last_ping).toLocaleTimeString()}</p>
                )}
              </div>
            )}
            {popup.type === "camera" && (
              <div>
                <p className="font-bold uppercase tracking-wide">{popup.data.name}</p>
                <p className="text-slate-500">{popup.data.feed_type} · <span className={popup.data.status === "online" ? "text-emerald-600" : "text-red-600"}>{popup.data.status}</span></p>
                <button
                  onClick={() => { onCameraClick && onCameraClick(popup.data); setPopup(null); }}
                  className="mt-1 text-[10px] text-cyan-600 underline"
                >
                  Open feed →
                </button>
              </div>
            )}
          </Popup>
        )}
      </Map>
    </div>
  );
}
