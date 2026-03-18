import React, { useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { 
  FileText, Download, Printer, Droplets, AlertTriangle, 
  MessageSquare, Calendar, MapPin, Target, CheckCircle2,
  TrendingUp, Users, Radio, CloudRain
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, LineChart, Line } from 'recharts';

/* ── Design tokens ───────────────────────────────────────────────────────────── */
const CARD = 'rounded border border-surface-border bg-surface-raised';
const LABEL = 'block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5';
const INPUT = 'w-full bg-surface border border-surface-border rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-flood-600 transition-colors';
const BTN_PRIMARY = 'flex items-center gap-2 h-9 px-5 rounded bg-flood-600 hover:bg-flood-500 text-white text-xs font-semibold transition-colors disabled:opacity-40';
const BTN_SECONDARY = 'flex items-center gap-2 h-9 px-4 rounded border border-surface-border text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors';

const REPORT_DEFINITIONS = [
  { id: 'hydro', name: 'Hydrological Bulletin', icon: Droplets, desc: 'Detailed water level, flow rates, and basin forecasts.', color: 'text-cyan-400' },
  { id: 'aar', name: 'Incident After-Action', icon: AlertTriangle, desc: 'Post-incident review, timeline analysis, and resource usage.', color: 'text-amber-400' },
  { id: 'social', name: 'Social Intelligence Digest', icon: MessageSquare, desc: 'Trending keywords, public sentiment, and geo-located civilian reports.', color: 'text-purple-400' },
];

export default function ReportsPage() {
  usePageTitle('Reports & Bulletins');
  const [activeReport, setActiveReport] = useState('hydro');

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar / Selector */}
      <div className="w-full md:w-64 border-r border-surface-border bg-surface/50 p-4 shrink-0 overflow-y-auto">
        <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">GOK · Crisis Intelligence</p>
        <h1 className="text-xl font-semibold text-slate-200 tracking-tight mb-6">Reports</h1>
        
        <div className="space-y-2">
          {REPORT_DEFINITIONS.map(rep => (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id)}
              className={`w-full text-left p-3 rounded border transition-all ${
                activeReport === rep.id 
                  ? 'border-surface-border bg-surface-raised shadow-sm' 
                  : 'border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <rep.icon size={14} className={activeReport === rep.id ? rep.color : 'text-slate-500'} />
                <span className={`text-xs font-semibold ${activeReport === rep.id ? 'text-slate-200' : 'text-slate-400'}`}>
                  {rep.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">{rep.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50/50 dark:bg-transparent">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-slate-200">
            {REPORT_DEFINITIONS.find(r => r.id === activeReport)?.name} Generator
          </h2>
          <div className="flex gap-2">
            <button className={BTN_SECONDARY}><Printer size={14} /> Print</button>
            <button className={BTN_PRIMARY}><Download size={14} /> Export PDF</button>
          </div>
        </div>

        {activeReport === 'hydro' && <HydroBulletinForm />}
        {activeReport === 'aar' && <AfterActionForm />}
        {activeReport === 'social' && <SocialIntelForm />}
      </div>
    </div>
  );
}

/* ── Hydrological Bulletin ─────────────────────────────────────────────────── */
function HydroBulletinForm() {
  const MOCK_LEVELS = Array.from({length: 12}, (_,i) => ({ time: `${i*2}:00`, level: 2.1 + Math.sin(i/2) * 0.8 + Math.random()*0.2 }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={LABEL}>Basin / Catchment</label>
          <select className={INPUT}>
            <option>Tana River Basin</option>
            <option>Athi River Basin</option>
            <option>Lake Victoria Basin</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Target Date</label>
          <input type="date" className={INPUT} defaultValue={new Date().toISOString().slice(0,10)} />
        </div>
        <div className="flex items-end">
          <button className={BTN_SECONDARY + ' w-full justify-center'}>Load Data</button>
        </div>
      </div>

      {/* Preview */}
      <div className={`${CARD} p-0 overflow-hidden`}>
        <div className="bg-slate-900 px-6 py-5 border-b border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase mb-1">Confidential — DO NOT SHARE</p>
              <h1 className="text-2xl font-serif text-white mb-2">Daily Hydrological Bulletin</h1>
              <p className="text-sm text-slate-400">Tana River Basin • {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <Droplets className="text-slate-700 w-12 h-12" />
          </div>
        </div>
        
        <div className="p-6 bg-white dark:bg-slate-50 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 rounded">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Water Level</p>
              <p className="text-2xl font-black text-slate-800">2.8m <span className="text-sm font-medium text-emerald-500">Normal</span></p>
            </div>
            <div className="p-4 border border-slate-200 rounded">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discharge Rate</p>
              <p className="text-2xl font-black text-slate-800">145 m³/s <span className="text-sm font-medium text-amber-500">+12%</span></p>
            </div>
            <div className="p-4 border border-slate-200 rounded">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rainfall Forecast</p>
              <p className="text-2xl font-black text-slate-800 flex items-center gap-2"><CloudRain size={20} className="text-blue-500"/> 45mm</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-4">24H River Level Profile (Garissa Station)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_LEVELS}>
                  <XAxis dataKey="time" tick={{fontSize: 10, fill: '#64748b'}} />
                  <YAxis tick={{fontSize: 10, fill: '#64748b'}} domain={[0, 4]} />
                  <Tooltip contentStyle={{background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, color: '#0f172a'}}/>
                  <Area type="monotone" dataKey="level" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Hydrologist Remarks</h3>
            <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-slate-300 pl-4 py-1">
              Water levels are currently stable but showing a mild upward trend due to localized heavy rainfall in the upper catchment area. We expect peak discharge at the Garissa station around 18:00 local time. No immediate inundation threat is present for the next 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Incident After-Action Report ──────────────────────────────────────────── */
function AfterActionForm() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Select Closed Incident</label>
          <select className={INPUT}>
            <option>INC-2023-149: Tana Delta Breach (Closed)</option>
            <option>INC-2023-142: Garissa Flash Flood (Closed)</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className={BTN_SECONDARY}>Generate Briefing</button>
        </div>
      </div>

      <div className={`${CARD} p-0 overflow-hidden`}>
        <div className="bg-slate-900 px-6 py-5 border-b border-amber-500/30">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className="text-amber-500" />
            <span className="text-[10px] font-mono text-amber-500 tracking-widest uppercase border border-amber-500/50 px-2 py-0.5 rounded-sm">After-Action Report</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">INC-2023-149: Tana Delta Breach</h1>
          <p className="text-sm text-slate-400">Resolution Date: Oct 12, 2023</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-50 space-y-8">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-100 rounded">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Response Time</p>
              <p className="text-lg font-black text-slate-800">14 mins</p>
            </div>
            <div className="p-3 bg-slate-100 rounded">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Duration</p>
              <p className="text-lg font-black text-slate-800">72 hours</p>
            </div>
            <div className="p-3 bg-slate-100 rounded">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Units Deployed</p>
              <p className="text-lg font-black text-slate-800">4 Teams</p>
            </div>
            <div className="p-3 bg-slate-100 rounded">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Evacuated</p>
              <p className="text-lg font-black text-slate-800">142 Pax</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-3 border-b border-slate-200 pb-2">Execution Timeline</h3>
            <div className="space-y-4">
              {[
                {t: 'T+00:00', label: 'Incident escalated to Active. Alerts broadcasted via CAP Feed.'},
                {t: 'T+00:14', label: 'First Responder Team (Bravo) on site.'},
                {t: 'T+05:30', label: 'Drone recce confirms breach stabilized, sandbags deployed.'},
                {t: 'T+72:00', label: 'Incident closed. Area secured.'},
              ].map(evt => (
                <div key={evt.t} className="flex gap-4">
                  <div className="text-[10px] font-mono text-slate-400 w-16 pt-0.5 shrink-0">{evt.t}</div>
                  <div className="relative pb-4 border-l border-slate-200 pl-4 w-full">
                    <div className="absolute w-2 h-2 bg-slate-300 rounded-full -left-[5px] top-1"></div>
                    <p className="text-sm text-slate-700">{evt.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-3 border-b border-slate-200 pb-2">Lessons & Recommendations</h3>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1 block">
              <li>Early warning broadcast reached 94% of registered users in the geofence within 3 minutes; highly effective.</li>
              <li>Radio comms degraded at the delta entry point; need to deploy mobile repeater for future localized events in this specific sector.</li>
              <li>Coordination with local transport authorities was delayed by an hour; process needs integrating into the national SOP checklist.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Social Intelligence Digest ────────────────────────────────────────────── */
function SocialIntelForm() {
  const MOCK_SENTIMENT = [
    { name: 'Positive', value: 15, fill: '#10b981' },
    { name: 'Neutral', value: 45, fill: '#64748b' },
    { name: 'Negative', value: 25, fill: '#f59e0b' },
    { name: 'Panic', value: 15, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={LABEL}>Data Source</label>
          <select className={INPUT}>
            <option>Cross-platform (X, Facebook, Blogs)</option>
            <option>X / Twitter only</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Geofence</label>
          <select className={INPUT}>
            <option>National Scope</option>
            <option>Nairobi Region</option>
            <option>Tana Basin Region</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className={BTN_SECONDARY + ' w-full justify-center'}>Analyze 24H Window</button>
        </div>
      </div>

      <div className={`${CARD} p-0 overflow-hidden`}>
        <div className="bg-slate-900 px-6 py-5 border-b border-purple-500/30 flex justify-between items-start">
          <div>
            <p className="text-[10px] font-mono text-purple-400 tracking-widest uppercase mb-1 flex items-center gap-1.5"><Radio size={12}/> OSINT Analysis</p>
            <h1 className="text-2xl font-bold text-white mb-2">Social Intelligence Digest</h1>
            <p className="text-sm text-slate-400">24H Scan • 14,502 Intercepts • National Scope</p>
          </div>
          <Target className="text-slate-800 w-16 h-16"/>
        </div>

        <div className="p-6 bg-white dark:bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            
            {/* Sentiment */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-4 border-b border-slate-200 pb-2">Sentiment Distribution</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_SENTIMENT} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 10, fill: '#475569'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{background: '#fff', fontSize: 11}} cursor={{fill: '#f1f5f9'}}/>
                    <Bar dataKey="value" radius={[0,2,2,0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trending Keywords */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-4 border-b border-slate-200 pb-2">Trending Geo-Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {['#GarissaFloods', 'bridge collapsed', 'stuck in traffic', 'Nairobi rain', 'power outage', 'rescue needed in Tana', 'Athi river rising'].map((kw, i) => (
                  <span key={i} className={`px-3 py-1.5 text-xs font-medium rounded border ${i < 3 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>

          </div>

          <div>
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-3 border-b border-slate-200 pb-2">AI Triage Summary</h3>
             <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-purple-300 pl-4 py-1">
               Social media volume increased by 45% in the last 6 hours, localized heavily around the Nairobi and Machakos regions. Principal civilian concerns involve traffic gridlock due to localized flooding and a power outage in the Athi River area. No widespread panic detected; sentiment is primarily frustrated (Neutral/Negative).
             </p>
          </div>

        </div>
      </div>
    </div>
  );
}
