/**
 * MapLibreMap.jsx — Full-featured WebGL tactical map
 *
 * Features:
 *   • 4 Basemaps: Dark / Light / Streets / Satellite (ESRI World Imagery)
 *   • 3D Terrain (Mapzen Terrarium DEM, 1.5× exaggeration, 45° pitch)
 *   • Drawing tools (polygon, line) — native MapLibre implementation
 *   • Time-slider replaying past RainViewer radar frames
 *   • Heatmap layer (MapLibre built-in heatmap type on hotspot data)
 *   • Supercluster marker clustering for hotspots + cameras
 *   • Distance & area measurement via @turf/turf
 *   • Map export to PNG (canvas snapshot)
 *   • County + sub-county fill/outline GeoJSON layers
 *   • Live GPS field-unit tracking markers
 *   • Camera feed markers — click opens camera modal
 *   • Flood spread simulation animated circles
 *   • Annotated zone polygons
 *   • Right-click → drop tactical pin
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, NavigationControl, Popup, ScaleControl, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from "supercluster";
import * as turf from "@turf/turf";
import {
  Download, Flame, Layers, Maximize2, Mountain, Minus, Ruler,
  Square, Trash2, Clock, X, Thermometer,
} from "lucide-react";
import client from "../../api/client";
import { getFloodFillColor } from "../../utils/floodColours";

// ── Basemap styles ─────────────────────────────────────────────────────────────
const CARTO = {
  dark:    "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light:   "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  voyager: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
};

const SATELLITE_STYLE = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    satellite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
  },
  layers: [{ id: "satellite-layer", type: "raster", source: "satellite" }],
};

function getMapStyle(key) {
  return key === "satellite" ? SATELLITE_STYLE : (CARTO[key] ?? CARTO.dark);
}

const BASEMAP_OPTIONS = [
  { key: "dark",      label: "Dark" },
  { key: "light",     label: "Light" },
  { key: "voyager",   label: "Streets" },
  { key: "satellite", label: "Satellite" },
];

const DEM_SOURCE_ID = "terrain-dem";

// ── Layer builders ─────────────────────────────────────────────────────────────
const countyFill    = dark => ({ id: "county-fill",    type: "fill",   source: "counties",    paint: { "fill-color": dark ? "#334155" : "#cbd5e1", "fill-opacity": dark ? 0.25 : 0.35 } });
const countyOutline = dark => ({ id: "county-outline", type: "line",   source: "counties",    paint: { "line-color": dark ? "#64748b" : "#94a3b8", "line-width": 1.5, "line-dasharray": [4, 3] } });
const subFill    = { id: "sub-fill",    type: "fill", source: "sub-counties", paint: { "fill-color": ["get", "_fillColor"], "fill-opacity": 0.78 } };
const subOutline = { id: "sub-outline", type: "line", source: "sub-counties", paint: { "line-color": "#1e3a8a", "line-width": 1 } };
const subSelected = { id: "sub-selected", type: "line", source: "sub-counties", paint: { "line-color": "#facc15", "line-width": 3 }, filter: ["==", "adm2_name", ""] };
const zoneLayer = {
  id: "annotated-zones", type: "fill", source: "zones",
  paint: { "fill-color": ["get", "_fillColor"], "fill-opacity": 0.35, "fill-outline-color": ["get", "_strokeColor"] },
};

// ── Colour helpers ─────────────────────────────────────────────────────────────
function injectAreaColors(geoJSON, areaRiskByKey) {
  if (!geoJSON?.features) return geoJSON;
  return {
    ...geoJSON,
    features: geoJSON.features.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        _fillColor: getFloodFillColor(
          areaRiskByKey[`${f.properties.adm1_name}::${f.properties.adm2_name}`]?.riskPercent || 40
        ),
      },
    })),
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
    features: zones.features.map(f => {
      const c = ZONE_COLORS[f.properties.zone_type] || { fill: "#94a3b8", stroke: "#64748b" };
      return { ...f, properties: { ...f.properties, _fillColor: c.fill, _strokeColor: c.stroke } };
    }),
  };
}

const UNIT_ICONS = { vehicle: "🚗", boat: "🚤", drone: "🚁", foot: "🦺", helicopter: "🚁" };

// ── Toolbar button ─────────────────────────────────────────────────────────────
function ToolBtn({ icon: Icon, active, onClick, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
        active
          ? "bg-flood-600 text-white"
          : danger
          ? "text-slate-400 hover:text-red-400 hover:bg-red-900/20"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/10"
      }`}
    >
      <Icon size={14} />
    </button>
  );
}

// ── Hotspot data (static — swap with live incidents endpoint) ──────────────────
const HOTSPOTS = [
  { id: "hs-1", title: "Bridge Washout",      lon: 36.96, lat: -1.15, county: "Kiambu",   area: "Juja" },
  { id: "hs-2", title: "Levee Breach",         lon: 34.85, lat: -0.15, county: "Kisumu",   area: "Nyando" },
  { id: "hs-3", title: "Power Failure",        lon: 36.82, lat: -1.28, county: "Nairobi",  area: "Nairobi Central" },
  { id: "hs-4", title: "Evacuation Route Cut", lon: 37.26, lat: -1.55, county: "Machakos", area: "Machakos Town" },
];

const SIM_ORIGINS = [
  { id: "s1", lon: 34.75, lat: -0.17, name: "Lake Victoria Surge",   r: 6000 },
  { id: "s2", lon: 36.88, lat: -1.22, name: "Nairobi River Overflow", r: 2000 },
  { id: "s3", lon: 37.01, lat: -1.10, name: "Athi River Swell",       r: 3500 },
];

// ── Main component ─────────────────────────────────────────────────────────────
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
  fieldUnits = [],
  cameras = [],
  annotatedZones = null,
  onCameraClick = null,
  darkMode = true,
  showRadar = false,
  radarOpacity = 0.4,
  height = "500px",
}) {
  const mapRef = useRef(null);

  // ── Tool state ────────────────────────────────────────────────────────────
  const [activeBasemap, setActiveBasemap] = useState("dark");
  const [show3D,        setShow3D]        = useState(false);
  const [activeTool,    setActiveTool]    = useState(null); // draw_polygon | draw_line | measure_distance | measure_area
  const [measurePts,    setMeasurePts]    = useState([]);
  const [measureResult, setMeasureResult] = useState(null);
  const [showHeatmap,   setShowHeatmap]   = useState(false);
  const [useClustering, setUseClustering] = useState(true);
  const [showTimeSlider,setShowTimeSlider]= useState(false);
  const [radarFrames,   setRadarFrames]   = useState([]);
  const [sliderIdx,     setSliderIdx]     = useState(0);
  const [clusters,      setClusters]      = useState([]);
  const [popup,         setPopup]         = useState(null);
  const [simRadius,     setSimRadius]     = useState(1);
  const [radarTs,       setRadarTs]       = useState(null);
  // Native drawing state
  const [drawPts,       setDrawPts]       = useState([]);   // in-progress vertices [[lng,lat],...]
  const [completedDrawings, setCompletedDrawings] = useState([]); // [{id, type, coords}]
  // Sensor layer
  const [showSensors,   setShowSensors]   = useState(false);
  const [sensorData,    setSensorData]    = useState([]);

  // ── Sensor data fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!showSensors) return;
    client.get("/api/sensors/summary/")
      .then(r => setSensorData(r.data.results || r.data || []))
      .catch(() => setSensorData([]));
  }, [showSensors]);

  // ── DEM — re-add on every style load (style change removes sources) ─────────
  const initDEM = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    if (!map.getSource(DEM_SOURCE_ID)) {
      map.addSource(DEM_SOURCE_ID, {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 14,
      });
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.on("style.load", initDEM);
    return () => { try { map.off("style.load", initDEM); } catch (_) {} };
  });

  // ── 3D terrain toggle ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const apply = () => {
      if (!map.getSource(DEM_SOURCE_ID)) return;
      if (show3D) {
        map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: 1.5 });
        map.easeTo({ pitch: 45, duration: 500 });
      } else {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, duration: 500 });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("style.load", apply);
  }, [show3D, activeBasemap]);

  // ── Native draw: finish on double-click ─────────────────────────────────────
  const handleDblClick = useCallback((e) => {
    if (!activeTool?.startsWith("draw")) return;
    e.preventDefault();
    // Remove the extra point added by the second click of dblclick
    setDrawPts(prev => {
      const pts = prev.slice(0, -1);
      if (pts.length >= 2) {
        setCompletedDrawings(d => [...d, {
          id: Date.now(),
          type: activeTool === "draw_polygon" ? "polygon" : "line",
          coords: pts,
        }]);
      }
      return [];
    });
    setActiveTool(null);
  }, [activeTool]);

  // ── Flood simulation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSimulating) { setSimRadius(1); return; }
    const id = setInterval(() => setSimRadius(r => r >= 3.5 ? 3.5 : r + 0.15), 2000);
    return () => clearInterval(id);
  }, [isSimulating]);

  // ── Fly-to on county deselect ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (selectedCounties.length === 0) {
      mapRef.current.flyTo({ center: [36.82, -0.28], zoom: 6.5, duration: 1200 });
    }
  }, [selectedCounties]);

  // ── Radar: live + time-slider frames ──────────────────────────────────────
  useEffect(() => {
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then(r => r.json())
      .then(data => {
        const past = data.radar?.past || [];
        setRadarFrames(past);
        if (past.length) {
          setSliderIdx(past.length - 1);
          setRadarTs(past[past.length - 1].path);
        }
      })
      .catch(() => {});
    const id = setInterval(() => {
      fetch("https://api.rainviewer.com/public/weather-maps.json")
        .then(r => r.json())
        .then(data => {
          const past = data.radar?.past || [];
          setRadarFrames(past);
          if (!showTimeSlider && past.length) setRadarTs(past[past.length - 1].path);
        })
        .catch(() => {});
    }, 600_000);
    return () => clearInterval(id);
  }, [showTimeSlider]);

  // Slider idx → radar path
  useEffect(() => {
    if (showTimeSlider && radarFrames[sliderIdx]) {
      setRadarTs(radarFrames[sliderIdx].path);
    }
  }, [sliderIdx, showTimeSlider, radarFrames]);

  // ── Supercluster ──────────────────────────────────────────────────────────
  const clusterIndex = useMemo(() => {
    if (!useClustering) return null;
    const pts = [
      ...HOTSPOTS.map(h => ({ ...h, _type: "hotspot" })),
      ...cameras.filter(c => c.lat && c.lon).map(c => ({ ...c, _type: "camera" })),
    ];
    if (!pts.length) return null;
    const sc = new Supercluster({ radius: 50, maxZoom: 14 });
    sc.load(pts.map(p => ({
      type: "Feature",
      properties: { ...p },
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
    })));
    return sc;
  }, [useClustering, cameras]);

  const updateClusters = useCallback(() => {
    if (!clusterIndex || !mapRef.current) return;
    const map = mapRef.current;
    const bounds = map.getBounds();
    const zoom   = Math.floor(map.getZoom());
    const bbox   = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    setClusters(clusterIndex.getClusters(bbox, zoom));
  }, [clusterIndex]);

  // ── Measurement ───────────────────────────────────────────────────────────
  const addMeasurePoint = useCallback((lngLat) => {
    const pt = [lngLat.lng, lngLat.lat];
    setMeasurePts(prev => {
      const next = [...prev, pt];
      if (activeTool === "measure_distance" && next.length >= 2) {
        const km = turf.length(turf.lineString(next), { units: "kilometers" });
        setMeasureResult(`${km.toFixed(2)} km`);
      } else if (activeTool === "measure_area" && next.length >= 3) {
        const m2 = turf.area(turf.polygon([[...next, next[0]]]));
        setMeasureResult(m2 > 1_000_000 ? `${(m2 / 1_000_000).toFixed(2)} km²` : `${m2.toFixed(0)} m²`);
      }
      return next;
    });
  }, [activeTool]);

  const clearMeasure   = () => { setMeasurePts([]); setMeasureResult(null); };
  const clearDrawings  = () => { setDrawPts([]); setCompletedDrawings([]); };

  const toggleTool = (tool) => {
    setActiveTool(prev => {
      if (prev === tool) { setDrawPts([]); return null; }
      if (tool.startsWith("measure")) clearMeasure();
      if (tool.startsWith("draw")) setDrawPts([]);
      return tool;
    });
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.once("render", () => {
      const url = map.getCanvas().toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `crisislens-map-${Date.now()}.png`;
      a.click();
    });
    map.triggerRepaint();
  }, []);

  // ── Click handlers ────────────────────────────────────────────────────────
  const handleMapClick = useCallback((e) => {
    if (activeTool?.startsWith("measure")) { addMeasurePoint(e.lngLat); return; }
    if (activeTool?.startsWith("draw")) {
      setDrawPts(prev => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
      return;
    }

    const map = mapRef.current;
    if (!map) return;
    const countyFs = map.queryRenderedFeatures(e.point, { layers: ["county-fill"] });
    if (countyFs.length) { onCountyClick?.(countyFs[0].properties.adm1_name); return; }
    const subFs = map.queryRenderedFeatures(e.point, { layers: ["sub-fill"] });
    if (subFs.length) { onAreaClick?.(subFs[0].properties.adm1_name, subFs[0].properties.adm2_name); }
  }, [activeTool, addMeasurePoint, onCountyClick, onAreaClick]);

  const handleContextMenu = useCallback((e) => {
    onCustomPinDrop?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
  }, [onCustomPinDrop]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const coloredAreas = injectAreaColors(focusAreasGeoJSON, areaRiskByKey);
  const filteredAreas = {
    ...coloredAreas,
    features: (coloredAreas?.features || []).filter(f => selectedCounties.includes(f.properties.adm1_name)),
  };
  const coloredZones = annotatedZones ? injectZoneColors(annotatedZones) : null;

  const measureGeoJSON = useMemo(() => {
    if (measurePts.length < 2) return null;
    if (activeTool === "measure_area" && measurePts.length >= 3) {
      return { type: "Feature", geometry: { type: "Polygon", coordinates: [[...measurePts, measurePts[0]]] } };
    }
    return { type: "Feature", geometry: { type: "LineString", coordinates: measurePts } };
  }, [measurePts, activeTool]);

  const heatmapGeoJSON = useMemo(() => ({
    type: "FeatureCollection",
    features: HOTSPOTS.map(h => ({
      type: "Feature",
      properties: { weight: 1 },
      geometry: { type: "Point", coordinates: [h.lon, h.lat] },
    })),
  }), []);

  const activeRadarPath = showTimeSlider ? radarFrames[sliderIdx]?.path : radarTs;

  // ── Cursor ────────────────────────────────────────────────────────────────
  const cursor = activeTool?.startsWith("draw") ? "crosshair"
               : activeTool?.startsWith("measure") ? "cell"
               : "crosshair";

  return (
    <div className={`w-full rounded-sm overflow-hidden border ${darkMode ? "border-surface-border" : "border-slate-300"} relative`} style={{ height }}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 36.82, latitude: -0.28, zoom: 6.5 }}
        mapStyle={getMapStyle(activeBasemap)}
        onClick={handleMapClick}
        onDblClick={handleDblClick}
        onContextMenu={handleContextMenu}
        onMove={updateClusters}
        onLoad={() => { initDEM(); updateClusters(); }}
        cursor={cursor}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" unit="metric" />

        {/* ── Left toolbar ────────────────────────────────────────────── */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-0.5 bg-surface/90 border border-surface-border rounded p-1 backdrop-blur-sm">
          {/* Draw */}
          <ToolBtn icon={Square} active={activeTool === "draw_polygon"}     onClick={() => toggleTool("draw_polygon")}     title="Draw polygon" />
          <ToolBtn icon={Minus}  active={activeTool === "draw_line_string"} onClick={() => toggleTool("draw_line_string")} title="Draw line" />
          <div className="h-px bg-surface-border mx-1 my-0.5" />
          {/* Measure */}
          <ToolBtn icon={Ruler}     active={activeTool === "measure_distance"} onClick={() => toggleTool("measure_distance")} title="Measure distance" />
          <ToolBtn icon={Maximize2} active={activeTool === "measure_area"}     onClick={() => toggleTool("measure_area")}     title="Measure area" />
          <div className="h-px bg-surface-border mx-1 my-0.5" />
          {/* Clear */}
          <ToolBtn icon={Trash2} onClick={() => { clearDrawings(); clearMeasure(); setActiveTool(null); }} title="Clear drawings & measurements" danger />
          <div className="h-px bg-surface-border mx-1 my-0.5" />
          {/* Heatmap */}
          <ToolBtn icon={Flame}       active={showHeatmap}    onClick={() => setShowHeatmap(v => !v)}    title="Toggle heatmap" />
          {/* Sensor dots */}
          <ToolBtn icon={Thermometer} active={showSensors}    onClick={() => setShowSensors(v => !v)}    title="Toggle sensor layer" />
          {/* 3D terrain */}
          <ToolBtn icon={Mountain}    active={show3D}         onClick={() => setShow3D(v => !v)}         title="Toggle 3D terrain" />
          {/* Time slider */}
          <ToolBtn icon={Clock}    active={showTimeSlider} onClick={() => setShowTimeSlider(v => !v)} title="Radar time-slider" />
          <div className="h-px bg-surface-border mx-1 my-0.5" />
          {/* Export */}
          <ToolBtn icon={Download} onClick={handleExport} title="Export map as PNG" />
        </div>

        {/* ── Basemap switcher (right) ─────────────────────────────────── */}
        <div className="absolute top-12 right-2 z-10 flex flex-col gap-0.5 bg-surface/90 border border-surface-border rounded p-1 backdrop-blur-sm">
          {BASEMAP_OPTIONS.map(b => (
            <button
              key={b.key}
              onClick={() => setActiveBasemap(b.key)}
              className={`h-6 px-2.5 rounded text-[9px] font-mono uppercase tracking-wider text-left transition-colors ${
                activeBasemap === b.key
                  ? "bg-flood-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/10"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* ── Measure result badge ─────────────────────────────────────── */}
        {measureResult && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-surface/95 border border-flood-600/40 rounded px-4 py-1.5 flex items-center gap-3 backdrop-blur-sm">
            <span className="text-[9px] font-mono uppercase text-slate-500">
              {activeTool === "measure_distance" ? "Distance" : "Area"}
            </span>
            <span className="text-sm font-mono font-bold text-flood-400">{measureResult}</span>
            <button onClick={() => { clearMeasure(); setActiveTool(null); }} className="text-slate-500 hover:text-slate-300">
              <X size={12} />
            </button>
          </div>
        )}

        {/* ── Active tool hint ─────────────────────────────────────────── */}
        {activeTool && !measureResult && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-surface/90 border border-surface-border rounded px-3 py-1 backdrop-blur-sm">
            <span className="text-[9px] font-mono text-slate-400">
              {activeTool === "draw_polygon" && "Click to add vertices — double-click to close polygon"}
              {activeTool === "draw_line"    && "Click to add points — double-click to finish line"}
              {activeTool === "measure_distance" && "Click two or more points to measure distance"}
              {activeTool === "measure_area"     && "Click 3+ points to measure area"}
            </span>
          </div>
        )}

        {/* ── Time-slider ──────────────────────────────────────────────── */}
        {showTimeSlider && radarFrames.length > 0 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-surface/95 border border-surface-border rounded px-4 py-2 flex items-center gap-3 min-w-[280px] max-w-xs backdrop-blur-sm">
            <span className="text-[9px] font-mono uppercase text-slate-500 whitespace-nowrap">Radar</span>
            <input
              type="range"
              min={0}
              max={radarFrames.length - 1}
              value={sliderIdx}
              onChange={e => setSliderIdx(Number(e.target.value))}
              className="flex-1 accent-flood-600"
            />
            <span className="text-[9px] font-mono text-flood-400 whitespace-nowrap">
              {radarFrames[sliderIdx]?.time
                ? new Date(radarFrames[sliderIdx].time * 1000).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </span>
            <button onClick={() => setShowTimeSlider(false)} className="text-slate-500 hover:text-slate-300">
              <X size={12} />
            </button>
          </div>
        )}

        {/* ── County fills ─────────────────────────────────────────────── */}
        {focusCountiesGeoJSON && (
          <Source id="counties" type="geojson" data={focusCountiesGeoJSON}>
            <Layer {...countyFill(darkMode)} />
            <Layer {...countyOutline(darkMode)} />
          </Source>
        )}

        {/* ── Sub-county choropleth ─────────────────────────────────────  */}
        {selectedCounties.length > 0 && filteredAreas?.features?.length > 0 && (
          <Source id="sub-counties" type="geojson" data={filteredAreas}>
            <Layer {...subFill} />
            <Layer {...subOutline} />
            <Layer {...subSelected} filter={["==", "adm2_name", selectedArea || ""]} />
          </Source>
        )}

        {/* ── Annotated zones ──────────────────────────────────────────── */}
        {coloredZones && (
          <Source id="zones" type="geojson" data={coloredZones}>
            <Layer {...zoneLayer} />
          </Source>
        )}

        {/* ── Heatmap ───────────────────────────────────────────────────  */}
        {showHeatmap && (
          <Source id="heatmap-src" type="geojson" data={heatmapGeoJSON}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              paint={{
                "heatmap-weight": 1,
                "heatmap-intensity": 1.5,
                "heatmap-radius": 45,
                "heatmap-color": [
                  "interpolate", ["linear"], ["heatmap-density"],
                  0, "rgba(0,0,0,0)",
                  0.2, "#0891b2",
                  0.4, "#22d3ee",
                  0.6, "#fbbf24",
                  0.8, "#f97316",
                  1,   "#ef4444",
                ],
                "heatmap-opacity": 0.85,
              }}
            />
          </Source>
        )}

        {/* ── Measurement overlay ──────────────────────────────────────── */}
        {measureGeoJSON && (
          <Source id="measure-src" type="geojson" data={measureGeoJSON}>
            <Layer
              id="measure-line"
              type="line"
              paint={{ "line-color": "#0891b2", "line-width": 2, "line-dasharray": [3, 2] }}
            />
            {activeTool === "measure_area" && measurePts.length >= 3 && (
              <Layer id="measure-fill" type="fill" paint={{ "fill-color": "#0891b2", "fill-opacity": 0.12 }} />
            )}
          </Source>
        )}
        {measurePts.map((pt, i) => (
          <Marker key={`mp-${i}`} longitude={pt[0]} latitude={pt[1]} anchor="center">
            <div className="w-2.5 h-2.5 bg-flood-600 border-2 border-white rounded-full shadow" />
          </Marker>
        ))}

        {/* ── In-progress drawing preview ────────────────────────────── */}
        {drawPts.length >= 2 && (
          <Source id="draw-preview" type="geojson" data={{
            type: "Feature",
            geometry: activeTool === "draw_polygon" && drawPts.length >= 3
              ? { type: "Polygon", coordinates: [[...drawPts, drawPts[0]]] }
              : { type: "LineString", coordinates: drawPts },
          }}>
            {activeTool === "draw_polygon" && drawPts.length >= 3 && (
              <Layer id="draw-preview-fill" type="fill" paint={{ "fill-color": "#0891b2", "fill-opacity": 0.15 }} />
            )}
            <Layer id="draw-preview-line" type="line" layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": "#0891b2", "line-width": 2, "line-dasharray": [3, 2] }} />
          </Source>
        )}
        {drawPts.map((pt, i) => (
          <Marker key={`dp-${i}`} longitude={pt[0]} latitude={pt[1]} anchor="center">
            <div className={`rounded-full border-2 border-white shadow ${i === 0 ? "w-3 h-3 bg-flood-600" : "w-2 h-2 bg-cyan-400"}`} />
          </Marker>
        ))}

        {/* ── Completed drawings ──────────────────────────────────────── */}
        {completedDrawings.map(d => (
          <Source key={`cd-${d.id}`} id={`cd-${d.id}`} type="geojson" data={{
            type: "Feature",
            geometry: d.type === "polygon"
              ? { type: "Polygon",    coordinates: [[...d.coords, d.coords[0]]] }
              : { type: "LineString", coordinates: d.coords },
          }}>
            {d.type === "polygon" && (
              <Layer id={`cd-fill-${d.id}`} type="fill" paint={{ "fill-color": "#0891b2", "fill-opacity": 0.2 }} />
            )}
            <Layer id={`cd-line-${d.id}`} type="line" layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": "#0891b2", "line-width": 2 }} />
          </Source>
        ))}

        {/* ── Flood simulation circles ──────────────────────────────────  */}
        {isSimulating && SIM_ORIGINS.map(sim => (
          <Marker key={sim.id} longitude={sim.lon} latitude={sim.lat} anchor="center">
            <div
              style={{
                width:  sim.r * simRadius * 0.006,
                height: sim.r * simRadius * 0.006,
                borderRadius: "50%",
                background: "rgba(59,130,246,0.25)",
                border: "2px dashed #2563eb",
                pointerEvents: "none",
              }}
              title={sim.name}
            />
          </Marker>
        ))}

        {/* ── Clustered markers (hotspots + cameras) ────────────────────  */}
        {useClustering && clusterIndex ? (
          clusters.map(feature => {
            const [lon, lat] = feature.geometry.coordinates;
            const { cluster, cluster_id, point_count, _type } = feature.properties;
            if (cluster) {
              return (
                <Marker
                  key={`cluster-${cluster_id}`}
                  longitude={lon} latitude={lat} anchor="center"
                  onClick={e => {
                    e.originalEvent.stopPropagation();
                    const zoom = clusterIndex.getClusterExpansionZoom(cluster_id);
                    mapRef.current?.flyTo({ center: [lon, lat], zoom, duration: 500 });
                  }}
                >
                  <div className="w-9 h-9 rounded-full bg-flood-600/80 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer">
                    {point_count}
                  </div>
                </Marker>
              );
            }
            if (_type === "camera") {
              const cam = feature.properties;
              return (
                <Marker
                  key={`cam-${cam.id}`} longitude={lon} latitude={lat} anchor="center"
                  onClick={e => { e.originalEvent.stopPropagation(); onCameraClick?.(cam); setPopup({ type: "camera", data: cam, lon, lat }); }}
                >
                  <div className={`w-5 h-5 rounded border-2 border-white shadow flex items-center justify-center text-[10px] cursor-pointer ${cam.status === "online" ? "bg-emerald-500" : cam.status === "degraded" ? "bg-amber-500" : "bg-slate-600"}`} title={cam.name}>
                    📷
                  </div>
                </Marker>
              );
            }
            // hotspot
            const hs = feature.properties;
            return (
              <Marker
                key={`hs-${hs.id}`} longitude={lon} latitude={lat} anchor="center"
                onClick={e => { e.originalEvent.stopPropagation(); setPopup({ type: "hotspot", data: hs, lon, lat }); onHotspotClick?.(hs); }}
              >
                <div className="relative cursor-pointer">
                  <div className="w-4 h-4 bg-red-600 border-2 border-white rounded-sm animate-pulse shadow-[0_0_12px_rgba(220,38,38,0.8)]" />
                  <div className="absolute -inset-1 border border-red-500 rounded-sm animate-ping opacity-50" />
                </div>
              </Marker>
            );
          })
        ) : (
          <>
            {/* Unclustered hotspots */}
            {HOTSPOTS
              .filter(h => selectedCounties.length === 0 || selectedCounties.includes(h.county))
              .map(hs => (
                <Marker key={hs.id} longitude={hs.lon} latitude={hs.lat} anchor="center"
                  onClick={e => { e.originalEvent.stopPropagation(); setPopup({ type: "hotspot", data: hs, lon: hs.lon, lat: hs.lat }); onHotspotClick?.(hs); }}>
                  <div className="relative cursor-pointer">
                    <div className="w-4 h-4 bg-red-600 border-2 border-white rounded-sm animate-pulse shadow-[0_0_12px_rgba(220,38,38,0.8)]" />
                    <div className="absolute -inset-1 border border-red-500 rounded-sm animate-ping opacity-50" />
                  </div>
                </Marker>
              ))}
            {/* Unclustered cameras */}
            {cameras.filter(c => c.lat && c.lon).map(cam => (
              <Marker key={`cam-${cam.id}`} longitude={cam.lon} latitude={cam.lat} anchor="center"
                onClick={e => { e.originalEvent.stopPropagation(); onCameraClick?.(cam); setPopup({ type: "camera", data: cam, lon: cam.lon, lat: cam.lat }); }}>
                <div className={`w-5 h-5 rounded border-2 border-white shadow flex items-center justify-center text-[10px] cursor-pointer ${cam.status === "online" ? "bg-emerald-500" : cam.status === "degraded" ? "bg-amber-500" : "bg-slate-600"}`} title={cam.name}>
                  📷
                </div>
              </Marker>
            ))}
          </>
        )}

        {/* ── Sensor dots (WeatherObservation latest per county) ────────── */}
        {showSensors && sensorData.filter(s => s.centroid_lat && s.centroid_lon).map(sensor => {
          const rain = sensor.rainfall_mm ?? 0;
          const river = sensor.river_level_cm ?? 0;
          // Colour: red if river > 300cm or rain > 30mm, orange if river > 150 or rain > 15, else green
          const dotColor = (river > 300 || rain > 30) ? "#ef4444"
                         : (river > 150 || rain > 15) ? "#f97316"
                         : "#22c55e";
          const dotGlow = (river > 300 || rain > 30) ? "rgba(239,68,68,0.5)"
                        : (river > 150 || rain > 15) ? "rgba(249,115,22,0.5)"
                        : "rgba(34,197,94,0.3)";
          return (
            <Marker
              key={`sensor-${sensor.id}`}
              longitude={sensor.centroid_lon}
              latitude={sensor.centroid_lat}
              anchor="center"
              onClick={e => { e.originalEvent.stopPropagation(); setPopup({ type: "sensor", data: sensor, lon: sensor.centroid_lon, lat: sensor.centroid_lat }); }}
            >
              <div className="relative cursor-pointer" title={sensor.station_name || sensor.county_name}>
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 border-white shadow"
                  style={{ background: dotColor, boxShadow: `0 0 8px ${dotGlow}` }}
                />
              </div>
            </Marker>
          );
        })}

        {/* ── Field-unit GPS markers ────────────────────────────────────── */}
        {fieldUnits.filter(u => u.current_lat && u.current_lon).map(unit => (
          <Marker key={`unit-${unit.id}`} longitude={unit.current_lon} latitude={unit.current_lat} anchor="center"
            onClick={e => { e.originalEvent.stopPropagation(); setPopup({ type: "unit", data: unit, lon: unit.current_lon, lat: unit.current_lat }); }}>
            <div className="relative cursor-pointer" title={unit.name}>
              <div className={`w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] ${unit.status === "active" ? "bg-cyan-500 shadow-cyan-500/50" : unit.status === "offline" ? "bg-slate-600" : "bg-amber-500"}`}>
                {UNIT_ICONS[unit.unit_type] || "●"}
              </div>
              {unit.status === "active" && <div className="absolute -inset-1 rounded-full border border-cyan-400 animate-ping opacity-40" />}
            </div>
          </Marker>
        ))}

        {/* ── Custom tactical pin ───────────────────────────────────────── */}
        {selectedCustomPin && (
          <Marker longitude={selectedCustomPin.lng} latitude={selectedCustomPin.lat} anchor="center">
            <div className="w-4 h-4 bg-purple-600 border-2 border-white rounded-full shadow-[0_0_10px_rgba(147,51,234,0.6)]" />
          </Marker>
        )}

        {/* ── RainViewer radar overlay ──────────────────────────────────── */}
        {(showRadar || showTimeSlider) && activeRadarPath && (
          <Source
            id="radar" type="raster"
            tiles={[`https://tilecache.rainviewer.com${activeRadarPath}/256/{z}/{x}/{y}/8/1_1.png`]}
            tileSize={256} minzoom={0} maxzoom={6} attribution="© RainViewer"
          >
            <Layer id="radar-layer" type="raster" minzoom={0} maxzoom={22} paint={{ "raster-opacity": radarOpacity }} />
          </Source>
        )}

        {/* ── Popup ─────────────────────────────────────────────────────── */}
        {popup && (
          <Popup longitude={popup.lon} latitude={popup.lat} closeOnClick={false} onClose={() => setPopup(null)} maxWidth="240px">
            {popup.type === "hotspot" && (
              <div className="font-mono text-xs">
                <p className="font-bold text-red-600 uppercase tracking-wide">{popup.data.title}</p>
                <p className="text-slate-600">{popup.data.area}, {popup.data.county}</p>
                <p className="text-slate-400 text-[10px] mt-1">CRITICAL — click for details</p>
              </div>
            )}
            {popup.type === "unit" && (
              <div className="font-mono text-xs">
                <p className="font-bold uppercase tracking-wide">{popup.data.name}</p>
                <p className="text-slate-500">{popup.data.unit_type} · <span className={popup.data.status === "active" ? "text-cyan-600" : "text-amber-600"}>{popup.data.status}</span></p>
                {popup.data.last_ping && <p className="text-slate-400 text-[10px] mt-1">Last ping: {new Date(popup.data.last_ping).toLocaleTimeString()}</p>}
              </div>
            )}
            {popup.type === "camera" && (
              <div className="font-mono text-xs">
                <p className="font-bold uppercase tracking-wide">{popup.data.name}</p>
                <p className="text-slate-500">{popup.data.feed_type} · <span className={popup.data.status === "online" ? "text-emerald-600" : "text-red-600"}>{popup.data.status}</span></p>
                <button onClick={() => { onCameraClick?.(popup.data); setPopup(null); }} className="mt-1 text-[10px] text-cyan-600 underline">Open feed →</button>
              </div>
            )}
          </Popup>
        )}
      </Map>
    </div>
  );
}
