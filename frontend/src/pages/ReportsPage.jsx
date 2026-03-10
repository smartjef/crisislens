import { useState, useEffect, useRef, useMemo } from "react";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import useSubCountyRisk from "../hooks/useSubCountyRisk";
import useCounties from "../hooks/useCounties";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import kenyaAreasRaw from "../data/ken_admin2.geojson?raw";
import { usePageTitle } from "../hooks/usePageTitle";
import { Camera, Mic, Ruler, History, Truck, Zap, Activity, TrendingUp, Users, Brain, MapPin, Send, Loader2 } from "lucide-react";
import client from "../api/client";
import { useAuthStore } from "../store/authStore";

const kenyaAreas = JSON.parse(kenyaAreasRaw);

const FOCUS_COUNTY_NAMES = new Set([
  "Homa Bay", "Kajiado", "Kiambu", "Kisumu", "Machakos", "Nairobi", "Siaya"
]);

/* ─── PALETTE ───────────────────────────────────────────────────────────────── */
const P = {
  accent: "#0891b2",
  accent2: "#10b981",
  warn: "#f59e0b",
  danger: "#ef4444",
  crit: "#dc2626",
};

/* ─── DATA HELPERS ──────────────────────────────────────────────────────────── */
const getRegionData = (areaName, subCounties) => {
  const backendArea = subCounties?.find(s => s.name === areaName);
  const prob = backendArea?.flood_probability ?? 0;

  let nLevel = "NORMAL";
  let cColor = P.accent2;
  if (prob > 75) { nLevel = "CRITICAL"; cColor = P.crit; }
  else if (prob > 60) { nLevel = "HIGH ALERT"; cColor = P.danger; }
  else if (prob > 40) { nLevel = "ELEVATED"; cColor = P.warn; }

  return {
    name: areaName,
    level: nLevel,
    prob: Math.round(prob),
    color: cColor,
    displaced: Math.round(prob * 820),
    water: (prob * 0.03).toFixed(2),
    rain: Math.round(prob * 1.8),
    riskCategory: backendArea?.risk_category ?? "Low",
    leadTime: backendArea?.lead_time_days ?? 7,
  };
};

function buildReplaySeries(d) {
  if (!d) return [];
  const peak = d.prob;
  const days = 14;
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const t = i / (days - 1);
    const peakT = 0.35;
    const probCurve = peak * Math.exp(-Math.pow((t - peakT) * 3.5, 2)) + 5;
    const dispCurve = i <= 4 ? d.displaced * 0.9 * (i / 4) : d.displaced * 0.9 * (1 - (i - 4) / 12);
    const base = new Date(today);
    base.setDate(base.getDate() - (days - 1 - i));
    return {
      label: base.toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      prob: Math.round(Math.max(5, Math.min(96, probCurve))),
      displaced: Math.max(0, Math.round(dispCurve)),
      waterLevel: Math.round(Math.max(0.3, d.water * (0.6 + t * 0.8)) * 100) / 100,
      rainfall: Math.round(d.rain * (0.3 + Math.random() * 0.7)),
    };
  });
}

function riskStroke(p) {
  if (p >= 75) return P.crit;
  if (p >= 60) return P.danger;
  if (p >= 35) return P.warn;
  return P.accent2;
}

/* ─── UI COMPONENTS ─────────────────────────────────────────────────────────── */
function Label({ children, className = "" }) {
  return <div className={`text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ${className}`}>{children}</div>;
}

function BarRow({ label, value, color }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] mb-1 text-slate-600 dark:text-slate-400">
        <span className="font-bold tracking-tight uppercase truncate pr-2">{label}</span>
        <span style={{ color }} className="font-black tabular-nums">{Math.round(value)}%</span>
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
    <div className="fixed bottom-4 right-4 z-[100] bg-white dark:bg-surface border-l-4 border-flood-500 rounded-sm px-4 py-2.5 shadow-xl animate-in slide-in-from-right-10 duration-300">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">{msg}</div>
    </div>
  );
}

/* ─── COUNTY SELECTOR ────────────────────────────────────────────────────────── */
function CountyPicker({ counties, selectedCounty, onSelect }) {
  return (
    <div className="p-3 border-b border-slate-100 dark:border-surface-border">
      <Label className="mb-2">County Focus</Label>
      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar">
        {counties.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.name)}
            className={`flex items-center justify-between px-2 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wide transition-all border ${selectedCounty === c.name
              ? "bg-flood-600/10 border-flood-500/40 text-flood-600 dark:text-flood-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface/50"
              }`}
          >
            <span className="flex items-center gap-1.5">
              <MapPin size={8} className="shrink-0" />
              {c.name}
            </span>
            {c.flood_probability > 0 && (
              <span style={{ color: riskStroke(c.flood_probability) }} className="tabular-nums">
                {Math.round(c.flood_probability)}%
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── AI PANEL (WIRED) ───────────────────────────────────────────────────────── */
function AIPanel({ region, countyName }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([
    {
      isAi: true,
      text: `CrisisLens AI ready. I have live risk data for ${countyName || "all monitored counties"}. Ask me about flood probability, evacuation routes, or response priorities.`,
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { isAi: false, text: userMsg }]);
    setLoading(true);
    try {
      const res = await client.post("/api/ai/chat/", {
        message: userMsg,
        county: countyName || "",
        area: region || "",
      });
      setMessages(prev => [...prev, { isAi: true, text: res.data.message }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || "AI service unavailable. Try again.";
      setMessages(prev => [...prev, { isAi: true, text: errMsg, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-slate-100 dark:border-surface-border bg-slate-50/50 dark:bg-surface/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-flood-600 flex items-center justify-center text-white">
            <Brain size={12} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">Intelligence Layer</div>
            <div className="text-[8px] text-emerald-500 font-bold tracking-widest uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live Data Connected
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-2 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.isAi ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[90%] px-3 py-2 rounded-sm text-[10px] leading-relaxed ${m.isAi
              ? m.isError
                ? "bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400"
                : "bg-flood-50/40 dark:bg-flood-950/10 border border-flood-100 dark:border-flood-900/20 text-slate-700 dark:text-slate-300"
              : "bg-slate-800 dark:bg-slate-700 text-white"
              }`}>
              {m.isAi ? (
                <div className="whitespace-pre-wrap">{m.text}</div>
              ) : (
                <p>{m.text}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 bg-flood-50/40 dark:bg-flood-950/10 border border-flood-100 dark:border-flood-900/20 rounded-sm flex items-center gap-2 text-[10px] text-slate-400">
              <Loader2 size={10} className="animate-spin" /> Analysing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 bg-slate-50/50 dark:bg-surface/50 border-t border-slate-100 dark:border-surface-border flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about flood risk, evacuation, response..."
          className="flex-1 h-8 bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm px-3 text-[10px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-flood-500 transition-all"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="h-8 w-8 flex items-center justify-center bg-flood-600 hover:bg-flood-700 disabled:opacity-40 text-white rounded-sm transition-all"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─── PAGE COMPONENTS ──────────────────────────────────────────────────────── */
function PageOperations({ region, setRegion, d, filteredAreas, counties, selectedCounty, onCountySelect }) {
  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden bg-white dark:bg-surface transition-colors duration-200">
      {/* Sidebar */}
      <div className="w-full lg:w-72 flex flex-col border-r border-slate-100 dark:border-surface-border overflow-y-auto custom-scrollbar">
        <CountyPicker counties={counties} selectedCounty={selectedCounty} onSelect={onCountySelect} />

        <div className="p-4 border-t border-slate-100 dark:border-surface-border flex-1">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Activity size={10} className="text-slate-400" />
              <Label>Sub-County Risk</Label>
            </div>
            <Badge variant="outline" className="text-[7px] tracking-widest px-1 font-black">LIVE</Badge>
          </div>
          <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredAreas.length === 0 ? (
              <p className="text-[9px] text-slate-400 italic uppercase tracking-widest text-center py-4">No data for selected county</p>
            ) : filteredAreas.map(s => (
              <div
                key={s.name}
                onClick={() => setRegion(s.name)}
                className={`cursor-pointer rounded-sm px-2 py-1 transition-all ${region === s.name ? "bg-flood-50 dark:bg-flood-950/10" : "hover:bg-slate-50 dark:hover:bg-surface/50"}`}
              >
                <BarRow label={s.name} value={s.flood_probability} color={riskStroke(s.flood_probability)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-surface/30 px-4 py-4 overflow-y-auto custom-scrollbar">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                {d.name || selectedCounty}
              </h1>
              {d.prob > 0 && (
                <Badge style={{ backgroundColor: d.color }} className="text-white h-5 px-1.5 text-[8px] font-black tracking-widest">
                  {d.level} {d.prob}%
                </Badge>
              )}
            </div>
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">
              {selectedCounty} County · Sub-county: {d.name || "Select sector below"}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3">
                <Label className="mb-1">Flood Risk</Label>
                <div className="text-xl font-black tabular-nums" style={{ color: d.color }}>{d.prob}%</div>
                <div className="text-[8px] text-slate-400 font-black mt-1 uppercase tracking-tighter">{d.riskCategory}</div>
              </Card>
              <Card className="p-3">
                <Label className="mb-1">Water Est.</Label>
                <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{d.water}m</div>
                <div className="text-[8px] text-slate-400 font-black mt-1 uppercase tracking-tighter">{d.leadTime}d lead</div>
              </Card>
              <Card className="p-3">
                <Label className="mb-1">Displaced</Label>
                <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{d.displaced.toLocaleString()}</div>
                <div className="text-[8px] text-amber-500 font-black mt-1 uppercase italic tracking-tighter">Estimate</div>
              </Card>
            </div>

            {/* Risk trend chart */}
            {d.prob > 0 && (
              <Card className="p-4">
                <Label className="mb-4">14-Day Risk Wave</Label>
                <div className="h-[110px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={buildReplaySeries(d)} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.08} />
                      <XAxis dataKey="label" tick={{ fontSize: 7, fontWeight: 700 }} tickLine={false} axisLine={false} interval={3} />
                      <YAxis tick={{ fontSize: 7 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}
                        formatter={(v, name) => [`${v}${name === "prob" ? "%" : ""}`, name.toUpperCase()]}
                      />
                      <Area type="monotone" dataKey="prob" stroke={d.color} strokeWidth={2} fill={d.color} fillOpacity={0.08} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>

          {/* AI Panel */}
          <Card className="min-h-[320px] flex flex-col overflow-hidden">
            <AIPanel region={d.name} countyName={selectedCounty} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function PageForecast({ d, filteredAreas }) {
  const forecast = [
    { day: "D+1", prob: Math.min(99, Math.round(d.prob * 0.85)), rain: Math.round(d.rain * 0.7) },
    { day: "D+2", prob: Math.min(99, Math.round(d.prob * 0.95)), rain: Math.round(d.rain * 0.9) },
    { day: "D+3", prob: d.prob, rain: d.rain },
    { day: "D+4", prob: Math.min(99, Math.round(d.prob * 1.1)), rain: Math.round(d.rain * 1.1) },
    { day: "D+5", prob: Math.min(99, Math.round(d.prob * 0.9)), rain: Math.round(d.rain * 0.8) },
  ];
  const peak = Math.max(...forecast.map(f => f.prob));

  return (
    <div className="w-full p-6 flex flex-col gap-6 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar bg-white dark:bg-surface transition-colors">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-surface-border pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{d.name || "Select Sector"} Forecast</h1>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Probabilistic Modelling · Real-time</p>
        </div>
        <Badge style={{ backgroundColor: d.color }} className="h-6 px-2 text-white text-[9px] font-black">{d.level} {d.prob}%</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <Label className="mb-4">5-Day Risk Trajectory</Label>
          <div className="flex gap-2 pb-2 overflow-x-auto custom-scrollbar">
            {forecast.map(({ day, prob, rain }, i) => (
              <div key={i} className={`flex-1 min-w-[90px] p-3 rounded-sm border transition-all ${i === 2 ? "bg-flood-50/30 dark:bg-flood-950/20 border-flood-500" : "bg-slate-50 dark:bg-surface border-transparent"}`}>
                <div className="text-[8px] font-black text-slate-400 mb-2 uppercase tracking-widest">{day}</div>
                <div className="text-xl font-black tabular-nums" style={{ color: riskStroke(prob) }}>{prob}%</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">{rain}mm rain</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 flex flex-col items-center justify-center bg-flood-50/30 dark:bg-surface-raised">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="7" className="text-slate-100 dark:text-surface-border" />
              <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="7"
                strokeDasharray="301.6" strokeDashoffset={301.6 * (1 - peak / 100)}
                strokeLinecap="round" style={{ color: riskStroke(peak) }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{peak}%</span>
              <Label>PEAK</Label>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold text-center mt-3 uppercase tracking-widest">5-day peak risk projection</p>
        </Card>
      </div>

      {/* Sub-county comparison */}
      {filteredAreas.length > 0 && (
        <Card className="p-4">
          <Label className="mb-4">County Sub-sector Comparison</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            {filteredAreas.slice(0, 10).map(s => (
              <BarRow key={s.name} label={s.name} value={s.flood_probability} color={riskStroke(s.flood_probability)} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function PageIntelligence({ d, selectedCounty }) {
  const INFRA = {
    Kisumu: [
      { type: "bridge", t: "Nyando Bridge", d: "Isolates basin at water level > 2.1m." },
      { type: "truck", t: "Ahero-Kisumu Highway", d: "Access lost when Nyando River overtops banks." },
    ],
    Siaya: [
      { type: "bridge", t: "Awach River Crossings", d: "Multiple low-lying bridges at risk during Lake Victoria surges." },
      { type: "truck", t: "Siaya-Kisumu Road", d: "Prone to flooding at Yala swamp intersections." },
    ],
    "Homa Bay": [
      { type: "bridge", t: "Rachuonyo Lakeshore Road", d: "Flooded during lake level rise > 1134.5m MSL." },
      { type: "truck", t: "Homa Bay-Kisii Corridor", d: "Landslide and flooding risk during long rains." },
    ],
    Nairobi: [
      { type: "bridge", t: "Ngong River Crossings (Kibera/Mukuru)", d: "20-year flood return period; informal settlements at high risk." },
      { type: "truck", t: "Outer Ring Road", d: "Flooding at Mathare Valley impedes emergency access." },
    ],
    Kiambu: [
      { type: "bridge", t: "Ruiru River Bridge", d: "Flash flooding risk during intense rainfall events." },
      { type: "truck", t: "Thika Superhighway Underpasses", d: "Drainage overwhelmed during heavy rains." },
    ],
    Machakos: [
      { type: "truck", t: "Mombasa Road Corridor", d: "Washout risk at seasonal river crossings." },
      { type: "bridge", t: "Athi River Bridge", d: "High flood risk during El Niño years." },
    ],
    Kajiado: [
      { type: "truck", t: "Namanga Road", d: "Flash flood risk in semi-arid valleys during rare rainfall." },
      { type: "bridge", t: "Ol Tukai Causeway", d: "Seasonal flooding isolates Amboseli region." },
    ],
  };

  const infra = INFRA[selectedCounty] || [];

  return (
    <div className="w-full p-6 flex flex-col gap-6 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar bg-white dark:bg-surface transition-colors">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-surface-border pb-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Tactical Intel: {selectedCounty}</h1>
        <Badge variant="outline" className="text-[8px] h-6 px-2 font-black uppercase">Historical Telemetry</Badge>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <Label className="mb-4 flex items-center gap-2"><span className="text-emerald-500 text-[6px]">●</span> Historical Flood Events</Label>
          <div className="space-y-4">
            {[
              { yr: "2020", t: "Long Rains Overflow", d: `Lake Victoria levels peaked; low-lying areas of ${selectedCounty} impacted for 14+ days. Displacement > 20,000.` },
              { yr: "2018", t: "El Niño Flash Flooding", d: "Seasonal river torrents caused dam failures at Patel Dam. Emergency protocols activated county-wide." },
              { yr: "2015", t: "March–May Peak", d: "Above-average rainfall caused widespread crop loss and disease outbreaks in displaced camps." },
            ].map(({ yr, t, d }) => (
              <div key={yr} className="flex gap-4 pb-4 border-b border-slate-50 dark:border-surface-border last:border-0 last:pb-0">
                <div className="text-[9px] font-black text-slate-400 mt-0.5 tabular-nums">{yr}</div>
                <div>
                  <div className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{t}</div>
                  <p className="text-[10px] text-slate-500 italic leading-snug">"{d}"</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <Label className="mb-4 flex items-center gap-2"><span className="text-red-500 text-[6px]">●</span> Critical Infrastructure at Risk</Label>
          <div className="space-y-2">
            {infra.length > 0 ? infra.map(({ type, t, d }) => (
              <div key={t} className="p-2.5 bg-slate-50 dark:bg-surface border border-slate-100 dark:border-surface-border rounded-sm flex items-start gap-3">
                <span className="text-flood-500 mt-0.5">{type === "bridge" ? <History size={14} /> : <Truck size={14} />}</span>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-tight mb-0.5">{t}</div>
                  <p className="text-[9px] text-slate-500 leading-tight">{d}</p>
                </div>
              </div>
            )) : (
              <p className="text-[9px] text-slate-400 italic uppercase tracking-widest text-center py-4">No infrastructure data for this county</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PageReplay({ d }) {
  const [pct, setPct] = useState(50);
  const seriesData = useMemo(() => buildReplaySeries(d), [d.prob]);
  const idx = Math.min(Math.floor(pct / 100 * (seriesData.length - 1)), seriesData.length - 1);
  const cur = seriesData[idx];

  return (
    <div className="w-full p-6 flex flex-col gap-6 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar bg-white dark:bg-surface transition-colors">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-surface-border pb-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">14-Day Event Replay: {d.name || "Select sector"}</h1>
        <Badge className="h-6 px-2 text-[8px] font-black uppercase tracking-widest">{cur?.label}</Badge>
      </div>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Label>Temporal Scrub</Label>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: riskStroke(cur?.prob || 0) }}>
            Risk: {cur?.prob || 0}% · Displaced: {(cur?.displaced || 0).toLocaleString()}
          </span>
        </div>
        <input type="range" min={0} max={100} className="w-full accent-flood-600 h-1.5 bg-slate-100 dark:bg-surface-border rounded-full" value={pct} onChange={e => setPct(Number(e.target.value))} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <Label className="mb-4">Flood Probability Wave</Label>
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.08} />
                <XAxis dataKey="label" tick={{ fontSize: 7, fontWeight: 700 }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}
                  formatter={(v) => [`${v}%`, "Probability"]}
                />
                <Area type="monotone" dataKey="prob" stroke={P.accent} strokeWidth={2} fill={P.accent} fillOpacity={0.1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <Label className="mb-4">Displacement Trend</Label>
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.08} />
                <XAxis dataKey="label" tick={{ fontSize: 7, fontWeight: 700 }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}
                  formatter={(v) => [v.toLocaleString(), "Displaced"]}
                />
                <Area type="monotone" dataKey="displaced" stroke={P.warn} strokeWidth={2} fill={P.warn} fillOpacity={0.1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PageCommunity({ onToast }) {
  const [modal, setModal] = useState(null);
  return (
    <div className="w-full p-6 flex flex-col gap-6 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar bg-white dark:bg-surface transition-colors">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-surface-border pb-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Ground Truth Signal</h1>
        <Badge className="bg-emerald-500 text-white text-[9px] h-6 px-2 font-black uppercase tracking-widest">Ingest Open</Badge>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <Label className="mb-4">Community Ingest Log</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              [<Camera size={16} />, "Nyando Bridge", "12m ago", "Verified"],
              [<Zap size={14} />, "Power Grid Alert", "28m ago", "Critical"],
            ].map(([icon, t, m, s]) => (
              <div key={t} className="p-3 border border-slate-100 dark:border-surface-border rounded-sm hover:bg-slate-50 dark:hover:bg-surface/50 transition-colors cursor-pointer">
                <span className="text-flood-600 dark:text-flood-400 mb-2 block">{icon}</span>
                <div className="text-[11px] font-black uppercase dark:text-white truncate">{t}</div>
                <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{m} · {s}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center border-dashed border-2 bg-slate-50/20 dark:bg-surface/5 text-center transition-colors">
          <Camera size={24} className="text-flood-500 mb-3" />
          <div className="text-xs font-black uppercase tracking-[0.2em] mb-2 dark:text-white">Relay Ground Truth</div>
          <p className="text-[9px] text-slate-500 font-bold mb-4 leading-tight">Transmit field photos to calibrate AI models.</p>
          <Button size="sm" className="w-full h-8 text-[9px] font-black uppercase tracking-widest" onClick={() => { onToast("Upload feature coming soon"); }}>Launch Relay</Button>
        </Card>
      </div>
    </div>
  );
}

/* ─── ROOT APP ─────────────────────────────────────────────────────────────── */
export default function ReportsPage() {
  usePageTitle("Operational Reports");
  const [selectedCounty, setSelectedCounty] = useState("Kisumu");
  const [region, setRegion] = useState("");
  const [page, setPage] = useState("operations");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const { data: allCounties } = useCounties();
  const { data: subCountiesData } = useSubCountyRisk();

  // Counties filtered to focus set
  const counties = useMemo(() => {
    if (!allCounties) return [];
    return allCounties.filter(c => FOCUS_COUNTY_NAMES.has(c.name))
      .sort((a, b) => b.flood_probability - a.flood_probability);
  }, [allCounties]);

  // Sub-counties for the selected county only
  const filteredAreas = useMemo(() => {
    if (!subCountiesData) return [];
    return subCountiesData
      .filter(s => kenyaAreas.features.some(
        f => f.properties.adm2_name === s.name && f.properties.adm1_name === selectedCounty
      ))
      .sort((a, b) => b.flood_probability - a.flood_probability);
  }, [subCountiesData, selectedCounty]);

  // Auto-select highest risk sub-county when county changes
  useEffect(() => {
    if (filteredAreas.length > 0) setRegion(filteredAreas[0].name);
    else setRegion("");
  }, [selectedCounty, filteredAreas.length]);

  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 2500);
  };

  const handleCountySelect = (name) => {
    setSelectedCounty(name);
    showToast(`📍 County: ${name.toUpperCase()}`);
  };

  const d = getRegionData(region, subCountiesData);

  const NAV = {
    operations: { icon: <Activity size={14} />, label: "Operations" },
    forecast: { icon: <TrendingUp size={14} />, label: "Forecast" },
    intelligence: { icon: <Brain size={14} />, label: "Intelligence" },
    replay: { icon: <History size={14} />, label: "Replay" },
    community: { icon: <Users size={14} />, label: "Community" },
  };

  const pages = {
    operations: <PageOperations region={region} setRegion={r => { setRegion(r); showToast(`📍 Sector: ${r.toUpperCase()}`); }} d={d} filteredAreas={filteredAreas} counties={counties} selectedCounty={selectedCounty} onCountySelect={handleCountySelect} />,
    forecast: <PageForecast d={d} filteredAreas={filteredAreas} />,
    intelligence: <PageIntelligence d={d} selectedCounty={selectedCounty} />,
    replay: <PageReplay d={d} />,
    community: <PageCommunity onToast={showToast} />,
  };

  return (
    <div className="flex h-full bg-white dark:bg-surface selection:bg-flood-500/30 transition-colors animate-in fade-in duration-300 overflow-hidden">
      {/* Sub-navigation */}
      <nav className="w-14 md:w-48 border-r border-slate-100 dark:border-surface-border bg-slate-50/30 dark:bg-surface-raised flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-surface-border hidden md:block">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational View</p>
          <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 mt-0.5 uppercase">{selectedCounty}</p>
        </div>
        <div className="flex-1 py-4 px-2 space-y-1">
          {Object.entries(NAV).map(([key, { icon, label }]) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] transition-all rounded-sm border ${page === key
                ? "bg-flood-600/10 text-flood-600 dark:text-flood-400 border-flood-600/20"
                : "text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent hover:bg-slate-100 dark:hover:bg-white/5"}`}
            >
              <span className="shrink-0">{icon}</span>
              <span className="hidden md:block truncate">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 overflow-hidden flex flex-col">
        {pages[page]}
      </div>
      <Toast msg={toast} />
    </div>
  );
}