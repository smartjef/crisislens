/**
 * BroadcastPage.jsx
 *
 * Early Warning Broadcast Composer + history log.
 * Steps:
 *   1 — Select channel (SMS / WhatsApp / Email)
 *   2 — Select counties to target
 *   3 — Compose message (char count, template library)
 *   4 — Preview + confirm → dispatch via OnfonMedia
 *   5 — Delivery status tracker
 *
 * Uses: POST /api/broadcasts/ + POST /api/broadcasts/:id/send/
 */
import React, { useEffect, useState } from "react";
import {
  CheckCircle, ChevronRight, Globe, Loader2, Mail,
  MessageCircle, MessageSquare, RefreshCw, Send, X,
} from "lucide-react";
import client from "../api/client";

const CHANNEL_INFO = {
  sms:       { label: "SMS",       icon: <MessageSquare className="w-5 h-5" />, limit: 320,  color: "border-cyan-400 dark:border-cyan-700    bg-cyan-50  dark:bg-cyan-900/30    text-cyan-700 dark:text-cyan-400" },
  whatsapp:  { label: "WhatsApp",  icon: <MessageCircle className="w-5 h-5" />, limit: 1000, color: "border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  email:     { label: "Email",     icon: <Mail className="w-5 h-5" />,          limit: 5000, color: "border-violet-400 dark:border-violet-700  bg-violet-50  dark:bg-violet-900/30  text-violet-700 dark:text-violet-400" },
};

const SMS_TEMPLATES = [
  {
    label: "Flood Alert",
    text:  "CRISISLENS ALERT: Flood risk is HIGH in {county}. Avoid low-lying areas & riverbanks. Evacuate if told to do so. For help: 999.",
  },
  {
    label: "Evacuation Notice",
    text:  "CRISISLENS: EVACUATION ORDER for {county}. Move immediately to nearest evacuation centre. Do NOT delay. Emergency line: 0800-723-999.",
  },
  {
    label: "All-Clear",
    text:  "CRISISLENS UPDATE: Flood risk has subsided in {county}. Exercise caution; avoid damaged infrastructure. Govt of Kenya.",
  },
  {
    label: "Standby Warning",
    text:  "CRISISLENS WATCH: Rising flood risk in {county}. Stay alert, avoid river corridors. Updates every 6 hours. Govt of Kenya.",
  },
];

const STATUS_BADGE = {
  draft:   "text-slate-500 dark:text-slate-400  border-slate-300 dark:border-slate-600",
  sending: "text-amber-600 dark:text-amber-400  border-amber-400 dark:border-amber-700",
  sent:    "text-emerald-600 dark:text-emerald-400 border-emerald-400 dark:border-emerald-700",
  failed:  "text-red-600 dark:text-red-400    border-red-400 dark:border-red-700",
};

// ── Broadcast history row ─────────────────────────────────────────────────────
function BroadcastRow({ broadcast }) {
  const ch = CHANNEL_INFO[broadcast.channel];
  return (
    <div className="rounded border border-slate-200 dark:border-surface-border bg-white dark:bg-surface-raised px-4 py-3 flex items-center gap-4">
      <span className={`text-[9px] font-mono uppercase px-2 py-1 rounded border ${STATUS_BADGE[broadcast.status]}`}>
        {broadcast.status}
      </span>
      <span className={`text-[10px] font-mono uppercase ${ch?.color?.split(" ")[2] || "text-slate-400"}`}>
        {ch?.label || broadcast.channel}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate">{broadcast.message.slice(0, 80)}</p>
        <p className="text-[9px] font-mono text-slate-600">
          {(broadcast.counties_list || []).map((c) => c.name).join(", ")}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{broadcast.delivered_count}/{broadcast.recipient_count}</p>
        <p className="text-[9px] font-mono text-slate-600">
          {broadcast.sent_at ? new Date(broadcast.sent_at).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
        </p>
      </div>
    </div>
  );
}

// ── Wizard ────────────────────────────────────────────────────────────────────
function BroadcastWizard({ counties, onClose, onSent }) {
  const [step, setStep]           = useState(1);
  const [channel, setChannel]     = useState("sms");
  const [selected, setSelected]   = useState([]);
  const [message, setMessage]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [broadcastId, setBroadcastId] = useState(null);
  const [result, setResult]       = useState(null);

  const limit = CHANNEL_INFO[channel]?.limit || 320;

  const toggleCounty = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const applyTemplate = (t) => {
    const countyNames = counties.filter((c) => selected.includes(c.id)).map((c) => c.name).join(", ") || "{county}";
    setMessage(t.text.replace("{county}", countyNames));
  };

  const create = () => {
    if (!message.trim() || selected.length === 0) { setError("Select counties and compose a message."); return; }
    setSaving(true); setError("");
    client.post("/api/broadcasts/", { channel, counties: selected, message })
      .then((res) => { setBroadcastId(res.data.id); setStep(4); })
      .catch((e) => setError(e.response?.data?.detail || "Failed to create broadcast."))
      .finally(() => setSaving(false));
  };

  const dispatch = () => {
    setSaving(true); setError("");
    client.post(`/api/broadcasts/${broadcastId}/send/`)
      .then((res) => { setResult(res.data); setStep(5); onSent(res.data); })
      .catch((e) => setError(e.response?.data?.detail || "Dispatch failed."))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded border border-slate-200 dark:border-surface-border bg-white dark:bg-surface-raised">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-surface-border">
          <div className="flex items-center gap-3">
            {[1,2,3,4,5].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold
                  ${step === s ? "bg-flood-600 text-white" : step > s ? "bg-emerald-700 text-white" : "bg-slate-800 text-slate-500"}`}>
                  {step > s ? "✓" : s}
                </div>
                {s < 5 && <div className={`h-px w-6 ${step > s ? "bg-emerald-700" : "bg-slate-700"}`} />}
              </React.Fragment>
            ))}
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="text-[11px] text-red-400 bg-red-900/20 border border-red-800 px-3 py-2 rounded">{error}</p>}

          {/* Step 1 — Channel */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Step 1 — Select Channel</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(CHANNEL_INFO).map(([key, info]) => (
                  <button key={key} onClick={() => setChannel(key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded border transition-all
                      ${channel === key ? info.color : "border-slate-200 dark:border-surface-border text-slate-400 hover:border-slate-500"}`}>
                    {info.icon}
                    <span className="text-xs font-mono uppercase">{info.label}</span>
                    <span className="text-[9px] text-slate-500">{info.limit} chars</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Counties */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Step 2 — Target Counties</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {counties.map((c) => (
                  <button key={c.id} onClick={() => toggleCounty(c.id)}
                    className={`text-left px-3 py-2 rounded border text-[11px] font-mono transition-colors
                      ${selected.includes(c.id) ? "border-flood-600 bg-flood-900/30 text-flood-300" : "border-slate-200 dark:border-surface-border text-slate-400 hover:border-slate-500"}`}>
                    {selected.includes(c.id) ? "✓ " : ""}{c.name}
                  </button>
                ))}
              </div>
              <p className="text-[9px] font-mono text-slate-600">{selected.length} counties selected</p>
            </div>
          )}

          {/* Step 3 — Compose */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Step 3 — Compose Message</p>
              {/* Templates */}
              <div className="flex gap-2 flex-wrap">
                {SMS_TEMPLATES.map((t) => (
                  <button key={t.label} onClick={() => applyTemplate(t)}
                    className="text-[9px] font-mono px-2 py-1 rounded border border-slate-200 dark:border-surface-border text-slate-400 hover:border-flood-600 hover:text-flood-400 transition-colors">
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                rows={6}
                maxLength={limit}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-surface-border rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:border-flood-600 font-mono"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Compose your ${CHANNEL_INFO[channel].label} message…`}
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>{Math.ceil(message.length / 160)} SMS segment{message.length > 160 ? "s" : ""}</span>
                <span className={message.length > limit * 0.9 ? "text-red-400" : ""}>{message.length}/{limit}</span>
              </div>
            </div>
          )}

          {/* Step 4 — Preview */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Step 4 — Review & Dispatch</p>
              <div className="rounded border border-slate-200 dark:border-surface-border bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono uppercase px-2 py-1 rounded border ${CHANNEL_INFO[channel].color}`}>{CHANNEL_INFO[channel].label}</span>
                  <span className="text-[10px] font-mono text-slate-400">{selected.length} counties targeted</span>
                </div>
                <div className="font-mono text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-100 dark:bg-slate-800 rounded p-3 border border-slate-700">
                  {message}
                </div>
                <p className="text-[10px] font-mono text-slate-500">
                  Recipients: all active {CHANNEL_INFO[channel].label} contacts in selected counties
                </p>
              </div>
              <p className="text-[10px] font-mono text-amber-400">
                ⚠ This will dispatch a live broadcast. Ensure message is verified before sending.
              </p>
            </div>
          )}

          {/* Step 5 — Sent */}
          {step === 5 && result && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Broadcast Dispatched</p>
              <div className="grid grid-cols-3 gap-4">
                {[["Recipients", result.recipient_count], ["Delivered", result.delivered_count], ["Failed", result.failed_count]].map(([l, v]) => (
                  <div key={l} className="rounded border border-slate-200 dark:border-surface-border bg-slate-50 dark:bg-surface p-3 text-center">
                    <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200">{v ?? "—"}</p>
                    <p className="text-[9px] font-mono text-slate-500 uppercase">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {step < 5 && (
          <div className="flex justify-between px-5 py-3 border-t border-slate-200 dark:border-surface-border">
            <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              className="px-4 py-2 text-sm font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              {step === 1 ? "Cancel" : "← Back"}
            </button>
            {step < 3 && (
              <button onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-mono bg-flood-600 text-white rounded hover:bg-flood-500">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 3 && (
              <button onClick={create} disabled={saving || !message.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-mono bg-flood-600 text-white rounded hover:bg-flood-500 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                Preview
              </button>
            )}
            {step === 4 && (
              <button onClick={dispatch} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-mono bg-red-700 text-white rounded hover:bg-red-600 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Broadcast
              </button>
            )}
          </div>
        )}
        {step === 5 && (
          <div className="flex justify-center px-5 py-3 border-t border-slate-200 dark:border-surface-border">
            <button onClick={onClose} className="px-6 py-2 text-sm font-mono bg-slate-700 text-white rounded hover:bg-slate-600">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [counties, setCounties]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      client.get("/api/broadcasts/?page_size=50"),
      client.get("/api/counties/"),
    ]).then(([bRes, cRes]) => {
      setBroadcasts(bRes.data.results || bRes.data);
      setCounties(cRes.data.results || cRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSent = (b) => setBroadcasts((prev) => [b, ...prev]);

  const sent     = broadcasts.filter((b) => b.status === "sent").length;
  const delivered = broadcasts.reduce((s, b) => s + (b.delivered_count || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200 font-['IBM_Plex_Condensed']">
            EARLY WARNING BROADCASTS
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-widest">
            {sent} broadcasts sent · {delivered.toLocaleString()} total delivered
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 dark:border-surface-border text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-red-700 bg-red-900/30 text-[11px] font-mono text-red-400 hover:bg-red-800/40 transition-colors">
            <Send className="w-3.5 h-3.5" />
            New Broadcast
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "SMS Sent",     value: broadcasts.filter(b=>b.channel==="sms"&&b.status==="sent").length,   color: "text-cyan-400" },
          { label: "Total Sent",   value: sent,                                                                  color: "text-slate-800 dark:text-slate-200" },
          { label: "Delivered",    value: delivered.toLocaleString(),                                            color: "text-emerald-400" },
          { label: "Failed",       value: broadcasts.reduce((s,b)=>s+(b.failed_count||0),0).toLocaleString(),   color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded border border-slate-200 dark:border-surface-border bg-white dark:bg-surface-raised px-3 py-2">
            <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Broadcast History</p>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No broadcasts yet.</p>
          </div>
        ) : (
          broadcasts.map((b) => <BroadcastRow key={b.id} broadcast={b} />)
        )}
      </div>

      {wizardOpen && (
        <BroadcastWizard counties={counties} onClose={() => setWizardOpen(false)} onSent={handleSent} />
      )}
    </div>
  );
}
