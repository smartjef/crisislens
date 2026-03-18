/**
 * AnalyticsPage.jsx
 *
 * Upgraded Analytics Dashboard with:
 * 1. 30/60/90-day risk trend
 * 2. Sensor anomaly detection
 * 3. Model performance (predicted vs. actual)
 * 4. Response time metrics
 * 5. Broadcast reach metrics
 *
 * It also retains the existing "Reports" generation wizard under the "Smart Reports" tab.
 */
import React, { useEffect, useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';
import {
  FileText, ChevronRight, ChevronLeft, Check, Download, RefreshCw,
  MapPin, Brain, Loader2, Plus, Eye, Activity, BarChart3, Clock, Send, Target,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, AreaChart, Area, Legend, ComposedChart, Scatter } from 'recharts';

/* ── Design tokens ───────────────────────────────────────────────────────────── */
const CARD = 'rounded border border-surface-border bg-surface-raised';
const LABEL = 'block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5';
const INPUT = 'w-full bg-surface border border-surface-border rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-flood-600 transition-colors';
const BTN_PRIMARY = 'flex items-center gap-2 h-9 px-5 rounded bg-flood-600 hover:bg-flood-500 text-white text-xs font-semibold transition-colors disabled:opacity-40';
const BTN_SECONDARY = 'flex items-center gap-2 h-9 px-4 rounded border border-surface-border text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors';
const TAB_ACTIVE = 'border-b-2 border-flood-500 text-flood-400 font-semibold';
const TAB_INACTIVE = 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent transition-colors';

const REPORT_TYPES = [
  { value: 'bulletin', label: 'Flood Risk Bulletin', desc: 'County-level risk assessment with probability scores' },
  { value: 'situation', label: 'Situation Report', desc: 'Incident summary with field unit activity and alerts' },
  { value: 'ai_brief', label: 'AI Intelligence Brief', desc: 'AI-generated narrative with recommendations' },
];

const STEPS = ['Scope', 'Date Range', 'AI Summary', 'Export'];

/* ── MOCK DATA FOR NEW CHARTS ───────────────────────────────────────────────── */
const MOCK_RISK_TREND = {
  30: Array.from({length: 30}, (_,i) => ({ date: `D-${30-i}`, risk: Math.min(100, Math.max(0, 40 + Math.sin(i/2) * 20 + Math.random()*10)) })),
  60: Array.from({length: 60}, (_,i) => ({ date: `D-${60-i}`, risk: Math.min(100, Math.max(0, 35 + Math.sin(i/4) * 25 + Math.random()*15)) })),
  90: Array.from({length: 90}, (_,i) => ({ date: `D-${90-i}`, risk: Math.min(100, Math.max(0, 30 + Math.sin(i/6) * 30 + Math.random()*20)) })),
};

const MOCK_ANOMALIES = [
  { name: 'Tana R.', normal: 1.2, anomaly: 0 },
  { name: 'Garissa S1', normal: 1.4, anomaly: 4.8 }, // Spike
  { name: 'Athi Br.', normal: 0.8, anomaly: 0 },
  { name: 'Nyando', normal: 2.1, anomaly: 2.4 },
  { name: 'Nzoia', normal: 3.5, anomaly: 5.2 }, // Spike
];

const MOCK_MODEL_PERF = [
  { date: 'Mon', predicted: 4.2, actual: 4.1 },
  { date: 'Tue', predicted: 4.3, actual: 4.4 },
  { date: 'Wed', predicted: 4.6, actual: 5.1 }, 
  { date: 'Thu', predicted: 4.9, actual: 4.8 },
  { date: 'Fri', predicted: 4.7, actual: 4.6 },
  { date: 'Sat', predicted: 4.4, actual: 4.5 },
  { date: 'Sun', predicted: 4.2, actual: 4.2 },
];

const MOCK_RESPONSE_TIME = [
  { hour: '00:00', time: 15 },
  { hour: '04:00', time: 14 },
  { hour: '08:00', time: 12 },
  { hour: '12:00', time: 8 },
  { hour: '16:00', time: 10 },
  { hour: '20:00', time: 16 },
];

const MOCK_BROADCAST_REACH = [
  { channel: 'SMS', sent: 15400, delivered: 14800 },
  { channel: 'WhatsApp', sent: 8200, delivered: 7500 },
  { channel: 'Email', sent: 2100, delivered: 1950 },
];

/* ── Shared components ──────────────────────────────────────────────────────── */
function SevChip({ risk }) {
  const map = {
    'High':     'text-red-400 border-red-800/50 bg-red-900/20',
    'Moderate': 'text-amber-400 border-amber-800/50 bg-amber-900/20',
    'Low':      'text-emerald-400 border-emerald-800/50 bg-emerald-900/20',
    'Normal':   'text-slate-400 border-slate-700 bg-slate-800/50',
  };
  return <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${map[risk] || map.Normal}`}>{risk}</span>;
}

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors
              ${i < current ? 'bg-flood-600 text-white' : i === current ? 'bg-flood-600/20 border-2 border-flood-600 text-flood-400' : 'bg-surface border-2 border-surface-border text-slate-600'}`}>
              {i < current ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-[8px] font-mono uppercase tracking-wider whitespace-nowrap ${i === current ? 'text-flood-400' : 'text-slate-600'}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-2 mb-4 ${i < current ? 'bg-flood-600' : 'bg-surface-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ReportRow({ report }) {
  const typeColors = {
    bulletin: 'text-flood-400 border-flood-800/50 bg-flood-900/20',
    situation: 'text-amber-400 border-amber-800/50 bg-amber-900/20',
    ai_brief:  'text-purple-400 border-purple-800/50 bg-purple-900/20',
  };
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-border last:border-0 hover:bg-surface/50 transition-colors">
      <div className="w-8 h-8 rounded border border-surface-border bg-surface flex items-center justify-center shrink-0">
        <FileText size={14} className="text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-300 truncate">{report.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${typeColors[report.report_type] || typeColors.bulletin}`}>
            {report.report_type?.replace('_', ' ')}
          </span>
          {report.county_name && (
            <span className="flex items-center gap-1 text-[9px] font-mono text-slate-600"><MapPin size={8} />{report.county_name}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-mono text-slate-500">{new Date(report.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p>
        <p className="text-[9px] font-mono text-slate-700">{new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <button className="p-1.5 rounded border border-surface-border text-slate-600 hover:text-flood-400 hover:border-flood-800 transition-colors">
        <Eye size={12} />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  usePageTitle('Analytics');

  const [activeTab, setActiveTab] = useState('dashboard');

  // Chart state
  const [trendPeriod, setTrendPeriod] = useState(30);

  // Reports state
  const [step, setStep] = useState(0);
  const [showWizard, setShowWizard] = useState(false);
  const [counties, setCounties] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Wizard state
  const [form, setForm] = useState({
    reportType: 'bulletin', county: '',
    dateFrom: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
  });
  const [aiSummary, setAiSummary] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedReport, setSavedReport] = useState(null);
  const [riskDataReport, setRiskDataReport] = useState([]);

  useEffect(() => {
    client.get('/api/counties/').then(r => setCounties(r.data)).catch(() => {});
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const r = await client.get('/api/reports/?ordering=-created_at');
      setReports(r.data.results || r.data || []);
    } catch {}
    setLoadingReports(false);
  };

  const generateAI = async () => {
    setGeneratingAI(true);
    const county = counties.find(c => String(c.id) === String(form.county));
    const prompt = `Generate a concise ${form.reportType === 'bulletin' ? 'Flood Risk Bulletin' : form.reportType === 'situation' ? 'Situation Report' : 'Intelligence Brief'} for ${county?.name || 'all monitored counties'} covering ${form.dateFrom} to ${form.dateTo}. Include: risk assessment, key observations, and actionable recommendations.`;
    try {
      const res = await client.post('/api/ai/chat/', { message: prompt, county: form.county || '', area: '' });
      setAiSummary(res.data?.message || 'AI summary could not be generated at this time.');
    } catch {
      setAiSummary('Unable to generate AI summary. You may write your own summary below.');
    }
    setGeneratingAI(false);
  };

  useEffect(() => {
    if (activeTab === 'reports' && step === 2 && form.county) {
      client.get(`/api/counties/trend/`).then(r => {
        const county = counties.find(c => String(c.id) === String(form.county));
        const filtered = (r.data || []).filter(d => d.county === county?.name).slice(-14);
        setRiskDataReport(filtered.map(d => ({
          date: new Date(d.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
          prob: Math.round(d.probability),
        })));
      }).catch(() => {});
    }
  }, [step, form.county, activeTab]);

  const saveReport = async () => {
    setSaving(true);
    try {
      const county = counties.find(c => String(c.id) === String(form.county));
      const res = await client.post('/api/reports/', {
        title: `Analytics Export — ${county?.name || 'National'} — ${form.dateTo}`,
        report_type: form.reportType,
        county: form.county || null,
        recommendations: aiSummary,
        risk_summary: { date_from: form.dateFrom, date_to: form.dateTo, county: county?.name },
      });
      setSavedReport(res.data);
      fetchReports();
    } catch {}
    setSaving(false);
  };

  const exportJSON = () => {
    const data = {
      type: form.reportType,
      county: counties.find(c => String(c.id) === String(form.county))?.name || 'National',
      period: { from: form.dateFrom, to: form.dateTo },
      summary: aiSummary,
      generated: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `crisislens-report-${form.dateTo}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const renderDashboardTab = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* 1. Risk Trend */}
      <div className={`${CARD} p-4 xl:col-span-2 flex flex-col`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-flood-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">National Risk Trend</h3>
          </div>
          <div className="flex bg-surface border border-surface-border rounded overflow-hidden text-[10px] font-mono">
            {[30, 60, 90].map(days => (
              <button key={days} onClick={() => setTrendPeriod(days)} className={`px-3 py-1 ${trendPeriod === days ? 'bg-flood-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                {days}d
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 cursor-crosshair">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_RISK_TREND[trendPeriod]}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, fontSize: 10, color: '#cbd5e1' }} />
              <Area type="monotone" dataKey="risk" stroke="#0ea5e9" fillOpacity={1} fill="url(#riskGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Sensor Anomalies */}
      <div className={`${CARD} p-4 flex flex-col`}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-amber-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">Sensor Anomaly Detection</h3>
        </div>
        <div className="flex-1 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={MOCK_ANOMALIES} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} hide />
              <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, fontSize: 10, color: '#f8fafc' }} />
              <Bar dataKey="normal" fill="#334155" radius={[0,2,2,0]} barSize={20} />
              <Scatter dataKey="anomaly" fill="#ef4444" shape="star" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-slate-500 font-mono text-center mt-2 flex items-center justify-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Anomalous spikes detected in real-time</p>
      </div>

      {/* 3. Model Performance */}
      <div className={`${CARD} p-4 flex flex-col`}>
        <div className="flex items-center gap-2 mb-4">
          <Target size={14} className="text-emerald-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">Model Perf (Predicted vs Actual)</h3>
        </div>
        <div className="flex-1 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MOCK_MODEL_PERF}>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, fontSize: 10 }} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} iconType="circle" />
              <Line type="monotone" dataKey="predicted" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={{r: 3, fill: '#10b981'}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Response Time */}
      <div className={`${CARD} p-4 flex flex-col`}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-purple-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">Avg Response Time</h3>
        </div>
        <div className="flex-1 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MOCK_RESPONSE_TIME}>
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, fontSize: 10 }} cursor={{fill: '#334155', opacity: 0.4}} />
              <Bar dataKey="time" fill="#a855f7" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Broadcast Reach */}
      <div className={`${CARD} p-4 flex flex-col`}>
        <div className="flex items-center gap-2 mb-4">
          <Send size={14} className="text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">Broadcast Reach Effectiveness</h3>
        </div>
        <div className="flex-1 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MOCK_BROADCAST_REACH} layout="horizontal">
              <XAxis dataKey="channel" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, fontSize: 10 }} cursor={{fill: '#334155', opacity: 0.4}} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
              <Bar dataKey="sent" fill="#334155" radius={[2,2,0,0]} />
              <Bar dataKey="delivered" fill="#06b6d4" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderWizardStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <label className={LABEL}>Report Type</label>
              <div className="space-y-2">
                {REPORT_TYPES.map(rt => (
                  <label key={rt.value} className={`flex items-start gap-3 p-4 rounded border cursor-pointer transition-all ${form.reportType === rt.value ? 'border-flood-600 bg-flood-600/5' : 'border-surface-border bg-surface hover:border-slate-600'}`}>
                    <input type="radio" name="reportType" value={rt.value} checked={form.reportType === rt.value} onChange={e => setForm(p => ({...p, reportType: e.target.value}))} className="mt-0.5 accent-cyan-500" />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{rt.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{rt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={LABEL}>County Scope</label>
              <select value={form.county} onChange={e => setForm(p => ({...p, county: e.target.value}))} className={INPUT}>
                <option value="">National (all counties)</option>
                {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>From Date</label>
                <input type="date" className={INPUT} value={form.dateFrom} onChange={e => setForm(p => ({...p, dateFrom: e.target.value}))} />
              </div>
              <div>
                <label className={LABEL}>To Date</label>
                <input type="date" className={INPUT} value={form.dateTo} onChange={e => setForm(p => ({...p, dateTo: e.target.value}))} max={new Date().toISOString().slice(0,10)} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Quick Range</label>
              <div className="flex gap-2 flex-wrap">
                {[['Last 7 days', 7], ['Last 14 days', 14], ['Last 30 days', 30]].map(([label, days]) => (
                  <button key={days} onClick={() => setForm(p => ({...p, dateFrom: new Date(Date.now() - days * 86400000).toISOString().slice(0,10), dateTo: new Date().toISOString().slice(0,10)}))}
                    className="h-7 px-3 rounded border border-surface-border text-[9px] font-mono uppercase text-slate-400 hover:border-flood-600 hover:text-flood-400 transition-colors">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            {riskDataReport.length > 0 && (
              <div className={`${CARD} p-4`}>
                <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-3">Risk Trend (last 14 days)</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={riskDataReport}>
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, fontSize: 10 }} />
                    <Line type="monotone" dataKey="prob" stroke="#0891b2" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={LABEL} style={{ marginBottom: 0 }}>AI Summary</label>
                <button onClick={generateAI} disabled={generatingAI} className="flex items-center gap-1.5 h-7 px-3 rounded border border-surface-border text-[9px] font-mono uppercase text-slate-400 hover:text-flood-400 hover:border-flood-800 transition-colors disabled:opacity-40">
                  {generatingAI ? <Loader2 size={10} className="animate-spin" /> : <Brain size={10} />}
                  {generatingAI ? 'Generating...' : 'Generate AI Draft'}
                </button>
              </div>
              {generatingAI ? (
                <div className="w-full h-48 rounded border border-surface-border bg-surface flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={20} className="animate-spin text-flood-400" />
                    <p className="text-[10px] font-mono text-slate-500">CrisisLens AI is drafting your report...</p>
                  </div>
                </div>
              ) : (
                <textarea className={`${INPUT} h-48 resize-none`} value={aiSummary} onChange={e => setAiSummary(e.target.value)} placeholder="Write your own summary here..." />
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {savedReport ? (
              <div className="flex flex-col items-center py-8 gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Check size={20} className="text-emerald-400" /></div>
                <p className="text-sm font-semibold text-slate-200">Export Saved</p>
                <p className="text-xs text-slate-500 text-center max-w-xs">{savedReport.title}</p>
              </div>
            ) : (
              <div className={`${CARD} p-4 space-y-3`}>
                <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Export Summary</p>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between"><span className="text-slate-600">Type</span><span className="text-slate-300">{REPORT_TYPES.find(r => r.value === form.reportType)?.label}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">County</span><span className="text-slate-300">{counties.find(c => String(c.id) === String(form.county))?.name || 'National'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Period</span><span className="text-slate-300">{form.dateFrom} → {form.dateTo}</span></div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button onClick={saveReport} disabled={saving || !!savedReport} className={BTN_PRIMARY + ' w-full justify-center'}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {saving ? 'Saving...' : savedReport ? 'Saved ✓' : 'Save Export'}
              </button>
              <button onClick={exportJSON} className={BTN_SECONDARY + ' w-full justify-center'}><Download size={14} /> Export JSON</button>
            </div>
          </div>
        );
    }
  };

  const renderReportsTab = () => (
    <div className="space-y-6">
      {showWizard && (
        <div className={`${CARD} p-6`}>
          <StepBar current={step} />
          <div className="max-w-xl mx-auto">
            {renderWizardStep()}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-surface-border">
              <button onClick={() => { if (step === 0) { setShowWizard(false); } else { setStep(s => s - 1); } }} className={BTN_SECONDARY}>
                <ChevronLeft size={14} /> {step === 0 ? 'Cancel' : 'Back'}
              </button>
              {step < 3 ? (
                <button
                  disabled={step === 1 && (!form.dateFrom || !form.dateTo)}
                  onClick={() => { if (step === 2 && !aiSummary) { generateAI().then(() => setStep(s => s + 1)); } else { setStep(s => s + 1); } }}
                  className={BTN_PRIMARY}
                >
                  {step === 2 ? 'Continue to Export' : 'Next'} <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={() => { setShowWizard(false); setStep(0); }} className={BTN_SECONDARY}>Done <Check size={14} /></button>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Recent Exports</h2>
          <button onClick={fetchReports} className="text-[9px] font-mono text-slate-600 hover:text-slate-400 flex items-center gap-1"><RefreshCw size={9} /> Refresh</button>
        </div>
        <div className={CARD + ' overflow-hidden'}>
          {loadingReports ? (
             <div className="divide-y divide-surface-border">
               {[1,2,3].map(i => <div key={i} className="px-4 py-4 animate-pulse"><div className="h-3 bg-surface w-2/3 rounded mb-2" /><div className="h-2 bg-surface w-1/3 rounded" /></div>)}
             </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <FileText size={24} className="text-slate-700" />
              <p className="text-xs font-mono text-slate-600">No exports generated yet</p>
            </div>
          ) : (
            <div>{reports.map(r => <ReportRow key={r.id} report={r} />)}</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 md:p-5 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">GOK · Crisis Intelligence</p>
          <h1 className="text-xl font-semibold text-slate-200 tracking-tight">Analytics</h1>
        </div>
        {activeTab === 'reports' && !showWizard && (
          <button onClick={() => { setShowWizard(true); setStep(0); setSavedReport(null); setAiSummary(''); }} className={BTN_PRIMARY}>
            <Plus size={14} /> New Export
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-surface-border px-2">
        <button onClick={() => setActiveTab('dashboard')} className={`pb-3 text-xs font-medium ${activeTab === 'dashboard' ? TAB_ACTIVE : TAB_INACTIVE}`}>
          Dashboard
        </button>
        <button onClick={() => setActiveTab('reports')} className={`pb-3 text-xs font-medium ${activeTab === 'reports' ? TAB_ACTIVE : TAB_INACTIVE}`}>
          Smart Exports
        </button>
      </div>

      {activeTab === 'dashboard' ? renderDashboardTab() : renderReportsTab()}
    </div>
  );
}
