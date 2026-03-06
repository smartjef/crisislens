import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ShieldAlert, MapPin, Users, Clock, ArrowRight, TrendingUp, Plus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlertCreateModal from '../../components/alerts/AlertCreateModal';

/* ── Shared dark panel ─────────────────────────────────────────── */
function Panel({ title, action, children, className = '' }) {
    return (
        <div className={`bg-surface-raised border border-surface-border rounded ${className}`}>
            {(title || action) && (
                <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
                    {title && <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{title}</span>}
                    {action}
                </div>
            )}
            {children}
        </div>
    );
}

/* ── KPI metric card ─────────────────────────────────────────────── */
function KPI({ title, value, icon: Icon, accent = 'flood' }) {
    const accentMap = {
        flood:  { icon: 'text-flood-400',   bar: 'bg-flood-900/40',  border: 'border-flood-800/40' },
        red:    { icon: 'text-red-400',      bar: 'bg-red-900/30',    border: 'border-red-800/30' },
        amber:  { icon: 'text-amber-400',    bar: 'bg-amber-900/30',  border: 'border-amber-800/30' },
        indigo: { icon: 'text-indigo-400',   bar: 'bg-indigo-900/30', border: 'border-indigo-800/30' },
    };
    const c = accentMap[accent] || accentMap.flood;
    return (
        <div className={`bg-surface-raised border border-surface-border rounded p-5 flex items-start justify-between`}>
            <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-600 mb-2">{title}</p>
                <p className="text-3xl font-semibold text-slate-100 tabular-nums font-mono">{value ?? '—'}</p>
            </div>
            <div className={`p-2 rounded border ${c.bar} ${c.border}`}>
                <Icon size={16} className={c.icon} />
            </div>
        </div>
    );
}

/* ── Risk bar ──────────────────────────────────────────────────────── */
function RiskBar({ value }) {
    const color = value >= 75 ? 'bg-red-500' : value >= 50 ? 'bg-amber-500' : 'bg-flood-500';
    return (
        <div className="flex items-center gap-3">
            <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums w-8">{value}%</span>
        </div>
    );
}

/* ── Severity chip ─────────────────────────────────────────────────── */
function SeverityChip({ severity }) {
    const map = {
        critical: 'text-red-400 bg-red-900/20 border-red-800/30',
        high:     'text-amber-400 bg-amber-900/20 border-amber-800/30',
        medium:   'text-flood-400 bg-flood-900/20 border-flood-800/30',
        low:      'text-emerald-400 bg-emerald-900/20 border-emerald-800/30',
    };
    return (
        <span className={`text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${map[severity] || map.low}`}>
            {severity}
        </span>
    );
}

/* ── Sort header ──────────────────────────────────────────────────── */
function SortTh({ label, sortKey, sortConfig, onSort, className = '' }) {
    const active = sortConfig.key === sortKey;
    return (
        <th
            className={`px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600 cursor-pointer hover:text-slate-300 select-none ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <span className="flex items-center gap-1">
                {label}
                {active
                    ? sortConfig.direction === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                    : <ChevronsUpDown size={11} className="opacity-30" />
                }
            </span>
        </th>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function NationalOpsDashboard() {
    usePageTitle('National Operations Center');
    const [stats,        setStats]        = useState(null);
    const [trendData,    setTrendData]    = useState([]);
    const [countiesData, setCountiesData] = useState([]);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [sortConfig,   setSortConfig]   = useState({ key: 'flood_probability', direction: 'desc' });
    const [modalOpen,    setModalOpen]    = useState(false);

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
        <div className="flex items-center justify-center min-h-[400px] gap-3">
            <div className="w-5 h-5 border-2 border-flood-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Loading intelligence...</span>
        </div>
    );

    return (
        <div className="space-y-4">

            {/* Page header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1">GOK · National Emergency Management Authority</p>
                    <h1 className="text-xl font-semibold text-slate-200">National Operations Center</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Lake Victoria Basin — Flood Risk Monitoring &amp; Coordination</p>
                </div>
                <Button
                    onClick={() => setModalOpen(true)}
                    className="shrink-0 bg-red-700 hover:bg-red-600 text-white text-xs px-4 py-2 rounded flex items-center gap-1.5 font-medium"
                >
                    <Plus size={13} /> Broadcast Alert
                </Button>
            </div>

            <AlertCreateModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchAll} />

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPI title="Active Alerts"       value={stats?.active_alerts}                    icon={ShieldAlert} accent="red"    />
                <KPI title="High Risk Zones"     value={stats?.high_risk_count}                  icon={MapPin}      accent="amber"  />
                <KPI title="Population at Risk"  value={stats?.pop_at_risk?.toLocaleString()}    icon={Users}       accent="flood"  />
                <KPI title="Avg Lead Time"       value={stats?.avg_lead_time ? `${stats.avg_lead_time}d` : null} icon={Clock} accent="indigo" />
            </div>

            {/* Chart + alerts feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Trend chart */}
                <Panel title="30-Day Flood Probability Trend" className="lg:col-span-2">
                    <div className="p-5 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                                <defs>
                                    {[
                                        { id: 'kisumu', color: '#22d3ee' },
                                        { id: 'siaya',  color: '#818cf8' },
                                        { id: 'homa',   color: '#34d399' },
                                    ].map(g => (
                                        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={g.color} stopOpacity={0.2} />
                                            <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" fontSize={9} tick={{ fill: '#475569' }} axisLine={false} tickLine={false} />
                                <YAxis fontSize={9} tick={{ fill: '#475569' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, fontSize: 11 }}
                                    labelStyle={{ color: '#94a3b8' }}
                                    itemStyle={{ color: '#cbd5e1' }}
                                />
                                <Legend wrapperStyle={{ fontSize: 10, color: '#64748b' }} verticalAlign="top" height={28} />
                                <Area type="monotone" name="Kisumu"   dataKey="Kisumu"   stroke="#22d3ee" fill="url(#kisumu)" strokeWidth={1.5} dot={false} />
                                <Area type="monotone" name="Siaya"    dataKey="Siaya"    stroke="#818cf8" fill="url(#siaya)"  strokeWidth={1.5} dot={false} />
                                <Area type="monotone" name="Homa Bay" dataKey="Homa Bay" stroke="#34d399" fill="url(#homa)"   strokeWidth={1.5} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>

                {/* Recent alerts feed */}
                <Panel title="Recent Alerts">
                    <div className="divide-y divide-surface-border max-h-64 overflow-y-auto">
                        {recentAlerts.length === 0 ? (
                            <p className="px-5 py-8 text-center text-xs text-slate-600 italic">No recent alerts</p>
                        ) : recentAlerts.map(alert => (
                            <Link
                                key={alert.id}
                                to={`/alerts/${alert.id}`}
                                className="flex items-start gap-3 px-5 py-3 hover:bg-white/5 transition-colors group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <SeverityChip severity={alert.severity} />
                                        <span className="text-[10px] font-mono text-slate-600">
                                            {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-300 truncate group-hover:text-flood-400 transition-colors">{alert.title}</p>
                                    <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wide mt-0.5">{alert.county_name}</p>
                                </div>
                                <ArrowRight size={12} className="text-slate-700 group-hover:text-flood-400 transition-colors mt-1 shrink-0" />
                            </Link>
                        ))}
                    </div>
                </Panel>
            </div>

            {/* Risk matrix table */}
            <Panel title="National Risk Analytics Matrix">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="border-b border-surface-border">
                            <tr>
                                <SortTh label="County"           sortKey="name"              sortConfig={sortConfig} onSort={handleSort} />
                                <SortTh label="Flood Probability" sortKey="flood_probability" sortConfig={sortConfig} onSort={handleSort} />
                                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Risk Tier</th>
                                <SortTh label="Lead Time"        sortKey="lead_time_days"    sortConfig={sortConfig} onSort={handleSort} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                            {sortedCounties.map(c => (
                                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3 font-medium text-slate-300">{c.name}</td>
                                    <td className="px-5 py-3">
                                        <RiskBar value={c.flood_probability} />
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                            c.risk_category === 'High'     ? 'text-red-400 bg-red-900/20 border-red-800/30' :
                                            c.risk_category === 'Moderate' ? 'text-amber-400 bg-amber-900/20 border-amber-800/30' :
                                            'text-emerald-400 bg-emerald-900/20 border-emerald-800/30'
                                        }`}>{c.risk_category}</span>
                                    </td>
                                    <td className="px-5 py-3 font-mono text-slate-500">{c.lead_time_days}d</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}
