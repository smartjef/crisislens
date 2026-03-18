import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/useAlertStore';
import {
    Bell, Plus, Filter, AlertCircle, Shield, Search,
    ArrowLeft, CheckCheck, CheckCircle, Clock, MapPin, User, ChevronRight, Brain, Waves
} from 'lucide-react';
import useAlerts from '../hooks/useAlerts';
import useCounties from '../hooks/useCounties';
import AlertCreateModal from '../components/alerts/AlertCreateModal';

/* ── Severity Chip ────────────────────────────────────────────────── */
function SeverityChip({ severity }) {
    const map = {
        critical: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20 border-red-100 dark:border-red-900/30',
        high: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
        medium: 'text-flood-600 bg-flood-50 dark:text-flood-400 dark:bg-flood-950/20 border-flood-100 dark:border-flood-900/30',
        low: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
    };
    return (
        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${map[severity] || map.low}`}>
            {severity}
        </span>
    );
}

/* ── Status Chip ──────────────────────────────────────────────────── */
function StatusChip({ status }) {
    const map = {
        active: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20 border-red-100 dark:border-red-900/30',
        acknowledged: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
        resolved: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
    };
    return (
        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${map[status] || map.resolved}`}>
            {status}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export function AlertsPage() {
    usePageTitle('Crisis Alerts');
    const { user } = useAuthStore();
    const isNational = user?.role === 'national_ops' || user?.role === 'super_admin';
    // For county officers / responders, pre-lock to their county (backend enforces this anyway)
    const [filters, setFilters] = useState({
        county: isNational ? '' : (user?.county_id || ''),
        severity: '',
        status: '',
    });
    const { data: alertsData, loading, refetch } = useAlerts(filters);
    const { data: countiesData } = useCounties();
    const [modalOpen, setModalOpen] = useState(false);
    const navigate = useNavigate();
    const [actionLoading, setActionLoading] = useState({});
    const [sort, setSort] = useState({ field: 'created_at', dir: 'desc' });

    const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }));
    const clearFilters = () => setFilters({ county: isNational ? '' : (user?.county_id || ''), severity: '', status: '' });

    const doAlertAction = async (id, action) => {
        setActionLoading(p => ({ ...p, [id]: action }));
        try {
            await client.patch(`/api/alerts/${id}/${action}/`);
            refetch();
        } catch (e) { console.error(e); }
        setActionLoading(p => ({ ...p, [id]: null }));
    };

    const toggleSort = (field) => {
        setSort(prev => prev.field === field
            ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
            : { field, dir: 'desc' }
        );
    };

    const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedAlerts = [...(alertsData?.results || [])].sort((a, b) => {
        let cmp = 0;
        if (sort.field === 'title') {
            cmp = (a.title || '').localeCompare(b.title || '');
        } else if (sort.field === 'created_at') {
            cmp = new Date(a.created_at) - new Date(b.created_at);
        } else if (sort.field === 'status') {
            cmp = (a.status || '').localeCompare(b.status || '');
        } else if (sort.field === 'severity') {
            cmp = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
        }
        return sort.dir === 'asc' ? cmp : -cmp;
    });

    const activeFilters = Object.values(filters).filter(Boolean).length;

    const SELECT_CLASSES = "bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 focus:ring-1 focus:ring-flood-500 outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-surface-border transition-all";

    return (
        <div className="p-4 md:p-5 space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-surface-border">
                <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-1">GOK · Crisis Intelligence</p>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Situational Alerts</h1>
                </div>
                <Button
                    onClick={() => setModalOpen(true)}
                    className="shrink-0 h-9 px-4 font-black uppercase tracking-widest text-[9px] flex items-center gap-2"
                >
                    <Plus size={14} strokeWidth={3} /> Create Alert
                </Button>
            </div>

            <AlertCreateModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refetch} />

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <Filter size={11} />
                    Filters {activeFilters > 0 && <span className="text-flood-600 dark:text-flood-400">({activeFilters})</span>}
                </div>
                {isNational ? (
                    <select
                        className={SELECT_CLASSES}
                        value={filters.county}
                        onChange={e => setFilter('county', e.target.value)}
                    >
                        <option value="">Jurisdiction: All</option>
                        {countiesData?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                ) : (
                    <span className={SELECT_CLASSES + " opacity-60 cursor-default"}>
                        Jurisdiction: {countiesData?.find(c => String(c.id) === String(user?.county_id))?.name || 'My County'}
                    </span>
                )}
                <select
                    className={SELECT_CLASSES}
                    value={filters.severity}
                    onChange={e => setFilter('severity', e.target.value)}
                >
                    <option value="">Severity: All</option>
                    {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                    className={SELECT_CLASSES}
                    value={filters.status}
                    onChange={e => setFilter('status', e.target.value)}
                >
                    <option value="">Status: All</option>
                    {['active', 'acknowledged', 'resolved'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {activeFilters > 0 && (
                    <button onClick={clearFilters} className="text-[9px] font-black text-slate-500 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 transition-colors uppercase tracking-widest">
                        Reset
                    </button>
                )}
            </div>

            {/* Alerts table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs">
                        <thead className="border-b border-slate-100 dark:border-surface-border bg-slate-50/50 dark:bg-surface/30">
                            <tr>
                                {[
                                    { label: 'Tactical Detail', field: 'title', align: 'left' },
                                    { label: 'Jurisdiction', field: null, align: 'left' },
                                    { label: 'Status', field: 'status', align: 'left' },
                                    { label: 'Tele-Log', field: 'created_at', align: 'left' },
                                ].map(({ label, field, align }) => (
                                    <th
                                        key={label}
                                        className={`px-5 py-3 text-${align} text-[9px] font-black uppercase tracking-widest text-slate-400 ${field ? 'cursor-pointer select-none hover:text-slate-200 transition-colors' : ''}`}
                                        onClick={field ? () => toggleSort(field) : undefined}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            {label}
                                            {field && (
                                                <span className="text-[8px] font-mono">
                                                    {sort.field === field ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                                                </span>
                                            )}
                                        </span>
                                    </th>
                                ))}
                                <th
                                    className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none hover:text-slate-200 transition-colors"
                                    onClick={() => toggleSort('severity')}
                                >
                                    <span className="inline-flex items-center justify-end gap-1">
                                        Action
                                        <span className="text-[8px] font-mono">
                                            {sort.field === 'severity' ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                                        </span>
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-surface-border">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-5 py-6">
                                            <div className="h-2.5 bg-slate-100 dark:bg-surface-border/50 rounded-sm w-3/4" />
                                        </td>
                                    </tr>
                                ))
                            ) : sortedAlerts.length > 0 ? (
                                sortedAlerts.map(alert => (
                                    <tr key={alert.id} className="hover:bg-slate-50/50 dark:hover:bg-surface/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-sm border ${alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-950/20 text-red-600 border-red-100 dark:border-red-900/30' : alert.severity === 'high' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100 dark:border-amber-900/30' : 'bg-flood-50 dark:bg-flood-950/20 text-flood-600 border-flood-100 dark:border-flood-900/30'}`}>
                                                    <Bell size={12} strokeWidth={3} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{alert.title}</p>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <SeverityChip severity={alert.severity} />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-tight">{alert.county_name}</p>
                                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{alert.sub_county_name || 'Generic zone'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <StatusChip status={alert.status} />
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 tabular-nums">{new Date(alert.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="inline-flex items-center gap-1.5 justify-end">
                                                {alert.status === 'active' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); doAlertAction(alert.id, 'acknowledge'); }}
                                                        disabled={!!actionLoading[alert.id]}
                                                        className="h-8 px-2 rounded-sm border border-amber-800/50 text-[9px] font-mono text-amber-400 hover:bg-amber-900/20 transition-all disabled:opacity-40 flex items-center gap-1"
                                                    >
                                                        <CheckCheck size={10} /> ACK
                                                    </button>
                                                )}
                                                {alert.status !== 'resolved' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); doAlertAction(alert.id, 'resolve'); }}
                                                        disabled={!!actionLoading[alert.id]}
                                                        className="h-8 px-2 rounded-sm border border-emerald-800/50 text-[9px] font-mono text-emerald-400 hover:bg-emerald-900/20 transition-all disabled:opacity-40 flex items-center gap-1"
                                                    >
                                                        <CheckCircle size={10} /> CLOSE
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/alerts/${alert.id}`)}
                                                    className="h-8 px-3 rounded-sm border border-slate-200 dark:border-surface-border text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:border-flood-500 hover:text-flood-600 dark:hover:text-flood-400 transition-all inline-flex items-center gap-1.5"
                                                >
                                                    VIEW <ChevronRight size={10} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 rounded border border-surface-border bg-surface flex items-center justify-center">
                                                <Bell size={18} className="text-slate-700" />
                                            </div>
                                            <p className="text-xs font-mono text-slate-500">No alerts in this zone</p>
                                            <p className="text-[9px] font-mono text-slate-700">System is monitoring — last checked just now</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export function AlertDetailPage() {
    usePageTitle('Alert Detail');
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const addToast = useAlertStore(s => s.addToast);

    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActLoad] = useState(false);

    const fetchAlert = async () => {
        setLoading(true);
        try {
            const res = await client.get(`/api/alerts/${id}/`);
            setAlert(res.data);
        } catch {
            addToast('Failed to load alert details', 'error');
            navigate('/alerts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAlert(); }, [id]);

    const handleAction = async (action) => {
        setActLoad(true);
        try {
            await client.patch(`/api/alerts/${id}/${action}/`);
            addToast(`Alert ${action}d successfully`, 'success');
            fetchAlert();
        } catch {
            addToast(`Failed to ${action} alert`, 'error');
        } finally {
            setActLoad(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <div className="w-6 h-6 border-2 border-flood-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Intel Detail...</span>
        </div>
    );
    if (!alert) return null;

    const severityBorder = {
        critical: 'border-l-red-500',
        high: 'border-l-amber-500',
        medium: 'border-l-flood-500',
        low: 'border-l-emerald-500',
    }[alert.severity] || 'border-l-slate-500';

    const directives = [
        alert.severity === 'critical'
            ? 'Initiate immediate evacuation protocols for low-lying zones.'
            : 'Monitor water levels at critical bridge crossings.',
        'Pre-position response units at designated staging points.',
        'Maintain continuous radio contact with coordination center.',
    ];

    return (
        <div className="p-4 md:p-5 max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500">
            <button
                onClick={() => navigate(-1)}
                className="group flex items-center gap-2 text-[9px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all uppercase tracking-widest"
            >
                <ArrowLeft size={10} strokeWidth={3} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Intelligence Feed
            </button>

            {/* Main alert card */}
            <Card className={`border-l-4 ${severityBorder} overflow-hidden`}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-50 dark:border-surface-border bg-slate-50/30 dark:bg-surface/30">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <SeverityChip severity={alert.severity} />
                                <StatusChip status={alert.status} />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock size={10} /> {new Date(alert.created_at).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{alert.title}</h1>
                            <div className="flex flex-wrap items-center gap-5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                                <span className="flex items-center gap-1.5 text-flood-600 dark:text-flood-400"><User size={10} /> {alert.created_by_name}</span>
                                <span className="flex items-center gap-1.5"><MapPin size={10} /> {alert.county_name} · {alert.sub_county_name || 'Operational Sector'}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                            {alert.status === 'active' && user?.role === 'responder' && (
                                <Button
                                    onClick={() => handleAction('acknowledge')}
                                    disabled={actionLoading}
                                    className="h-9 px-5 font-black uppercase tracking-widest text-[9px] flex items-center gap-2"
                                >
                                    <CheckCheck size={14} strokeWidth={3} />
                                    ACKNOWLEDGE
                                </Button>
                            )}
                            {alert.status !== 'resolved' && (user?.role === 'national_ops' || (user?.role === 'county_officer' && user.county_id === alert.county)) && (
                                <Button
                                    onClick={() => handleAction('resolve')}
                                    disabled={actionLoading}
                                    variant="outline"
                                    className="h-9 px-5 font-black uppercase tracking-widest text-[9px] border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                                >
                                    MARK RESOLVED
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="px-6 py-5 border-b border-slate-50 dark:border-surface-border">
                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Situational Intelligence Report</p>
                    <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed font-medium">{alert.description || 'No descriptive intel available for this vector.'}</p>
                </div>

                {/* Operational directives */}
                <div className="px-6 py-5 bg-slate-50/50 dark:bg-surface/10">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle size={12} className="text-flood-600 dark:text-flood-400" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Operational Directives</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {directives.map((d, i) => (
                            <div key={i} className="flex items-start gap-4 p-3 bg-white dark:bg-surface border border-slate-100 dark:border-surface-border rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                <span className="text-flood-600 dark:text-flood-400 font-black text-[10px] tabular-nums mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-snug">{d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export function AdminPage() {
    usePageTitle('System Administration');
    return (
        <div className="p-4 md:p-5 space-y-4 animate-in fade-in duration-500">
            <div className="pb-4 border-b border-slate-200 dark:border-surface-border">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-1">GOK · System Control</p>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Administration Terminal</h1>
            </div>

            {/* User management */}
            <Card className="overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-surface-border flex items-center justify-between bg-slate-50/50 dark:bg-surface/50">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Shield size={12} /> Personnel Management
                    </span>
                    <Button className="h-8 px-4 font-black uppercase tracking-widest text-[9px]">
                        + Commission User
                    </Button>
                </div>
                <div className="p-5">
                    <div className="relative mb-5">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="SEARCH PERSONNEL (EMAIL, NAME, ROLE)..."
                            className="w-full bg-slate-50 dark:bg-surface/50 border border-slate-200 dark:border-surface-border rounded-sm pl-9 pr-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:ring-1 focus:ring-flood-500 outline-none transition-all"
                        />
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-xs">
                            <thead className="border-b border-slate-100 dark:border-surface-border">
                                <tr>
                                    {['Operator', 'Authorization', 'Jurisdiction', 'Status', 'Last Auth'].map(h => (
                                        <th key={h} className="px-0 pb-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 pr-6">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 rounded-sm bg-slate-50 dark:bg-surface-border/20 flex items-center justify-center text-slate-300 dark:text-slate-600">
                                                <User size={16} />
                                            </div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Personnel API link pending • System nominal</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>

            {/* Audit log placeholder */}
            <Card className="overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-surface-border bg-slate-50/50 dark:bg-surface/50">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Tactical Audit Loop</span>
                </div>
                <div className="p-10 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic leading-relaxed max-w-sm mx-auto">
                        All command actions are recorded in the immutable audit sequence. Integration with the NOC forensic API is currently in progress.
                    </p>
                </div>
            </Card>
        </div>
    );
}

