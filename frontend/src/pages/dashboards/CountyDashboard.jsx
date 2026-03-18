import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { ShieldAlert, Bell, PlusCircle, ArrowRight, Droplets, MapPin, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlertCreateModal from '../../components/alerts/AlertCreateModal';
import useSubCountyRisk from '../../hooks/useSubCountyRisk';
import useAlerts from '../../hooks/useAlerts';
import IntelSummaryWidget from '../../components/IntelSummaryWidget';

function Panel({ title, badge, children, className = '' }) {
    return (
        <Card className={`overflow-hidden ${className}`}>
            {title && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-surface-border bg-slate-50/50 dark:bg-surface/50">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{title}</span>
                    {badge}
                </div>
            )}
            {children}
        </Card>
    );
}

function RiskBar({ value }) {
    const color = value >= 75 ? 'bg-red-500' : value >= 50 ? 'bg-amber-500' : 'bg-flood-500';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-100 dark:bg-surface border border-slate-200/50 dark:border-surface-border rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-700 ease-out`} style={{ width: `${value}%` }} />
            </div>
            <span className="text-[9px] font-black text-slate-400 tabular-nums w-7">{value}%</span>
        </div>
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

function ActionCard({ sub }) {
    const prob = sub.flood_probability;
    if (prob >= 75) return (
        <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-surface-border bg-red-50/30 dark:bg-red-950/5">
            <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-900 dark:text-slate-100 leading-tight">EVAC ADVISORY: {sub.name}</p>
                <p className="text-[8px] text-red-500 font-black mt-1 uppercase tracking-widest leading-none">Status: Critical Action Required</p>
            </div>
        </div>
    );
    if (prob >= 50) return (
        <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-surface-border bg-amber-50/30 dark:bg-amber-950/5">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-900 dark:text-slate-100 leading-tight">PRE-POSITION RELIEF: {sub.name}</p>
                <p className="text-[8px] text-amber-500 font-black mt-1 uppercase tracking-widest leading-none">Status: Elevated Readiness</p>
            </div>
        </div>
    );
    return (
        <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-surface-border bg-slate-50/50 dark:bg-surface/5">
            <Droplets size={14} className="text-flood-600 dark:text-flood-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-900 dark:text-slate-100 leading-tight">MONITOR LEVELS: {sub.name}</p>
                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black mt-1 uppercase tracking-widest leading-none">Status: Routine Surveillance</p>
            </div>
        </div>
    );
}

/* ── Skeleton components ─────────────────────────────────────────── */
const KPISkeleton = () => (
    <div className="rounded border border-surface-border bg-surface-raised p-4 animate-pulse">
        <div className="h-2 w-20 bg-surface-border/50 rounded mb-3" />
        <div className="h-8 w-16 bg-surface-border/50 rounded mb-2" />
        <div className="h-2 w-24 bg-surface-border/50 rounded" />
    </div>
);

const RowSkeleton = () => (
    <tr className="border-b border-surface-border animate-pulse">
        <td className="px-4 py-2.5"><div className="h-2.5 bg-surface-border/40 rounded w-28" /></td>
        <td className="px-4 py-2.5"><div className="h-2 bg-surface-border/30 rounded w-20" /></td>
        <td className="px-4 py-2.5"><div className="h-5 bg-surface-border/30 rounded w-14" /></td>
        <td className="px-4 py-2.5"><div className="h-2 bg-surface-border/30 rounded w-12" /></td>
    </tr>
);

const AlertRowSkeleton = () => (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-border animate-pulse">
        <div className="w-8 h-8 rounded bg-surface-border/40" />
        <div className="flex-1 space-y-2">
            <div className="h-2.5 bg-surface-border/40 rounded w-3/4" />
            <div className="h-2 bg-surface-border/30 rounded w-1/2" />
        </div>
        <div className="h-5 w-12 bg-surface-border/30 rounded" />
    </div>
);

export default function CountyDashboard() {
    const user = useAuthStore(state => state.user);
    const [county, setCounty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    usePageTitle(`${county?.name || 'County'} Dashboard`);

    const { data: subCounties } = useSubCountyRisk(user?.county_id);
    const { data: alertsData } = useAlerts({ county: user?.county_id }, { pollInterval: 60000 });

    useEffect(() => {
        if (user?.county_id) fetchCountyDetail();
    }, [user?.county_id]);

    const fetchCountyDetail = async () => {
        try {
            const res = await client.get(`/api/counties/${user.county_id}/`);
            setCounty(res.data);
        } catch (e) {
            console.error('Failed to fetch county detail', e);
        } finally {
            setLoading(false);
        }
    };

    const sorted = [...(subCounties || [])].sort((a, b) => b.flood_probability - a.flood_probability);
    const alerts = alertsData?.results || [];

    if (loading && !county) return (
        <div className="p-4 md:p-5 space-y-4">
            {/* Header skeleton */}
            <div className="flex items-center justify-between pb-4 border-b border-surface-border animate-pulse">
                <div className="space-y-2">
                    <div className="h-2 w-36 bg-surface-border/50 rounded" />
                    <div className="h-6 w-52 bg-surface-border/40 rounded" />
                    <div className="h-4 w-40 bg-surface-border/30 rounded" />
                </div>
                <div className="h-9 w-28 bg-surface-border/40 rounded" />
            </div>
            {/* KPI row skeleton */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[0, 1, 2].map(i => <KPISkeleton key={i} />)}
            </section>
            {/* Sub-county table + advisories skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded border border-surface-border bg-surface-raised overflow-hidden animate-pulse">
                    <div className="px-4 py-2 border-b border-surface-border">
                        <div className="h-2 w-44 bg-surface-border/50 rounded" />
                    </div>
                    <table className="w-full">
                        <tbody>
                            {[0, 1, 2, 3, 4].map(i => <RowSkeleton key={i} />)}
                        </tbody>
                    </table>
                </div>
                <div className="rounded border border-surface-border bg-surface-raised overflow-hidden animate-pulse">
                    <div className="px-4 py-2 border-b border-surface-border">
                        <div className="h-2 w-32 bg-surface-border/50 rounded" />
                    </div>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-surface-border">
                            <div className="w-4 h-4 rounded bg-surface-border/40 mt-0.5 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-2.5 bg-surface-border/40 rounded w-3/4" />
                                <div className="h-2 bg-surface-border/30 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Alerts panel skeleton */}
            <div className="rounded border border-surface-border bg-surface-raised overflow-hidden animate-pulse">
                <div className="px-4 py-2 border-b border-surface-border">
                    <div className="h-2 w-40 bg-surface-border/50 rounded" />
                </div>
                {[0, 1, 2].map(i => <AlertRowSkeleton key={i} />)}
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-5 space-y-4 animate-in fade-in duration-500">

            {/* Header - Highly Compact */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-surface-border">
                <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
                        <MapPin size={10} strokeWidth={3} className="text-emerald-500" /> County Emergency Operations
                    </p>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter capitalize">{county?.name} Jurisdiction</h1>
                    <div className="flex items-center gap-3 mt-1.5">
                        <RiskTier category={county?.risk_category} />
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">
                            {county?.lead_time_days}-day lead telemetry active
                        </span>
                    </div>
                </div>
                {(user?.role === 'county_officer' || user?.role === 'national_ops') && (
                    <Button
                        onClick={() => setModalOpen(true)}
                        className="shrink-0 h-9 px-4 font-black uppercase tracking-widest text-[9px] flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600"
                    >
                        <PlusCircle size={14} strokeWidth={3} /> Issue Alert
                    </Button>
                )}
            </header>

            <AlertCreateModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchCountyDetail} />

            {/* Intel Summary Widget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <IntelSummaryWidget countyId={user?.county_id} />
            </div>

            {/* Sub-county matrix + advisories - Compact Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Panel title="Jurisdiction Vulnerability Matrix" className="lg:col-span-2">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-[10px]">
                            <thead className="border-b border-slate-100 dark:border-surface-border bg-slate-50/50 dark:bg-surface/30 text-slate-400">
                                <tr>
                                    <th className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-widest">Sector Name</th>
                                    <th className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-widest">Risk Signal</th>
                                    <th className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-widest">Tier</th>
                                    <th className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-widest">Target</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-surface-border">
                                {sorted.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-10">
                                            <div className="flex flex-col items-center gap-3 text-center">
                                                <div className="w-10 h-10 rounded border border-surface-border bg-surface flex items-center justify-center">
                                                    <MapPin size={18} className="text-slate-700" />
                                                </div>
                                                <p className="text-xs font-mono text-slate-500">No risk data for this county</p>
                                                <p className="text-[9px] font-mono text-slate-700">Run seed_counties to populate initial data</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : sorted.map(sub => (
                                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-surface/30 transition-colors">
                                        <td className="px-4 py-2 font-black text-slate-800 dark:text-slate-200 capitalize tracking-tight">{sub.name}</td>
                                        <td className="px-4 py-2"><RiskBar value={sub.flood_probability} /></td>
                                        <td className="px-4 py-2"><RiskTier category={sub.risk_category} /></td>
                                        <td className="px-4 py-2 font-black text-slate-400 tabular-nums italic tracking-tighter uppercase">{sub.lead_time_days}D Lead</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                <Panel title="Sector Protocol Advisories">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-surface-border">
                        {sorted.length === 0 ? (
                            <div className="flex flex-col items-center py-10 gap-3 text-center">
                                <div className="w-10 h-10 rounded border border-surface-border bg-surface flex items-center justify-center">
                                    <AlertTriangle size={18} className="text-slate-700" />
                                </div>
                                <p className="text-xs font-mono text-slate-500">No advisories for this county</p>
                                <p className="text-[9px] font-mono text-slate-700">Advisories generate once sub-county data is synced</p>
                            </div>
                        ) : sorted.map(sub => (
                            <ActionCard key={sub.id} sub={sub} />
                        ))}
                    </div>
                </Panel>
            </div>

            {/* Active broadcasts - Compact */}
            <Panel
                title="Active Jurisdiction Broadcasts"
                badge={
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live Signals</span>
                    </div>
                }
            >
                <div className="divide-y divide-slate-100 dark:divide-surface-border">
                    {alerts.length === 0 ? (
                        <div className="flex flex-col items-center py-10 gap-3 text-center">
                            <div className="w-10 h-10 rounded border border-surface-border bg-surface flex items-center justify-center">
                                <ShieldAlert size={18} className="text-slate-700" />
                            </div>
                            <p className="text-xs font-mono text-slate-500">No active alerts in this jurisdiction</p>
                            <p className="text-[9px] font-mono text-slate-700">System status: Monitoring</p>
                        </div>
                    ) : alerts.map(alert => (
                        <div key={alert.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-surface/50 transition-all group">
                            <div className={`p-1.5 rounded-sm border ${alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-950/20 text-red-600 border-red-100 dark:border-red-900/10' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100 dark:border-amber-900/10'}`}>
                                <Bell size={12} strokeWidth={3} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate group-hover:text-flood-600 transition-colors uppercase leading-none">{alert.title}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1.5 flex items-center gap-2">
                                    <span>{alert.sub_county_name || 'All Sectors'}</span>
                                    <span className="opacity-20">•</span>
                                    <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border shrink-0 ${alert.severity === 'critical' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/10' : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/10'
                                    }`}>{alert.severity}</span>
                                <Link to={`/alerts/${alert.id}`} className="text-slate-300 hover:text-flood-500 transition-all">
                                    <ArrowRight size={12} strokeWidth={3} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
}
