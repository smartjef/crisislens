import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/useAlertStore';
import {
    Bell, Plus, Filter, AlertCircle, Shield, Search,
    ArrowLeft, CheckCheck, Clock, MapPin, User,
} from 'lucide-react';
import useAlerts from '../hooks/useAlerts';
import useCounties from '../hooks/useCounties';
import AlertCreateModal from '../components/alerts/AlertCreateModal';

/* ── Shared panel ──────────────────────────────────────────────────── */
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

function SeverityChip({ severity }) {
    const map = {
        critical: 'text-red-400 bg-red-900/20 border-red-800/30',
        high:     'text-amber-400 bg-amber-900/20 border-amber-800/30',
        medium:   'text-flood-400 bg-flood-900/20 border-flood-800/30',
        low:      'text-emerald-400 bg-emerald-900/20 border-emerald-800/30',
    };
    return (
        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${map[severity] || map.low}`}>
            {severity}
        </span>
    );
}

function StatusChip({ status }) {
    const map = {
        active:       'text-red-400 bg-red-900/20 border-red-800/30',
        acknowledged: 'text-amber-400 bg-amber-900/20 border-amber-800/30',
        resolved:     'text-emerald-400 bg-emerald-900/20 border-emerald-800/30',
    };
    return (
        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${map[status] || map.resolved}`}>
            {status}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export function AlertsPage() {
    usePageTitle('Crisis Alerts');
    const [filters, setFilters] = useState({ county: '', severity: '', status: '' });
    const { data: alertsData, loading, refetch } = useAlerts(filters);
    const { data: countiesData } = useCounties();
    const [modalOpen, setModalOpen] = useState(false);
    const navigate = useNavigate();

    const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }));
    const clearFilters = () => setFilters({ county: '', severity: '', status: '' });

    const activeFilters = Object.values(filters).filter(Boolean).length;

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1">Crisis Intelligence</p>
                    <h1 className="text-xl font-semibold text-slate-200">Situational Alerts</h1>
                </div>
                <Button
                    onClick={() => setModalOpen(true)}
                    className="shrink-0 bg-red-700 hover:bg-red-600 text-white text-xs px-4 py-2 rounded flex items-center gap-1.5 font-medium"
                >
                    <Plus size={13} /> Create Alert
                </Button>
            </div>

            <AlertCreateModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refetch} />

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                    <Filter size={11} />
                    Filters {activeFilters > 0 && <span className="text-flood-400">({activeFilters})</span>}
                </div>
                <select
                    className="bg-surface-raised border border-surface-border rounded px-3 py-1.5 text-xs font-mono text-slate-400 focus:ring-1 focus:ring-flood-500 outline-none appearance-none"
                    value={filters.county}
                    onChange={e => setFilter('county', e.target.value)}
                >
                    <option value="">All Counties</option>
                    {countiesData?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                    className="bg-surface-raised border border-surface-border rounded px-3 py-1.5 text-xs font-mono text-slate-400 focus:ring-1 focus:ring-flood-500 outline-none appearance-none"
                    value={filters.severity}
                    onChange={e => setFilter('severity', e.target.value)}
                >
                    <option value="">All Severities</option>
                    {['critical','high','medium','low'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <select
                    className="bg-surface-raised border border-surface-border rounded px-3 py-1.5 text-xs font-mono text-slate-400 focus:ring-1 focus:ring-flood-500 outline-none appearance-none"
                    value={filters.status}
                    onChange={e => setFilter('status', e.target.value)}
                >
                    <option value="">All Statuses</option>
                    {['active','acknowledged','resolved'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                {activeFilters > 0 && (
                    <button onClick={clearFilters} className="text-[10px] font-mono text-slate-600 hover:text-slate-300 px-2 py-1 border border-surface-border rounded hover:bg-white/5 transition-colors">
                        Clear
                    </button>
                )}
            </div>

            {/* Alerts table */}
            <Panel>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="border-b border-surface-border">
                            <tr>
                                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Severity / Title</th>
                                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Region</th>
                                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Status</th>
                                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Logged</th>
                                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-5 py-4">
                                            <div className="h-3 bg-surface-border rounded w-3/4" />
                                        </td>
                                    </tr>
                                ))
                            ) : alertsData?.results?.length > 0 ? (
                                alertsData.results.map(alert => (
                                    <tr key={alert.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <Bell size={12} className={alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'high' ? 'text-amber-400' : 'text-flood-400'} />
                                                <div>
                                                    <p className="font-medium text-slate-300 truncate max-w-xs">{alert.title}</p>
                                                    <SeverityChip severity={alert.severity} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 font-mono text-slate-500">
                                            {alert.county_name}{alert.sub_county_name ? ` / ${alert.sub_county_name}` : ''}
                                        </td>
                                        <td className="px-5 py-3">
                                            <StatusChip status={alert.status} />
                                        </td>
                                        <td className="px-5 py-3 font-mono text-slate-600">
                                            {new Date(alert.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => navigate(`/alerts/${alert.id}`)}
                                                className="text-[10px] font-mono text-flood-400 hover:text-flood-300 uppercase tracking-wider hover:underline"
                                            >
                                                View →
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-600 italic">
                                        No alerts match the selected filters
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Panel>
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

    const [alert, setAlert]             = useState(null);
    const [loading, setLoading]         = useState(true);
    const [actionLoading, setActLoad]   = useState(false);

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
        <div className="flex items-center justify-center min-h-[400px] gap-3">
            <div className="w-5 h-5 border-2 border-flood-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Retrieving intelligence...</span>
        </div>
    );
    if (!alert) return null;

    const severityLeft = {
        critical: 'border-l-red-500',
        high:     'border-l-amber-500',
        medium:   'border-l-flood-500',
        low:      'border-l-emerald-500',
    }[alert.severity] || 'border-l-slate-500';

    const directives = [
        alert.severity === 'critical'
            ? 'Initiate immediate evacuation protocols for low-lying zones.'
            : 'Monitor water levels at critical bridge crossings.',
        'Pre-position response units at designated staging points.',
        'Maintain continuous radio contact with coordination center.',
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-300 transition-colors uppercase tracking-wider"
            >
                <ArrowLeft size={12} /> Back to Alerts
            </button>

            {/* Main alert card */}
            <div className={`bg-surface-raised border border-surface-border border-l-4 ${severityLeft} rounded overflow-hidden`}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-surface-border">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <SeverityChip severity={alert.severity} />
                                <StatusChip status={alert.status} />
                                <span className="text-[10px] font-mono text-slate-600">
                                    {new Date(alert.created_at).toLocaleString()}
                                </span>
                            </div>
                            <h1 className="text-lg font-semibold text-slate-200 leading-snug">{alert.title}</h1>
                            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-600 uppercase tracking-wide">
                                <span className="flex items-center gap-1"><User size={10} /> {alert.created_by_name}</span>
                                <span className="flex items-center gap-1"><MapPin size={10} /> {alert.county_name}{alert.sub_county_name ? ` / ${alert.sub_county_name}` : ''}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            {alert.status === 'active' && user?.role === 'responder' && (
                                <Button
                                    onClick={() => handleAction('acknowledge')}
                                    disabled={actionLoading}
                                    className="bg-flood-700 hover:bg-flood-600 text-white text-xs px-4 py-2 rounded font-medium"
                                >
                                    <CheckCheck size={12} className="mr-1.5" />
                                    Acknowledge
                                </Button>
                            )}
                            {alert.status !== 'resolved' && (user?.role === 'national_ops' || (user?.role === 'county_officer' && user.county_id === alert.county)) && (
                                <Button
                                    onClick={() => handleAction('resolve')}
                                    disabled={actionLoading}
                                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-4 py-2 rounded font-medium"
                                >
                                    Mark Resolved
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="px-6 py-5 border-b border-surface-border">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">Situation Report</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{alert.description}</p>
                </div>

                {/* Operational directives */}
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={13} className="text-flood-400" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Operational Directives</span>
                    </div>
                    <ul className="space-y-2">
                        {directives.map((d, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs text-slate-400">
                                <span className="text-flood-500 font-mono mt-0.5">{String(i + 1).padStart(2, '0')}.</span>
                                {d}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export { default as ReportsPage } from './ReportsPage';

/* ═══════════════════════════════════════════════════════════════════ */
export function AdminPage() {
    usePageTitle('System Administration');
    return (
        <div className="space-y-4">
            <div className="pb-4 border-b border-surface-border">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1">System Control</p>
                <h1 className="text-xl font-semibold text-slate-200">Administration Panel</h1>
            </div>

            {/* User management */}
            <div className="bg-surface-raised border border-surface-border rounded">
                <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Shield size={11} /> User Management
                    </span>
                    <Button className="bg-flood-700 hover:bg-flood-600 text-white text-xs px-3 py-1.5 rounded font-medium">
                        + Invite User
                    </Button>
                </div>
                <div className="p-5">
                    <div className="relative mb-4">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input
                            type="text"
                            placeholder="Search by email, name, or role..."
                            className="w-full bg-surface border border-surface-border rounded pl-9 pr-4 py-2 text-xs font-mono text-slate-400 placeholder-slate-700 focus:ring-1 focus:ring-flood-500 outline-none"
                        />
                    </div>
                    <table className="w-full text-xs">
                        <thead className="border-b border-surface-border">
                            <tr>
                                {['User', 'Role', 'County', 'Status', 'Last Active'].map(h => (
                                    <th key={h} className="px-0 pb-2 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600 pr-6">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={5} className="py-10 text-center text-xs text-slate-600 italic">
                                    Connect backend user management API to populate this table
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit log placeholder */}
            <div className="bg-surface-raised border border-surface-border rounded">
                <div className="px-5 py-3 border-b border-surface-border">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Audit Log</span>
                </div>
                <div className="p-5">
                    <p className="text-xs text-slate-600 italic text-center py-6">
                        All administrative actions are recorded and auditable. Audit trail API integration pending.
                    </p>
                </div>
            </div>
        </div>
    );
}
