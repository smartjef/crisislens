import React, { useEffect, useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';
import { Plus, Upload, Download, Trash2, X, Users, Phone, Mail } from 'lucide-react';

const CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email' };
const CHANNEL_COLORS = {
  sms: 'text-cyan-400 border-cyan-800 bg-cyan-900/20',
  whatsapp: 'text-emerald-400 border-emerald-800 bg-emerald-900/20',
  email: 'text-violet-400 border-violet-800 bg-violet-900/20',
};

export default function ContactsPage() {
  usePageTitle('Contacts');
  const [contacts, setContacts] = useState([]);
  const [counties, setCounties] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCounty, setFilterCounty] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', channels: ['sms'], county: '', sub_county: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = filterCounty ? `?county=${filterCounty}` : '';
      const res = await client.get(`/api/broadcast-recipients/${params}`);
      setContacts(res.data.results || res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    client.get('/api/counties/').then(r => setCounties(r.data)).catch(() => {});
    fetchContacts();
  }, [filterCounty]);

  useEffect(() => {
    if (form.county) {
      client.get(`/api/sub-counties/?county=${form.county}`).then(r => setSubCounties(r.data)).catch(() => {});
    } else {
      setSubCounties([]);
    }
  }, [form.county]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (form.channels.length === 0) { setError('Select at least one channel'); return; }
    setSaving(true);
    setError('');
    try {
      await Promise.all(
        form.channels.map(ch =>
          client.post('/api/broadcast-recipients/', { ...form, channel: ch })
        )
      );
      setModalOpen(false);
      setForm({ name: '', phone: '', email: '', channels: ['sms'], county: '', sub_county: '' });
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save contact');
    }
    setSaving(false);
  };

  const handleDelete = async (id, silent = false) => {
    if (!silent && !confirm('Delete this contact?')) return;
    if (!silent) {
      try { await client.delete(`/api/broadcast-recipients/${id}/`); fetchContacts(); } catch {}
      return;
    }
    try { await client.delete(`/api/broadcast-recipients/${id}/`); } catch {}
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportStatus({ loading: true });
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await client.post('/api/broadcast-recipients/import-csv/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportStatus({ success: true, ...res.data });
      fetchContacts();
    } catch (err) {
      setImportStatus({ error: err.response?.data?.detail || 'Import failed' });
    }
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const rows = [
      ['name', 'phone', 'email', 'channel', 'county_code', 'sub_county_name'],
      ['John Doe', '+254712345678', 'john@example.com', 'sms', '42', 'Central'],
      ['Jane Wanjiru', '+254723456789', 'jane@example.com', 'email', '44', 'East'],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const rows = [['name', 'phone', 'email', 'channel', 'county', 'sub_county']];
    contacts.forEach(c => rows.push([c.name, c.phone, c.email, c.channel, c.county_name || '', c.sub_county_name || '']));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group by county, then merge same-phone contacts into one row with multiple channel badges
  const grouped = contacts.reduce((acc, c) => {
    const key = c.county_name || 'Unknown';
    if (!acc[key]) acc[key] = {};
    const pkey = c.phone || c.email || c.id;
    if (!acc[key][pkey]) acc[key][pkey] = { ...c, channels: [], ids: [] };
    acc[key][pkey].channels.push(c.channel);
    acc[key][pkey].ids.push(c.id);
    return acc;
  }, {});
  const groupedEntries = Object.entries(grouped).map(([county, byPhone]) => [county, Object.values(byPhone)]);

  const INPUT = 'w-full bg-surface border border-surface-border rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-flood-600';
  const LABEL = 'block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1';

  return (
    <div className="p-4 md:p-5 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">GOK · Broadcast Contacts</p>
          <h1 className="text-xl font-semibold text-slate-200 tracking-tight">Contact Registry</h1>
          <p className="text-xs text-slate-500 mt-0.5">{contacts.length} contacts across {groupedEntries.length} counties</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 h-8 px-3 rounded border border-surface-border text-[9px] font-mono uppercase tracking-widest text-slate-400 hover:border-flood-600 hover:text-flood-400 transition-colors">
            <Download size={12} /> Template
          </button>
          <label className="flex items-center gap-1.5 h-8 px-3 rounded border border-surface-border text-[9px] font-mono uppercase tracking-widest text-slate-400 hover:border-flood-600 hover:text-flood-400 cursor-pointer transition-colors">
            <Upload size={12} /> Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={handleExport} className="flex items-center gap-1.5 h-8 px-3 rounded border border-surface-border text-[9px] font-mono uppercase tracking-widest text-slate-400 hover:border-flood-600 hover:text-flood-400 transition-colors">
            <Download size={12} /> Export
          </button>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 h-8 px-3 rounded bg-flood-600 hover:bg-flood-500 text-white text-[9px] font-mono uppercase tracking-widest transition-colors">
            <Plus size={12} /> Add Contact
          </button>
        </div>
      </div>

      {/* Import status */}
      {importStatus && !importStatus.loading && (
        <div className={`flex items-center gap-3 p-3 rounded border text-xs ${importStatus.error ? 'border-red-800 bg-red-900/20 text-red-400' : 'border-emerald-800 bg-emerald-900/20 text-emerald-400'}`}>
          {importStatus.error
            ? importStatus.error
            : `Imported: ${importStatus.created} created, ${importStatus.skipped} skipped`}
          <button onClick={() => setImportStatus(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* CSV template hint */}
      <div className="text-[9px] font-mono text-slate-600 bg-surface-raised border border-surface-border rounded px-3 py-2">
        CSV format: <span className="text-slate-400">name, phone (+254...), email, channel (sms/whatsapp/email), county_code, sub_county_name</span>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">County:</span>
        <select
          value={filterCounty}
          onChange={e => setFilterCounty(e.target.value)}
          className="bg-surface border border-surface-border rounded px-2 py-1 text-[10px] font-mono text-slate-400 focus:outline-none"
        >
          <option value="">All Counties</option>
          {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Contact groups */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded border border-surface-border bg-surface-raised animate-pulse" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={32} className="text-slate-700 mb-4" />
          <p className="text-sm font-mono text-slate-500">No contacts registered</p>
          <p className="text-xs text-slate-600 mt-1">Add contacts manually or import a CSV file</p>
        </div>
      ) : (
        groupedEntries.map(([county, list]) => (
          <div key={county} className="border border-surface-border rounded overflow-hidden">
            <div className="px-4 py-2 bg-surface flex items-center gap-2 border-b border-surface-border">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{county}</span>
              <span className="text-[9px] font-mono text-flood-400">{list.length} contacts</span>
            </div>
            <div className="divide-y divide-surface-border">
              {list.map(c => (
                <div key={c.ids[0]} className="flex items-center gap-4 px-4 py-3 bg-surface-raised hover:bg-surface/50 transition-colors">
                  <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-400 font-mono shrink-0">
                    {c.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300">{c.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.phone && (
                        <span className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                          <Phone size={9} />{c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                          <Mail size={9} />{c.email}
                        </span>
                      )}
                      {c.sub_county_name && (
                        <span className="text-[9px] font-mono text-slate-600">{c.sub_county_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {c.channels.map(ch => (
                      <span key={ch} className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border ${CHANNEL_COLORS[ch]}`}>
                        {CHANNEL_LABELS[ch]}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this contact?')) return;
                      await Promise.all(c.ids.map(id => handleDelete(id, true)));
                      fetchContacts();
                    }}
                    className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add Contact Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md bg-surface-raised border border-surface-border rounded shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <h2 className="text-sm font-semibold text-slate-200">Add Contact</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              {error && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</p>
              )}
              <div>
                <label className={LABEL}>Full Name *</label>
                <input
                  required
                  className={INPUT}
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Phone (E.164)</label>
                  <input
                    className={INPUT}
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+254712345678"
                  />
                </div>
                <div>
                  <label className={LABEL}>Email</label>
                  <input
                    type="email"
                    className={INPUT}
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="john@email.com"
                  />
                </div>
              </div>
              <div>
                <label className={LABEL}>Channels * (select one or more)</label>
                <div className="flex gap-2">
                  {[['sms','SMS'],['whatsapp','WhatsApp'],['email','Email']].map(([val, label]) => {
                    const active = form.channels.includes(val);
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm(p => ({
                          ...p,
                          channels: p.channels.includes(val)
                            ? p.channels.filter(c => c !== val)
                            : [...p.channels, val],
                        }))}
                        className={`flex-1 py-1.5 rounded border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                          active
                            ? 'bg-flood-600 border-flood-600 text-white'
                            : 'bg-transparent border-surface-border text-slate-500 hover:border-flood-600 hover:text-flood-400'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={LABEL}>County *</label>
                <select
                  required
                  className={INPUT}
                  value={form.county}
                  onChange={e => setForm(p => ({ ...p, county: e.target.value, sub_county: '' }))}
                >
                  <option value="">Select county...</option>
                  {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {subCounties.length > 0 && (
                <div>
                  <label className={LABEL}>Sub-County</label>
                  <select
                    className={INPUT}
                    value={form.sub_county}
                    onChange={e => setForm(p => ({ ...p, sub_county: e.target.value }))}
                  >
                    <option value="">All sub-counties</option>
                    {subCounties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 h-9 rounded border border-surface-border text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-9 rounded bg-flood-600 hover:bg-flood-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
