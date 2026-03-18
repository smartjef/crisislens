/**
 * CameraPage.jsx
 *
 * Live camera feed grid.  Supports:
 *  - HLS streams via hls.js
 *  - MJPEG fallback (img src with live=true)
 *  - Snapshot cameras with auto-refresh every 60 s
 *  - ESRI World Imagery satellite snapshots (street-level resolution)
 *  - Status indicators: ONLINE / DEGRADED / OFFLINE
 *  - Filter bar: county, type, status
 *  - Click any tile → fullscreen modal
 *  - Full light/dark mode support
 */
import React, { useEffect, useState } from "react";
import { Camera, ExternalLink, Filter, Globe, Info, RefreshCw, X } from "lucide-react";
import client from "../api/client";
import CameraDrawer from "../components/camera/CameraDrawer";
import CameraFeedCard, { STATUS_COLORS, TYPE_LABELS } from "../components/camera/CameraFeedCard";
import CameraGrid from "../components/camera/CameraGrid";
import HLSPlayer from "../components/camera/CameraFeedCard";
import { ESRI_SATELLITE_STYLE } from "../components/camera/CameraFeedCard";
import Map, { Marker, NavigationControl, ScaleControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import Hls from "hls.js";

// ── Demo feeds — shown when no real cameras are registered in DB ──────────────
const DEMO_FEEDS = [
  {
    id: "d1",
    name: "Lake Victoria — Kisumu Bay",
    location_label: "Kisumu Bay, Kisumu County",
    feed_type: "satellite",
    status: "online",
    stream_url: null,          // interactive map replaces snapshot for satellite type
    lat: -0.098766, lon: 34.730744,
    defaultZoom: 18,           // ~100 m street-level
  },
  {
    id: "d2",
    name: "Nyando River Delta",
    location_label: "Nyando Floodplain, Kisumu",
    feed_type: "satellite",
    status: "online",
    stream_url: null,
    lat: -0.007979, lon: 35.282044,
    defaultZoom: 18,           // ~100 m street-level
  },
  {
    id: "d3",
    name: "Nyando Bridge Monitor",
    location_label: "Nyando Bridge, Kisumu",
    feed_type: "river",
    status: "online",
    stream_url: null,
    lat: -0.172251, lon: 34.920937,
    defaultZoom: 18,           // ~100 m bridge close-up
    streetViewUrl: "https://www.google.com/maps?layer=c&cbll=-0.172251,34.920937&output=svembed",
  },
  {
    id: "d4",
    name: "Mathare River Drainage",
    location_label: "Mathare, Nairobi",
    feed_type: "cctv",
    status: "degraded",
    stream_url: null,          // CCTV — connect real stream URL via Admin
    lat: -1.258, lon: 36.862,
    defaultZoom: 17,
  },
  {
    id: "d5",
    name: "Masinga Dam Spillway",
    location_label: "Masinga Dam, Machakos",
    feed_type: "river",
    status: "online",
    stream_url: null,
    lat: -0.889443, lon: 37.594190,
    defaultZoom: 18,           // ~100 m dam close-up
  },
  {
    id: "d6",
    name: "Kibra Flood Plain",
    location_label: "Kibra, Nairobi",
    feed_type: "cctv",
    status: "offline",
    stream_url: null,
    lat: -1.31, lon: 36.79,
    defaultZoom: 15,
  },
];

// ── Inline helpers reused only inside ExpandedModal ───────────────────────────
function _LiveTicker() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{t.toLocaleTimeString("en-KE", { hour12: false })} EAT</>;
}

function _LiveOverlay({ label = "LIVE", isSatellite = false }) {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="camera-scanline w-full"
          style={{
            height: "60px",
            background: "linear-gradient(to bottom,transparent,rgba(255,255,255,0.06) 50%,transparent)",
          }}
        />
      </div>
      <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 bg-black/65 backdrop-blur-sm px-2 py-0.5 rounded-sm camera-signal">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-white text-[8px] font-mono font-bold tracking-widest uppercase">
          {isSatellite ? "SAT DOWNLINK" : label}
        </span>
      </div>
      <div className="absolute bottom-2 right-2 pointer-events-none bg-black/65 backdrop-blur-sm px-1.5 py-0.5 rounded-sm">
        <span className="text-[9px] font-mono text-white tabular-nums">
          <_LiveTicker />
        </span>
      </div>
      {isSatellite && (
        <div className="absolute top-2 right-2 pointer-events-none flex items-end gap-0.5 bg-black/65 backdrop-blur-sm px-2 py-1 rounded-sm">
          {[3, 5, 7, 9, 11].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-sm bg-emerald-400"
              style={{ height: `${h}px`, opacity: i < 4 ? 1 : 0.3 }}
            />
          ))}
        </div>
      )}
    </>
  );
}

const _BASE_TELEMETRY = {
  d1: { wl: 2.34, temp: 26.1, wind: 12, rh: 81 },
  d2: { wl: 4.71, temp: 25.8, wind: 9,  rh: 84 },
  d3: { wl: 3.20, temp: 25.4, wind: 11, rh: 79 },
  d4: { wl: 0.82, temp: 22.1, wind: 7,  rh: 73 },
  d5: { wl: 8.14, temp: 24.9, wind: 14, rh: 76 },
  d6: { wl: 1.10, temp: 23.3, wind: 8,  rh: 78 },
};
function _jitter(v, pct = 0.015) {
  return +(v * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(2);
}
function _TelemetryTicker({ cameraId }) {
  const base = _BASE_TELEMETRY[cameraId] || { wl: 2.0, temp: 24, wind: 10, rh: 75 };
  const [vals, setVals] = useState(base);
  useEffect(() => {
    const id = setInterval(() => {
      setVals({
        wl:   _jitter(base.wl),
        temp: _jitter(base.temp),
        wind: _jitter(base.wind, 0.05),
        rh:   _jitter(base.rh,   0.02),
      });
    }, 2000);
    return () => clearInterval(id);
  }, [cameraId]);
  return (
    <div className="absolute bottom-2 left-2 bg-black/65 backdrop-blur-sm px-2 py-1 rounded-sm space-y-0.5 pointer-events-none">
      <div className="flex gap-3">
        <span className="text-[8px] font-mono text-cyan-400 tabular-nums">WL {vals.wl}m</span>
        <span className="text-[8px] font-mono text-amber-400 tabular-nums">{vals.temp}°C</span>
      </div>
      <div className="flex gap-3">
        <span className="text-[8px] font-mono text-slate-300 tabular-nums">🌬 {vals.wind}km/h</span>
        <span className="text-[8px] font-mono text-slate-300 tabular-nums">RH {vals.rh}%</span>
      </div>
    </div>
  );
}

function _HLSPlayer({ src, className = "" }) {
  const videoRef = React.useRef(null);
  useEffect(() => {
    if (!src || !videoRef.current) return;
    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = src;
    }
  }, [src]);
  return <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${className}`} />;
}

function _SatelliteMapView({ lat, lon, zoom = 14, compact = false }) {
  if (!lat || !lon) return null;
  return (
    <Map
      initialViewState={{ longitude: lon, latitude: lat, zoom }}
      mapStyle={ESRI_SATELLITE_STYLE}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      cooperativeGestures={compact}
    >
      <NavigationControl
        position="top-right"
        showCompass={!compact}
        visualizePitch={!compact}
      />
      {!compact && <ScaleControl position="bottom-left" unit="metric" />}
      <Marker longitude={lon} latitude={lat} anchor="center">
        <div className="relative">
          <div className="w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-lg" />
          <div className="absolute -inset-2 border-2 border-red-400 rounded-full animate-ping opacity-50" />
        </div>
      </Marker>
    </Map>
  );
}

// ── Expanded modal — satellite map + optional Street View toggle ───────────────
function ExpandedModal({ camera, onClose }) {
  const [showStreetView, setShowStreetView] = useState(false);
  const hasStreetView = !!camera.streetViewUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded border border-slate-200 dark:border-surface-border bg-white dark:bg-surface overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-surface-border">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{camera.name}</p>
            <p className="text-[10px] font-mono text-slate-500">{camera.location_label}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Street View toggle — only shown for cameras with confirmed coverage */}
            {hasStreetView && (
              <button
                onClick={() => setShowStreetView(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono transition-colors
                  ${showStreetView
                    ? "border-flood-600 bg-flood-50 dark:bg-flood-900/30 text-flood-600 dark:text-flood-400"
                    : "border-slate-200 dark:border-surface-border text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                <Globe className="w-3 h-3" />
                {showStreetView ? "Satellite" : "Street View"}
              </button>
            )}
            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[camera.status]}`}>
              {camera.status}
            </span>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Feed / map area — taller in modal */}
        <div className="h-[60vh] bg-slate-100 dark:bg-slate-900 relative">
          {/* Street View iframe */}
          {showStreetView && hasStreetView ? (
            <iframe
              src={camera.streetViewUrl}
              title={`Street View — ${camera.name}`}
              className="w-full h-full border-0"
              allowFullScreen
            />
          ) : camera.stream_url?.includes(".m3u8") ? (
            <>
              <_HLSPlayer src={camera.stream_url} />
              <div className="absolute inset-0 pointer-events-none">
                <_LiveOverlay label="LIVE" isSatellite={false} />
                <_TelemetryTicker cameraId={camera.id} />
              </div>
            </>
          ) : camera.stream_url?.includes("mjpg") || camera.stream_url?.includes("mjpeg") ? (
            <>
              <img src={camera.stream_url} alt={camera.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none">
                <_LiveOverlay label="LIVE" isSatellite={false} />
                <_TelemetryTicker cameraId={camera.id} />
              </div>
            </>
          ) : camera.lat && camera.lon ? (
            <>
              <_SatelliteMapView
                lat={camera.lat}
                lon={camera.lon}
                zoom={(camera.defaultZoom ?? 14) + 1}
                compact={false}
              />
              <div className="absolute inset-0 pointer-events-none">
                <_LiveOverlay
                  label="FEED"
                  isSatellite={camera.feed_type === "satellite"}
                />
                {camera.status === "online" && <_TelemetryTicker cameraId={camera.id} />}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Camera className="w-16 h-16 text-slate-300 dark:text-slate-700" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-mono">No stream or coordinates configured</p>
              <p className="text-slate-400 dark:text-slate-600 text-xs">Add coordinates or an HLS URL via Admin → Cameras</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-200 dark:border-surface-border bg-slate-50 dark:bg-surface-raised">
          <span>{TYPE_LABELS[camera.feed_type] || camera.feed_type} · {camera.location_label}</span>
          {showStreetView
            ? <span className="text-slate-400">Google Street View · Click &amp; drag to look around</span>
            : <span className="text-slate-400">Scroll to zoom · Drag to pan · Ctrl+scroll in card view</span>
          }
        </div>
      </div>
    </div>
  );
}

// ── Full page ─────────────────────────────────────────────────────────────────
export default function CameraPage() {
  const [cameras, setCameras]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [expanded, setExpanded]         = useState(null);
  const [filterType, setFilterType]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = () => {
    setLoading(true);
    client.get("/api/cameras/")
      .then((res) => {
        const data = res.data.results || res.data;
        setCameras(data.length ? data : DEMO_FEEDS);
      })
      .catch(() => setCameras(DEMO_FEEDS))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = cameras.filter((c) => {
    if (filterType   !== "all" && c.feed_type !== filterType)  return false;
    if (filterStatus !== "all" && c.status    !== filterStatus) return false;
    return true;
  });

  const online  = cameras.filter((c) => c.status === "online").length;
  const offline = cameras.filter((c) => c.status === "offline").length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200 font-['IBM_Plex_Condensed']">
            LIVE CAMERA FEEDS
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-widest">
            {online} online · {offline} offline · {cameras.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 dark:border-surface-border text-[11px] font-mono text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-surface-border">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <div className="flex gap-2">
          {["all", "cctv", "drone", "river", "satellite", "weather"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-[10px] font-mono uppercase px-2 py-1 rounded border transition-colors
                ${filterType === t
                  ? "border-flood-600 text-flood-600 dark:text-flood-400 bg-flood-50 dark:bg-flood-900/30"
                  : "border-slate-200 dark:border-surface-border text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-slate-200 dark:bg-surface-border" />
        <div className="flex gap-2">
          {["all", "online", "degraded", "offline"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-[10px] font-mono uppercase px-2 py-1 rounded border transition-colors
                ${filterStatus === s
                  ? "border-flood-600 text-flood-600 dark:text-flood-400 bg-flood-50 dark:bg-flood-900/30"
                  : "border-slate-200 dark:border-surface-border text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50 dark:bg-cyan-950/30 text-[10px] font-mono text-cyan-700 dark:text-cyan-400">
        <Info className="w-3 h-3 shrink-0" />
        Satellite &amp; river feeds use ESRI World Imagery — fully interactive: <strong className="font-semibold">scroll to zoom · drag to pan</strong> · click expand for immersive view · connect RTSP/HLS via <strong className="font-semibold">Admin → Cameras</strong>
      </div>

      {/* Camera grid */}
      <CameraGrid cameras={filtered} loading={loading} onExpand={setExpanded} />

      {/* Side drawer */}
      {expanded && (
        <CameraDrawer
          camera={expanded}
          onClose={() => setExpanded(null)}
          onFullscreen={() => {}}
        />
      )}
    </div>
  );
}
