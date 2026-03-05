import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import useSubCountyRisk from "../hooks/useSubCountyRisk";

const aiHistory = [
  { role: "system", msg: "CrisisLens Intelligence Engine online. Real-time flood analysis active for Kisumu Region." },
  { role: "assistant", msg: "⚠️ Ahero zone showing critical divergence: risk 91% vs readiness 38%. Response gap: 53 points. Pre-positioning recommended immediately." },
];

const aiSuggestions = [
  "If rainfall continues 3 days, which villages face highest displacement?",
  "How many boats needed if Nyando hits 85%?",
  "Which hospitals will be affected in Ahero?",
  "What lessons from 2018 floods apply now?",
  "Generate an evacuation priority list for Kisumu zones",
  "What's the estimated economic impact if Ahero floods?",
];

const statusPulse = ["● LIVE", "○ LIVE"];

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
      // Fallback while loading
      return [
        { name: "Ahero", risk: 91, color: "#7c3aed" },
        { name: "Nyando", risk: 82, color: "#dc2626" },
        { name: "Winam", risk: 73, color: "#ea580c" },
        { name: "Kisumu Central", risk: 61, color: "#d97706" },
        { name: "Muhoroni", risk: 47, color: "#ca8a04" },
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
        let color = "#ca8a04";
        if (z.risk >= 85) color = "#7c3aed";
        else if (z.risk >= 70) color = "#dc2626";
        else if (z.risk >= 50) color = "#ea580c";
        else if (z.risk >= 30) color = "#d97706";
        return { ...z, color };
      });
  }, [subCounties]);

  const maxRiskZone = liveZones[0] || { name: "N/A", risk: 0 };
  const alertPhase = maxRiskZone.risk >= 75 ? "ACTION REQUIRED" : maxRiskZone.risk >= 50 ? "ELEVATED PHASE" : "MONITORING";
  const alertColor = maxRiskZone.risk >= 75 ? "#dc2626" : maxRiskZone.risk >= 50 ? "#ea580c" : "#16a34a";

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

Current operational data:
- Ahero zone: risk 91%, readiness 38%, population 9,200 (highly vulnerable)
- Nyando: risk 82%, readiness 54%, population 18,400
- Kisumu Central: risk 61%, readiness 70%, population 42,000
- Muhoroni: risk 47%, readiness 62%, population 15,600
- Winam: risk 73%, readiness 45%, population 28,000

Active alert phase: ACTION REQUIRED
Forecast window: 7 days, high confidence
Available resources: 18 boats (12 deployed), 2400 tents (1100 used), 340 volunteers (210 active)

Be concise, tactical, and data-driven. Use bullet points and numbers. Start responses with a relevant emoji. Format clearly for field use. Target your advice towards the area of interest: ${targetArea}.`
            },
            ...newMsgs.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.msg }))
          ]
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Intelligence engine processing...";
      setMessages([...newMsgs, { role: "assistant", msg: reply }]);
    } catch {
      setMessages([...newMsgs, { role: "assistant", msg: "⚠️ Intelligence engine offline. Check network connection." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{
      height: "100vh",
      background: "#f5f7fa",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color: "#1a202c",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* HEADER */}
      <div style={{
        background: "#ffffff",
        borderBottom: "2px solid #dc2626",
        padding: "0 28px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              border: "2px solid #dc2626",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, background: "#fff1f1",
            }}>🌊</div>
            <div style={{
              position: "absolute", top: -1, right: -1,
              width: 10, height: 10, borderRadius: "50%",
              background: "#16a34a",
              boxShadow: "0 0 6px #16a34a",
              animation: "glow 1.5s infinite",
            }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 4, color: "#111827" }}>CRISISLENS</div>
            <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: 2, fontFamily: "'Inter', sans-serif" }}>AI INTELLIGENCE ENGINE · KISUMU FLOOD OPS</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "#9ca3af", letterSpacing: 2 }}>ALERT PHASE</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: alertColor, letterSpacing: 2 }}>{alertPhase}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "#9ca3af", letterSpacing: 2 }}>MAX RISK</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: maxRiskZone.color }}>{maxRiskZone.name.toUpperCase()} {maxRiskZone.risk}%</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "#9ca3af", letterSpacing: 2 }}>STATUS</div>
            <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>{statusPulse[tick % 2]}</div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* CHAT */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16, background: "#f5f7fa" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: m.role === "user" ? "#dbeafe" : m.role === "system" ? "#f3f4f6" : "#dcfce7",
                  border: `1px solid ${m.role === "user" ? "#93c5fd" : m.role === "system" ? "#e5e7eb" : "#86efac"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>
                  {m.role === "user" ? "👤" : "🌊"}
                </div>
                <div style={{
                  maxWidth: "72%",
                  padding: "12px 16px",
                  borderRadius: m.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                  fontSize: 13,
                  lineHeight: 1.7,
                  background: m.role === "user" ? "#eff6ff" : m.role === "system" ? "#f9fafb" : "#f0fdf4",
                  border: `1px solid ${m.role === "user" ? "#bfdbfe" : m.role === "system" ? "#e5e7eb" : "#bbf7d0"}`,
                  color: m.role === "system" ? "#9ca3af" : "#1f2937",
                  whiteSpace: "pre-wrap",
                  fontStyle: m.role === "system" ? "italic" : "normal",
                  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}>
                  {m.role !== "user" && m.role !== "system" && (
                    <div style={{ fontSize: 9, color: "#16a34a", letterSpacing: 2, marginBottom: 6, fontWeight: 700 }}>CRISISLENS INTELLIGENCE</div>
                  )}
                  {m.role === "user" && (
                    <div style={{ fontSize: 9, color: "#2563eb", letterSpacing: 2, marginBottom: 6, fontWeight: 700, textAlign: "right" }}>OPERATOR QUERY</div>
                  )}
                  {m.msg}
                </div>
              </div>
            ))}

            {/* Suggestions */}
            {showSuggestions && (
              <div style={{ padding: "8px 0 0 44px" }}>
                <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: 2, marginBottom: 10 }}>SUGGESTED INTELLIGENCE QUERIES</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {aiSuggestions.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)}
                      style={{
                        padding: "7px 14px", background: "#ffffff", border: "1px solid #e5e7eb",
                        borderRadius: 20, fontSize: 11, color: "#6b7280", cursor: "pointer",
                        fontFamily: "'Inter', sans-serif", transition: "all 0.15s", textAlign: "left",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#16a34a"; e.currentTarget.style.color = "#15803d"; e.currentTarget.style.background = "#f0fdf4"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.background = "#ffffff"; }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dcfce7", border: "1px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center" }}>🌊</div>
                <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "4px 12px 12px 12px", fontSize: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 9, color: "#16a34a", letterSpacing: 2, marginBottom: 6, fontWeight: 700 }}>CRISISLENS INTELLIGENCE</div>
                  <span style={{ color: "#15803d" }}>Analyzing operational data</span>
                  <span style={{ animation: "blink 1s infinite", color: "#16a34a" }}> ▋</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "16px 28px 20px",
            borderTop: "1px solid #e5e7eb",
            background: "#ffffff",
            flexShrink: 0,
            boxShadow: "0 -1px 8px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask the intelligence engine... (Enter to send, Shift+Enter for new line)"
                  rows={3}
                  style={{
                    width: "100%", background: "#f9fafb", border: "1px solid #d1d5db",
                    borderRadius: 8, padding: "14px 16px", color: "#1f2937",
                    fontSize: 14, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", outline: "none",
                    resize: "none", lineHeight: 1.6, transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#16a34a"}
                  onBlur={e => e.target.style.borderColor = "#d1d5db"}
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  padding: "12px 22px", height: 56,
                  background: loading || !input.trim() ? "#f3f4f6" : "#16a34a",
                  border: "none", borderRadius: 8,
                  color: loading || !input.trim() ? "#9ca3af" : "#ffffff",
                  fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 700,
                  letterSpacing: 1, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  transition: "all 0.2s", whiteSpace: "nowrap",
                }}>
                {loading ? "..." : "SEND ↑"}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 9, color: "#d1d5db", letterSpacing: 1 }}>
              CRISISLENS v2.1 · KISUMU FLOOD INTELLIGENCE SYSTEM · ALL DATA IS OPERATIONAL
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{
          width: 260,
          borderLeft: "1px solid #e5e7eb",
          background: "#ffffff",
          display: "flex", flexDirection: "column",
          flexShrink: 0, overflowY: "auto",
          boxShadow: "-1px 0 6px rgba(0,0,0,0.04)",
        }}>

          {/* Live Zone Risk */}
          <div style={{ padding: 18, borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: 2, marginBottom: 14 }}>LIVE ZONE RISK</div>
            {liveZones.map((z, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{z.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: z.color }}>{z.risk}%</span>
                </div>
                <div style={{ height: 4, background: "#f3f4f6", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${z.risk}%`, background: z.color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Queries */}
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: 2, marginBottom: 12 }}>QUICK QUERIES</div>
            {aiSuggestions.map((s, i) => (
              <div key={i} onClick={() => sendMessage(s)}
                style={{
                  padding: "9px 11px", marginBottom: 7, background: "#f9fafb",
                  border: "1px solid #e5e7eb", borderRadius: 6,
                  fontSize: 10, color: "#6b7280", cursor: "pointer", lineHeight: 1.5,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#86efac"; e.currentTarget.style.color = "#15803d"; e.currentTarget.style.background = "#f0fdf4"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.background = "#f9fafb"; }}>
                "{s}"
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #16a34a; }
          50% { opacity: 0.5; box-shadow: 0 0 2px #16a34a; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f9fafb; }
        ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
        textarea::placeholder { color: #9ca3af; }
      `}</style>
    </div>
  );
}