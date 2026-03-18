/**
 * PublicPortal.jsx  — Route: /
 *
 * Unauthenticated public-facing early warning dashboard.
 * 3-column full-viewport layout:
 *   Col 1 (~50%): Live MapLibre map — county risk fills, alert hotspot pins, camera markers
 *   Col 2 (~25%): Active alerts feed (severity-coloured cards, auto-refresh)
 *   Col 3 (~25%): Social intel headlines + verified news items
 *
 * Supports both light and dark mode via Tailwind dark: variants.
 * Auto-refreshes every 60 seconds. No auth token needed.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Radio,
  RefreshCw,
  Shield,
  Zap,
} from "lucide-react";
import axios from "axios";
import MapLibreMap from "../components/map/MapLibreMap";
import { useDarkMode } from "../hooks/useDarkMode";
import kenyaCountiesRaw from "../data/ken_admin1.geojson?raw";

const kenyaCounties = JSON.parse(kenyaCountiesRaw);
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Weather constants ─────────────────────────────────────────────────────────
const WMO_ICONS = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫",
  51: "🌦", 53: "🌦", 55: "🌧",
  61: "🌧", 63: "🌧", 65: "🌧",
  71: "🌨", 73: "🌨", 75: "🌨",
  80: "🌦", 81: "🌧", 82: "⛈",
  95: "⛈", 96: "⛈", 99: "⛈",
};

const WEATHER_LOCATIONS = [
  { name: "Kisumu",   lat: -0.10, lon: 34.75 },
  { name: "Nairobi",  lat: -1.29, lon: 36.82 },
  { name: "Homa Bay", lat: -0.52, lon: 34.46 },
];

// ── Severity styling ──────────────────────────────────────────────────────────
const SEV = {
  critical: {
    border: "border-red-600 dark:border-red-700",
    bg: "bg-red-50 dark:bg-red-950/60",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
    titleText: "text-red-900 dark:text-slate-200",
  },
  high: {
    border: "border-orange-600 dark:border-orange-700",
    bg: "bg-orange-50 dark:bg-orange-950/50",
    text: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
    titleText: "text-orange-900 dark:text-slate-200",
  },
  medium: {
    border: "border-amber-500 dark:border-amber-700",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    titleText: "text-amber-900 dark:text-slate-200",
  },
  low: {
    border: "border-slate-300 dark:border-slate-700",
    bg: "bg-white dark:bg-slate-900",
    text: "text-slate-600 dark:text-slate-400",
    dot: "bg-slate-400",
    titleText: "text-slate-800 dark:text-slate-200",
  },
};

const INTEL_SENTIMENT = {
  urgent:   "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800",
  negative: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800",
  neutral:  "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700",
  positive: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800",
};

function fmtTime(iso) {
  return new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildRiskMap(alerts = []) {
  const map = {};
  alerts.forEach((a) => {
    if (!a.county) return;
    const order = ["critical", "high", "medium", "low"];
    const prev = map[a.county];
    if (!prev || order.indexOf(a.severity) < order.indexOf(prev)) {
      map[a.county] = a.severity;
    }
  });
  return map;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 min-w-[90px]">
      <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

function AlertCard({ alert }) {
  const s = SEV[alert.severity] || SEV.low;
  return (
    <div className={`rounded border ${s.border} ${s.bg} px-3 py-2.5 space-y-1`}>
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
        <span className={`text-[9px] font-mono uppercase tracking-widest ${s.text}`}>
          {alert.severity}
        </span>
        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-600 ml-auto">
          {fmtTime(alert.issued_at)}
        </span>
      </div>
      <p className={`text-[12px] font-semibold leading-snug ${s.titleText}`}>{alert.title}</p>
      <p className="text-[10px] font-mono text-slate-500">{alert.county}</p>
    </div>
  );
}

function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getSocialPlatform(url) {
  if (!url) return null;
  if (url.includes("tiktok.com"))    return "TikTok";
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("twitter.com") || url.includes("x.com")) return "X/Twitter";
  if (url.includes("facebook.com"))  return "Facebook";
  return null;
}

function IntelCard({ item }) {
  const sentiment = item.sentiment || "neutral";
  const hasUrl = Boolean(item.url);
  const ytId = extractYouTubeId(item.url);
  const platform = !ytId ? getSocialPlatform(item.url) : null;

  return (
    <div className="group rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {/* YouTube embed */}
      {ytId && (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title={item.title}
          />
        </div>
      )}

      {/* Text content */}
      <div
        className={`px-3 py-2 space-y-1 ${hasUrl && !ytId ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors" : ""}`}
        onClick={hasUrl && !ytId ? () => window.open(item.url, "_blank", "noopener,noreferrer") : undefined}
      >
        <div className="flex items-start gap-2">
          <span
            className={`mt-0.5 text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${
              INTEL_SENTIMENT[sentiment] || INTEL_SENTIMENT.neutral
            }`}
          >
            {sentiment}
          </span>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug flex-1">{item.title}</p>
          {platform && (
            <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-gradient-to-r from-pink-500 to-purple-600 text-white shrink-0">
              {platform}
            </span>
          )}
          {hasUrl && !ytId && !platform && (
            <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-slate-300 dark:text-slate-600 group-hover:text-cyan-500 transition-colors" />
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-600">
          <span>{(item.source || "").toUpperCase().replace("_", " ")}</span>
          <span>·</span>
          <span>{fmtTime(item.ts || item.scraped_at)}</span>
          {item.county_tag && (
            <>
              <span>·</span>
              <span className="text-cyan-600 dark:text-cyan-700">{item.county_tag}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EATClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-[10px] font-mono text-slate-500 tabular-nums">
      {now.toLocaleTimeString("en-KE", { hour12: false })} EAT
    </span>
  );
}

// ── Subscribe Section ─────────────────────────────────────────────────────────
function SubscribeSection({ counties }) {
  const [form, setForm] = useState({ phone: '', email: '', channels: ['sms'], county: '' });
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'already' | 'error'

  const toggleChannel = (ch) => {
    setForm(p => ({
      ...p,
      channels: p.channels.includes(ch) ? p.channels.filter(c => c !== ch) : [...p.channels, ch],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.channels.length === 0) return;
    setStatus('loading');
    try {
      const results = await Promise.all(
        form.channels.map(ch =>
          fetch(`${API_BASE}/api/public/subscribe/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: form.phone, email: form.email, channel: ch, county: form.county }),
          }).then(r => r.json())
        )
      );
      const anyNew = results.some(d => d.subscribed);
      setStatus(anyNew ? 'success' : 'already');
    } catch {
      setStatus('error');
    }
  };

  const CH_BTN = (ch, label) => {
    const active = form.channels.includes(ch);
    return (
      <button
        key={ch}
        type="button"
        onClick={() => toggleChannel(ch)}
        className={`flex-1 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
          active
            ? 'bg-cyan-600 border-cyan-600 text-white'
            : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-cyan-600 hover:text-cyan-500'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-3 py-3">
      <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">Early Warning Alerts</p>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Get Notified Instantly</p>
      <p className="text-[10px] text-slate-500 mb-3 leading-snug">Subscribe to receive flood alerts for your county via SMS or email.</p>

      {status === 'success' ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Check size={14} className="text-emerald-400" />
          </div>
          <p className="text-xs text-emerald-400 font-mono">Subscribed successfully!</p>
        </div>
      ) : status === 'already' ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <p className="text-xs text-amber-400 font-mono">Already subscribed.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+254712345678"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-600"
            />
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="email@example.com"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-600"
            />
          </div>
          {/* Channel toggles */}
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">Channels</p>
            <div className="flex gap-1.5">
              {CH_BTN('sms', 'SMS')}
              {CH_BTN('email', 'Email')}
            </div>
          </div>
          <select
            value={form.county}
            onChange={e => setForm(p => ({ ...p, county: e.target.value }))}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400 focus:outline-none"
          >
            <option value="">All Counties</option>
            {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {status === 'error' && <p className="text-[10px] text-red-400">Subscription failed. Please try again.</p>}
          <button
            type="submit"
            disabled={status === 'loading' || (!form.phone && !form.email) || form.channels.length === 0}
            className="w-full h-8 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors disabled:opacity-40"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe to Alerts'}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PublicPortal() {
  const { theme } = useDarkMode();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme:dark)").matches);

  const [data, setData] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [weather, setWeather] = useState([]);

  useEffect(() => {
    const locs = WEATHER_LOCATIONS.map(loc =>
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
        `&current=temperature_2m,precipitation,wind_speed_10m,weather_code&timezone=Africa%2FNairobi`
      ).then(r => r.json()).then(d => ({
        name: loc.name,
        temp: d.current?.temperature_2m,
        rain: d.current?.precipitation,
        wind: d.current?.wind_speed_10m,
        code: d.current?.weather_code,
      })).catch(() => null)
    );
    Promise.all(locs).then(results => setWeather(results.filter(Boolean)));
    // refresh every 15 min
    const id = setInterval(() => {
      Promise.all(locs).then(results => setWeather(results.filter(Boolean)));
    }, 900_000);
    return () => clearInterval(id);
  }, []);

  const load = () => {
    Promise.all([
      axios.get(`${API_BASE}/api/public/summary/`),
      axios.get(`${API_BASE}/api/public/cameras/`),
      axios.get(`${API_BASE}/api/public/counties/`).catch(() => ({ data: [] })),
    ])
      .then(([sumRes, camRes, coRes]) => {
        setData(sumRes.data);
        setCameras(camRes.data || []);
        const coData = coRes.data;
        setCounties(coData.results || coData || []);
        setLastUpdated(new Date());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const activeAlerts = data?.active_alerts || [];
  const intelItems   = data?.latest_intel  || [];
  const riskByCounty = useMemo(() => buildRiskMap(activeAlerts), [activeAlerts]);

  const cameraMarkers = cameras.map((cam) => ({
    id: cam.id,
    name: cam.name,
    lat: cam.latitude,
    lon: cam.longitude,
    status: cam.status || "offline",
    stream_url: cam.stream_url,
  }));

  return (
    <div className="h-screen w-screen flex flex-col bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20">
        <div className="w-full px-4 py-2.5 flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-500 shrink-0" />
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-['IBM_Plex_Condensed'] tracking-widest uppercase">
                CRISISLENS
              </p>
              <p className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">
                GOK National Early Warning System
              </p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="hidden sm:flex items-center gap-2 ml-4">
            <StatPill label="Active Alerts"     value={activeAlerts.length}            color="text-red-500" />
            <StatPill label="Counties Affected"  value={data?.affected_counties ?? "—"}  color="text-orange-500" />
            <StatPill label="Active Incidents"   value={data?.active_incidents  ?? "—"}  color="text-amber-500" />
          </div>

          <div className="flex-1" />

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
              <Clock className="w-3 h-3" />
              <EATClock />
            </div>
            {lastUpdated && (
              <span className="hidden md:inline text-[9px] font-mono text-slate-400 dark:text-slate-600">
                Refreshed {lastUpdated.toLocaleTimeString("en-KE", { hour12: false })}
              </span>
            )}
            <button
              onClick={load}
              title="Refresh now"
              className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <a
              href="/login"
              className="flex items-center gap-1 text-[10px] font-mono text-cyan-600 dark:text-cyan-500 hover:text-cyan-700 dark:hover:text-cyan-300 border border-cyan-300 dark:border-cyan-800 hover:border-cyan-400 dark:hover:border-cyan-600 px-2.5 py-1 rounded transition-colors"
            >
              Staff Login <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Weather bar ──────────────────────────────────────────────────────── */}
      {weather.length > 0 && (
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-1.5 flex items-center gap-4 overflow-x-auto">
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest shrink-0">Weather</span>
          {weather.map(w => (
            <div key={w.name} className="flex items-center gap-1.5 shrink-0">
              <span className="text-sm leading-none">{WMO_ICONS[w.code] ?? "🌡"}</span>
              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 font-semibold">{w.name}</span>
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">{w.temp?.toFixed(1)}°C</span>
              {w.rain > 0 && (
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">{w.rain}mm</span>
              )}
              <span className="text-[9px] font-mono text-slate-400 tabular-nums">{w.wind?.toFixed(0)}km/h</span>
              <span className="w-px h-3 bg-slate-200 dark:bg-slate-700 ml-1" />
            </div>
          ))}
        </div>
      )}

      {/* ── 3-column body ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Col 1: Map (50%) ─────────────────────────────────────────────── */}
        <div className="relative flex-1 min-w-0">
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1">
            <Globe className="w-3 h-3 text-cyan-600 dark:text-cyan-500" />
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              Live Risk Map
            </span>
          </div>

          {activeAlerts.length > 0 && (
            <div className="absolute bottom-6 left-3 z-10 flex items-center gap-1.5 bg-red-50/90 dark:bg-red-950/80 backdrop-blur-sm border border-red-300 dark:border-red-800 rounded px-2.5 py-1.5">
              <Zap className="w-3 h-3 text-red-500 dark:text-red-400" />
              <span className="text-[10px] font-mono text-red-600 dark:text-red-400">
                {activeAlerts.length} active alert{activeAlerts.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          <MapLibreMap
            focusCountiesGeoJSON={kenyaCounties}
            focusAreasGeoJSON={{ type: "FeatureCollection", features: [] }}
            riskByCounty={riskByCounty}
            areaRiskByKey={{}}
            selectedCounties={Object.keys(riskByCounty)}
            cameras={cameraMarkers}
            fieldUnits={[]}
            annotatedZones={{ type: "FeatureCollection", features: [] }}
            darkMode={isDark}
            showRadar={true}
          />
        </div>

        {/* ── Col 2: Alerts feed (25%) ──────────────────────────────────────── */}
        <div className="w-72 xl:w-80 shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              Active Alerts
            </span>
            {activeAlerts.length > 0 && (
              <span className="ml-auto text-[9px] font-mono bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 px-1.5 py-0.5 rounded">
                {activeAlerts.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 p-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
              ))
            ) : activeAlerts.length > 0 ? (
              activeAlerts.map((a) => <AlertCard key={a.id} alert={a} />)
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <AlertTriangle className="w-6 h-6 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-[11px] text-slate-400 dark:text-slate-600">No active alerts.</p>
              </div>
            )}
          </div>

          <SubscribeSection counties={counties} />
          <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 px-3 py-2 text-[9px] font-mono text-slate-400 text-center">
            Auto-refreshes every 60 s · Call 999 for emergencies
          </div>
        </div>

        {/* ── Col 3: Intel feed (25%) ───────────────────────────────────────── */}
        <div className="w-72 xl:w-80 shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <Radio className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              Latest Intel
            </span>
            {intelItems.length > 0 && (
              <span className="ml-auto text-[9px] font-mono bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded">
                {intelItems.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 p-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
              ))
            ) : intelItems.length > 0 ? (
              intelItems.map((item, i) => <IntelCard key={i} item={item} />)
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Radio className="w-6 h-6 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-[11px] text-slate-400 dark:text-slate-600">No verified intel at this time.</p>
              </div>
            )}
          </div>

          {/* Camera section */}
          {cameras.length > 0 && (
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                <Camera className="w-3 h-3 text-cyan-500" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Live Cameras
                </span>
                <span className="ml-auto text-[9px] font-mono text-emerald-600 dark:text-emerald-400">● {cameras.length}</span>
              </div>
              <div className="space-y-1.5 p-2 max-h-48 overflow-y-auto">
                {cameras.slice(0, 4).map((cam) => (
                  <div key={cam.id} className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                    <div className="aspect-video bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center">
                      {cam.stream_url ? (
                        <img src={cam.stream_url} alt={cam.name} className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                      )}
                    </div>
                    <div className="px-2 py-1 flex items-center justify-between">
                      <p className="text-[9px] font-mono text-slate-500 truncate">{cam.name}</p>
                      <span className="text-[8px] font-mono text-emerald-500 shrink-0">● LIVE</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 px-3 py-2 text-[9px] font-mono text-slate-400 text-center">
            © {new Date().getFullYear()} GOK — National Disaster Management Unit
          </div>
        </div>
      </div>
    </div>
  );
}
