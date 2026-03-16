/**
 * IncidentPage.jsx
 *
 * Full incident lifecycle management board.
 * Columns (Kanban-style): OPEN → ACTIVE → CONTAINED → CLOSED
 * Features:
 *   - Create incident modal
 *   - Status transitions with confirmation
 *   - Timeline of updates per incident
 *   - Severity / type badges
 *   - Affected population counter
 *   - Assign to broadcast
 */
import React, { useEffect, useState } from "react";
import {
  AlertCircle, ChevronRight, Clock, MapPin, MessageSquare,
  Plus, RefreshCw, Users, X, Loader2, CheckCircle,
} from "lucide-react";
import client from "../api/client";
import { useAlertStore } from "../store/useAlertStore";

const SEVERITY_STYLES = {
  critical: "text-red-600 dark:text-red-400    border-red-400 dark:border-red-700    bg-red-50  dark:bg-red-900/30",
  high:     "text-orange-600 dark:text-orange-400 border-orange-400 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30",
  medium:   "text-amber-600 dark:text-amber-400  border-amber-400 dark:border-amber-700  bg-amber-50 dark:bg-amber-900/30",
  low:      "text-slate-600 dark:text-slate-400  border-slate-300 dark:border-slate-700  bg-slate-50 dark:bg-slate-800",
};

const STATUS_COLS = [
  { key: "open",      label: "OPEN",      color: "border-red-400 dark:border-red-700    text-red-600 dark:text-red-400" },
  { key: "active",    label: "ACTIVE",    color: "border-orange-400 dark:border-orange-700 text-orange-600 dark:text-orange-400" },
  { key: "contained", label: "CONTAINED", color: "border-amber-400 dark:border-amber-700  text-amber-600 dark:text-amber-400" },
  { key: "closed",    label: "CLOSED",    color: "border-slate-300 dark:border-slate-700  text-slate-500 dark:text-slate-500" },
];

const TYPE_ICONS = {
  flood:          "🌊",
  drought:        "☀️",
  landslide:      "⛰️",
  infrastructure: "🏗️",
  displacement:   "🚶",
  other:          "📋",
};

// ── Timeline entry ────────────────────────────────────────────────────────────
function TimelineEntry({ update }) {
  return (
    <div className="flex gap-2 items-start">
      <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${update.is_system ? "bg-slate-400 dark:bg-slate-600" : "bg-cyan-500"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">{update.body}</p>
        <p className="text-[9px] font-mono text-slate-600 mt-0.5">
          {update.author_name || "System"} · {new Date(update.timestamp).toLocaleString("en-KE")}
        </p>
      </div>
    </div>
  );
}

// ── Incident card ─────────────────────────────────────────────────────────────
function IncidentCard({ incident, onStatusChange, onSelect }) {
  return (
    <div
      className="rounded border border-slate-200 dark:border-surface-border bg-slate-50 dark:bg-surface p-3 space-y-2 cursor-pointer hover:border-slate-500 transition-colors"
      onClick={() => onSelect(incident)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-base">{TYPE_ICONS[incident.incident_type] || "📋"}</span>
          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${SEVERITY_STYLES[incident.severity]}`}>
            {incident.severity}
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-600 shrink-0">
          #{incident.id}
        </span>
      </div>
      <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">{incident.title}</p>
      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{incident.county_name}</span>
        {incident.affected_population > 0 && (
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{incident.affected_population.toLocaleString()}</span>
        )}
        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{incident.update_count}</span>
      </div>
      <div className="flex items-center gap-1 text-[9px] font-mono text-slate-600">
        <Clock className="w-3 h-3" />
        {new Date(incident.created_at).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}

// ── Create incident form ──────────────────────────────────────────────────────
function CreateIncidentModal({ counties, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", incident_type: "flood", severity: "medium",
    county: "", description: "", affected_population: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = () => {
    if (!form.title.trim() || !form.county) { setError("Title and county are required."); return; }
    setSaving(true);
    client.post("/api/incidents/", { ...form, affected_population: Number(form.affected_population) || 0 })
      .then((res) => { onCreated(res.data); onClose(); })
      .catch((e) => setError(e.response?.data?.detail || "Failed to create incident."))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded border border-slate-200 dark:border-surface-border bg-white dark:bg-surface-raised">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-surface-border">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Open New Incident</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          {error && <p className="text-[11px] text-red-400 bg-red-900/20 border border-red-800 px-3 py-2 rounded">{error}</p>}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Title *</label>
            <input className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-surface-border rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-flood-600"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Nyando Bridge Flooding" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Type</label>
              <select className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-surface-border rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value })}>
                {[["flood","Flood"],["drought","Drought"],["landslide","Landslide"],["infrastructure","Infrastructure"],["displacement","Displacement"],["other","Other"]].map(([v,l])=>(
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Severity</label>
              <select className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-surface-border rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {["critical","high","medium","low"].map((s)=>(<option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">County *</label>
              <select className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-surface-border rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })}>
                <option value="">Select county</option>
                {counties.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Affected Population</label>
              <input type="number" min="0" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-surface-border rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                value={form.affected_population} onChange={(e) => setForm({ ...form, affected_population: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Description</label>
            <textarea rows={3} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-surface-border rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:border-flood-600"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200 dark:border-surface-border">
          <button onClick={onClose} className="px-4 py-2 text-sm font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-mono bg-flood-600 text-white rounded hover:bg-flood-500 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Open Incident
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function IncidentDetailDrawer({ incident, onClose, onUpdated }) {
  const [updates, setUpdates] = useState(incident.updates || []);
  const [newUpdate, setNewUpdate] = useState("");
  const [saving, setSaving] = useState(false);

  const postUpdate = () => {
    if (!newUpdate.trim()) return;
    setSaving(true);
    client.post(`/api/incidents/${incident.id}/add_update/`, { body: newUpdate })
      .then((res) => { setUpdates((u) => [...u, res.data]); setNewUpdate(""); })
      .finally(() => setSaving(false));
  };

  const changeStatus = (newStatus) => {
    const endpoint = newStatus === "closed"
      ? `/api/incidents/${incident.id}/close/`
      : `/api/incidents/${incident.id}/change_status/`;
    const body = newStatus === "closed" ? {} : { status: newStatus };
    client.patch(endpoint, body)
      .then((res) => onUpdated(res.data))
      .catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <div className="w-full max-w-md bg-slate-50 dark:bg-surface border-l border-slate-200 dark:border-surface-border flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-slate-200 dark:border-surface-border shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{TYPE_ICONS[incident.incident_type]}</span>
              <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${SEVERITY_STYLES[incident.severity]}`}>
                {incident.severity}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{incident.title}</p>
            <p className="text-[10px] font-mono text-slate-500">{incident.county_name} · #{incident.id}</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {/* Meta */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-surface-border grid grid-cols-2 gap-3 shrink-0">
          <div>
            <p className="text-[9px] font-mono text-slate-500 dark:text-slate-600 uppercase">Status</p>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono uppercase mt-0.5">{incident.status}</p>
          </div>
          <div>
            <p className="text-[9px] font-mono text-slate-500 dark:text-slate-600 uppercase">Affected</p>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono mt-0.5">{(incident.affected_population || 0).toLocaleString()} persons</p>
          </div>
          <div className="col-span-2">
            <p className="text-[9px] font-mono text-slate-500 dark:text-slate-600 uppercase">Description</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{incident.description || "—"}</p>
          </div>
        </div>

        {/* Status transitions */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-surface-border flex gap-2 flex-wrap shrink-0">
          {STATUS_COLS.filter((s) => s.key !== incident.status).map((s) => (
            <button key={s.key} onClick={() => changeStatus(s.key)}
              className={`text-[9px] font-mono uppercase px-2 py-1 rounded border transition-colors ${s.color} hover:bg-white/5`}>
              → {s.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <p className="text-[9px] font-mono text-slate-500 dark:text-slate-600 uppercase tracking-widest">Timeline</p>
          {updates.length === 0 ? (
            <p className="text-[11px] text-slate-600">No updates yet.</p>
          ) : (
            updates.map((u) => <TimelineEntry key={u.id} update={u} />)
          )}
        </div>

        {/* Add update */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-surface-border shrink-0 space-y-2">
          <textarea rows={2} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-surface-border rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:border-flood-600"
            placeholder="Add situation update…" value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} />
          <button onClick={postUpdate} disabled={saving || !newUpdate.trim()}
            className="w-full py-2 text-sm font-mono bg-flood-600 text-white rounded hover:bg-flood-500 disabled:opacity-50">
            {saving ? "Posting…" : "Post Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function IncidentPage() {
  const [incidents, setIncidents] = useState([]);
  const [counties, setCounties]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [selected, setSelected]   = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      client.get("/api/incidents/?page_size=100"),
      client.get("/api/counties/"),
    ]).then(([incRes, coRes]) => {
      setIncidents(incRes.data.results || incRes.data);
      setCounties(coRes.data.results || coRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreated = (inc) => setIncidents((prev) => [inc, ...prev]);
  const handleUpdated = (inc) => {
    setIncidents((prev) => prev.map((i) => i.id === inc.id ? inc : i));
    setSelected(inc);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200 font-['IBM_Plex_Condensed']">
            INCIDENT MANAGEMENT
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-widest">
            {incidents.filter(i => i.status !== "closed").length} active · {incidents.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 dark:border-surface-border text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-flood-700 bg-flood-900/30 text-[11px] font-mono text-flood-400 hover:bg-flood-800/40 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Open Incident
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLS.map((col) => {
            const colIncidents = incidents.filter((i) => i.status === col.key);
            return (
              <div key={col.key} className="space-y-2">
                <div className={`flex items-center gap-2 pb-2 border-b-2 ${col.color.replace("text-", "border-").split(" ")[0]}`}>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${col.color.split(" ")[0]}`}>
                    {col.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">{colIncidents.length}</span>
                </div>
                {colIncidents.length === 0 ? (
                  <p className="text-[10px] font-mono text-slate-700 text-center py-6">—</p>
                ) : (
                  colIncidents.map((inc) => (
                    <IncidentCard
                      key={inc.id}
                      incident={inc}
                      onStatusChange={handleUpdated}
                      onSelect={setSelected}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <CreateIncidentModal
          counties={counties}
          onClose={() => setCreating(false)}
          onCreated={handleCreated}
        />
      )}
      {selected && (
        <IncidentDetailDrawer
          incident={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
