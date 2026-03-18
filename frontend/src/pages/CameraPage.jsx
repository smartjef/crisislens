/**
 * CameraPage.jsx
 *
 * Live camera feed grid with full CRUD.
 * Supports: HLS, MJPEG, ESRI satellite map, status filters, search, add/edit/delete.
 */
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Camera, Filter, Globe, Info, RefreshCw, X,
  Maximize2, Plus, Search, Pencil, Trash2,
} from "lucide-react";
import client from "../api/client";
import CameraDrawer from "../components/camera/CameraDrawer";
import CameraFeedCard, {
  STATUS_COLORS, TYPE_LABELS, ESRI_SATELLITE_STYLE,
  HLSPlayer, SatelliteMapView, LiveOverlay, TelemetryTicker,
} from "../components/camera/CameraFeedCard";
import CameraGrid from "../components/camera/CameraGrid";

// ── Demo feeds — shown when no real cameras are registered in DB ──────────────
const DEMO_FEEDS = [
  {
    id: "d1", name: "Lake Victoria — Kisumu Bay",
    location_label: "Kisumu Bay, Kisumu County",
    feed_type: "satellite", status: "online", stream_url: null,
    lat: -0.098766, lon: 34.730744, defaultZoom: 18,
  },
  {
    id: "d2", name: "Nyando River Delta",
    location_label: "Nyando Floodplain, Kisumu",
    feed_type: "satellite", status: "online", stream_url: null,
    lat: -0.007979, lon: 35.282044, defaultZoom: 18,
  },
  {
    id: "d3", name: "Nyando Bridge Monitor",
    location_label: "Nyando Bridge, Kisumu",
    feed_type: "river", status: "online", stream_url: null,
    lat: -0.172251, lon: 34.920937, defaultZoom: 18,
    streetViewUrl: "https://www.google.com/maps?layer=c&cbll=-0.172251,34.920937&output=svembed",
  },
  {
    id: "d4", name: "Mathare River Drainage",
    location_label: "Mathare, Nairobi",
    feed_type: "cctv", status: "degraded", stream_url: null,
    lat: -1.258, lon: 36.862, defaultZoom: 17,
  },
  {
    id: "d5", name: "Masinga Dam Spillway",
    location_label: "Masinga Dam, Machakos",
    feed_type: "river", status: "online", stream_url: null,
    lat: -0.889443, lon: 37.594190, defaultZoom: 18,
  },
  {
    id: "d6", name: "Kibra Flood Plain",
    location_label: "Kibra, Nairobi",
    feed_type: "cctv", status: "offline", stream_url: null,
    lat: -1.31, lon: 36.79, defaultZoom: 15,
  },
];

const FEED_TYPES = ["cctv", "drone", "river", "satellite", "weather"];
const AGENCIES   = ["KMD", "NTSA", "KenHA", "LVBC", "KDF", "NPS", "Other"];

const EMPTY_FORM = {
  name: "", location_label: "", feed_type: "cctv", status: "online",
  agency: "Other", lat: "", lon: "", stream_url: "", notes: "",
};

// ── Add / Edit modal ───────────────────────────────────────────────────────────
function CameraFormModal({ camera, onClose, onSaved }) {
  const isEdit = !!camera?.id && !String(camera.id).startsWith("d");
  const [form, setForm] = useState(
    camera ? {
      name: camera.name || "",
      location_label: camera.location_label || "",
      feed_type: camera.feed_type || "cctv",
      status: camera.status || "online",
      agency: camera.agency || "Other",
      lat: camera.lat ?? "",
      lon: camera.lon ?? "",
      stream_url: camera.stream_url || "",
      notes: camera.notes || "",
    } : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      ...form,
      lat: form.lat !== "" ? parseFloat(form.lat) : null,
      lon: form.lon !== "" ? parseFloat(form.lon) : null,
    };
    try {
      if (isEdit) {
        await client.patch(`/api/cameras/${camera.id}/`, payload);
      } else {
        await client.post("/api/cameras/", payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || "Save failed. Check all fields.");
    } finally {
      setSaving(false);
    }
  };

  const labelCls = "text-[9px] font-mono uppercase tracking-widest text-slate-500 block mb-1";
  const inputCls = "w-full bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-flood-600";
  const selectCls = inputCls;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-surface-border">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {isEdit ? "Edit Camera" : "Add Camera Feed"}
          </span>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="px-3 py-2 rounded border border-red-800 bg-red-900/20 text-red-400 text-xs font-mono">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Camera Name *</label>
              <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Nyando Bridge Monitor" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Location Label</label>
              <input value={form.location_label} onChange={e => set("location_label", e.target.value)} placeholder="e.g. Ahero Bridge, Kisumu" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Feed Type</label>
              <select value={form.feed_type} onChange={e => set("feed_type", e.target.value)} className={selectCls}>
                {FEED_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={selectCls}>
                <option value="online">Online</option>
                <option value="degraded">Degraded</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Agency</label>
              <select value={form.agency} onChange={e => set("agency", e.target.value)} className={selectCls}>
                {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div />

            <div>
              <label className={labelCls}>Latitude</label>
              <input type="number" step="any" value={form.lat} onChange={e => set("lat", e.target.value)} placeholder="-0.172251" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input type="number" step="any" value={form.lon} onChange={e => set("lon", e.target.value)} placeholder="34.920937" className={inputCls} />
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Stream URL (HLS / MJPEG)</label>
              <input value={form.stream_url} onChange={e => set("stream_url", e.target.value)} placeholder="https://…/stream.m3u8" className={inputCls} />
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Operational notes, access instructions…" className={inputCls + " resize-none"} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border border-slate-300 dark:border-surface-border text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded border border-flood-600 bg-flood-900/30 text-flood-400 text-xs font-mono hover:bg-flood-900/60 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Camera"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Expanded / fullscreen modal ────────────────────────────────────────────────
function ExpandedModal({ camera, onClose }) {
  const containerRef = useRef(null);
  const [showStreetView, setShowStreetView] = useState(false);
  const hasStreetView = !!camera.streetViewUrl;

  const handleFullscreen = () => {
    if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-surface-border">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{camera.name}</p>
            <p className="text-[10px] font-mono text-slate-500">{camera.location_label}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasStreetView && (
              <button
                onClick={() => setShowStreetView(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono transition-colors
                  ${showStreetView
                    ? "border-flood-600 bg-flood-900/30 text-flood-400"
                    : "border-slate-300 dark:border-surface-border text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                <Globe className="w-3 h-3" />
                {showStreetView ? "Satellite" : "Street View"}
              </button>
            )}
            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[camera.status]}`}>
              {camera.status}
            </span>
            <button onClick={handleFullscreen} className="p-1.5 hover:bg-slate-100 dark:hover:bg-surface-raised rounded transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" title="Fullscreen">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-surface-raised rounded transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feed / map area */}
        <div ref={containerRef} className="h-[75vh] bg-slate-200 dark:bg-slate-900 relative overflow-hidden">
          {showStreetView && hasStreetView ? (
            <iframe src={camera.streetViewUrl} title={`Street View — ${camera.name}`} className="w-full h-full border-0" allowFullScreen />
          ) : camera.stream_url?.includes(".m3u8") ? (
            <>
              <HLSPlayer src={camera.stream_url} />
              <div className="absolute inset-0 pointer-events-none">
                <LiveOverlay label="LIVE" isSatellite={false} />
                <TelemetryTicker cameraId={camera.id} />
              </div>
            </>
          ) : camera.stream_url?.includes("mjpg") || camera.stream_url?.includes("mjpeg") ? (
            <>
              <img src={camera.stream_url} alt={camera.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none">
                <LiveOverlay label="LIVE" isSatellite={false} />
                <TelemetryTicker cameraId={camera.id} />
              </div>
            </>
          ) : camera.lat && camera.lon ? (
            <>
              <SatelliteMapView lat={camera.lat} lon={camera.lon} zoom={(camera.defaultZoom ?? 14) + 1} compact={false} />
              <div className="absolute inset-0 pointer-events-none">
                <LiveOverlay label="FEED" isSatellite={camera.feed_type === "satellite"} />
                {camera.status === "online" && <TelemetryTicker cameraId={camera.id} />}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Camera className="w-16 h-16 text-slate-700" />
              <p className="text-slate-500 text-sm font-mono">No stream or coordinates configured</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-200 dark:border-surface-border bg-slate-50 dark:bg-surface-raised">
          <span>{TYPE_LABELS[camera.feed_type] || camera.feed_type} · {camera.location_label}</span>
          <span className="text-slate-600">
            {showStreetView ? "Click & drag to look around" : "Scroll to zoom · Drag to pan · Press Esc to close"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Full page ─────────────────────────────────────────────────────────────────
export default function CameraPage() {
  const [cameras, setCameras]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [expanded, setExpanded]         = useState(null);   // drawer
  const [fullscreen, setFullscreen]     = useState(null);   // expanded modal
  const [filterType, setFilterType]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery]   = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCamera, setEditCamera]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const isDemoMode = cameras.length > 0 && String(cameras[0]?.id).startsWith("d");

  const load = useCallback(() => {
    setLoading(true);
    client.get("/api/cameras/")
      .then((res) => {
        const data = res.data.results || res.data;
        setCameras(data.length ? data : DEMO_FEEDS);
      })
      .catch(() => setCameras(DEMO_FEEDS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // Esc key closes modals
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(null);
        else if (expanded) setExpanded(null);
        else if (showAddModal) setShowAddModal(false);
        else if (editCamera) setEditCamera(null);
        else if (deleteTarget) setDeleteTarget(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen, expanded, showAddModal, editCamera, deleteTarget]);

  const filtered = cameras.filter((c) => {
    if (filterType   !== "all" && c.feed_type !== filterType)  return false;
    if (filterStatus !== "all" && c.status    !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name?.toLowerCase().includes(q) && !c.location_label?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const online  = cameras.filter((c) => c.status === "online").length;
  const offline = cameras.filter((c) => c.status === "offline").length;
  const degraded = cameras.filter((c) => c.status === "degraded").length;

  const handleSaved = () => {
    setShowAddModal(false);
    setEditCamera(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget || isDemoMode) return;
    setDeleting(true);
    try {
      await client.delete(`/api/cameras/${deleteTarget.id}/`);
      if (expanded?.id === deleteTarget.id) setExpanded(null);
      load();
      setDeleteTarget(null);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-200 font-['IBM_Plex_Condensed']">LIVE CAMERA FEEDS</h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-widest">
            {online} online · {degraded > 0 ? `${degraded} degraded · ` : ""}{offline} offline · {cameras.length} total
            {isDemoMode && <span className="text-amber-500 ml-2">· demo mode</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isDemoMode && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-flood-600 bg-flood-900/20 text-flood-400 text-[11px] font-mono hover:bg-flood-900/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Camera
            </button>
          )}
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-surface-border text-[11px] font-mono text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-raised transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter + search bar */}
      <div className="space-y-2">
        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cameras…"
            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-surface-raised border border-slate-300 dark:border-surface-border rounded text-[11px] font-mono text-slate-900 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-flood-600"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Type + status filters */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-surface-border">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {["all", "cctv", "drone", "river", "satellite", "weather"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded border transition-colors
                  ${filterType === t
                    ? "border-flood-600 text-flood-600 dark:text-flood-400 bg-flood-50 dark:bg-flood-900/30"
                    : "border-slate-300 dark:border-surface-border text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-surface-border" />
          <div className="flex gap-1.5 flex-wrap">
            {["all", "online", "degraded", "offline"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded border transition-colors
                  ${filterStatus === s
                    ? "border-flood-600 text-flood-600 dark:text-flood-400 bg-flood-50 dark:bg-flood-900/30"
                    : "border-slate-300 dark:border-surface-border text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50 dark:bg-cyan-950/30 text-[10px] font-mono text-cyan-700 dark:text-cyan-400">
        <Info className="w-3 h-3 shrink-0" />
        Satellite &amp; river feeds use ESRI World Imagery — interactive: <strong>scroll to zoom · drag to pan</strong> · click the <Maximize2 className="inline w-3 h-3 mx-0.5" /> to expand
      </div>

      {/* Camera grid */}
      <CameraGrid
        cameras={filtered}
        loading={loading}
        onExpand={setExpanded}
        onEdit={isDemoMode ? undefined : setEditCamera}
        onDelete={isDemoMode ? undefined : setDeleteTarget}
      />

      {/* Side drawer */}
      {expanded && (
        <CameraDrawer
          camera={expanded}
          onClose={() => setExpanded(null)}
          onFullscreen={(cam) => { setExpanded(null); setFullscreen(cam); }}
        />
      )}

      {/* Fullscreen modal */}
      {fullscreen && (
        <ExpandedModal camera={fullscreen} onClose={() => setFullscreen(null)} />
      )}

      {/* Add / Edit modal */}
      {(showAddModal || editCamera) && (
        <CameraFormModal
          camera={editCamera}
          onClose={() => { setShowAddModal(false); setEditCamera(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded shadow-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">Delete Camera?</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              <span className="text-slate-900 dark:text-slate-200">{deleteTarget.name}</span> will be permanently removed from all dashboards and records.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 rounded border border-slate-300 dark:border-surface-border text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded border border-red-800 bg-red-900/30 text-red-400 text-xs font-mono hover:bg-red-900/60 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
