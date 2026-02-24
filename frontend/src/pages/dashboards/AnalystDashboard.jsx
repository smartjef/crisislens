import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import AIChatPanel from '../../components/ai/AIChatPanel';
import ScenarioSimulator from '../../components/ai/ScenarioSimulator';
import { BrainCircuit, History, Search, Info } from 'lucide-react';

export default function AnalystDashboard() {
    usePageTitle('Analyst Workbench - CrisisLens');
    const [subCounties, setSubCounties] = useState([]);
    const [selectedSubId, setSelectedSubId] = useState(null);
    const [selectedSub, setSelectedSub] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubCounties();
    }, []);

    useEffect(() => {
        if (selectedSubId) {
            fetchSubCountyDetail(selectedSubId);
        }
    }, [selectedSubId]);

    const fetchSubCounties = async () => {
        setLoading(true);
        try {
            const res = await client.get('/api/sub-counties/');
            setSubCounties(res.data);
            if (res.data.length > 0) {
                setSelectedSubId(res.data[0].id);
            }
        } catch (e) {
            console.error("Failed to fetch sub-counties", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubCountyDetail = async (id) => {
        try {
            const res = await client.get(`/api/sub-counties/${id}/`);
            setSelectedSub(res.data);
        } catch (e) {
            console.error("Failed to fetch sub-county detail", e);
        }
    };

    if (loading && subCounties.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 font-black animate-pulse uppercase tracking-widest text-xs">Calibrating Analytical Workspace...</p>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 h-full flex flex-col animate-in fade-in duration-700">
            {/* Context Switcher & Dashboard Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl border border-slate-800">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-3xl shadow-inner border border-indigo-500/10">
                        <BrainCircuit className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.4em] leading-none mb-2 ml-0.5">Analytic Intelligence</p>
                        <h1 className="text-3xl font-black text-white tracking-tighter">Strategic Workbench</h1>
                    </div>
                </div>
                <div className="w-full md:w-96 group relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                        <Search className="w-5 h-5" />
                    </div>
                    <select
                        className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl pl-14 pr-5 py-4 text-sm font-black text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                        value={selectedSubId || ""}
                        onChange={(e) => setSelectedSubId(e.target.value)}
                    >
                        {subCounties.map(s => (
                            <option key={s.id} value={s.id}>{s.name} Sector Context</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* AI Briefing Panel - Full Width Top */}
            <div className="animate-in slide-in-from-top-10 duration-700">
                <AIChatPanel county={selectedSub?.county_name} area={selectedSub?.name} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Panel: Scenarios */}
                <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                    <Card className="border-slate-200 shadow-xl overflow-hidden border-t-8 border-t-indigo-600 rounded-[2.5rem] bg-white transition-all hover:shadow-2xl">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex justify-between items-center px-8 py-7">
                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
                                <BrainCircuit className="w-7 h-7 text-indigo-600" /> Scenario Simulator
                            </CardTitle>
                            <Badge variant="outline" className="font-bold border-indigo-100 text-indigo-600 bg-white shadow-sm px-4 py-1.5 rounded-xl uppercase tracking-widest text-[9px]">Monte Carlo Sim v1.2</Badge>
                        </CardHeader>
                        <CardContent className="p-8">
                            <ScenarioSimulator subCounty={selectedSub} />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel: History Table */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                    <Card className="border-slate-200 shadow-xl overflow-hidden rounded-[2.5rem] bg-white transition-all hover:shadow-2xl">
                        <CardHeader className="bg-slate-900 border-b border-slate-800 flex justify-between items-center px-8 py-7">
                            <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                                <History className="w-7 h-7 text-indigo-400" /> Prediction History
                            </CardTitle>
                            <Badge variant="info" className="bg-indigo-500 text-white border-none font-bold uppercase tracking-widest text-[9px] px-3 py-1">Time Series</Badge>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-5">Date</th>
                                        <th className="px-6 py-5">Prob %</th>
                                        <th className="px-6 py-5">Category</th>
                                        <th className="px-6 py-5">Lead Time</th>
                                        <th className="px-6 py-5">Confidence</th>
                                        <th className="px-6 py-5">Source</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {selectedSub?.floodprediction_set?.length === 0 ? (
                                        <tr><td colSpan="6" className="p-20 text-center text-slate-400 italic font-black uppercase tracking-widest text-xs opacity-50">No temporal data available for this sector</td></tr>
                                    ) : selectedSub?.floodprediction_set?.slice(0, 10).map((p, idx) => (
                                        <tr key={idx} className="hover:bg-indigo-50/30 transition-all group">
                                            <td className="px-6 py-5 font-black text-slate-600 group-hover:text-indigo-600 transition-colors uppercase tracking-tight whitespace-nowrap">
                                                {new Date(p.predicted_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-5 font-black text-slate-900 tabular-nums text-sm">
                                                {p.flood_probability}%
                                            </td>
                                            <td className="px-6 py-5">
                                                <Badge variant={p.risk_category === 'High' ? 'danger' : p.risk_category === 'Moderate' ? 'warning' : 'success'} className="px-3 py-1 font-black text-[8px] uppercase tracking-widest">
                                                    {p.risk_category}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-5 font-black text-slate-400 italic tabular-nums">{p.lead_time_days}d</td>
                                            <td className="px-6 py-5 font-black text-slate-500 tabular-nums">{(p.confidence * 100).toFixed(0)}%</td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-1.5 font-bold text-slate-400 uppercase text-[9px] tracking-wider">
                                                    <Badge variant="outline" className="text-[8px] border-slate-200 text-slate-400">{p.source || 'Model'}</Badge>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50 p-5 text-center border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                <Info className="w-3.5 h-3.5" /> Showing last 10 model execution cycles
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
