/**
 * ReportsPage.jsx
 *
 * Report Builder Wizard — 4 steps:
 *   1. Scope (report type + county selection)
 *   2. Date Range (start date, end date)
 *   3. AI Summary (generate + review AI-drafted summary)
 *   4. Export (download PDF / JSON)
 *
 * Also shows recent reports list below.
 */
import React, { useEffect, useState, useRef } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';
import {
  FileText, ChevronRight, ChevronLeft, Check, Download, RefreshCw,
  Calendar, MapPin, Brain, AlertCircle, Loader2, Plus, Eye,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts';

/* ── Design tokens ───────────────────────────────────────────────────────────── */
const CARD = 'rounded border border-surface-border bg-surface-raised';
const LABEL = 'block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5';
const INPUT = 'w-full bg-surface border border-surface-border rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-flood-600 transition-colors';
const BTN_PRIMARY = 'flex items-center gap-2 h-9 px-5 rounded bg-flood-600 hover:bg-flood-500 text-white text-xs font-semibold transition-colors disabled:opacity-40';
const BTN_SECONDARY = 'flex items-center gap-2 h-9 px-4 rounded border border-surface-border text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors';

const REPORT_TYPES = [
  { value: 'bulletin', label: 'Flood Risk Bulletin', desc: 'County-level risk assessment with probability scores' },
  { value: 'situation', label: 'Situation Report', desc: 'Incident summary with field unit activity and alerts' },
  { value: 'ai_brief', label: 'AI Intelligence Brief', desc: 'AI-generated narrative with recommendations' },
];

const STEPS = ['Scope', 'Date Range', 'AI Summary', 'Export'];

/* ── Severity chip ───────────────────────────────────────────────────────────── */
function SevChip({ risk }) {
  const map = {
    'High':     'text-red-400 border-red-800/50 bg-red-900/20',
    'Moderate': 'text-amber-400 border-amber-800/50 bg-amber-900/20',
    'Low':      'text-emerald-400 border-emerald-800/50 bg-emerald-900/20',
    'Normal':   'text-slate-400 border-slate-700 bg-slate-800/50',
  };
  return <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${map[risk] || map.Normal}`}>{risk}</span>;
}

/* ── Step indicator ─────────────────────────────────────────────────────────── */
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

/* ── Recent reports row ─────────────────────────────────────────────────────── */
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
export default function ReportsPage() {
  usePageTitle('Reports');

  const [step, setStep] = useState(0);
  const [showWizard, setShowWizard] = useState(false);
  const [counties, setCounties] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Wizard state
  const [form, setForm] = useState({
    reportType: 'bulletin',
    county: '',
    dateFrom: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
  });
  const [aiSummary, setAiSummary] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedReport, setSavedReport] = useState(null);
  const [riskData, setRiskData] = useState([]);

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

  // Generate AI summary (Step 3)
  const generateAI = async () => {
    setGeneratingAI(true);
    const county = counties.find(c => String(c.id) === String(form.county));
    const prompt = `Generate a concise ${form.reportType === 'bulletin' ? 'Flood Risk Bulletin' : form.reportType === 'situation' ? 'Situation Report' : 'Intelligence Brief'} for ${county?.name || 'all monitored counties'} covering ${form.dateFrom} to ${form.dateTo}. Include: risk assessment, key observations, and 3 actionable recommendations. Use bullet points. Be direct and factual.`;
    try {
      const res = await client.post('/api/ai/chat/', { message: prompt, county: form.county || '', area: '' });
      setAiSummary(res.data?.message || 'AI summary could not be generated at this time.');
    } catch {
      setAiSummary('Unable to generate AI summary. You may write your own summary below.');
    }
    setGeneratingAI(false);
  };

  // Fetch risk trend for chart
  useEffect(() => {
    if (step === 2 && form.county) {
      client.get(`/api/counties/trend/`).then(r => {
        const county = counties.find(c => String(c.id) === String(form.county));
        const filtered = (r.data || []).filter(d => d.county === county?.name).slice(-14);
        setRiskData(filtered.map(d => ({
          date: new Date(d.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
          prob: Math.round(d.probability),
        })));
      }).catch(() => {});
    }
  }, [step, form.county]);

  // Save report (Step 4)
  const saveReport = async () => {
    setSaving(true);
    try {
      const county = counties.find(c => String(c.id) === String(form.county));
      const res = await client.post('/api/reports/', {
        title: `${form.reportType === 'bulletin' ? 'Flood Risk Bulletin' : form.reportType === 'situation' ? 'Situation Report' : 'AI Brief'} — ${county?.name || 'National'} — ${form.dateTo}`,
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

  // Export as JSON
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

  const canNext = () => {
    if (step === 0) return form.reportType;
    if (step === 1) return form.dateFrom && form.dateTo;
    if (step === 2) return true;
    return true;
  };

  /* ── WIZARD STEPS ── */
  const renderStep = () => {
    switch (step) {
      case 0: // Scope
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

      case 1: // Date Range
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
            {/* Quick presets */}
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
            <div className="p-3 rounded border border-surface-border bg-surface text-[9px] font-mono text-slate-500">
              Period: <span className="text-slate-300">{form.dateFrom}</span> to <span className="text-slate-300">{form.dateTo}</span>
              &nbsp;·&nbsp; {Math.round((new Date(form.dateTo) - new Date(form.dateFrom)) / 86400000)} days
            </div>
          </div>
        );

      case 2: // AI Summary
        return (
          <div className="space-y-4">
            {riskData.length > 0 && (
              <div className={`${CARD} p-4`}>
                <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-3">Risk Trend (last 14 days)</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={riskData}>
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, fontSize: 10, color: '#cbd5e1' }} />
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
                <textarea
                  className={`${INPUT} h-48 resize-none`}
                  value={aiSummary}
                  onChange={e => setAiSummary(e.target.value)}
                  placeholder="Click 'Generate AI Draft' above, or write your own summary here..."
                />
              )}
            </div>
          </div>
        );

      case 3: // Export
        return (
          <div className="space-y-4">
            {savedReport ? (
              <div className="flex flex-col items-center py-8 gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Check size={20} className="text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-slate-200">Report Saved</p>
                <p className="text-xs text-slate-500 text-center max-w-xs">{savedReport.title}</p>
              </div>
            ) : (
              <div className={`${CARD} p-4 space-y-3`}>
                <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Report Summary</p>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between"><span className="text-slate-600">Type</span><span className="text-slate-300">{REPORT_TYPES.find(r => r.value === form.reportType)?.label}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">County</span><span className="text-slate-300">{counties.find(c => String(c.id) === String(form.county))?.name || 'National'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Period</span><span className="text-slate-300">{form.dateFrom} → {form.dateTo}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">AI Summary</span><span className="text-slate-300">{aiSummary ? `${aiSummary.length} chars` : 'None'}</span></div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button onClick={saveReport} disabled={saving || !!savedReport} className={BTN_PRIMARY + ' w-full justify-center'}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {saving ? 'Saving...' : savedReport ? 'Saved ✓' : 'Save to Reports'}
              </button>
              <button onClick={exportJSON} className={BTN_SECONDARY + ' w-full justify-center'}>
                <Download size={14} /> Export as JSON
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-5 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">GOK · Crisis Intelligence</p>
          <h1 className="text-xl font-semibold text-slate-200 tracking-tight">Reports</h1>
        </div>
        <button
          onClick={() => { setShowWizard(true); setStep(0); setSavedReport(null); setAiSummary(''); }}
          className={BTN_PRIMARY}
        >
          <Plus size={14} /> New Report
        </button>
      </div>

      {/* Wizard */}
      {showWizard && (
        <div className={`${CARD} p-6`}>
          <StepBar current={step} />
          <div className="max-w-xl mx-auto">
            {renderStep()}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-surface-border">
              <button onClick={() => { if (step === 0) { setShowWizard(false); } else { setStep(s => s - 1); } }} className={BTN_SECONDARY}>
                <ChevronLeft size={14} /> {step === 0 ? 'Cancel' : 'Back'}
              </button>
              {step < 3 ? (
                <button
                  disabled={!canNext()}
                  onClick={() => { if (step === 2 && !aiSummary) { generateAI().then(() => setStep(s => s + 1)); } else { setStep(s => s + 1); } }}
                  className={BTN_PRIMARY}
                >
                  {step === 2 ? 'Continue to Export' : 'Next'} <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={() => { setShowWizard(false); setStep(0); }} className={BTN_SECONDARY}>
                  Done <Check size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reports History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Recent Reports</h2>
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
              <p className="text-xs font-mono text-slate-600">No reports generated yet</p>
              <p className="text-[9px] font-mono text-slate-700">Use the wizard above to create your first report</p>
            </div>
          ) : (
            <div>
              {reports.map(r => <ReportRow key={r.id} report={r} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
