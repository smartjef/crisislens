import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import AIChatPanel from '../../components/ai/AIChatPanel';
import ScenarioSimulator from '../../components/ai/ScenarioSimulator';
import Card from '../../components/ui/Card';
import { BrainCircuit, History, Search, Info } from 'lucide-react';

function Panel({ title, badge, children, className = '' }) {
    return (
        <Card className={`overflow-hidden ${className}`}>
            {title && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-surface-border bg-slate-50/50 dark:bg-surface/50">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        {title}
                    </span>
                    {badge}
                </div>
            )}
            {children}
        </Card>
    );
}

function RiskTier({ category }) {
    const map = {
        High: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20',
        Moderate: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/20',
        Low: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20',
    };
    return (
        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${map[category] || map.Low}`}>
            {category}
        </span>
    );
}

export default function AnalystDashboard() {
    usePageTitle('Analyst Workbench');
    const [subCounties, setSubCounties] = useState([]);
    const [selectedSubId, setSelectedSubId] = useState(null);
    const [selectedSub, setSelectedSub] = useState(null);
    const [loading, setLoading] = useState(true);

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
            const res = await client.get(`/api/sub-county/${id}/`);
            setSelectedSub(res.data);
        } catch (e) {
            console.error('Failed to fetch sub-county detail', e);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Initializing Analyst Context...</span>
        </div>
    );

    const predictions = selectedSub?.floodprediction_set?.slice(0, 8) || [];

    return (
        <div className="p-4 md:p-5 space-y-4 animate-in fade-in duration-500">

            {/* Header - Highly Compact */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-surface-border">
                <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
                        <BrainCircuit size={10} strokeWidth={3} className="text-flood-500" /> Analytic Intelligence
                    </p>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Strategic Workbench</h1>
                </div>
                {/* Sector selector - Compact */}
                <div className="relative w-full sm:w-64 shrink-0">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                        className="w-full bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm pl-8 pr-3 py-2 text-[10px] font-black text-slate-700 dark:text-slate-300 focus:border-flood-500 outline-none appearance-none cursor-pointer transition-colors uppercase tracking-tight"
                        value={selectedSubId || ''}
                        onChange={e => setSelectedSubId(e.target.value)}
                    >
                        {subCounties.map(s => (
                            <option key={s.id} value={s.id}>{s.name} — {s.county_name}</option>
                        ))}
                    </select>
                </div>
            </header>

            {/* AI Chat - Should handle compactness internally */}
            <AIChatPanel county={selectedSub?.county_name} area={selectedSub?.name} />

            {/* Scenario + History - Compact Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

                {/* Scenario simulator */}
                <Panel
                    title={<><BrainCircuit size={11} strokeWidth={3} className="text-flood-500" />Scenario simulator</>}
                    badge={<span className="text-[8px] font-black text-flood-600 dark:text-flood-400 bg-flood-50 dark:bg-flood-950/10 border border-flood-100 dark:border-flood-900/20 px-1.5 py-0.5 rounded-sm uppercase tracking-widest">MC v1.2</span>}
                    className="xl:col-span-2"
                >
                    <div className="p-4">
                        <ScenarioSimulator subCounty={selectedSub} />
                    </div>
                </Panel>

                {/* Prediction history */}
                <Panel
                    title={<><History size={11} strokeWidth={3} className="text-slate-400" />Temporal Analysis</>}
                    badge={<span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Telemetry</span>}
                    className="xl:col-span-3"
                >
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-[10px]">
                            <thead className="border-b border-slate-100 dark:border-surface-border bg-slate-50/50 dark:bg-surface/30">
                                <tr className="text-slate-400">
                                    {['Execution', 'Prob %', 'Tier', 'Lead', 'Conf', 'Origin'].map(h => (
                                        <th key={h} className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-surface-border">
                                {predictions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center bg-slate-50/20 dark:bg-surface/5">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">No telemetry cycles detected</p>
                                        </td>
                                    </tr>
                                ) : predictions.map((p, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-surface/30 transition-colors">
                                        <td className="px-4 py-2 font-black text-slate-400 tabular-nums">
                                            {new Date(p.predicted_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-2 font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{p.flood_probability}%</td>
                                        <td className="px-4 py-2"><RiskTier category={p.risk_category} /></td>
                                        <td className="px-4 py-2 font-black text-slate-500 italic uppercase tracking-tighter">{p.lead_time_days}D</td>
                                        <td className="px-4 py-2 font-black text-slate-400 tabular-nums tracking-tighter">{(p.confidence * 100).toFixed(0)}%</td>
                                        <td className="px-4 py-2">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 py-0.5 border border-slate-200 dark:border-surface-border rounded-sm">
                                                {p.source || 'SYS-X'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2 bg-slate-50/30 dark:bg-surface/30 border-t border-slate-100 dark:border-surface-border flex items-center gap-2">
                        <Info size={10} className="text-slate-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Last 8 autonomous execution cycles</span>
                    </div>
                </Panel>
            </div>
        </div>
    );
}
