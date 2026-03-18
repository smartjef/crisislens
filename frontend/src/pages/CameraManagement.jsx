/**
 * CameraManagement.jsx — Admin UI for managing camera feeds
 * Accessible to super_admin only via Settings or a direct /admin/cameras route.
 */
import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Camera, Edit2, Plus, Trash2, X, Check, Wifi, WifiOff, Globe, RefreshCw } from 'lucide-react';

const FEED_TYPES = ['cctv', 'drone', 'river', 'satellite', 'weather'];
const STATUSES   = ['online', 'degraded', 'offline'];
const AGENCIES   = [
  { label: 'KMD — Kenya Meteorological Dept', value: 'KMD' },
  { label: 'NTSA — Road Safety Authority', value: 'NTSA' },
  { label: 'KenHA — Highways Authority', value: 'KenHA' },
  { label: 'LVBC — Lake Victoria Basin Commission', value: 'LVBC' },
  { label: 'KDF — Kenya Defence Forces', value: 'KDF' },
  { label: 'NPS — National Police Service', value: 'NPS' },
  { label: 'Other', value: 'Other' },
];

const EMPTY_FORM = {
  name: '', location_label: '', feed_type: 'cctv', status: 'offline',
  stream_url: '', lat: '', lon: '', agency: 'Other', notes: '',
};

const INPUT = 'w-full bg-surface border border-surface-border rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-flood-600';
const LABEL = 'block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1';

const STATUS_PILL = {
  online:   'text-emerald-400 border-emerald-800 bg-emerald-900/20',
  degraded: 'text-amber-400 border-amber-800 bg-amber-900/20',
  offline:  'text-slate-500 border-slate-700 bg-surface',
};

export default function CameraManagement() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCamera, setEditCamera] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    client.get('/api/cameras/')
      .then(r => setCameras(r.data.results || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => { setForm(EMPTY_FORM); setEditCamera(null); setError(''); setModalOpen(true); };
  const openEdit = (cam) => {
    setForm({
      name: cam.name || '', location_label: cam.location_label || '',
      feed_type: cam.feed_type || 'cctv', status: cam.status || 'offline',
      stream_url: cam.stream_url || '', lat: cam.lat ?? '', lon: cam.lon ?? '',
      agency: cam.agency || 'Other', notes: cam.notes || '',
    });
    setEditCamera(cam);
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      lat: form.lat !== '' ? parseFloat(form.lat) : null,
      lon: form.lon !== '' ? parseFloat(form.lon) : null,
    };
    try {
      if (editCamera) {
        await client.patch(`/api/cameras/${editCamera.id}/`, payload);
      } else {
        await client.post('/api/cameras/', payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Save failed');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this camera feed?')) return;
    try { await client.delete(`/api/cameras/${id}/`); load(); } catch {}
  };

  return (
    <div className="p-4 md:p-5 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">GOK · Camera Infrastructure</p>
          <h1 className="text-xl font-semibold text-slate-200 tracking-tight">Camera Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">{cameras.length} feeds registered · KMD · NTSA · KenHA · LVBC</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={load} className="flex items-center gap-1.5 h-8 px-3 rounded border border-surface-border text-[9px] font-mono uppercase tracking-widest text-slate-400 hover:border-flood-600 hover:text-flood-400 transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 h-8 px-3 rounded bg-flood-600 hover:bg-flood-500 text-white text-[9px] font-mono uppercase tracking-widest transition-colors">
            <Plus size={12} /> Add Camera
          </button>
        </div>
      </div>

      {/* Agency key */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'KMD', color: 'text-cyan-400 border-cyan-800 bg-cyan-900/20' },
          { label: 'NTSA', color: 'text-violet-400 border-violet-800 bg-violet-900/20' },
          { label: 'KenHA', color: 'text-amber-400 border-amber-800 bg-amber-900/20' },
          { label: 'LVBC', color: 'text-emerald-400 border-emerald-800 bg-emerald-900/20' },
          { label: 'KDF', color: 'text-red-400 border-red-800 bg-red-900/20' },
        ].map(a => (
          <span key={a.label} className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border ${a.color}`}>{a.label}</span>
        ))}
        <span className="text-[9px] font-mono text-slate-600 self-center">Connected agencies</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 rounded border border-surface-border bg-surface-raised animate-pulse" />)}</div>
      ) : cameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Camera size={32} className="text-slate-700 mb-4" />
          <p className="text-sm font-mono text-slate-500">No cameras registered</p>
          <p className="text-xs text-slate-600 mt-1">Add cameras from KMD, NTSA, KenHA, or LVBC</p>
        </div>
      ) : (
        <div className="border border-surface-border rounded overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                {['Name', 'Location', 'Type', 'Agency', 'Status', 'Stream', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {cameras.map(cam => (
                <tr key={cam.id} className="bg-surface-raised hover:bg-surface/50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-xs font-medium text-slate-300">{cam.name}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-[10px] font-mono text-slate-500">{cam.location_label || '—'}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[9px] font-mono uppercase text-slate-400">{cam.feed_type}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[9px] font-mono text-slate-500">{cam.agency || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${STATUS_PILL[cam.status] || STATUS_PILL.offline}`}>
                      {cam.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {cam.stream_url ? (
                      <span className="text-[9px] font-mono text-flood-400 truncate max-w-[140px] block">{cam.stream_url.slice(0, 30)}…</span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-600">Not configured</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(cam)} className="p-1.5 rounded text-slate-600 hover:text-flood-400 hover:bg-flood-900/20 transition-colors">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => handleDelete(cam.id)} className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg bg-surface-raised border border-surface-border rounded shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border sticky top-0 bg-surface-raised">
              <h2 className="text-sm font-semibold text-slate-200">{editCamera ? 'Edit Camera' : 'Add Camera Feed'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</p>}

              <div><label className={LABEL}>Camera Name *</label>
                <input required className={INPUT} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Nyando Bridge CCTV-01" />
              </div>
              <div><label className={LABEL}>Location Label</label>
                <input className={INPUT} value={form.location_label} onChange={e => setForm(p => ({...p, location_label: e.target.value}))} placeholder="Nyando Bridge, Kisumu County" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>Feed Type *</label>
                  <select required className={INPUT} value={form.feed_type} onChange={e => setForm(p => ({...p, feed_type: e.target.value}))}>
                    {FEED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={LABEL}>Status *</label>
                  <select required className={INPUT} value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={LABEL}>Agency</label>
                <select className={INPUT} value={form.agency} onChange={e => setForm(p => ({...p, agency: e.target.value}))}>
                  {AGENCIES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div><label className={LABEL}>Stream URL (HLS .m3u8 / MJPEG / RTSP)</label>
                <input className={INPUT} value={form.stream_url} onChange={e => setForm(p => ({...p, stream_url: e.target.value}))} placeholder="https://stream.example.com/live.m3u8" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>Latitude</label>
                  <input type="number" step="any" className={INPUT} value={form.lat} onChange={e => setForm(p => ({...p, lat: e.target.value}))} placeholder="-0.098766" />
                </div>
                <div><label className={LABEL}>Longitude</label>
                  <input type="number" step="any" className={INPUT} value={form.lon} onChange={e => setForm(p => ({...p, lon: e.target.value}))} placeholder="34.730744" />
                </div>
              </div>
              <div><label className={LABEL}>Notes</label>
                <textarea rows={2} className={INPUT} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="KMD-owned, RTSP stream via MediaMTX relay on 10.0.1.42" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 h-9 rounded border border-surface-border text-xs text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-9 rounded bg-flood-600 hover:bg-flood-500 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : editCamera ? 'Save Changes' : 'Add Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
