import { useState, useEffect, useRef, useMemo } from "react";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import useSubCountyRisk from "../hooks/useSubCountyRisk";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import kenyaAreasRaw from "../data/ken_admin2.geojson?raw";
import { usePageTitle } from "../hooks/usePageTitle";
import { Camera, Mic, Ruler, History, Truck, Zap, Activity, TrendingUp, Users, Brain } from "lucide-react";

const kenyaAreas = JSON.parse(kenyaAreasRaw);
const FOCUS_COUNTY_NAMES = new Set(["Kisumu", "Siaya", "Homa Bay"]);

/* ─── PALETTE ───────────────────────────────────────────────────────────────── */
const P = {
  accent: "#0891b2", // flood-600
  accent2: "#10b981", // success (emerald)
  warn: "#f59e0b", // warning (amber)
  danger: "#ef4444", // danger (red)
  crit: "#dc2626", // strong danger (red-600)
};

/* ─── DATA HELPERS ──────────────────────────────────────────────────────────── */
const getRegionData = (areaName, subCounties, dayOffset = 0) => {
  const backendArea = subCounties?.find(s => s.name === areaName);
  let baseProb = backendArea?.flood_probability || Math.floor(Math.random() * 20 + 10);

  let prob = baseProb;
  if (dayOffset !== 0) {
    const factor = dayOffset > 0 ? (1 + (dayOffset * 0.15)) : (1 + (dayOffset * 0.1));
    prob = Math.min(99, Math.max(5, Math.round(baseProb * factor)));
  }

  let nLevel = "NORMAL";
  let cColor = P.accent2;
  if (prob > 75) { nLevel = "CRITICAL"; cColor = P.crit; }
  else if (prob > 60) { nLevel = "HIGH ALERT"; cColor = P.danger; }
  else if (prob > 40) { nLevel = "ELEVATED"; cColor = P.warn; }

  return {
    name: areaName,
    level: nLevel,
    prob: prob,
    color: cColor,
    displaced: Math.round(prob * 820),
    water: (prob * 0.03).toFixed(2),
    rain: Math.round(prob * 1.8),
  };
};

function buildReplaySeries(startDateStr, d) {
  if (!d) return [];
  const peak = d.prob;
  const maxDisp = d.displaced;
  const maxWater = parseFloat(d.water);
  const maxRain = d.rain;
  const days = 14;

  return Array.from({ length: days }, (_, i) => {
    const t = i / (days - 1);
    const peakT = 0.35;
    const probCurve = peak * Math.exp(-Math.pow((t - peakT) * 3.5, 2)) + 5;
    const dispCurve = i <= 4 ? maxDisp * 0.9 * (i / 4) : maxDisp * 0.9 * (1 - (i - 4) / 12);
    const waterCurve = i <= 4 ? maxWater * (i / 4) * 1.05 : maxWater * (1 - (i - 4) / 14) * 0.9;

    let label = `D+${i + 1}`;
    if (startDateStr) {
      const base = new Date(startDateStr);
      base.setDate(base.getDate() + i);
      label = base.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    }

    return {
      label,
      prob: Math.round(Math.max(5, Math.min(96, probCurve))),
      displaced: Math.max(0, Math.round(dispCurve)),
      waterLevel: Math.round(Math.max(0.3, waterCurve) * 100) / 100,
      rainfall: Math.round(maxRain * (0.5 + Math.random() * 0.5)),
    };
  });
}

function riskStroke(p) {
  if (p >= 75) return P.crit;
  if (p >= 60) return P.danger;
  if (p >= 35) return P.warn;
  return P.accent2;
}

/* ─── UI COMPONENTS ────────────────────────────────────────────────────────── */
function Label({ children, className = "" }) {
  return <div className={`text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ${className}`}>{children}</div>;
}

function BarRow({ label, value, color }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] mb-1 text-slate-600 dark:text-slate-400">
        <span className="font-bold tracking-tight uppercase truncate pr-2">{label}</span>
        <span style={{ color }} className="font-black tabular-nums">{value}%</span>
      </div>
      <div className="h-1 bg-slate-100 dark:bg-surface border border-slate-200/50 dark:border-surface-border rounded-full overflow-hidden">
        <div className="h-full transition-all duration-700 ease-out" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] bg-white dark:bg-surface border-l-4 border-flood-500 rounded-sm px-4 py-2.5 shadow-xl animate-in slide-in-from-right-10 duration-300"
    >
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: msg }} />
    </div>
  );
}

/* ─── FEATURE COMPONENTS ──────────────────────────────────────────────────── */
function SubmitModal({ type, onClose, onToast }) {
  const titles = { photo: "Tactical Photo", voice: "Ops Voice", water: "Gauge Index" };
  const icons = { photo: <Camera size={18} />, voice: <Mic size={18} />, water: <Ruler size={18} /> };
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      onToast(`Signal transmitted.`);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-xs p-4 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-flood-600 dark:text-flood-400">{icons[type]}</span>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] dark:text-white">{titles[type]}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-xs font-black">✕</button>
        </div>
        <div className="space-y-4">
          <div className="h-24 border border-dashed border-slate-200 dark:border-surface-border rounded-sm flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50 dark:bg-surface/30">
            <span className="text-flood-500">{icons[type]}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Upload Intel</span>
          </div>
          <Button className="w-full h-9 font-black uppercase tracking-widest text-[9px]" onClick={handleSubmit} disabled={loading}>
            {loading ? "..." : "Transmit Signal"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MapSVG({ region, onRegion }) {
  const regions = { Kisumu: { prob: 72, color: P.danger }, Nyando: { prob: 88, color: P.crit }, Siaya: { prob: 45, color: P.warn }, "Homa Bay": { prob: 32, color: P.accent2 } };
  return (
    <div className="relative h-44 bg-slate-50 dark:bg-surface-border/5 flex items-center justify-center overflow-hidden transition-colors">
      <div className="absolute inset-0 opacity-5 dark:opacity-10 flex items-center justify-center font-black text-4xl pointer-events-none select-none uppercase tracking-tighter">Ops View</div>
      <div className="flex gap-2 p-4 flex-wrap justify-center relative z-10">
        {Object.keys(regions).map(r => (
          <div key={r} onClick={() => onRegion(r)} className={`px-3 py-2 rounded-sm border cursor-pointer transition-all ${region === r ? "bg-white dark:bg-surface border-flood-500" : "bg-white/50 dark:bg-surface/50 border-transparent hover:border-slate-200"}`}>
            <div className="text-[9px] font-black uppercase mb-1 dark:text-white truncate lg:max-w-[60px]">{r}</div>
            <div className="text-[9px] font-black tracking-tighter" style={{ color: regions[r].color }}>{regions[r].prob}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Calendar({ selectedDayIndex, setSelectedDayIndex }) {
  return (
    <div className="p-3 border-t border-slate-100 dark:border-surface-border">
      <Label className="mb-3">Temporal Index</Label>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 31 }).map((_, i) => (
          <div
            key={i}
            onClick={() => setSelectedDayIndex(i)}
            className={`h-6 rounded-sm flex items-center justify-center text-[9px] font-black cursor-pointer transition-all ${selectedDayIndex === i ? "bg-flood-600 text-white" : i === 21 ? "bg-slate-200 dark:bg-surface-border text-slate-800" : "hover:bg-slate-100 dark:hover:bg-surface text-slate-400"}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

function AIPanel({ region }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-slate-100 dark:border-surface-border bg-slate-50/50 dark:bg-surface/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-flood-600 flex items-center justify-center text-white">
            <Brain size={12} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">Intelligence Layer</div>
            <div className="text-[8px] text-emerald-500 font-bold tracking-widest uppercase">Validated Ground Truth</div>
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
        <div className="p-2.5 bg-flood-50/30 dark:bg-flood-950/10 border border-flood-100 dark:border-flood-900/20 rounded-sm">
          <p className="text-[10px] leading-snug dark:text-slate-300 italic">Analyzed signals for <b>{region}</b>: divergent flows detected in Nyando basin. Lead window suggests pre-positioning required at T+36h.</p>
        </div>
      </div>
      <div className="p-3 bg-slate-50/50 dark:bg-surface/50 border-t border-slate-100 dark:border-surface-border flex gap-2">
        <div className="flex-1 h-8 bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm px-3 flex items-center text-[9px] text-slate-400 uppercase font-black">Query Intelligence...</div>
        <Button size="sm" className="h-8 w-8 p-0 text-[10px] font-black">ASK</Button>
      </div>
    </div>
  );
}

function SignalChart({ d }) {
  return (
    <div className="h-[100px] flex items-end gap-0.5 px-0.5">
      {Array.from({ length: 32 }).map((_, i) => (
        <div key={i} className="flex-1 bg-flood-500/20 hover:bg-flood-500 transition-all" style={{ height: `${20 + Math.random() * d.prob}%` }} />
      ))}
    </div>
  );
}

/* ─── PAGE COMPONENTS ──────────────────────────────────────────────────────── */
function PageOperations({ region, setRegion, d, filteredAreas, selectedDayIndex, setSelectedDayIndex }) {
  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden bg-white dark:bg-surface transition-colors duration-200">
      {/* Sidebar - Compact */}
      <div className="w-full lg:w-72 flex flex-col border-r border-slate-100 dark:border-surface-border overflow-y-auto custom-scrollbar">
        <MapSVG region={region} onRegion={setRegion} />
        <div className="p-4 border-t border-slate-100 dark:border-surface-border flex-1">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Activity size={10} className="text-slate-400" />
              <Label>Telemetry Status</Label>
            </div>
            <Badge variant="outline" className="text-[7px] tracking-widest px-1 font-black">LIVE</Badge>
          </div>
          <div className="space-y-0.5 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredAreas.map(s => (
              <BarRow key={s.name} label={s.name} value={s.flood_probability} color={riskStroke(s.flood_probability)} />
            ))}
          </div>
        </div>
        <Calendar selectedDayIndex={selectedDayIndex} setSelectedDayIndex={setSelectedDayIndex} />
      </div>

      {/* Main Panel - Compact */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-surface/30 px-4 py-4 overflow-y-auto custom-scrollbar">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{d.name} Tactical</h1>
              <Badge style={{ backgroundColor: d.color }} className="text-white h-5 px-1.5 text-[8px] font-black tracking-widest">{d.level} {d.prob}%</Badge>
            </div>
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Sector Index: Lower Nyando Basin Ops</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-7 text-[8px] px-2 font-black">HEALTH</Button>
            <Button className="h-7 text-[8px] px-2 font-black uppercase tracking-widest">OPS BRIEF</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card className="p-4">
              <Label className="mb-4">Risk Waveform (24h)</Label>
              <SignalChart d={d} />
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3">
                <Label className="mb-2">Water (m)</Label>
                <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{d.water}</div>
                <div className="text-[8px] text-red-500 font-black mt-1 uppercase italic tracking-tighter">↑ 0.12m SURGE</div>
              </Card>
              <Card className="p-3">
                <Label className="mb-2">Displ. Est.</Label>
                <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{d.displaced.toLocaleString()}</div>
                <div className="text-[8px] text-amber-500 font-black mt-1 uppercase italic tracking-tighter">CRITICAL DELTA</div>
              </Card>
            </div>
          </div>

          <Card className="min-h-[300px] flex flex-col overflow-hidden">
            <AIPanel region={region} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function PageForecast({ d }) {
  return (
    <div className="w-full p-6 flex flex-col gap-6 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar bg-white dark:bg-surface transition-colors">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-surface-border pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{d.name} Forecast</h1>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Probabilistic Modeling • Real-time</p>
        </div>
        <Badge style={{ backgroundColor: d.color }} className="h-6 px-2 text-white text-[9px] font-black">{d.level} {d.prob}%</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <Label className="mb-6">5-Day Risk Trajectory</Label>
          <div className="flex gap-2 pb-2 overflow-x-auto custom-scrollbar">
            {[[42, "110mm"], [68, "130mm"], [d.prob, "138mm"], [84, "125mm"], [71, "90mm"]].map(([prob, rain], i) => (
              <div key={i} className={`flex-1 min-w-[100px] p-3 rounded-sm border transition-all ${i === 2 ? "bg-flood-50/30 dark:bg-flood-950/20 border-flood-500" : "bg-slate-50 dark:bg-surface border-transparent"}`}>
                <div className="text-[8px] font-black text-slate-400 mb-2 uppercase tracking-widest">D+{i + 1}</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mb-1 tabular-nums">{prob}%</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{rain} Precipitation</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 flex flex-col items-center justify-center bg-flood-50/30 dark:bg-surface-raised">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-surface-border" />
              <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="351.8" strokeDashoffset={351.8 * (1 - d.prob / 100)} strokeLinecap="round" style={{ color: d.color }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{d.prob}%</span>
              <Label>MAX PEAK</Label>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PageIntelligence({ d }) {
  return (
    <div className="w-full p-6 flex flex-col gap-6 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar bg-white dark:bg-surface transition-colors">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-surface-border pb-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Memory Bank: {d.name}</h1>
        <Badge variant="outline" className="text-[8px] h-6 px-2 font-black uppercase">Historical Telemetry</Badge>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <Label className="mb-4 flex items-center gap-2"><span className="text-emerald-500 text-[6px]">●</span> Intelligence cycles</Label>
          <div className="space-y-4">
            {[{ yr: "2018", t: "Low-Pressure Sync", d: "Bridge failure at 2.1m. Pre-staging was delayed by 12h." }, { yr: "2020", t: "Overflow Event", d: "Victoria levels blocked basin drainage for 14d." }].map(({ yr, t, d }) => (
              <div key={yr} className="flex gap-4 pb-4 border-b border-slate-50 dark:border-surface-border last:border-0 last:pb-0">
                <div className="text-[9px] font-black text-slate-400 mt-0.5 tabular-nums grayscale">{yr}</div>
                <div>
                  <div className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{t}</div>
                  <p className="text-[10px] text-slate-500 italic leading-snug">"{d}"</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <Label className="mb-4 flex items-center gap-2"><span className="text-red-500 text-[6px]">●</span> Tactical Vulnerabilities</Label>
          <div className="space-y-2">
            {[["bridge", "Nyando Bridge", "Limit: 2.1m. Isolates basin."], ["truck", "Relief Corridor", "Road access lost at 1.8m."]].map(([type, t, d]) => (
              <div key={t} className="p-2.5 bg-slate-50 dark:bg-surface border border-slate-100 dark:border-surface-border rounded-sm flex items-start gap-3">
                <span className="text-flood-500 mt-0.5">{type === 'bridge' ? <History size={14} /> : <Truck size={14} />}</span>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-tight mb-0.5">{t}</div>
                  <p className="text-[9px] text-slate-500 leading-tight">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PageReplay({ d }) {
  const [pct, setPct] = useState(35);
  const seriesData = useMemo(() => buildReplaySeries("2023-03-14", d), [d]);
  const cur = seriesData[Math.min(Math.floor(pct / 100 * (seriesData.length - 1)), seriesData.length - 1)];

  return (
    <div className="w-full p-6 flex flex-col gap-6 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar bg-white dark:bg-surface transition-colors">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-surface-border pb-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Ops Replay Analysis</h1>
        <Badge className="h-6 px-2 text-[8px] font-black uppercase tracking-widest">{cur?.label}</Badge>
      </div>
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Label>Temporal Scrub</Label>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: riskStroke(cur?.prob) }}>RISK: {cur?.prob}%</span>
        </div>
        <input type="range" className="w-full accent-flood-600 h-1.5 bg-slate-100 dark:bg-surface-border rounded-full" value={pct} onChange={e => setPct(e.target.value)} />
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <Label className="mb-4">Temporal risk wave</Label>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <Area type="monotone" dataKey="prob" stroke={P.accent} strokeWidth={2} fill={P.accent} fillOpacity={0.1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <Label className="mb-4">Historical Log</Label>
          <div className="space-y-3">
            {[["D+1", "Alert Cascade", "SMS systems fired."], ["D+3", "County Lag", "Protocol delay noted."]].map(([t, k, v]) => (
              <div key={t + k} className="flex gap-4 text-[10px] items-start">
                <span className="font-black text-slate-400 w-8 shrink-0">{t}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase tracking-tight truncate">{k}</div>
                  <div className="text-slate-500 text-[9px] tracking-tight">{v}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PageCommunity({ onToast }) {
  const [modal, setModal] = useState(null);
  const icons = { photo: <Camera size={18} />, zap: <Zap size={14} />, activity: <Activity size={14} /> };
  return (
    <div className="w-full p-6 flex flex-col gap-6 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar bg-white dark:bg-surface transition-colors">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-surface-border pb-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Ground Truth Signal</h1>
        <Badge className="bg-emerald-500 text-white text-[9px] h-6 px-2 font-black uppercase tracking-widest">312 ACTIVE UNITS</Badge>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <Label className="mb-4">Community Ingest Log</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[[icons.photo, "Nyando Bridge", "12m ago", "Verified"], [icons.zap, "Power Grid", "28m ago", "Critical"]].map(([i, t, m, s]) => (
              <div key={t} className="p-3 border border-slate-100 dark:border-surface-border rounded-sm hover:bg-slate-50 dark:hover:bg-surface/50 transition-colors cursor-pointer">
                <span className="text-flood-600 dark:text-flood-400 mb-2 block">{i}</span>
                <div className="text-[11px] font-black uppercase dark:text-white truncate">{t}</div>
                <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{m} • {s}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center border-dashed border-2 bg-slate-50/20 dark:bg-surface/5 text-center transition-colors">
          <span className="text-flood-500 mb-3">{icons.photo}</span>
          <div className="text-xs font-black uppercase tracking-[0.2em] mb-2 dark:text-white">Relay Ground Truth</div>
          <p className="text-[9px] text-slate-500 font-bold mb-4 leading-tight">Transmit visual confirmation to calibrate AI models.</p>
          <Button size="sm" className="w-full h-8 text-[9px] font-black uppercase tracking-widest" onClick={() => setModal("photo")}>LAUNCH RELAY</Button>
        </Card>
      </div>
      {modal && <SubmitModal type={modal} onClose={() => setModal(null)} onToast={onToast} />}
    </div>
  );
}

/* ─── ROOT APP ─────────────────────────────────────────────────────────────── */
export default function ReportsPage() {
  usePageTitle("Operational Reports");
  const [region, setRegion] = useState("Nyando");
  const [page, setPage] = useState("operations");
  const [toast, setToast] = useState({ msg: "" });
  const toastTimer = useRef(null);

  const { data: subCountiesData } = useSubCountyRisk();
  const filteredAreas = useMemo(() => {
    if (!subCountiesData) return [];
    return subCountiesData.filter((s) => kenyaAreas.features.some(f => f.properties.adm2_name === s.name && FOCUS_COUNTY_NAMES.has(f.properties.adm1_name)))
      .sort((a, b) => b.flood_probability - a.flood_probability);
  }, [subCountiesData]);

  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast({ msg });
    toastTimer.current = setTimeout(() => setToast({ msg: "" }), 2500);
  };

  const d = getRegionData(region, subCountiesData, 0); // Day offset logic simplified for app integration

  const pages = {
    operations: <PageOperations region={region} setRegion={r => { setRegion(r); showToast(`📍 Location: ${r.toUpperCase()}`); }} d={d} filteredAreas={filteredAreas} selectedDayIndex={21} setSelectedDayIndex={() => { }} />,
    forecast: <PageForecast d={d} />,
    intelligence: <PageIntelligence d={d} />,
    replay: <PageReplay d={d} />,
    community: <PageCommunity onToast={showToast} />
  };

  return (
    <div className="flex h-full bg-white dark:bg-surface selection:bg-flood-500/30 transition-colors animate-in fade-in duration-300 overflow-hidden">
      {/* Internal Sub-navigation Sidebar */}
      <nav className="w-14 md:w-48 border-r border-slate-100 dark:border-surface-border bg-slate-50/30 dark:bg-surface-raised flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-surface-border hidden md:block">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational View</p>
        </div>
        <div className="flex-1 py-4 px-2 space-y-1">
          {Object.keys(pages).map(p => {
            const icons = {
              operations: <Activity size={14} />,
              forecast: <TrendingUp size={14} />,
              intelligence: <Brain size={14} />,
              replay: <History size={14} />,
              community: <Users size={14} />
            };
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] transition-all rounded-sm border ${page === p
                  ? "bg-flood-600/10 text-flood-600 dark:text-flood-400 border-flood-600/20"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent hover:bg-slate-100 dark:hover:bg-white/5"}`}
              >
                <span className="shrink-0">{icons[p]}</span>
                <span className="hidden md:block truncate">{p}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex-1 overflow-hidden flex flex-col">
        {pages[page]}
      </div>
      <Toast msg={toast.msg} />
    </div>
  );
}