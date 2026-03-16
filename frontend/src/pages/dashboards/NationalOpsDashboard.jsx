import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ShieldAlert, MapPin, Users, Clock, ArrowRight, Plus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlertCreateModal from '../../components/alerts/AlertCreateModal';

/* ── Panel Component ─────────────────────────────────────────── */
function Panel({ title, action, children, className = '' }) {
    return (
        <Card className={`overflow-hidden ${className}`}>
            {(title || action) && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-surface-border bg-slate-50/50 dark:bg-surface/50">
                    {title && <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{title}</span>}
                    {action}
                </div>
            )}
            {children}
        </Card>
    );
}

/* ── KPI metric card ─────────────────────────────────────────────── */
function KPI({ title, value, icon: Icon, accent = 'flood' }) {
    const accentMap = {
        flood: { icon: 'text-flood-600 dark:text-flood-400', bg: 'bg-flood-50 dark:bg-flood-950/20', border: 'border-flood-100 dark:border-flood-900/30' },
        red: { icon: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-100 dark:border-red-900/30' },
        amber: { icon: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-100 dark:border-amber-900/30' },
        indigo: { icon: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/20', border: 'border-indigo-100 dark:border-indigo-900/30' },
    };
    const c = accentMap[accent] || accentMap.flood;
    return (
        <Card className="px-4 py-3 flex items-start justify-between">
            <div>
                <p className="text-[8px] uppercase tracking-[0.25em] font-black text-slate-400 dark:text-slate-500 mb-1.5">{title}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">{value ?? '—'}</p>
            </div>
            <div className={`p-1.5 rounded-sm border ${c.bg} ${c.border}`}>
                <Icon size={14} className={c.icon} />
            </div>
        </Card>
    );
}

/* ── Risk bar ──────────────────────────────────────────────────────── */
function RiskBar({ value }) {
    const color = value >= 75 ? 'bg-red-500' : value >= 50 ? 'bg-amber-500' : 'bg-flood-500';
    return (
        <div className="flex items-center gap-2">
            <div className="w-16 h-1 bg-slate-100 dark:bg-surface border border-slate-200/50 dark:border-surface-border rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-700 ease-out`} style={{ width: `${value}%` }} />
            </div>
            <span className="text-[9px] font-black text-slate-400 tabular-nums w-7">{value}%</span>
        </div>
    );
}

/* ── Severity chip ─────────────────────────────────────────────────── */
function SeverityChip({ severity }) {
    const map = {
        critical: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30',
        high: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
        medium: 'text-flood-600 dark:text-flood-400 bg-flood-50 dark:bg-flood-950/20 border-flood-100 dark:border-flood-900/30',
        low: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
    };
    return (
        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${map[severity] || map.low}`}>
            {severity}
        </span>
    );
}

/* ── Sort header ──────────────────────────────────────────────────── */
function SortTh({ label, sortKey, sortConfig, onSort, className = '' }) {
    const active = sortConfig.key === sortKey;
    return (
        <th
            className={`px-4 py-2 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors select-none ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <span className="flex items-center gap-1">
                {label}
                {active
                    ? sortConfig.direction === 'asc' ? <ChevronUp size={10} className="text-flood-500" /> : <ChevronDown size={10} className="text-flood-500" />
                    : <ChevronsUpDown size={10} className="opacity-20" />
                }
            </span>
        </th>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function NationalOpsDashboard() {
    usePageTitle('National Operations Center');
    const [stats, setStats] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [countiesData, setCountiesData] = useState([]);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'flood_probability', direction: 'desc' });
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [s, t, c, a] = await Promise.all([
                client.get('/api/counties/stats/'),
                client.get('/api/counties/trend/'),
                client.get('/api/counties/'),
                client.get('/api/alerts/?limit=10'),
            ]);
            setStats(s.data);
            setTrendData(t.data);
            setCountiesData(c.data);
            setRecentAlerts(a.data.results || a.data);
        } catch (e) {
            console.error('Failed to load national dashboard', e);
        } finally {
            setLoading(false);
        }
    };

    const sortedCounties = useMemo(() => {
        const items = [...countiesData];
        if (sortConfig.key) {
            items.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [countiesData, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
        }));
    };

    const chartData = useMemo(() => {
        const pivot = {};
        trendData.forEach(d => {
            const dateStr = new Date(d.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
            if (!pivot[dateStr]) pivot[dateStr] = { date: dateStr };
            pivot[dateStr][d.county] = d.probability;
        });
        return Object.values(pivot).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [trendData]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <div className="w-6 h-6 border-2 border-flood-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing NOC Intel...</span>
        </div>
    );

    return (
        <div className="p-4 md:p-5 space-y-4 animate-in fade-in duration-500">

            {/* Page header - Highly Compact */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-surface-border">
                <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-1">GOK · National Emergency Management Authority</p>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">National Ops Center</h1>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Lake Victoria Basin — Flood Monitoring & Coordination</p>
                </div>
                <Button
                    onClick={() => setModalOpen(true)}
                    className="shrink-0 h-9 px-4 font-black uppercase tracking-widest text-[9px] flex items-center gap-2"
                >
                    <Plus size={14} strokeWidth={3} /> Broadcast Alert
                </Button>
            </header>

            <AlertCreateModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchAll} />

            {/* KPI row - Compact */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPI title="Active Alerts" value={stats?.active_alerts} icon={ShieldAlert} accent="red" />
                <KPI title="High Risk Zones" value={stats?.high_risk_count} icon={MapPin} accent="amber" />
                <KPI title="Pop at Risk" value={stats?.pop_at_risk?.toLocaleString()} icon={Users} accent="flood" />
                <KPI title="Avg Lead Time" value={stats?.avg_lead_time ? `${stats.avg_lead_time}d` : null} icon={Clock} accent="indigo" />
            </section>

            {/* Chart + alerts feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Trend chart */}
                <Panel title="30-Day Probability Trend" className="lg:col-span-2">
                    <div className="p-4 min-h-[224px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <defs>
                                    {[
                                        { id: 'kisumu', color: '#0891b2' },
                                        { id: 'siaya', color: '#4f46e5' },
                                        { id: 'homa', color: '#059669' },
                                    ].map(g => (
                                        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={g.color} stopOpacity={0.15} />
                                            <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-surface-border" vertical={false} />
                                <XAxis dataKey="date" fontSize={9} fontWeight={600} tick={{ fill: 'currentColor', fontFamily: "'IBM Plex Mono', monospace" }} className="text-slate-400" axisLine={false} tickLine={false} dy={5} />
                                <YAxis fontSize={9} fontWeight={600} tick={{ fill: 'currentColor', fontFamily: "'IBM Plex Mono', monospace" }} className="text-slate-400" axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 2, fontSize: 10, fontFamily: "'IBM Plex Sans', sans-serif" }}
                                    itemStyle={{ color: '#fff', fontWeight: 700 }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: 2, fontWeight: 700 }}
                                />
                                <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 5 }} verticalAlign="top" height={30} />
                                <Area type="monotone" name="Kisumu" dataKey="Kisumu" stroke="#0891b2" fill="url(#kisumu)" strokeWidth={2} dot={false} />
                                <Area type="monotone" name="Siaya" dataKey="Siaya" stroke="#4f46e5" fill="url(#siaya)" strokeWidth={2} dot={false} />
                                <Area type="monotone" name="Homa Bay" dataKey="Homa Bay" stroke="#059669" fill="url(#homa)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>

                {/* Recent alerts feed */}
                <Panel title="Live Intelligence Feed">
                    <div className="divide-y divide-slate-100 dark:divide-surface-border max-h-[224px] overflow-y-auto custom-scrollbar">
                        {recentAlerts.length === 0 ? (
                            <div className="px-5 py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed">System Scan: Nominal</div>
                        ) : recentAlerts.map(alert => (
                            <Link
                                key={alert.id}
                                to={`/alerts/${alert.id}`}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-surface/50 transition-all group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <SeverityChip severity={alert.severity} />
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                            {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate group-hover:text-flood-600 transition-colors uppercase">{alert.title}</p>
                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">{alert.county_name}</p>
                                </div>
                                <ArrowRight size={12} className="text-slate-300 group-hover:text-flood-500 transition-all mt-1 shrink-0" />
                            </Link>
                        ))}
                    </div>
                </Panel>
            </div>

            {/* Risk matrix table - Highly Compact */}
            <Panel title="Regional Risk Analytics Matrix">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-[10px]">
                        <thead className="border-b border-slate-100 dark:border-surface-border bg-slate-50/50 dark:bg-surface/30 text-slate-400">
                            <tr>
                                <SortTh label="Jurisdictions" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                                <SortTh label="Probability" sortKey="flood_probability" sortConfig={sortConfig} onSort={handleSort} />
                                <th className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-widest">Risk Tier</th>
                                <SortTh label="Lead window" sortKey="lead_time_days" sortConfig={sortConfig} onSort={handleSort} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-surface-border">
                            {sortedCounties.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-surface/30 transition-colors">
                                    <td className="px-4 py-2 font-black text-slate-800 dark:text-slate-200 capitalize tracking-tight">{c.name}</td>
                                    <td className="px-4 py-2">
                                        <RiskBar value={c.flood_probability} />
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${c.risk_category === 'High' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/10' :
                                            c.risk_category === 'Moderate' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/10' :
                                                'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/10'
                                            }`}>{c.risk_category}</span>
                                    </td>
                                    <td className="px-4 py-2 font-black text-slate-400 tabular-nums italic tracking-tighter">{c.lead_time_days}D LEAD</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}
