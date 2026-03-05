import { useState, useEffect, useRef, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import useCounties from "../hooks/useCounties";
import useSubCountyRisk from "../hooks/useSubCountyRisk";
import LeafletMap from "../components/map/LeafletMap";
import kenyaCountiesRaw from "../data/ken_admin1.geojson?raw";
import kenyaAreasRaw from "../data/ken_admin2.geojson?raw";

const kenyaCounties = JSON.parse(kenyaCountiesRaw);
const kenyaAreas = JSON.parse(kenyaAreasRaw);

const FOCUS_COUNTY_NAMES = new Set(["Kisumu", "Siaya", "Homa Bay"]);
const focusCountiesGeoJSON = {
  ...kenyaCounties,
  features: kenyaCounties.features.filter((f) => FOCUS_COUNTY_NAMES.has(f.properties.adm1_name))
};
const focusAreasGeoJSON = {
  ...kenyaAreas,
  features: kenyaAreas.features.filter((f) => FOCUS_COUNTY_NAMES.has(f.properties.adm1_name))
};

/* ─── FONTS & GLOBALS ──────────────────────────────────────────────────────── */
const GLOBAL = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Syne:wght@600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
html,body{background:#f1f5fb;color:#0f172a;font-family:'Plus Jakarta Sans',sans-serif;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);border-radius:2px;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes rpulse{0%,100%{opacity:1}50%{opacity:0.55}}
@keyframes fring{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.5);opacity:0}}
@keyframes scan{0%{top:0}100%{top:100vh}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes tdot{0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}
@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes modalIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
.fadeUp{animation:fadeUp 0.35s ease both;}
.slideIn{animation:slideIn 0.3s ease both;}
.pulse{animation:rpulse 2.5s ease-in-out infinite;}
.flood-ring{animation:fring 3s ease-out infinite;}
.flood-ring-d{animation:fring 3s ease-out 1.2s infinite;}
`;

/* ─── PALETTE ───────────────────────────────────────────────────────────────── */
const P = {
  bg: "#f1f5fb", surface: "#ffffff", card: "#ffffff", card2: "#f7f9fc",
  border: "rgba(15,23,42,0.08)", border2: "rgba(37,99,235,0.18)",
  accent: "#2563eb", accent2: "#059669", warn: "#d97706", danger: "#dc2626", crit: "#7c3aed",
  text: "#0f172a", sub: "#475569", muted: "#94a3b8",
  low: "#059669", moderate: "#d97706", high: "#dc2626",
};

/* ─── REAL DATA MAPPING ───────────────────────────────────────────────────────────── */
// Helper to safely get mock-like data for real dynamic regions, considering an optional day offset
const getRegionData = (areaName, subCounties, dayOffset = 0, baseColor = P.accent) => {
  const backendArea = subCounties?.find(s => s.name === areaName);
  let baseProb = backendArea?.flood_probability || parseInt(Math.random() * 20 + 10);

  // Modulate probability based on day offset to simulate forecast
  let prob = baseProb;
  if (dayOffset !== 0) {
    // A simple curve modification
    const factor = dayOffset > 0 ? (1 + (dayOffset * 0.15)) : (1 + (dayOffset * 0.1));
    prob = Math.min(99, Math.max(5, Math.round(baseProb * factor)));
  }
  let statusStr = "Normal conditions.";
  let nLevel = "LOW";
  let cColor = P.accent2;

  if (prob > 75) { nLevel = "CRITICAL"; cColor = P.crit; statusStr = "Emergency protocols active."; }
  else if (prob > 60) { nLevel = "HIGH"; cColor = P.danger; statusStr = "High alert. Monitor closely."; }
  else if (prob > 40) { nLevel = "MODERATE"; cColor = P.warn; statusStr = "Watch active. Elevated risk."; }

  // Create deterministic mock strings based on actual probability if not available in strict DB fields
  const bts = Math.round(prob * 0.45);

  return {
    name: areaName,
    raw: backendArea,
    level: nLevel,
    prob: prob,
    color: cColor,
    displaced: `${Math.round(prob * 0.82)}K`,
    econ: `$${(prob * 0.15).toFixed(1)}M`,
    rain: `${Math.round(prob * 1.8)}mm`,
    water: `${(prob * 0.03).toFixed(1)}m`,
    pop: `${100 + prob * 2}K`,
    poverty: `${Math.min(85, prob + 15)}%`,
    health: Math.max(3, Math.round(prob / 8)),
    elderly: `${Math.min(30, 10 + prob / 5)}%`,
    risk: prob,
    ready: Math.max(20, 95 - prob),
    vol: Math.max(30, 85 - prob / 2),
    boats: bts,
    gap: prob > 50 ? `-${Math.round(prob / 3)}% GAP` : "+OK",
    sub: `Verified Flood Zone`,
    status: statusStr,
    prepNote: prob > 60 ? "⚠ Underprepared" : "✓ Adequate",
    conf: Math.max(40, 95 - prob / 3),
    esc: prob > 60 ? `↑ Escalation prob: ${Math.round(prob * 0.8)}% by Day 3` : "→ Stable",
    vuln: (prob / 10).toFixed(1),
  };
};

const CAL_DATA = {
  nyando: [0, 0, 12, 15, 8, 22, 31, 45, 52, 48, 61, 68, 72, 80, 91, 82, 74, 68, 55, 62, 84, 91, 88, 76, 58, 64, 82, 62, 44, 28, 38],
  kisumu: [0, 0, 8, 12, 6, 18, 24, 38, 44, 41, 52, 58, 65, 72, 82, 75, 68, 60, 48, 55, 76, 82, 78, 68, 52, 58, 74, 56, 38, 22, 32],
  homabay: [0, 0, 6, 10, 4, 14, 20, 32, 38, 35, 46, 52, 58, 65, 74, 68, 62, 55, 42, 48, 68, 74, 70, 61, 46, 52, 66, 50, 34, 18, 26],
  nandi: [0, 0, 4, 6, 3, 10, 14, 22, 28, 25, 34, 40, 46, 52, 58, 52, 48, 42, 32, 38, 52, 58, 55, 46, 34, 40, 52, 40, 26, 14, 20],
  siaya: [0, 0, 3, 5, 2, 8, 12, 18, 22, 20, 28, 34, 38, 44, 45, 40, 36, 32, 24, 30, 42, 45, 43, 36, 26, 32, 42, 32, 20, 10, 16],
  kakamega: [0, 0, 2, 3, 1, 5, 8, 12, 15, 13, 18, 22, 24, 28, 18, 15, 13, 10, 8, 12, 20, 18, 15, 12, 9, 12, 16, 12, 7, 4, 6],
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ─── REPLAY SERIES ─────────────────────────────────────────────────────────── */
function buildReplaySeries(startDateStr, d) {
  if (!d) return [];
  const peak = d.prob;
  const maxDisp = parseInt(String(d.displaced).replace("K", "")) * 1000;
  const maxWater = parseFloat(d.water);
  const maxRain = parseInt(d.rain);
  const days = 14;
  return Array.from({ length: days }, (_, i) => {
    const t = i / (days - 1);
    const peakT = 0.35;
    const probCurve = peak * Math.exp(-Math.pow((t - peakT) * 3.5, 2)) + 5;
    const dispCurve = i <= 4 ? maxDisp * 0.9 * (i / 4) * Math.min(1, probCurve / 90) :
      maxDisp * 0.9 * (1 - (i - 4) / 12) * 0.85;
    const waterCurve = i <= 4 ? maxWater * (i / 4) * 1.05 : maxWater * (1 - (i - 4) / 14) * 0.9;
    const rainCurve = i <= 4 ? maxRain * (0.3 + i * 0.175) : maxRain * (1 - (i - 4) * 0.07);
    const lag = i === 1 ? 9.2 : i === 2 ? 9.2 : i === 3 ? 9.2 : 0;
    const label = i === 0 ? "Day 1" : i === 4 ? "Peak" : i === 7 ? "Day 8" : i === 13 ? "Day 14" : `Day ${i + 1} `;
    let date = "";
    if (startDateStr) {
      const base = new Date(startDateStr);
      base.setDate(base.getDate() + i);
      date = base.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    }
    return {
      day: i + 1, label: date || label,
      prob: Math.round(Math.max(5, Math.min(96, probCurve))),
      displaced: Math.max(0, Math.round(dispCurve / 100) * 100),
      waterLevel: Math.round(Math.max(0.3, waterCurve) * 100) / 100,
      rainfall: Math.round(Math.max(5, rainCurve)),
      lag: lag,
      responseScore: Math.round(Math.max(10, 100 - probCurve * 0.7 - lag * 2)),
    };
  });
}

/* ─── AI ANSWERS ────────────────────────────────────────────────────────────── */
const AI_ANSWERS = {
  hospitals: `3 hospitals at < b style = "color:${P.danger}" > high risk</b >: Ahero Sub - County(82 %), Awasi Health Centre(78 %), Muhoroni District(71 %).Recommend patient transfers start within < b > 4hrs</b > — helicopter pad at Ahero is operational.`,
  "2018": `2018 lesson: Kisumu - Ahero road closed Day 3 — 18hr delay.Bridge failed at 2.1m.Current level: 2.4m. < b style = "color:${P.danger}" > Closure imminent.</b > Pre - stock supplies before road access is cut.`,
  boats: `At 85 %: <b style="color:${P.accent2}">42 rescue boats</b> needed.Gap of 34. Request < b > Kenya Navy + Red Cross fleet</b > now — 6–8hr lead time.`,
  schools: `< b > 14 schools</b > in flood zones.Immediate closure: Awasi Primary(1, 200), Nyando Girls(980), Ahero Boys(1, 100). < b style = "color:${P.accent2}" > ~8, 400 students</b >.County Education alerted.`,
  bridges: `< b style = "color:${P.danger}" > Nyando Bridge CRITICAL</b > — at 2.4m vs 2.1m failure threshold.Recommend closing NOW — ~3hrs to breach.`,
  timeline: `< b style = "color:${P.danger}" > NOW:</b > Deploy boats, close bridge < br > <b>+4hrs:</b> Evacuate 3 villages < br > <b>+8hrs:</b> Close Kisumu - Ahero road < br > <b style="color:${P.accent2}">+24hrs:</b> Red Cross full deployment`,
};

/* ─── UTILITY ───────────────────────────────────────────────────────────────── */
const riskBg = p => p >= 75 ? "rgba(124,58,237,0.1)" : p >= 60 ? "rgba(220,38,38,0.08)" : p >= 35 ? "rgba(217,119,6,0.09)" : "rgba(5,150,105,0.07)";
const riskStroke = p => p >= 75 ? P.crit : p >= 60 ? P.danger : p >= 35 ? P.warn : P.accent2;
const dayBg = p => p >= 75 ? "rgba(124,58,237,0.12)" : p >= 50 ? "rgba(220,38,38,0.08)" : p >= 20 ? "rgba(217,119,6,0.09)" : "rgba(5,150,105,0.07)";

function Card({ children, style = {}, className = "" }) {
  return (
    <div className={className} style={{ background: P.card, border: `1px solid ${P.border} `, borderRadius: 12, boxShadow: "0 1px 6px rgba(15,23,42,0.06)", ...style }}>
      {children}
    </div>
  );
}

function Label({ children, style = {} }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: P.muted, ...style }}>{children}</div>;
}

function Badge({ label, color }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: `${color} 15`, color, border: `1px solid ${color} 30` }}>{label}</span>;
}

function BarRow({ label, value, color }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3, color: P.sub }}>
        <span>{label}</span><span style={{ color, fontWeight: 600 }}>{value}%</span>
      </div>
      <div style={{ height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}% `, background: color, borderRadius: 3, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}

/* ─── TOAST ─────────────────────────────────────────────────────────────────── */
function Toast({ msg, color }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: P.card, border: `1px solid ${P.border2} `, borderRadius: 10, padding: "11px 16px", fontSize: 12, maxWidth: 300, boxShadow: "0 8px 32px rgba(0,0,0,0.1)", pointerEvents: "none", transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", transform: msg ? "translateY(0)" : "translateY(120px)", opacity: msg ? 1 : 0 }}>
      <span style={{ color }} dangerouslySetInnerHTML={{ __html: msg || "" }} />
    </div>
  );
}

/* ─── SUBMIT REPORT MODAL ───────────────────────────────────────────────────── */
function SubmitModal({ type, onClose, onToast }) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const titles = { photo: "📷 Submit Photo Report", voice: "🎤 Submit Voice Note", water: "📏 Submit Water Reading" };
  const colors = { photo: P.accent, voice: P.accent2, water: P.warn };

  function submit() {
    setSubmitted(true);
    setTimeout(() => { onToast(`✅ Report submitted & sent for AI validation`, colors[type]); onClose(); }, 1200);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: P.card, borderRadius: 16, padding: 28, width: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.15)", animation: "modalIn 0.25s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 17, fontWeight: 700 }}>{titles[type]}</div>
          <button onClick={onClose} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 14, color: P.sub }}>✕</button>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: P.accent2 }}>Sending for AI validation…</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {type === "photo" && <>
              <div>
                <Label style={{ marginBottom: 6 }}>Upload Photo</Label>
                <div onClick={() => set("file", "photo_001.jpg")} style={{ border: `2px dashed ${form.file ? P.accent2 : P.border2} `, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: form.file ? `rgba(5, 150, 105, 0.04)` : "rgba(0,0,0,0.01)", transition: "all 0.2s" }}>
                  {form.file ? <><div style={{ fontSize: 24, marginBottom: 4 }}>📎</div><div style={{ fontSize: 12, color: P.accent2, fontWeight: 600 }}>{form.file}</div></> : <><div style={{ fontSize: 28, marginBottom: 6 }}>📷</div><div style={{ fontSize: 12, color: P.muted }}>Click to select photo</div></>}
                </div>
              </div>
              <div><Label style={{ marginBottom: 5 }}>Description</Label><textarea onChange={e => set("desc", e.target.value)} placeholder="Describe what you're seeing…" style={{ width: "100%", height: 72, padding: "8px 10px", border: `1px solid ${P.border2} `, borderRadius: 8, fontFamily: "Plus Jakarta Sans,sans-serif", fontSize: 12, color: P.text, background: "rgba(0,0,0,0.02)", resize: "none", outline: "none" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><Label style={{ marginBottom: 5 }}>Latitude</Label><input onChange={e => set("lat", e.target.value)} placeholder="-0.1234" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${P.border2} `, borderRadius: 8, fontSize: 12, color: P.text, outline: "none", background: "rgba(0,0,0,0.02)" }} /></div>
                <div><Label style={{ marginBottom: 5 }}>Longitude</Label><input onChange={e => set("lng", e.target.value)} placeholder="34.5678" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${P.border2} `, borderRadius: 8, fontSize: 12, color: P.text, outline: "none", background: "rgba(0,0,0,0.02)" }} /></div>
              </div>
            </>}

            {type === "voice" && <>
              <div><Label style={{ marginBottom: 5 }}>Location / Area</Label><input onChange={e => set("loc", e.target.value)} placeholder="e.g. Nyando Bridge area" style={{ width: "100%", padding: "9px 12px", border: `1px solid ${P.border2} `, borderRadius: 8, fontSize: 12, color: P.text, outline: "none", background: "rgba(0,0,0,0.02)" }} /></div>
              <div>
                <Label style={{ marginBottom: 6 }}>Record Voice Note</Label>
                <div onClick={() => set("recorded", !form.recorded)} style={{ border: `1px solid ${form.recorded ? P.accent2 : P.border} `, borderRadius: 10, padding: "20px", textAlign: "center", cursor: "pointer", background: form.recorded ? `rgba(5, 150, 105, 0.05)` : "rgba(0,0,0,0.01)", transition: "all 0.2s" }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>{form.recorded ? "⏹" : "🎙"}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: form.recorded ? P.accent2 : P.muted }}>{form.recorded ? "Recording — tap to stop (0:08)" : "Tap to start recording"}</div>
                </div>
              </div>
              <div><Label style={{ marginBottom: 5 }}>Written Summary (optional)</Label><textarea onChange={e => set("summary", e.target.value)} placeholder="Brief description of conditions…" style={{ width: "100%", height: 64, padding: "8px 10px", border: `1px solid ${P.border2} `, borderRadius: 8, fontFamily: "Plus Jakarta Sans,sans-serif", fontSize: 12, color: P.text, background: "rgba(0,0,0,0.02)", resize: "none", outline: "none" }} /></div>
            </>}

            {type === "water" && <>
              <div><Label style={{ marginBottom: 5 }}>Gauge Name / Location</Label><input onChange={e => set("gauge", e.target.value)} placeholder="e.g. Nyando River Gauge" style={{ width: "100%", padding: "9px 12px", border: `1px solid ${P.border2} `, borderRadius: 8, fontSize: 12, color: P.text, outline: "none", background: "rgba(0,0,0,0.02)" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><Label style={{ marginBottom: 5 }}>Water Level (m)</Label><input type="number" step="0.01" onChange={e => set("level", e.target.value)} placeholder="e.g. 2.38" style={{ width: "100%", padding: "9px 12px", border: `1px solid ${P.border2} `, borderRadius: 8, fontSize: 12, color: P.text, outline: "none", background: "rgba(0,0,0,0.02)" }} /></div>
                <div><Label style={{ marginBottom: 5 }}>Time of Reading</Label><input type="time" onChange={e => set("time", e.target.value)} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${P.border2} `, borderRadius: 8, fontSize: 12, color: P.text, outline: "none", background: "rgba(0,0,0,0.02)" }} /></div>
              </div>
              <div><Label style={{ marginBottom: 5 }}>Trend</Label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["↑ Rising", "→ Stable", "↓ Falling"].map(t => (
                    <button key={t} onClick={() => set("trend", t)} style={{ flex: 1, padding: "8px", border: `1px solid ${form.trend === t ? P.warn : P.border} `, borderRadius: 8, background: form.trend === t ? `rgba(217, 119, 6, 0.08)` : "none", color: form.trend === t ? P.warn : P.sub, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Plus Jakarta Sans,sans-serif" }}>{t}</button>
                  ))}
                </div>
              </div>
              <div><Label style={{ marginBottom: 5 }}>Notes</Label><input onChange={e => set("notes", e.target.value)} placeholder="Any relevant observations…" style={{ width: "100%", padding: "9px 12px", border: `1px solid ${P.border2} `, borderRadius: 8, fontSize: 12, color: P.text, outline: "none", background: "rgba(0,0,0,0.02)" }} /></div>
            </>}

            <button onClick={submit} style={{ background: colors[type], border: "none", borderRadius: 9, padding: "11px", color: "#fff", fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
              Submit Report →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── MAP SVG ───────────────────────────────────────────────────────────────── */
function MapSVG({ region, onRegion, onToast }) {
  const [viewBox, setViewBox] = useState("0 0 600 460");
  const zoomed = viewBox !== "0 0 600 460";

  useEffect(() => {
    const d = REGIONS[region];
    setViewBox(`${d.svx - 155} ${d.svy - 115} 310 230`);
  }, [region]);

  function reset() { setViewBox("0 0 600 460"); onToast("🗺 Map reset — full view", P.accent); }

  const regionPaths = [
    { id: "nyando", path: "M230 175 L330 155 L375 215 L355 285 L275 305 L225 265 Z" },
    { id: "kisumu", path: "M125 205 L230 175 L225 265 L165 285 L105 255 Z" },
    { id: "homabay", path: "M155 305 L225 265 L275 305 L265 365 L195 395 L145 355 Z" },
    { id: "nandi", path: "M330 155 L425 145 L445 205 L395 255 L355 285 L375 215 Z" },
    { id: "siaya", path: "M425 145 L515 135 L535 215 L475 255 L445 205 Z" },
    { id: "kakamega", path: "M105 155 L195 145 L230 175 L125 205 Z" },
  ];
  const nodes = [
    { id: "nyando", cx: 295, cy: 240, r: 7, or: 20 }, { id: "kisumu", cx: 185, cy: 255, r: 5, or: 14 },
    { id: "homabay", cx: 215, cy: 345, r: 4.5, or: 12 }, { id: "nandi", cx: 385, cy: 196, r: 4, or: 11 },
    { id: "siaya", cx: 148, cy: 185, r: 4, or: 10 }, { id: "kakamega", cx: 155, cy: 162, r: 3.5, or: 9 },
  ];

  return (
    <div style={{ flex: 1, position: "relative", background: "#e8eef8", overflow: "hidden", minHeight: 320 }}>
      <svg viewBox={viewBox} style={{ width: "100%", height: "100%", position: "absolute", inset: 0, transition: "all 0.55s cubic-bezier(0.4,0,0.2,1)", cursor: "crosshair" }}>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <radialGradient id="lakeglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(96,165,250,0.3)" /><stop offset="100%" stopColor="rgba(59,130,246,0.1)" />
          </radialGradient>
        </defs>
        <ellipse cx="175" cy="340" rx="115" ry="88" fill="url(#lakeglow)" stroke="rgba(59,130,246,0.35)" strokeWidth="1.2" />
        <text x="175" y="344" textAnchor="middle" fill="rgba(37,99,235,0.55)" fontSize="10" fontFamily="Syne,sans-serif" fontWeight="700">Lake Victoria</text>
        {region === "nyando" && <>
          <circle cx="295" cy="240" r="30" fill="none" stroke="rgba(124,58,237,0.45)" strokeWidth="1.5" className="flood-ring" />
          <circle cx="295" cy="240" r="30" fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth="1" className="flood-ring-d" />
        </>}
        {regionPaths.map(({ id, path }) => {
          const d = REGIONS[id]; const active = id === region;
          return <path key={id} d={path} fill={riskBg(d.prob)} stroke={riskStroke(d.prob)} strokeWidth={active ? 2.2 : 1.2} style={{ cursor: "pointer", filter: active ? "brightness(1.12)" : "none", transition: "all 0.25s" }} onClick={() => onRegion(id)} className={active ? "pulse" : ""} />;
        })}
        <path d="M295 240 Q275 285 195 315 Q185 335 195 365" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="2" strokeDasharray="5,3" />
        <path d="M295 240 Q315 265 305 295" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="1.5" strokeDasharray="4,3" />
        {nodes.map(({ id, cx, cy, r, or }) => {
          const d = REGIONS[id]; const active = id === region;
          return (
            <g key={id} onClick={() => onRegion(id)} style={{ cursor: "pointer" }}>
              <circle cx={cx} cy={cy} r={or} fill={d.color} opacity={active ? 0.12 : 0.06} />
              <circle cx={cx} cy={cy} r={active ? r + 2 : r} fill={d.color} stroke="white" strokeWidth="1.8" filter="url(#glow)" />
              <text x={cx} y={cy - or - 3} textAnchor="middle" fontSize="9.5" fontFamily="Syne,sans-serif" fontWeight="700" fill={active ? d.color : "rgba(15,23,42,0.7)"}>{d.name.split(" ")[0]}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 5 }}>
        {["Risk", "Vulnerability", "Resources", "Displacement"].map(l => (
          <button key={l} onClick={() => onToast(`Layer: ${l} `, P.accent)} style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: `1px solid ${P.border} `, borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: P.sub, cursor: "pointer" }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: `1px solid ${P.border} `, borderRadius: 8, padding: "6px 12px", display: "flex", gap: 12 }}>
        {[[P.crit, "Critical"], [P.danger, "High"], [P.warn, "Moderate"], [P.accent2, "Low"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: P.sub }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />{l}
          </div>
        ))}
      </div>
      {zoomed && <button onClick={reset} style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(255,255,255,0.92)", border: `1px solid ${P.border} `, borderRadius: 7, padding: "5px 10px", fontSize: 10, color: P.sub, cursor: "pointer" }}>⊖ Reset</button>}
    </div>
  );
}

function Calendar({ region, onToast, selectedDayIndex, setSelectedDayIndex }) {
  const [month, setMonth] = useState(2);
  const [year, setYear] = useState(2025);
  const TODAY = 21;
  const probs = CAL_DATA[region] || CAL_DATA.nyando;
  const offset = month === 2 && year === 2025 ? 6 : new Date(year, month, 1).getDay();
  const dim = new Date(year, month + 1, 0).getDate();

  return (
    <div style={{ borderTop: `1px solid ${P.border} `, padding: "14px 18px", background: P.surface }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700 }}>Crisis Heat Calendar</div>
          <div style={{ fontSize: 10, color: P.muted, marginTop: 1 }}>
            Historical · AI Forecast — <span style={{ color: P.accent, fontWeight: 600 }}>{region}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 5, background: `rgba(37, 99, 235, 0.07)`, color: P.accent, border: `1px solid rgba(37, 99, 235, 0.15)` }}>{MONTHS[month]} {year}</span>
          {[-1, 1].map(dir => (
            <button key={dir} onClick={() => { let m = month + dir, y = year; if (m > 11) { m = 0; y++; } if (m < 0) { m = 11; y--; } setMonth(m); setYear(y); setSelectedDayIndex(-1); }} style={{ background: P.card2, border: `1px solid ${P.border} `, borderRadius: 5, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: P.sub, cursor: "pointer" }}>{dir < 0 ? "‹" : "›"}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 9, fontWeight: 600, color: P.muted, padding: "2px 0" }}>{d}</div>)}
        {Array(offset).fill(null).map((_, i) => <div key={"e" + i} />)}
        {Array(dim).fill(null).map((_, i) => {
          const d = i + 1, p = probs[i] || 0;
          const isFore = d > TODAY, isTod = d === TODAY && month === 2 && year === 2025, isSel = d === selectedDayIndex;
          const rc = riskStroke(p);
          return (
            <div key={d} onClick={() => { setSelectedDayIndex(d); onToast(`📅 ${MONTHS[month]} ${d} — Maps & Data Updated`, rc); }}
              style={{ aspectRatio: "1", borderRadius: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: dayBg(p), border: `1px ${isFore ? "dashed" : "solid"} ${isSel ? "rgba(15,23,42,0.5)" : isTod ? P.accent : "transparent"} `, transform: isSel ? "scale(1.08)" : "none", zIndex: isSel ? 2 : "auto", transition: "all 0.15s" }}>
              <div style={{ fontSize: 9.5, fontWeight: 600, lineHeight: 1 }}>{d}</div>
              <div style={{ fontSize: 7, marginTop: 1, color: rc, fontWeight: 600 }}>{p}%</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        {[["rgba(5,150,105,0.15)", "Low"], ["rgba(217,119,6,0.15)", "Moderate"], ["rgba(220,38,38,0.12)", "High"], ["rgba(124,58,237,0.15)", "Critical"]].map(([bg, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: P.sub }}><div style={{ width: 9, height: 9, borderRadius: 2, background: bg, border: `1px solid rgba(0, 0, 0, 0.07)` }} />{l}</div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 9, color: P.muted, display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 0, borderTop: `1px dashed ${P.muted} ` }} />Forecast</div>
      </div>
    </div>
  );
}

/* ─── AI PANEL ──────────────────────────────────────────────────────────────── */
function AIPanel({ region, onToast }) {
  const [msgs, setMsgs] = useState([
    { role: "system", msg: `CrisisLens Intelligence Engine online.Real - time analysis for ${region}.` },
  ]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef(null);

  const targetArea = region;

  useEffect(() => { if (ref.current) ref.current.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  const sendMessage = async (msgText) => {
    const userMsg = msgText || input;
    if (!userMsg.trim() || typing) return;

    setInput("");
    const newMsgs = [...msgs, { role: "user", msg: userMsg }];
    setMsgs(newMsgs);
    setTyping(true);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer KEY_HERE"
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: `You are CrisisLens, an elite flood crisis intelligence analyst for Western Kenya(focusing on ${targetArea}).You have deep expertise in flood forecasting, humanitarian logistics, and disaster response.Be concise, tactical, and data - driven.Use bullet points and numbers.` },
            ...newMsgs.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.msg }))
          ]
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Intelligence engine processing...";
      setMsgs([...newMsgs, { role: "assistant", msg: reply }]);
      if (onToast) onToast("AI analysis complete", P.accent2);
    } catch {
      setMsgs([...newMsgs, { role: "assistant", msg: "⚠️ Intelligence engine offline. Check network connection." }]);
    }
    setTyping(false);
  };

  return (
    <div style={{ padding: 14, borderBottom: `1px solid ${P.border} `, display: "flex", flexDirection: "column", height: 350 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear - gradient(135deg, ${P.accent}, ${P.accent2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🧠</div>
        <div><div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700 }}>CrisisLens AI</div><div style={{ fontSize: 10, color: P.accent2 }}>Deep Analyst Mode</div></div>
        <div style={{ marginLeft: "auto", width: 6, height: 6, background: P.accent2, borderRadius: "50%", animation: "blink 2s infinite" }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
        {msgs.map((m, i) => {
          if (m.role === "system") return null;
          return (
            <div key={i} style={{ fontSize: 11, lineHeight: 1.65, padding: "8px 11px", borderRadius: m.role === "assistant" ? "8px 8px 8px 2px" : "8px 8px 2px 8px", background: m.role === "assistant" ? `rgba(37, 99, 235, 0.05)` : P.card2, border: `1px solid ${m.role === "assistant" ? `rgba(37,99,235,0.1)` : `rgba(0,0,0,0.06)`} `, color: m.role === "user" ? P.sub : P.text, whiteSpace: "pre-wrap" }}>
              {m.msg}
            </div>
          );
        })}
        {typing && <div style={{ fontSize: 11, padding: "8px 11px", borderRadius: "8px 8px 8px 2px", background: `rgba(37, 99, 235, 0.05)`, border: `1px solid rgba(37, 99, 235, 0.1)` }}><span style={{ display: "inline-flex", gap: 3 }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 4, height: 4, background: P.accent, borderRadius: "50%", display: "inline-block", animation: "tdot 1.2s infinite", animationDelay: `${i * 0.2} s` }} />)}</span></div>}
        <div ref={ref} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, mb: 1, flexShrink: 0 }}>
        {[["hospitals", "Hospitals at risk?"], ["2018", "2018 lessons?"], ["boats", "Boats at 85%?"], ["bridges", "Bridge failures?"]].map(([k, l]) => (
          <button key={k} onClick={() => sendMessage(l)} style={{ fontSize: 9.5, padding: "3px 8px", borderRadius: 5, border: `1px solid ${P.border2} `, color: P.sub, cursor: "pointer", background: "none", fontFamily: "Plus Jakarta Sans,sans-serif", marginBottom: 6 }}>{l}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Ask the analyst…" style={{ flex: 1, background: P.card2, border: `1px solid ${P.border2} `, borderRadius: 7, padding: "7px 10px", color: P.text, fontSize: 11, fontFamily: "Plus Jakarta Sans,sans-serif", outline: "none" }} />
        <button disabled={typing || !input.trim()} onClick={() => sendMessage()} style={{ background: (typing || !input.trim()) ? P.border2 : P.accent, border: "none", borderRadius: 7, padding: "7px 12px", color: "#fff", cursor: (typing || !input.trim()) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}>→</button>
      </div>
    </div>
  );
}

/* ─── SIGNAL CHART ──────────────────────────────────────────────────────────── */
function SignalChart({ prob }) {
  // Generate signal bars predictably based on the region's current risk probability
  const sigs = Array.from({ length: 10 }).map((_, i) => {
    const t = i / 9;
    const peak = Math.max(20, prob);
    const r = Math.min(100, (peak * 1.5) * Math.pow(t, 2) + Math.random() * 15);
    const s = Math.min(100, peak * Math.pow(t, 1.5) + Math.random() * 10);
    const n = Math.max(0, 100 - (peak * Math.pow(t, 1.2)) - Math.random() * 20);
    return { r, s, n };
  });

  return (
    <div style={{ height: 64, display: "flex", alignItems: "flex-end", gap: 2, margin: "7px 0 3px" }}>
      {sigs.map((s, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column-reverse", gap: 1, height: "100%" }}>
          {[[s.r / 1.6, P.accent], [s.s / 3, P.warn], [(100 - s.n) / 3, P.accent2]].map(([h, c], j) => (
            <div key={j} style={{ width: "100%", height: `${h}% `, minHeight: 2, background: c, borderRadius: "2px 2px 0 0", opacity: 0.75 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Wrapping LeafletMap so it receives the right context data from backend
const FIXED_COUNTIES = ["Kisumu", "Siaya", "Homa Bay"];

function LeafletMapPlaceholder({ region, setRegion, subCounties, dayOffset }) {
  const { data: allCounties } = useCounties();
  const [mapInstance, setMapInstance] = useState(null);

  const counties = useMemo(() => {
    if (!allCounties) return [];
    return allCounties.filter(c => FOCUS_COUNTY_NAMES.has(c.name));
  }, [allCounties]);

  const riskByCounty = useMemo(() => {
    return counties.reduce((acc, county) => {
      acc[county.name] = { ...county, riskPercent: county.flood_probability, riskType: "flood" };
      return acc;
    }, {});
  }, [counties]);

  const robustAreaRiskByKey = useMemo(() => {
    const acc = {};
    if (!subCounties) return acc;
    kenyaAreas.features.forEach(f => {
      const areaName = f.properties.adm2_name;
      const countyName = f.properties.adm1_name;
      const backendArea = subCounties.find(s => s.name === areaName);
      if (backendArea) {
        // Calculate the risk for the map polygons considering the dayOffset
        const dynamicData = getRegionData(areaName, subCounties, dayOffset);
        acc[`${countyName}::${areaName}`] = { ...backendArea, riskPercent: dynamicData.prob, riskType: "flood" };
      }
    });
    return acc;
  }, [subCounties]);

  return (
    <LeafletMap
      focusCountiesGeoJSON={focusCountiesGeoJSON}
      focusAreasGeoJSON={focusAreasGeoJSON}
      riskByCounty={riskByCounty}
      areaRiskByKey={robustAreaRiskByKey}
      onCountyClick={() => { }}
      onAreaClick={(county, areaName) => { setRegion(areaName); }}
      selectedCounties={FIXED_COUNTIES}
      selectedArea={region}
      mapInstance={mapInstance}
      setMapInstance={setMapInstance}
    />
  );
}

/* ─── OPERATIONS PAGE ───────────────────────────────────────────────────────── */
function PageOperations({ region, setRegion, onToast, d, subCounties, filteredAreas, dayOffset, selectedDayIndex, setSelectedDayIndex }) {

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* ── LEFT SIDEBAR ── */}
      <div style={{ width: 262, flexShrink: 0, borderRight: `1px solid ${P.border} `, overflowY: "auto", height: "calc(100vh - 58px)", position: "sticky", top: 58, background: P.surface }}>
        {/* Alert escalation */}
        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${P.border} ` }}>
          <Label style={{ marginBottom: 9 }}>Alert Escalation</Label>
          {[[P.crit, "Emergency Mode", "All agencies activated", 2], [P.danger, "Action Required", "Deploy response teams", 5], [P.warn, "Alert", "Elevated monitoring", 8], [P.accent2, "Watch", "Passive monitoring", 12]].map(([c, nm, sub, cnt]) => (
            <div key={nm} onClick={() => onToast(`${nm} — ${cnt} zones`, c)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: `${c}09`, border: `1px solid ${c} 22`, cursor: "pointer", marginBottom: 3, transition: "all 0.15s" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0, boxShadow: `0 0 5px ${c} 55` }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 11.5, fontWeight: 600, color: c }}>{nm}</div><div style={{ fontSize: 9.5, color: P.sub, marginTop: 1 }}>{sub}</div></div>
              <div style={{ fontSize: 10, padding: "1px 7px", borderRadius: 8, background: `${c} 15`, fontWeight: 700, color: c }}>{cnt}</div>
            </div>
          ))}
        </div>

        {/* Prep delta */}
        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${P.border} ` }}>
          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 11 }}>
              <div><div style={{ fontFamily: "Syne,sans-serif", fontSize: 12.5, fontWeight: 700 }}>{d.name}</div><div style={{ fontSize: 9.5, color: P.muted, marginTop: 1 }}>Preparedness Delta</div></div>
              <Badge label={d.gap} color={P.danger} />
            </div>
            <BarRow label="Flood Risk" value={d.risk} color={P.danger} />
            <BarRow label="Resource Readiness" value={d.ready} color={P.warn} />
            <BarRow label="Volunteer Coverage" value={d.vol} color={P.warn} />
            <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${P.border} `, fontSize: 10, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: P.danger }}>{d.prepNote}</span>
              <span style={{ color: P.muted }}>+{d.boats} boats needed</span>
            </div>
          </Card>
        </div>

        {/* Regions */}
        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${P.border} ` }}>
          <Label style={{ marginBottom: 9 }}>Focus Regions</Label>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {filteredAreas.filter((a, i) => i < 15).map((area) => {
              const p_desc = getRegionData(area.name, subCounties, dayOffset);
              return (
                <button key={area.id} onClick={() => setRegion(area.name)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, cursor: "pointer", border: `1px solid ${region === area.name ? p_desc.color + "33" : P.border} `, background: region === area.name ? `${p_desc.color}08` : "none", width: "100%", fontFamily: "Plus Jakarta Sans,sans-serif", color: P.text, marginBottom: 2, transition: "all 0.15s" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: p_desc.color, marginRight: 8, flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, flex: 1, textAlign: "left", fontWeight: region === area.name ? 600 : 400 }}>{area.name}</span>
                  <Badge label={`${p_desc.prob}% `} color={p_desc.color} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Confidence */}
        <div style={{ padding: "14px 14px 10px" }}>
          <Card style={{ padding: 13 }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Lead-Time Confidence</div>
            <div style={{ fontSize: 10, color: P.muted, marginBottom: 7 }}>5-Day Forecast Window</div>
            <div style={{ height: 22, background: "rgba(0,0,0,0.05)", borderRadius: 5, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${d.conf}% `, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: P.accent2, background: `linear - gradient(90deg, rgba(5, 150, 105, 0.2), rgba(217, 119, 6, 0.25))`, transition: "width 0.7s ease" }}>{d.conf}%</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: P.muted }}>{100 - d.conf}% uncertain</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: P.muted, marginTop: 3 }}><span>Day 1</span><span>Day 3</span><span>Day 5</span></div>
            <div style={{ fontSize: 9.5, color: P.warn, marginTop: 6 }}>{d.esc}</div>
          </Card>
        </div>
      </div>

      {/* ── CENTER ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top metrics bar */}
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${P.border} `, background: P.surface, position: "sticky", top: 58, zIndex: 20, boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 19, fontWeight: 800, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                {d.name}
                {dayOffset !== 0 && <span style={{ fontSize: 12, backgroundColor: P.accent2, color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Forecast T{dayOffset > 0 ? "+" + dayOffset : dayOffset}</span>}
                <Badge label={`${d.level} ${d.prob}% `} color={d.color} />
              </div>
              <div style={{ fontSize: 10, color: P.muted, marginTop: 2 }}>{d.sub} · Updated just now</div>
            </div>
            {/* 2×2 metric grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[[d.displaced, P.danger, "Est. Displaced"], [d.econ, P.warn, "Econ. Impact"], [d.rain, P.accent2, "24h Rainfall"], [d.water, P.accent, "Water Level"]].map(([v, c, l]) => (
                <div key={l} style={{ background: P.card2, border: `1px solid ${P.border} `, borderRadius: 8, padding: "7px 12px", textAlign: "center", minWidth: 90 }}>
                  <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 800, color: c }}>{v}</div>
                  <div style={{ fontSize: 9, color: P.muted, marginTop: 1, fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, position: "relative", minHeight: 320, zIndex: 0, padding: 12 }}>
          {/* We must fetch subcounties and counties in the parent to pass down correctly, so we'll do that at the root level ReportsPage */}
          <div style={{ height: "100%", width: "100%", borderRadius: 12, overflow: "hidden", border: `1px solid ${P.border} ` }}>
            <LeafletMapPlaceholder region={region} setRegion={setRegion} subCounties={subCounties} dayOffset={dayOffset} />
          </div>
        </div>
        <Calendar region={region} onToast={onToast} selectedDayIndex={selectedDayIndex} setSelectedDayIndex={setSelectedDayIndex} />
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ width: 296, flexShrink: 0, borderLeft: `1px solid ${P.border} `, overflowY: "auto", height: "calc(100vh - 58px)", position: "sticky", top: 58, background: P.surface }}>
        <AIPanel region={region} onToast={onToast} />

        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${P.border} ` }}>
          <Label style={{ marginBottom: 5 }}>Signal Correlation</Label>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 11, fontWeight: 700, marginBottom: 1 }}>Rainfall × NDVI × Soil Moisture</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: P.muted, marginBottom: 1 }}><span>10d ago</span><span>Today</span></div>
          <SignalChart prob={d.prob} />
          <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
            {[[P.accent, "Rain"], [P.warn, "Soil"], [P.accent2, "NDVI"]].map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 8.5, color: P.muted }}><div style={{ width: 7, height: 7, borderRadius: 2, background: c }} />{l}</div>
            ))}
          </div>
        </div>

        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${P.border} ` }}>
          <Label style={{ marginBottom: 8 }}>Auto Protocols <span style={{ color: P.danger, fontSize: 9, fontWeight: 700, marginLeft: 4 }}>TRIGGERED &gt;75%</span></Label>
          {[["🚨", "Yellow Alert Issued", "All county officers notified", "Done", P.accent2], ["🏫", "Notify 14 Schools", "Awasi, Ahero, Muhoroni zones", "Done", P.accent2], ["💊", "Pre-position 500 Kits", "Purification tablets — staging", "Transit", P.warn], ["🚢", "Alert Transport Agencies", "34 boats, 12 trucks requested", "Pending", P.danger]].map(([icon, nm, sub, st, sc]) => (
            <div key={nm} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: `1px solid rgba(0, 0, 0, 0.04)` }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: `${sc} 14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 1 }}>{nm}</div><div style={{ fontSize: 9.5, color: P.sub }}>{sub}</div></div>
              <Badge label={st} color={sc} />
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 14px" }}>
          <Label style={{ marginBottom: 7 }}>Vulnerability Index</Label>
          <div style={{ fontSize: 11, color: P.accent, marginBottom: 8, fontWeight: 500 }}>Human Impact Score: <span style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 800 }}>{d.vuln}</span><span style={{ fontSize: 10, color: P.muted }}>/10</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[[d.pop, P.danger, "Pop. at risk"], [d.poverty, P.warn, "Poverty index"], [d.health, P.crit, "Health centers"], [d.elderly, P.accent, "Elderly pop."]].map(([v, c, l]) => (
              <div key={l} style={{ background: P.card2, border: `1px solid ${P.border} `, borderRadius: 8, padding: "9px", textAlign: "center" }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ fontSize: 8.5, color: P.muted, marginTop: 1, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── FORECAST PAGE ─────────────────────────────────────────────────────────── */
function PageForecast({ region, onToast, d }) {
  const [selDay, setSelDay] = useState("TODAY");
  return (
    <div style={{ width: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 18 }} className="fadeUp">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800 }}>5-Day Flood Forecast</h1>
            <Badge label={`${d.name} · ${d.level} ${d.prob}% `} color={d.color} />
          </div>
          <div style={{ fontSize: 11, color: P.muted, marginTop: 3 }}>AI-generated probabilistic forecast · Western Kenya Basin</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["↻ Refresh", "📡 Refreshed", P.accent2], ["Export", "📄 Exported", P.accent]].map(([l, t, c]) => (
            <button key={l} onClick={() => onToast(t, c)} style={{ background: l === "↻ Refresh" ? P.card2 : `${P.accent} 10`, border: `1px solid ${l === "↻ Refresh" ? P.border : `${P.accent}30`} `, borderRadius: 8, padding: "7px 14px", color: l === "↻ Refresh" ? P.text : P.accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 13 }}>📅 Day-by-Day Probability</div>
          <div style={{ display: "flex", gap: 5 }}>
            {[["MON", "🌧️", 82, P.danger, "148mm", false], ["TUE", "⛈️", 88, P.crit, "162mm", false], ["TODAY", "🚨", d.prob, d.color, "138mm", false], ["THU ✦", "🌩️", 84, P.danger, "~125mm", true], ["FRI ✦", "🌦️", 71, P.warn, "~90mm", true], ["SAT ✦", "🌤️", 45, P.moderate, "~55mm", true], ["SUN ✦", "⛅", 28, P.accent2, "~30mm", true]].map(([day, icon, prob, c, rain, fc]) => (
              <div key={day} onClick={() => { setSelDay(day); onToast(`${day}: ${prob}%`, c); }} style={{ flex: 1, background: selDay === day ? `${c}15` : P.card2, border: `1px ${fc ? "dashed" : "solid"} ${selDay === day ? c : day.includes("TODAY") && selDay === "TODAY" ? P.accent : P.border}`, borderRadius: 8, padding: "9px 4px", textAlign: "center", cursor: "pointer", transform: selDay === day ? "scale(1.05)" : "none", transition: "all 0.15s" }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: P.muted, marginBottom: 5 }}>{day}</div>
                <div style={{ fontSize: 18, marginBottom: 5 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "Syne,sans-serif", color: c }}>{prob}%</div>
                <div style={{ fontSize: 9, color: P.muted, marginTop: 2 }}>{rain}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 13 }}>🎯 Risk Probability</div>
          <div style={{ width: 90, height: 90, margin: "0 auto 12px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={d.color} strokeWidth="8" strokeDasharray="263.9" strokeDashoffset={263.9 * (1 - d.prob / 100)} strokeLinecap="round" />
            </svg>
            <div style={{ textAlign: "center" }}><div style={{ fontFamily: "Syne,sans-serif", fontSize: 19, fontWeight: 800, color: d.color }}>{d.prob}%</div><div style={{ fontSize: 9, color: P.muted }}>Flood Risk</div></div>
          </div>
          {[["Emergency threshold", ">80%"], ["7-day avg", "76.3%"], ["Peak forecast", "Day 2 (+88%)"], ["Recovery", "Day 6–7"]].map(([k, v]) => (
            <div key={k} style={{ fontSize: 10.5, color: P.sub, marginBottom: 4 }}>• <b style={{ color: P.text }}>{k}:</b> {v}</div>
          ))}
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>⏱ Hourly Risk</div>
          <div style={{ height: 120, display: "flex", alignItems: "flex-end", gap: 1 }}>
            {[72, 75, 78, 82, 85, 88, 91, 93, 91, 89, 87, 85, 82, 79, 76, 73, 70, 68, 65, 62, 59, 56, 53, 50].map((v, i) => (
              <div key={i} title={`${String(i).padStart(2, "0")}:00 — ${v}% `} onClick={() => onToast(`${String(i).padStart(2, "0")}:00 — ${v}% risk`, v >= 80 ? P.crit : P.danger)} style={{ flex: 1, borderRadius: "2px 2px 0 0", background: v >= 80 ? P.crit : v >= 65 ? P.danger : P.warn, opacity: 0.75, height: `${v}% `, cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: P.muted, marginTop: 3 }}><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📋 Scenario Modeling</div>
          {[["Rain stops in 24h", "Risk drops to 42%", P.accent2], ["Rain continues 3 days", "Risk peaks at 96%", P.danger], ["Dike failure at Nyando", "68,000+ displaced", P.crit], ["Bridge closure (Day 2)", "18hr response delay", P.warn], ["Current trajectory", `${d.displaced} displaced`, P.danger]].map(([s, r, c]) => (
            <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid rgba(0, 0, 0, 0.04)`, fontSize: 11 }}>
              <span style={{ color: P.sub }}>{s}</span><span style={{ color: c, fontWeight: 600 }}>{r}</span>
            </div>
          ))}
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 11 }}>🛰 Satellite Data Inputs</div>
          {[["Soil Moisture", 95, P.danger], ["NDVI Decline", 72, P.warn], ["River Velocity", 88, P.danger], ["Cloud Cover", 91, P.accent], ["Evapotranspiration", 18, P.accent2]].map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: P.sub, width: 130, flexShrink: 0 }}>{l}</span>
              <div style={{ flex: 1, height: 9, background: "rgba(0,0,0,0.05)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${v}% `, background: c, borderRadius: 4, transition: "width 1s ease" }} />
              </div>
              <span style={{ fontSize: 10, width: 30, textAlign: "right", fontWeight: 700, color: c }}>{v}%</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ─── INTELLIGENCE PAGE ─────────────────────────────────────────────────────── */
function PageIntelligence({ region, onToast, d }) {
  return (
    <div style={{ width: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 18 }} className="fadeUp">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800 }}>Intelligence Engine</h1>
          <div style={{ fontSize: 11, color: P.muted, marginTop: 3 }}>Historical memory · Bottleneck analysis · Causal correlation for <b style={{ color: d.color }}>{d.name}</b></div>
        </div>
        <Badge label={`${d.level} ${d.prob}% `} color={d.color} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🧠 Flood Memory Bank</div>
            {[
              { yr: "2018", t: `${d.name} Major Flood Event`, desc: `Roads closed Day 3 causing 18hr delay. Bridge near ${d.name} failed at 2.1m. 34,000 displaced.`, tags: [[P.danger, "Bridge Failure"], [P.warn, "Road Closure"]] },
              { yr: "2020", t: "Lake Victoria Overflow", desc: "Lake level rose 1.8m above seasonal average. Fishing communities in Homa Bay worst affected. Pre-staged supplies reduced displacement by 31%.", tags: [[P.accent, "Lake Overflow"], [P.accent2, "Pre-staging Success"]] },
              { yr: "2022", t: "El Niño Forecast Validation", desc: "CrisisLens prototype predicted peak correctly 6 days prior. 12,000 fewer displaced vs model without early action.", tags: [[P.accent2, "Early Action: Success"]] },
              { yr: "2023", t: "Delayed Response — Siaya", desc: "Alert acknowledged 9hrs late. NDMA-county comms breakdown. New protocol implemented post-event.", tags: [[P.crit, "Comms Failure"], [P.warn, "Protocol Gap"]] },
            ].map(({ yr, t, desc, tags }) => (
              <div key={yr} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid rgba(0, 0, 0, 0.05)` }}>
                <div style={{ fontSize: 10, color: P.muted, width: 34, flexShrink: 0, paddingTop: 1 }}>{yr}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{t}</div>
                  <div style={{ fontSize: 10.5, color: P.sub, lineHeight: 1.55 }}>{desc}</div>
                  <div style={{ marginTop: 5, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {tags.map(([c, l]) => <Badge key={l} label={l} color={c} />)}
                  </div>
                </div>
              </div>
            ))}
          </Card>
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📡 Causal Correlation Timeline</div>
            <div style={{ fontSize: 10.5, color: P.muted, marginBottom: 12 }}>Signal progression 10 days before peak flood event</div>
            {[["Rainfall spike", 100, P.accent, "Day 1"], ["NDVI decline", 80, P.accent2, "Day 2"], ["Soil saturation", 65, P.warn, "Day 3"], ["River level rise", 50, P.moderate, "Day 4–5"], ["Flood onset", 30, P.danger, "Day 7–10"]].map(([l, v, c, day]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: P.sub, width: 108, flexShrink: 0 }}>{l}</span>
                <div style={{ flex: 1, height: 9, background: "rgba(0,0,0,0.05)", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${v}% `, background: c, borderRadius: 4 }} /></div>
                <span style={{ fontSize: 10, width: 44, textAlign: "right", fontWeight: 700, color: c }}>{day}</span>
              </div>
            ))}
          </Card>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚠️ Known Bottlenecks</div>
            {[["🌉", `${d.name} Bridge — Critical`, "Fails at 2.1m. Currently at 2.4m. Closure in 6–12hrs."], ["🛣️", "Main Access Road", "Floods in first 72hrs. Cuts basin from resources."], ["📡", "NDMA-County Comms", "Alert relay 4.5hrs avg. Target: <1hr."], ["🏥", "Regional Hospital Access", "Isolated when bridge & road flood. 72hr reserve."]].map(([icon, t, desc]) => (
              <div key={t} style={{ display: "flex", gap: 9, padding: "8px 0", borderBottom: `1px solid rgba(0, 0, 0, 0.05)` }}>
                <div style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</div>
                <div><div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 2 }}>{t}</div><div style={{ fontSize: 10, color: P.sub }}>{desc}</div></div>
              </div>
            ))}
          </Card>
          <Card style={{ padding: 16 }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🎯 AI Recommendations</div>
            {[[P.danger, "🔴 IMMEDIATE — Next 6hrs", `Move 34 boats to ${d.name} staging. Evacuate 3 villages near bridge. Pre-close main access road in 4hrs.`], [P.warn, "🟡 PRIORITY — Next 24hrs", "Activate regional stadium shelter (15,000 cap). Alert 2 hospitals. Deploy 180 volunteers."], [P.accent2, "🟢 PLAN — Day 3–5", "Supply chain reroute via secondary highway. Establish 3 water purification stations. Red Cross food convoy."]].map(([c, title, body]) => (
              <div key={title} style={{ background: `${c}08`, border: `1px solid ${c} 28`, borderRadius: 9, padding: 11, marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: c, fontWeight: 700, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 11, lineHeight: 1.65, color: P.text }}>{body}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── REPLAY PAGE ───────────────────────────────────────────────────────────── */
const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border} `, borderRadius: 8, padding: "8px 12px", fontSize: 10.5, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: P.text }}>{label}</div>
      {payload.map(({ name, value, color }) => (
        <div key={name} style={{ color, marginBottom: 2 }}>{name}: <b>{value}</b></div>
      ))}
    </div>
  );
};

function PageReplay({ region, onToast, d }) {
  const [pct, setPct] = useState(35);
  const [playing, setPlaying] = useState(false);
  const [startDate, setStartDate] = useState("2023-03-14");
  const [endDate, setEndDate] = useState("2023-03-28");
  const [eventName, setEventName] = useState("2023 Flood Event");
  const [scenarioLoaded, setScenarioLoaded] = useState(true);
  const timer = useRef(null);
  const trackRef = useRef(null);

  const seriesData = useMemo(() => buildReplaySeries(startDate, d), [startDate, d]);
  const dayIdx = Math.min(Math.floor(pct / 100 * (seriesData.length - 1)), seriesData.length - 1);
  const cur = seriesData[dayIdx];

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => {
        setPct(p => { if (p >= 100) { setPlaying(false); clearInterval(timer.current); return 0; } return Math.min(100, p + 0.7); });
      }, 100);
    } else clearInterval(timer.current);
    return () => clearInterval(timer.current);
  }, [playing]);

  function scrub(e) {
    if (!trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    setPct(Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)));
  }

  function loadScenario() {
    setScenarioLoaded(true); setPct(0); setPlaying(false);
    onToast(`🔄 Scenario loaded: ${eventName} `, P.accent);
  }

  const currentLabel = cur?.label || "";

  return (
    <div style={{ width: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 18 }} className="fadeUp">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800 }}>Decision Replay Mode</h1>
          <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{eventName} · <b style={{ color: d.color }}>{d.name}</b> · Post-incident analysis</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setPct(0)} style={{ background: P.card2, border: `1px solid ${P.border} `, borderRadius: 7, padding: "7px 13px", color: P.text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>|◀ Reset</button>
          <button onClick={() => setPlaying(p => !p)} style={{ background: `${P.accent} 12`, border: `1px solid ${P.accent} 35`, borderRadius: 7, padding: "7px 14px", color: P.accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{playing ? "⏸ Pause" : "▶ Play"}</button>
          <button onClick={() => setPct(100)} style={{ background: P.card2, border: `1px solid ${P.border} `, borderRadius: 7, padding: "7px 13px", color: P.text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>▶| End</button>
          <button onClick={() => onToast("📊 Accountability report exported", P.accent)} style={{ background: `${P.accent} 10`, border: `1px solid ${P.accent} 30`, borderRadius: 7, padding: "7px 14px", color: P.accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Export Report</button>
        </div>
      </div>

      {/* Custom Scenario Input */}
      <Card style={{ padding: 18 }}>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 13 }}>🗓 Custom Scenario Input</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
          <div>
            <Label style={{ marginBottom: 5 }}>Event Name</Label>
            <input value={eventName} onChange={e => setEventName(e.target.value)} style={{ width: "100%", padding: "8px 11px", border: `1px solid ${P.border2} `, borderRadius: 8, fontSize: 12, color: P.text, outline: "none", background: P.card2 }} />
          </div>
          <div>
            <Label style={{ marginBottom: 5 }}>Start Date</Label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: "100%", padding: "8px 11px", border: `1px solid ${P.border2} `, borderRadius: 8, fontSize: 12, color: P.text, outline: "none", background: P.card2 }} />
          </div>
          <div>
            <Label style={{ marginBottom: 5 }}>End Date</Label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: "100%", padding: "8px 11px", border: `1px solid ${P.border2} `, borderRadius: 8, fontSize: 12, color: P.text, outline: "none", background: P.card2 }} />
          </div>
          <button onClick={loadScenario} style={{ background: P.accent, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Syne,sans-serif", whiteSpace: "nowrap" }}>Load Scenario →</button>
        </div>
      </Card>

      {/* Timeline Scrubber */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700 }}>Timeline Scrubber</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge label={currentLabel} color={P.accent} />
            <span style={{ fontSize: 12, fontWeight: 700, color: cur?.prob >= 75 ? P.crit : cur?.prob >= 60 ? P.danger : P.warn }}>Flood Prob: {cur?.prob}%</span>
          </div>
        </div>
        <div ref={trackRef} onClick={scrub} onMouseMove={e => { if (e.buttons === 1) scrub(e); }} style={{ height: 10, background: "rgba(0,0,0,0.07)", borderRadius: 5, position: "relative", margin: "8px 0 6px", cursor: "pointer", userSelect: "none" }}>
          <div style={{ height: "100%", width: `${pct}% `, background: `linear - gradient(90deg, ${P.accent2}, ${P.accent}, ${P.danger})`, borderRadius: 5, transition: "width 0.1s" }} />
          <div style={{ width: 16, height: 16, background: "white", borderRadius: "50%", position: "absolute", top: "50%", left: `${pct}% `, transform: "translate(-50%,-50%)", boxShadow: `0 0 0 3px ${P.accent}, 0 2px 8px rgba(0, 0, 0, 0.15)`, transition: "left 0.1s", cursor: "grab" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: P.muted }}>
          {seriesData.filter((_, i) => i % 2 === 0).map(s => <span key={s.day}>{s.label}</span>)}
        </div>
      </Card>

      {/* Live stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[[`${cur?.prob}% `, P.danger, "Flood Probability"], [cur?.displaced?.toLocaleString() || "0", P.warn, "People Displaced"], [`${cur?.waterLevel} m`, P.accent, "Water Level"], [`${cur?.lag || "—"} hrs`, P.crit, "Alert Lag"]].map(([v, c, l]) => (
          <Card key={l} style={{ padding: 14 }}>
            <div style={{ fontSize: 10, color: P.muted, marginBottom: 6, fontWeight: 500 }}>{l}</div>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
          </Card>
        ))}
      </div>

      {/* GRAPHS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📈 Flood Probability & Water Level</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={seriesData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: P.muted }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 9, fill: P.muted }} tickLine={false} axisLine={false} />
              <Tooltip content={CUSTOM_TOOLTIP} />
              <ReferenceLine x={cur?.label} stroke={P.accent} strokeDasharray="3 3" strokeWidth={1.5} />
              <Line type="monotone" dataKey="prob" stroke={P.danger} strokeWidth={2} dot={false} name="Prob %" />
              <Line type="monotone" dataKey="waterLevel" stroke={P.accent} strokeWidth={2} dot={false} name="Water (m)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🏠 Displacement Over Time</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={seriesData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="dispGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={P.warn} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={P.warn} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: P.muted }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 9, fill: P.muted }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)} K` : v} />
              <Tooltip content={CUSTOM_TOOLTIP} />
              <ReferenceLine x={cur?.label} stroke={P.accent} strokeDasharray="3 3" strokeWidth={1.5} />
              <Area type="monotone" dataKey="displaced" stroke={P.warn} strokeWidth={2} fill="url(#dispGrad)" name="Displaced" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🌧 Rainfall & Response Score</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={seriesData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: P.muted }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 9, fill: P.muted }} tickLine={false} axisLine={false} />
              <Tooltip content={CUSTOM_TOOLTIP} />
              <ReferenceLine x={cur?.label} stroke={P.accent} strokeDasharray="3 3" strokeWidth={1.5} />
              <Line type="monotone" dataKey="rainfall" stroke={P.accent} strokeWidth={2} dot={false} name="Rainfall mm" />
              <Line type="monotone" dataKey="responseScore" stroke={P.accent2} strokeWidth={2} dot={false} name="Response Score" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>⏰ Alert Response Lag (hrs)</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={seriesData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: P.muted }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 9, fill: P.muted }} tickLine={false} axisLine={false} />
              <Tooltip content={CUSTOM_TOOLTIP} />
              <ReferenceLine x={cur?.label} stroke={P.accent} strokeDasharray="3 3" strokeWidth={1.5} />
              <Bar dataKey="lag" fill={P.crit} opacity={0.75} radius={[3, 3, 0, 0]} name="Lag hrs" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Event log */}
      <Card style={{ padding: 18 }}>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📋 Event Log — Predicted vs Actual vs Response</div>
        {[
          [seriesData[0]?.label || "Day 1", P.accent, "CrisisLens Alert Issued", "72% flood probability predicted. Yellow alert auto-generated.", "On-time", P.accent2],
          [seriesData[1]?.label || "Day 2", P.warn, "County Acknowledged", "9hr 12min delay. Weekend staffing gap.", "9.2hr lag", P.danger],
          [seriesData[3]?.label || "Day 4", P.danger, `${d.name} Bridge Closed`, "Water reached 2.1m — bridge failure. Predicted 6hrs earlier.", "Predicted ✓", P.crit],
          [seriesData[4]?.label || "Peak", P.crit, "Peak Flood — Emergency", "34,000 displaced. CrisisLens prediction within confidence band.", "Accurate ✓", P.accent2],
          [seriesData[7]?.label || "Day 8", P.accent2, "Red Cross Deployed", "3 days after peak. Could have saved 8,200 if pre-positioned.", "3-day lag", P.warn],
        ].map(([time, dc, title, desc, st, sc]) => (
          <div key={time + title} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: `1px solid rgba(0, 0, 0, 0.05)` }}>
            <div style={{ fontSize: 10, color: P.muted, width: 60, flexShrink: 0, paddingTop: 1 }}>{time}</div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dc, flexShrink: 0, marginTop: 4 }} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 2 }}>{title}</div><div style={{ fontSize: 10, color: P.sub }}>{desc}</div></div>
            <Badge label={st} color={sc} />
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ─── COMMUNITY PAGE ────────────────────────────────────────────────────────── */
function PageCommunity({ region, onToast, d }) {
  const [modal, setModal] = useState(null); // "photo"|"voice"|"water"
  return (
    <div style={{ width: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 18 }} className="fadeUp">
      {modal && <SubmitModal type={modal} onClose={() => setModal(null)} onToast={onToast} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800 }}>Community Signal Feed</h1>
          <div style={{ fontSize: 11, color: P.muted, marginTop: 3 }}>Citizen reports · Water readings · AI validation for <b style={{ color: d.color }}>{d.name}</b></div>
        </div>
        <div style={{ background: `${P.accent2} 10`, border: `1px solid ${P.accent2} 30`, borderRadius: 8, padding: "7px 14px", fontSize: 11, color: P.accent2, fontWeight: 600 }}>🟢 312 Active reporters</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {/* Photo reports */}
        <Card style={{ padding: 16 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📸 AI-Validated Reports</div>
          {[["📷", `${d.name} Bridge flooding`, "12min ago · James M. · GPS matched ✓", "Verified", P.accent2], ["⚡", "Power line down — Main market", "28min ago · Mercy A. · GPS matched ✓", "Verified", P.accent2], ["🏘️", `Houses flooded in ${d.name} South`, "41min ago · Anonymous · Mismatch ⚠", "Checking", P.warn], ["❓", "Flood near boundary — mismatch", "1hr ago · Unknown", "Rejected", P.danger]].map(([icon, title, meta, badge, bc]) => (
            <div key={title} onClick={() => onToast(title, bc)} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: `1px solid rgba(0, 0, 0, 0.04)`, cursor: "pointer" }}>
              <div style={{ fontSize: 16, flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 1 }}>{title}</div><div style={{ fontSize: 9.5, color: P.muted }}>{meta}</div></div>
              <Badge label={badge} color={bc} />
            </div>
          ))}
        </Card>

        {/* Water readings */}
        <Card style={{ padding: 16 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📏 Live Water Readings</div>
          {[[`${d.name} River Gauge`, "8min ago · Robert K.", "2.38m ↑", P.danger], ["Regional Port Gauge", "15min ago · KPA Station", "1.72m ↑", P.warn], ["Main Bridge Gauge", "22min ago · Odhiambo F.", "2.06m ↑", P.danger], ["Local Pier", "35min ago · Atieno B.", "1.14m →", P.moderate]].map(([loc, meta, level, c]) => (
            <div key={loc} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 11px", background: P.card2, border: `1px solid ${P.border} `, borderRadius: 8, marginBottom: 6 }}>
              <div><div style={{ fontSize: 11, fontWeight: 600 }}>{loc}</div><div style={{ fontSize: 9, color: P.muted, marginTop: 1 }}>{meta}</div></div>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 800, color: c }}>{level}</div>
            </div>
          ))}
          <div style={{ background: `${P.accent2}08`, border: `1px solid ${P.accent2} 28`, borderRadius: 8, padding: 10, fontSize: 10.5, color: P.accent2, display: "flex", gap: 7, alignItems: "flex-start", marginTop: 4 }}>
            <span>🤖</span><div><b>AI Cross-validation:</b> 4 readings consistent with sensor data. {d.name} gauge confirms 2.4m (±0.06m). Community data accepted into model.</div>
          </div>
        </Card>

        {/* Submit report */}
        <Card style={{ padding: 16 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📤 Submit a Report</div>

          {/* Photo upload */}
          <div onClick={() => setModal("photo")} style={{ border: `2px dashed ${P.border2}`, borderRadius: 10, padding: "18px", textAlign: "center", cursor: "pointer", marginBottom: 10, transition: "all 0.2s" }}>
            <div style={{ fontSize: 26, marginBottom: 5 }}>📷</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Upload Photo Report</div>
            <div style={{ fontSize: 10, color: P.muted }}>GPS auto-tagged · AI validates in &lt;30s</div>
          </div>

          {/* Voice report */}
          <div onClick={() => setModal("voice")} style={{ border: `1px solid ${P.border}`, borderRadius: 10, padding: "14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 10, transition: "all 0.2s" }}>
            <div style={{ fontSize: 20 }}>🎤</div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 1 }}>Record Voice Note</div>
              <div style={{ fontSize: 9.5, color: P.muted }}>Local dialect supported</div>
            </div>
          </div>

          {/* Water level */}
          <div onClick={() => setModal("water")} style={{ border: `1px solid ${P.border}`, borderRadius: 10, padding: "14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ fontSize: 20 }}>📏</div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 1 }}>Log Water Level</div>
              <div style={{ fontSize: 9.5, color: P.muted }}>Help calibrate sensors</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── ROOT APP ──────────────────────────────────────────────────────────────── */
export default function App() {
  const [region, setRegion] = useState("Kisumu"); // Setup a default name from the DB
  const [page, setPage] = useState("operations");
  const [toast, setToast] = useState({ msg: "", color: P.accent });
  const [clock, setClock] = useState("");
  const [selectedDayIndex, setSelectedDayIndex] = useState(21); // Keep track of the selected day inside Calendar (21 is TODAY)
  const dayOffset = selectedDayIndex - 21;
  const toastTimer = useRef(null);

  const { data: subCountiesData } = useSubCountyRisk();

  // Filter subCounties for our focus regions
  const filteredAreas = useMemo(() => {
    if (!subCountiesData) return [];
    return subCountiesData.filter((s) => {
      // Find if this area falls under Kisumu, Siaya, or Homa Bay in the GeoJSON mapping
      return kenyaAreas.features.some(f => f.properties.adm2_name === s.name && FOCUS_COUNTY_NAMES.has(f.properties.adm1_name));
    }).sort((a, b) => b.flood_probability - a.flood_probability);
  }, [subCountiesData]);

  useEffect(() => {
    // When subCounties map finishes loading, if "Nyando" isn't a valid area name, fallback to the top risk area
    if (filteredAreas.length > 0 && !filteredAreas.find(s => s.name === "Nyando")) {
      setRegion(filteredAreas[0].name);
    }
  }, [filteredAreas]);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = GLOBAL;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  useEffect(() => {
    const tick = () => setClock(new Date().toUTCString().slice(17, 25) + " UTC");
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  function toast_(msg, color = P.accent) {
    clearTimeout(toastTimer.current);
    setToast({ msg, color });
    toastTimer.current = setTimeout(() => setToast({ msg: "", color }), 3200);
  }

  useEffect(() => toast_("🗺 Operations — Live monitoring active", P.accent), []);

  const PAGE_MSGS = {
    operations: "🗺 Operations — Live monitoring", forecast: "📡 Forecast loaded",
    intelligence: "🧠 Intelligence Engine ready", replay: "⏪ Replay Mode — Load a scenario", community: "📱 Community Feed — 312 reporters",
  };

  // Sync the current Region Data dynamically from whatever the forecast offset is
  const currentD = getRegionData(region, subCountiesData, dayOffset);

  const pageEl = {
    operations: <PageOperations region={region} setRegion={r => { setRegion(r); toast_(`📍 ${r} selected`, P.accent); }} onToast={toast_} d={currentD} subCounties={subCountiesData} filteredAreas={filteredAreas} dayOffset={dayOffset} selectedDayIndex={selectedDayIndex} setSelectedDayIndex={setSelectedDayIndex} />,
    forecast: <PageForecast region={region} onToast={toast_} d={currentD} />,
    intelligence: <PageIntelligence region={region} onToast={toast_} d={currentD} />,
    replay: <PageReplay region={region} onToast={toast_} d={currentD} />,
    community: <PageCommunity region={region} onToast={toast_} d={currentD} />,
  };

  return (
    <div style={{ background: P.bg, minHeight: "100vh", color: P.text, fontFamily: "Plus Jakarta Sans,sans-serif" }}>
      <style>{`@keyframes scan{ 0% { top: 0 }100% { top: 100vh } } @keyframes modalIn{from{ opacity: 0; transform: scale(0.95) }to{ opacity: 1; transform: scale(1) } } `}</style>
      {/* Scan line */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${P.accent}55, transparent)`, animation: "scan 6s linear infinite", zIndex: 998, pointerEvents: "none" }} />

      {/* Header */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", background: "rgba(241,245,251,0.96)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${P.border}`, boxShadow: "0 1px 8px rgba(15,23,42,0.06)" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 18, cursor: "pointer" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${P.accent}, ${P.accent2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: `0 2px 12px ${P.accent}35` }}>🌊</div>
          Crisis<span style={{ color: P.accent2 }}>Lens</span>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {[["operations", "Operations", 7], ["forecast", "Forecast"], ["intelligence", "Intelligence"], ["replay", "Replay"], ["community", "Community", 3]].map(([id, label, badge]) => (
            <button key={id} onClick={() => { setPage(id); toast_(PAGE_MSGS[id], P.accent); }}
              style={{ background: page === id ? `${P.accent}10` : "none", border: "none", padding: "6px 13px", borderRadius: 7, color: page === id ? P.accent : P.sub, fontFamily: "Plus Jakarta Sans,sans-serif", fontSize: 12, fontWeight: page === id ? 700 : 500, cursor: "pointer", transition: "all 0.18s", position: "relative", boxShadow: page === id ? `inset 0 -2px 0 ${P.accent}` : "none" }}>
              {label}
              {badge && <span style={{ background: id === "community" ? P.accent2 : P.danger, color: "#fff", fontSize: 8, padding: "1px 5px", borderRadius: 9, marginLeft: 4, fontWeight: 700 }}>{badge}</span>}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Region indicator (non-operations pages) */}
          {page !== "operations" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 7, background: `${currentD.color}10`, border: `1px solid ${currentD.color}25` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: currentD.color }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: currentD.color }}>{currentD.name}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: P.danger, fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: P.danger, animation: "blink 1.5s infinite" }} />
            LIVE
          </div>
          <div style={{ fontSize: 10.5, color: P.muted, fontWeight: 500 }}>{clock}</div>
        </div>
      </header>

      <div style={{ display: "flex", paddingTop: 58, minHeight: "100vh", position: "relative", zIndex: 1, overflowY: "auto" }}>
        {pageEl[page]}
      </div>

      <Toast msg={toast.msg} color={toast.color} />
    </div>
  );
}