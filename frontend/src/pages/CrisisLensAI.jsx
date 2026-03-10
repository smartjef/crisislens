import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import useSubCountyRisk from "../hooks/useSubCountyRisk";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

const aiHistory = [
  { role: "system", msg: "CrisisLens Intelligence Engine online. Real-time flood analysis active for Kisumu Region." },
  { role: "assistant", msg: "⚠️ Ahero zone showing critical divergence: risk 91% vs readiness 38%. Response gap: 53 points. Pre-positioning recommended immediately." },
];

const aiSuggestions = [
  "Village displacement forecast?",
  "Nyando 85% boat needs?",
  "Ahero hospital impact?",
  "2018 flood lessons?",
  "Evacuation priority list?",
  "Ahero economic impact?",
];

export default function CrisisLensAI() {
  const [searchParams] = useSearchParams();
  const areaContext = searchParams.get('area');
  const countyContext = searchParams.get('county');
  const targetArea = areaContext || 'Kisumu Region';

  const [messages, setMessages] = useState(
    areaContext
      ? [{ role: "system", msg: `CrisisLens Intelligence Engine online. Real-time analysis active for ${areaContext}.` }]
      : aiHistory
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(!areaContext);
  const bottomRef = useRef(null);
  const hasInitializedArea = useRef(false);

  // Fetch real-time sub-county data
  const { data: subCounties } = useSubCountyRisk();

  const liveZones = useMemo(() => {
    if (!subCounties || subCounties.length === 0) {
      return [
        { name: "Ahero", risk: 91, color: "#ef4444" },
        { name: "Nyando", risk: 82, color: "#ef4444" },
        { name: "Winam", risk: 73, color: "#f59e0b" },
        { name: "Kisumu Central", risk: 61, color: "#f59e0b" },
        { name: "Muhoroni", risk: 47, color: "#10b981" },
      ];
    }

    return subCounties
      .map(sc => ({
        name: sc.name,
        risk: sc.flood_probability || 0
      }))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 5)
      .map(z => {
        let color = "#10b981";
        if (z.risk >= 85) color = "#ef4444";
        else if (z.risk >= 70) color = "#ef4444";
        else if (z.risk >= 50) color = "#f59e0b";
        else if (z.risk >= 30) color = "#f59e0b";
        return { ...z, color };
      });
  }, [subCounties]);

  const maxRiskZone = liveZones[0] || { name: "N/A", risk: 0 };
  const alertPhase = maxRiskZone.risk >= 75 ? "ACTION REQUIRED" : maxRiskZone.risk >= 50 ? "ELEVATED PHASE" : "MONITORING";
  const alertColor = maxRiskZone.risk >= 75 ? "text-red-600 dark:text-red-400" : maxRiskZone.risk >= 50 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (areaContext && !hasInitializedArea.current) {
      hasInitializedArea.current = true;
      const initialSys = [{ role: "system", msg: `CrisisLens Intelligence Engine online. Real-time analysis active for ${areaContext}.` }];
      sendMessage(`Please provide real-time ground information and current risk assessment for ${areaContext}${countyContext ? `, ${countyContext} County` : ''}.`, initialSys);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaContext, countyContext]);

  const sendMessage = async (msg, currentMessages = messages) => {
    const userMsg = msg || input;
    if (!userMsg.trim() || loading) return;
    setInput("");
    setShowSuggestions(false);
    const newMsgs = [...currentMessages, { role: "user", msg: userMsg }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_API_TOKEN}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system", content: `You are CrisisLens, an elite flood crisis intelligence analyst for Western Kenya (focusing on ${targetArea}). You have deep expertise in flood forecasting, humanitarian logistics, and disaster response.
Highly concise, tactical responses. Bullet points. No fluff. Area: ${targetArea}.`
            },
            ...newMsgs.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.msg }))
          ]
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Processing...";
      setMessages([...newMsgs, { role: "assistant", msg: reply }]);
    } catch {
      setMessages([...newMsgs, { role: "assistant", msg: "⚠️ Engine offline. Check connection." }]);
    }
    setLoading(false);
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-surface text-slate-900 dark:text-white font-sans flex flex-col overflow-hidden transition-colors duration-200">

      {/* HEADER - CONCISE */}
      <header className="fixed top-0 left-0 right-0 h-[56px] bg-white dark:bg-surface border-b border-red-600 dark:border-red-700 px-5 flex items-center justify-between z-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-sm border border-red-600 dark:border-red-700 bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-base">🌊</div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-[0.15em] text-slate-900 dark:text-white uppercase leading-none">CrisisLens AI</h1>
            <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.05em] mt-1">Intelligence Layer • Kisumu Ops</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center hidden sm:block">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Alert Phase</p>
            <p className={`text-[10px] font-black tracking-tight ${alertColor}`}>{alertPhase}</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Risk</p>
            <p className="text-[10px] font-black tracking-tight uppercase" style={{ color: maxRiskZone.color }}>{maxRiskZone.name} {maxRiskZone.risk}%</p>
          </div>
          <div className="flex items-center px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/10 rounded-sm border border-emerald-100 dark:border-emerald-900/20">
            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{tick % 2 === 0 ? "● LIVE" : "○ LIVE"}</span>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex pt-[56px] overflow-hidden">

        {/* CHAT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-surface/50">

          {/* MESSAGES - COMPACT */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="max-w-3xl mx-auto w-full space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"} items-start`}>
                  <div className={`w-7 h-7 rounded-sm flex items-center justify-center text-sm flex-shrink-0 ${m.role === "user" ? "bg-slate-200 dark:bg-surface-border text-slate-600" : "bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/30"}`}>
                    {m.role === "user" ? "👤" : "🌊"}
                  </div>
                  <div className={`flex-1 max-w-[85%] ${m.role === "user" ? "text-right" : "text-left"}`}>
                    <div className={`text-[8px] font-black uppercase tracking-widest mb-1.5 ${m.role === "user" ? "text-slate-400" : "text-flood-500"}`}>
                      {m.role === "user" ? "Operator" : m.role === "system" ? "Protocol" : "Intelligence"}
                    </div>
                    <div className={`p-3 rounded-sm text-xs leading-snug transition-colors border ${m.role === "user" ? "bg-white dark:bg-surface-raised border-slate-200 dark:border-surface-border text-slate-800 dark:text-slate-200" : m.role === "system" ? "bg-slate-100/50 dark:bg-surface italic text-slate-500 border-transparent" : "bg-white dark:bg-surface border-slate-200 dark:border-surface-border text-slate-800 dark:text-slate-200"}`}>
                      {m.msg}
                    </div>
                  </div>
                </div>
              ))}

              {/* SUGGESTIONS - CONCISE */}
              {showSuggestions && (
                <div className="pt-2 pl-10">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Tactical Presets</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        className="px-3 py-1.5 bg-white dark:bg-surface-raised border border-slate-200 dark:border-surface-border rounded-sm text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:border-flood-500 dark:hover:border-flood-600 hover:text-flood-600 transition-all text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex gap-3 items-center animate-pulse">
                  <div className="w-7 h-7 rounded-sm bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/30 flex items-center justify-center">🌊</div>
                  <div className="flex-1">
                    <div className="text-[8px] font-black text-flood-500 uppercase tracking-widest mb-1.5">Processing Telemetry...</div>
                    <div className="h-8 bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm w-full" />
                  </div>
                </div>
              )}
            </div>
            <div ref={bottomRef} />
          </div>

          {/* INPUT BAR - HIGHLY COMPACT */}
          <footer className="p-4 bg-white dark:bg-surface border-t border-slate-200 dark:border-surface-border transition-colors">
            <div className="max-w-3xl mx-auto flex gap-3 items-center">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Query intelligence..."
                  rows={1}
                  className="w-full bg-slate-50 dark:bg-surface-border/10 border border-slate-200 dark:border-surface-border rounded-sm px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-flood-500 transition-colors resize-none custom-scrollbar h-[38px] leading-tight"
                />
              </div>
              <Button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="h-[38px] px-6 font-black uppercase tracking-widest text-[10px]"
              >
                {loading ? "..." : "SEND"}
              </Button>
            </div>
            <p className="max-w-3xl mx-auto mt-3 text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
              CrisisLens Intelligence Unit • v3.5 Highly Compact
            </p>
          </footer>
        </div>

        {/* SIDEBAR - COMPACT */}
        <aside className="hidden lg:flex w-[260px] flex-col border-l border-slate-200 dark:border-surface-border bg-white dark:bg-surface transition-colors overflow-y-auto custom-scrollbar">

          <div className="p-4 border-b border-slate-100 dark:border-surface-border">
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Area Risk Telemetry</h3>
            <div className="space-y-4">
              {liveZones.map((z, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-black text-slate-900 dark:text-slate-300 uppercase truncate pr-2">{z.name}</span>
                    <span className="text-[10px] font-black tabular-nums" style={{ color: z.color }}>{z.risk}%</span>
                  </div>
                  <div className="h-1 bg-slate-100 dark:bg-surface-border/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${z.risk}%`, backgroundColor: z.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Tactical Presets</h3>
            <div className="space-y-1">
              {aiSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="w-full px-3 py-2 bg-slate-50/50 dark:bg-surface-border/5 border border-slate-100 dark:border-surface-border rounded-sm text-[9px] font-bold text-slate-500 dark:text-slate-400 text-left hover:border-flood-500/30 hover:text-flood-600 transition-all leading-relaxed"
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}