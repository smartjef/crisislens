import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import AIChatPanel from '../../components/ai/AIChatPanel';
import ScenarioSimulator from '../../components/ai/ScenarioSimulator';
import { BrainCircuit, History, Search, Info } from 'lucide-react';

function Panel({ title, badge, children, className = '' }) {
    return (
        <div className={`bg-surface-raised border border-surface-border rounded ${className}`}>
            {title && (
                <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        {title}
                    </span>
                    {badge}
                </div>
            )}
            {children}
        </div>
    );
}

function RiskTier({ category }) {
    const map = {
        High:     'text-red-400 bg-red-900/20 border-red-800/30',
        Moderate: 'text-amber-400 bg-amber-900/20 border-amber-800/30',
        Low:      'text-emerald-400 bg-emerald-900/20 border-emerald-800/30',
    };
    return (
        <span className={`text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${map[category] || map.Low}`}>
            {category}
        </span>
    );
}

export default function AnalystDashboard() {
    usePageTitle('Analyst Workbench');
    const [subCounties,    setSubCounties]    = useState([]);
    const [selectedSubId,  setSelectedSubId]  = useState(null);
    const [selectedSub,    setSelectedSub]    = useState(null);
    const [loading,        setLoading]        = useState(true);

    useEffect(() => { fetchSubCounties(); }, []);

    useEffect(() => {
        if (selectedSubId) fetchSubCountyDetail(selectedSubId);
    }, [selectedSubId]);

    const fetchSubCounties = async () => {
        setLoading(true);
        try {
            const res = await client.get('/api/sub-counties/');
            setSubCounties(res.data);
            if (res.data.length > 0) setSelectedSubId(res.data[0].id);
        } catch (e) {
            console.error('Failed to fetch sub-counties', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubCountyDetail = async (id) => {
        try {
            const res = await client.get(`/api/sub-counties/${id}/`);
            setSelectedSub(res.data);
        } catch (e) {
            console.error('Failed to fetch sub-county detail', e);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px] gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Calibrating analytical workspace...</span>
        </div>
    );

    const predictions = selectedSub?.floodprediction_set?.slice(0, 10) || [];

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1 flex items-center gap-1.5">
                        <BrainCircuit size={10} /> Analytic Intelligence
                    </p>
                    <h1 className="text-xl font-semibold text-slate-200">Strategic Workbench</h1>
                </div>
                {/* Sector selector */}
                <div className="relative w-64 shrink-0">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    <select
                        className="w-full bg-surface-raised border border-surface-border rounded pl-8 pr-3 py-2 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-flood-500 outline-none appearance-none cursor-pointer"
                        value={selectedSubId || ''}
                        onChange={e => setSelectedSubId(e.target.value)}
                    >
                        {subCounties.map(s => (
                            <option key={s.id} value={s.id}>{s.name} — {s.county_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* AI Chat */}
            <AIChatPanel county={selectedSub?.county_name} area={selectedSub?.name} />

            {/* Scenario + History */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

                {/* Scenario simulator */}
                <Panel
                    title={<><BrainCircuit size={11} className="inline mr-1.5 text-indigo-400" />Scenario Simulator</>}
                    badge={<span className="text-[9px] font-mono text-indigo-400 bg-indigo-900/20 border border-indigo-800/30 px-1.5 py-0.5 rounded">Monte Carlo v1.2</span>}
                    className="xl:col-span-2"
                >
                    <div className="p-5">
                        <ScenarioSimulator subCounty={selectedSub} />
                    </div>
                </Panel>

                {/* Prediction history */}
                <Panel
                    title={<><History size={11} className="inline mr-1.5 text-slate-500" />Prediction History</>}
                    badge={<span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Time Series</span>}
                    className="xl:col-span-3"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="border-b border-surface-border">
                                <tr>
                                    {['Date', 'Prob %', 'Category', 'Lead', 'Confidence', 'Source'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border">
                                {predictions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-10 text-center text-xs text-slate-600 italic">
                                            No temporal data for this sector
                                        </td>
                                    </tr>
                                ) : predictions.map((p, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3 font-mono text-slate-400">
                                            {new Date(p.predicted_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-3 font-mono font-semibold text-slate-300 tabular-nums">{p.flood_probability}%</td>
                                        <td className="px-5 py-3"><RiskTier category={p.risk_category} /></td>
                                        <td className="px-5 py-3 font-mono text-slate-500">{p.lead_time_days}d</td>
                                        <td className="px-5 py-3 font-mono text-slate-500 tabular-nums">{(p.confidence * 100).toFixed(0)}%</td>
                                        <td className="px-5 py-3">
                                            <span className="text-[9px] font-mono text-slate-600 border border-surface-border px-1.5 py-0.5 rounded">
                                                {p.source || 'Model'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 py-2.5 border-t border-surface-border flex items-center gap-1.5">
                        <Info size={10} className="text-slate-600" />
                        <span className="text-[10px] font-mono text-slate-600">Showing last 10 model execution cycles</span>
                    </div>
                </Panel>
            </div>
        </div>
    );
}
