/**
 * CameraFeedCard.jsx
 *
 * Extracted camera tile component with all its supporting helpers.
 * Supports: HLS streams, MJPEG, snapshot with auto-refresh, interactive
 * ESRI satellite map, live overlays, and telemetry ticker.
 */
import React, { useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl, ScaleControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import Hls from "hls.js";
import { Camera, Maximize2, WifiOff } from "lucide-react";

// ── ESRI World Imagery style (no API key, full street-level zoom) ──────────────
export const ESRI_SATELLITE_STYLE = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "esri-imagery": {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "© Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
    "esri-labels": {
      type: "raster",
      tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "satellite-base", type: "raster", source: "esri-imagery" },
    { id: "satellite-labels", type: "raster", source: "esri-labels", paint: { "raster-opacity": 0.85 } },
  ],
};

// ── ESRI World Imagery snapshot helper (public, no API key needed) ─────────────
export function getESRISnapshot(lat, lon, radiusDeg = 0.02, width = 640, height = 480) {
  const minx = (lon - radiusDeg).toFixed(6);
  const miny = (lat - radiusDeg).toFixed(6);
  const maxx = (lon + radiusDeg).toFixed(6);
  const maxy = (lat + radiusDeg).toFixed(6);
  return (
    `https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${minx},${miny},${maxx},${maxy}&bboxSR=4326&size=${width},${height}&format=jpg&f=image`
  );
}

// ── Status chip color classes ──────────────────────────────────────────────────
export const STATUS_COLORS = {
  online:   "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-700",
  degraded: "text-amber-600  dark:text-amber-400  bg-amber-50  dark:bg-amber-900/40  border-amber-400  dark:border-amber-700",
  offline:  "text-red-600    dark:text-red-400    bg-red-50    dark:bg-red-900/40    border-red-400    dark:border-red-700",
};

// ── Camera type display labels ─────────────────────────────────────────────────
export const TYPE_LABELS = {
  cctv:      "CCTV",
  drone:     "Drone",
  river:     "River Cam",
  weather:   "Weather",
  satellite: "Satellite",
};

// ── Snapshot camera with auto-refresh ─────────────────────────────────────────
function SnapshotImg({ src, alt, className = "", refreshSecs = 30 }) {
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
    const id = setInterval(() => setCacheBust(Date.now()), refreshSecs * 1000);
    return () => clearInterval(id);
  }, [src, refreshSecs]);

  if (errored) return null; // parent renders fallback

  const sep = src.includes("?") ? "&" : "?";
  return (
    <img
      src={`${src}${sep}_t=${cacheBust}`}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}

// ── HLS player ────────────────────────────────────────────────────────────────
function HLSPlayer({ src, className = "" }) {
  const videoRef = useRef(null);
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

// ── Live clock ticker (updates every second) ──────────────────────────────────
function LiveTicker() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{t.toLocaleTimeString("en-KE", { hour12: false })} EAT</>;
}

// ── Live video overlay — scan line + REC badge + clock ────────────────────────
function LiveOverlay({ label = "LIVE", isSatellite = false }) {
  return (
    <>
      {/* CRT interlace lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)",
        }}
      />
      {/* Moving scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="camera-scanline w-full"
          style={{
            height: "60px",
            background:
              "linear-gradient(to bottom,transparent,rgba(255,255,255,0.06) 50%,transparent)",
          }}
        />
      </div>
      {/* REC / SAT badge top-left — pointer-events-none so map stays interactive */}
      <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 bg-black/65 backdrop-blur-sm px-2 py-0.5 rounded-sm camera-signal">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-white text-[8px] font-mono font-bold tracking-widest uppercase">
          {isSatellite ? "SAT DOWNLINK" : label}
        </span>
      </div>
      {/* Ticking clock bottom-right */}
      <div className="absolute bottom-2 right-2 pointer-events-none bg-black/65 backdrop-blur-sm px-1.5 py-0.5 rounded-sm">
        <span className="text-[9px] font-mono text-white tabular-nums">
          <LiveTicker />
        </span>
      </div>
      {/* Signal strength indicator top-right (for satellite) */}
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

// ── Fake telemetry — realistic values that jitter every 2 s ───────────────────
const BASE_TELEMETRY = {
  d1: { wl: 2.34, temp: 26.1, wind: 12, rh: 81 },
  d2: { wl: 4.71, temp: 25.8, wind: 9,  rh: 84 },
  d3: { wl: 3.20, temp: 25.4, wind: 11, rh: 79 },
  d4: { wl: 0.82, temp: 22.1, wind: 7,  rh: 73 },
  d5: { wl: 8.14, temp: 24.9, wind: 14, rh: 76 },
  d6: { wl: 1.10, temp: 23.3, wind: 8,  rh: 78 },
};

function jitter(v, pct = 0.015) {
  return +(v * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(2);
}

function TelemetryTicker({ cameraId }) {
  const base = BASE_TELEMETRY[cameraId] || { wl: 2.0, temp: 24, wind: 10, rh: 75 };
  const [vals, setVals] = useState(base);

  useEffect(() => {
    const id = setInterval(() => {
      setVals({
        wl:   jitter(base.wl),
        temp: jitter(base.temp),
        wind: jitter(base.wind, 0.05),
        rh:   jitter(base.rh,   0.02),
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

// ── Interactive satellite mini-map (replaces static JPEG for sat/river feeds) ──
function SatelliteMapView({ lat, lon, zoom = 14, compact = false }) {
  if (!lat || !lon) return null;
  return (
    <Map
      initialViewState={{ longitude: lon, latitude: lat, zoom }}
      mapStyle={ESRI_SATELLITE_STYLE}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      cooperativeGestures={compact}  // in card view require ctrl+scroll to zoom
    >
      <NavigationControl
        position="top-right"
        showCompass={!compact}
        visualizePitch={!compact}
      />
      {!compact && <ScaleControl position="bottom-left" unit="metric" />}
      {/* Pulsing location pin */}
      <Marker longitude={lon} latitude={lat} anchor="center">
        <div className="relative">
          <div className="w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-lg" />
          <div className="absolute -inset-2 border-2 border-red-400 rounded-full animate-ping opacity-50" />
        </div>
      </Marker>
    </Map>
  );
}

// ── Camera tile (default export) ───────────────────────────────────────────────
export default function CameraFeedCard({ camera, onExpand }) {
  const isHLS   = camera.stream_url?.includes(".m3u8");
  const isMJPEG = camera.stream_url?.includes("mjpg") || camera.stream_url?.includes("mjpeg");
  const isSnap  = camera.stream_url && !isHLS && !isMJPEG;
  // Use interactive satellite map for satellite/river types with coordinates
  const useMapView =
    (camera.feed_type === "satellite" || camera.feed_type === "river") &&
    camera.lat && camera.lon && camera.status !== "offline";

  const [snapFailed, setSnapFailed] = useState(false);
  const showPlaceholder =
    !useMapView &&
    (camera.status === "offline" || !camera.stream_url || (isSnap && snapFailed));

  return (
    <div className="relative group rounded border border-slate-200 dark:border-surface-border bg-white dark:bg-surface-raised overflow-hidden">
      {/* Feed area */}
      <div className="aspect-video bg-slate-100 dark:bg-slate-900 relative overflow-hidden">

        {/* ── Interactive satellite/river map ── */}
        {useMapView ? (
          <>
            <SatelliteMapView
              lat={camera.lat}
              lon={camera.lon}
              zoom={camera.defaultZoom ?? 14}
              compact={true}
            />
            {/* Overlays — all pointer-events-none so map stays interactive */}
            <div className="absolute inset-0 pointer-events-none">
              <LiveOverlay
                label="FEED"
                isSatellite={camera.feed_type === "satellite"}
              />
              <TelemetryTicker cameraId={camera.id} />
            </div>
          </>
        ) : showPlaceholder ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {camera.status === "offline" ? (
              <>
                <WifiOff className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-widest">Feed Offline</span>
              </>
            ) : (
              <>
                <Camera className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-widest">No Stream — Connect URL</span>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)",
                  }}
                />
              </>
            )}
          </div>
        ) : isHLS ? (
          <HLSPlayer src={camera.stream_url} />
        ) : isMJPEG ? (
          <img src={camera.stream_url} alt={camera.name} className="w-full h-full object-cover" />
        ) : (
          <SnapshotImg
            src={camera.stream_url}
            alt={camera.name}
            className="w-full h-full object-cover"
            refreshSecs={60}
          />
        )}

        {/* Live overlay for HLS/MJPEG/snapshot streams (map view has its own above) */}
        {!useMapView && camera.status === "online" && !showPlaceholder && (
          <>
            <LiveOverlay label={isHLS ? "LIVE" : "FEED"} isSatellite={false} />
            <TelemetryTicker cameraId={camera.id} />
          </>
        )}

        {/* Expand button — always on top */}
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(camera); }}
          className="absolute top-2 right-2 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Info bar */}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{camera.name}</p>
          <p className="text-[10px] text-slate-500 font-mono truncate">{camera.location_label}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${STATUS_COLORS[camera.status]}`}>
            {camera.status}
          </span>
          <span className="text-[9px] text-slate-400">{TYPE_LABELS[camera.feed_type] || camera.feed_type}</span>
        </div>
      </div>
    </div>
  );
}
