import { useState, useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "react-router-dom";
import useSubCountyRisk from "../hooks/useSubCountyRisk";
import client from "../api/client";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { usePageTitle } from "../hooks/usePageTitle";
import { Waves, Brain, User, Send, Info, Workflow } from "lucide-react";

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
  usePageTitle("CrisisLens Intelligence Engine");
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
      const res = await client.post("/api/ai/chat/", {
        message: userMsg,
        county: countyContext || 'National',
        area: areaContext || 'General'
      });
      setMessages([...newMsgs, { role: "assistant", msg: res.data.message }]);
    } catch {
      setMessages([...newMsgs, { role: "assistant", msg: "⚠️ Engine offline. Check connection." }]);
    }
    setLoading(false);
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-surface text-slate-900 dark:text-white font-sans flex flex-col overflow-hidden transition-colors duration-200 animate-in fade-in">

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">

        {/* CHAT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-surface/50">

          {/* MESSAGES - COMPACT */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="max-w-3xl mx-auto w-full space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"} items-start`}>
                  <div className={`w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0 ${m.role === "user" ? "bg-slate-200 dark:bg-surface-border text-slate-600" : "bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/30"}`}>
                    {m.role === "user" ? <User size={14} /> : <Waves size={14} />}
                  </div>
                  <div className={`flex-1 max-w-[85%] ${m.role === "user" ? "text-right" : "text-left"}`}>
                    <div className={`text-[8px] font-black uppercase tracking-widest mb-1.5 ${m.role === "user" ? "text-slate-400" : "text-flood-500"}`}>
                      {m.role === "user" ? "Operator" : m.role === "system" ? "Protocol" : "Intelligence"}
                    </div>
                    <div className={`p-3 rounded-sm text-xs leading-snug transition-colors border ${m.role === "user" ? "bg-white dark:bg-surface-raised border-slate-200 dark:border-surface-border text-slate-800 dark:text-slate-200" : m.role === "system" ? "bg-slate-100/50 dark:bg-surface italic text-slate-500 border-transparent" : "bg-white dark:bg-surface border-slate-200 dark:border-surface-border text-slate-800 dark:text-slate-200"}`}>
                      {m.role === "assistant" ? (
                        <div className="prose-tactical dark:prose-invert">
                          <ReactMarkdown>{m.msg}</ReactMarkdown>
                        </div>
                      ) : (
                        m.msg
                      )}
                    </div>
                  </div>
                </div>
              ))}

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
                  <div className="w-7 h-7 rounded-sm bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/30 flex items-center justify-center">
                    <Waves size={14} />
                  </div>
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
              <div className="flex-1 text-slate-900 dark:text-white">
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
                  className="w-full bg-slate-50 dark:bg-surface-border/10 border border-slate-200 dark:border-surface-border rounded-sm px-3 py-2.5 text-xs outline-none focus:border-flood-500 transition-colors resize-none custom-scrollbar h-[38px] leading-tight"
                />
              </div>
              <Button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="h-[38px] px-6 font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
              >
                {loading ? "..." : <><Send size={12} /> SEND</>}
              </Button>
            </div>
          </footer>
        </div>

        {/* SIDEBAR - COMPACT */}
        <aside className="hidden lg:flex w-[260px] flex-col border-l border-slate-200 dark:border-surface-border bg-white dark:bg-surface transition-colors overflow-y-auto custom-scrollbar">
          {/* Engine Status Block */}
          <div className="p-4 border-b border-slate-100 dark:border-surface-border bg-slate-50/30 dark:bg-surface-raised">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={12} className="text-flood-600 dark:text-flood-400" />
              <h3 className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Dossier Status</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Alert Phase</p>
                <p className={`text-[10px] font-black tracking-tight leading-none ${alertColor}`}>{alertPhase}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Telemetry</p>
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">{tick % 2 === 0 ? "● ONLINE" : "○ ONLINE"}</p>
                </div>
                <Badge variant="outline" className="text-[7px] font-black h-4 px-1 tracking-widest">v4.0o</Badge>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 dark:border-surface-border">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Workflow size={10} className="text-slate-400" />
                <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Area Risk</h3>
              </div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Sector Peak</span>
            </div>
            <div className="space-y-4">
              <div className="mb-4 p-2 bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 rounded-sm">
                <p className="text-[7px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Max Risk Vector</p>
                <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white">{maxRiskZone.name} {maxRiskZone.risk}%</p>
              </div>

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
            <div className="flex items-center gap-2 mb-4">
              <Info size={10} className="text-slate-400" />
              <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Tactical Presets</h3>
            </div>
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