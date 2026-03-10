import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import Button from '../../components/ui/Button';
import { ShieldAlert, Bell, PlusCircle, ArrowRight, Droplets, MapPin, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlertCreateModal from '../../components/alerts/AlertCreateModal';
import useSubCountyRisk from '../../hooks/useSubCountyRisk';
import useAlerts from '../../hooks/useAlerts';

function Panel({ title, badge, children, className = '' }) {
    return (
        <div className={`bg-surface-raised border border-surface-border rounded ${className}`}>
            {title && (
                <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{title}</span>
                    {badge}
                </div>
            )}
            {children}
        </div>
    );
}

function RiskBar({ value }) {
    const color = value >= 75 ? '#ef4444' : value >= 50 ? '#f59e0b' : '#0891b2';
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                <div className="h-full transition-all duration-700 rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] font-mono text-slate-500 tabular-nums w-8">{value}%</span>
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

function ActionCard({ sub }) {
    const prob = sub.flood_probability;
    if (prob >= 75) return (
        <div className="flex items-start gap-3 px-5 py-3 border-b border-surface-border">
            <ShieldAlert size={14} className="text-red-400 shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-medium text-slate-300">Issue evacuation advisory — {sub.name}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 font-mono uppercase tracking-wide">Priority: Critical</p>
            </div>
        </div>
    );
    if (prob >= 50) return (
        <div className="flex items-start gap-3 px-5 py-3 border-b border-surface-border">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-medium text-slate-300">Pre-position relief teams — {sub.name}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 font-mono uppercase tracking-wide">Priority: High</p>
            </div>
        </div>
    );
    return (
        <div className="flex items-start gap-3 px-5 py-3 border-b border-surface-border">
            <Droplets size={14} className="text-flood-400 shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-medium text-slate-300">Monitor river/lake levels — {sub.name}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 font-mono uppercase tracking-wide">Priority: Routine</p>
            </div>
        </div>
    );
}

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
        <div className="flex items-center justify-center min-h-[400px] gap-3">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Loading county intelligence...</span>
        </div>
    );

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1">
                        <MapPin size={10} className="inline mr-1" />
                        County Emergency Operations
                    </p>
                    <h1 className="text-xl font-semibold text-slate-200">{county?.name} County</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <RiskTier category={county?.risk_category} />
                        <span className="text-[10px] font-mono text-slate-600">
                            {county?.lead_time_days}-day early warning lead time
                        </span>
                    </div>
                </div>
                {(user?.role === 'county_officer' || user?.role === 'national_ops') && (
                    <Button
                        onClick={() => setModalOpen(true)}
                        className="shrink-0 bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-4 py-2 rounded flex items-center gap-1.5 font-medium"
                    >
                        <PlusCircle size={13} /> Issue Alert
                    </Button>
                )}
            </div>

            <AlertCreateModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchCountyDetail} />

            {/* Sub-county matrix + advisories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Panel title="Sub-County Vulnerability Matrix" className="lg:col-span-2">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="border-b border-surface-border">
                                <tr>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Sub-County</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Flood Risk</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Tier</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Lead</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border">
                                {sorted.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-600 italic">
                                            No jurisdictional data available
                                        </td>
                                    </tr>
                                ) : sorted.map(sub => (
                                    <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3 font-medium text-slate-300">{sub.name}</td>
                                        <td className="px-5 py-3"><RiskBar value={sub.flood_probability} /></td>
                                        <td className="px-5 py-3"><RiskTier category={sub.risk_category} /></td>
                                        <td className="px-5 py-3 font-mono text-slate-500">{sub.lead_time_days}d</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                <Panel title="Protocol Advisories">
                    <div className="max-h-80 overflow-y-auto">
                        {sorted.length === 0 ? (
                            <p className="px-5 py-8 text-center text-xs text-slate-600 italic">Awaiting sector analysis</p>
                        ) : sorted.map(sub => (
                            <ActionCard key={sub.id} sub={sub} />
                        ))}
                    </div>
                </Panel>
            </div>

            {/* Active broadcasts */}
            <Panel
                title="Active County Broadcasts"
                badge={
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-emerald-400">LIVE</span>
                    </span>
                }
            >
                <div className="divide-y divide-surface-border">
                    {alerts.length === 0 ? (
                        <p className="px-5 py-8 text-center text-xs text-slate-600 italic">
                            No alerts currently broadcast for this jurisdiction
                        </p>
                    ) : alerts.map(alert => (
                        <div key={alert.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                            <Bell size={14} className={alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'} />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-300 truncate">{alert.title}</p>
                                <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wide mt-0.5">
                                    {alert.sub_county_name || 'All Sectors'} · {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <span className={`text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                                alert.severity === 'critical' ? 'text-red-400 bg-red-900/20 border-red-800/30' : 'text-amber-400 bg-amber-900/20 border-amber-800/30'
                            }`}>{alert.severity}</span>
                            <Link to={`/alerts/${alert.id}`} className="text-slate-700 hover:text-flood-400 transition-colors">
                                <ArrowRight size={13} />
                            </Link>
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
}
