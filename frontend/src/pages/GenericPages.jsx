import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAlertStore } from '../store/useAlertStore';
import { Bell, FileText, Settings, Shield, Plus, Search, Filter, AlertCircle, Download, Activity, Cpu, Calendar, ChevronDown } from 'lucide-react';
import useAlerts from '../hooks/useAlerts';
import useCounties from '../hooks/useCounties';
import AlertCreateModal from '../components/alerts/AlertCreateModal';

export function AlertsPage() {
    usePageTitle('Alerts');
    const [filters, setFilters] = useState({
        county: '',
        severity: '',
        status: ''
    });

    const { data: alertsData, loading: alertsLoading, refetch } = useAlerts(filters);
    const { data: countiesData } = useCounties();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Crisis Alerts</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage and respond to active situational alerts.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all hover:scale-[1.02]"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Create Alert
                    </Button>
                </div>
            </div>

            <AlertCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={refetch}
            />

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-flood-500 appearance-none"
                        value={filters.county}
                        onChange={(e) => handleFilterChange('county', e.target.value)}
                    >
                        <option value="">All Counties</option>
                        {countiesData?.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <select
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-flood-500 appearance-none"
                    value={filters.severity}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                >
                    <option value="">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>

                <select
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-flood-500 appearance-none"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="resolved">Resolved</option>
                </select>

                <Button variant="ghost" className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => setFilters({ county: '', severity: '', status: '' })}>
                    Clear Filters
                </Button>
            </div>

            <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Severity / Title</th>
                                <th className="px-6 py-4 font-semibold">Region</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Time Logged</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {alertsLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4 h-16 bg-slate-50/50 dark:bg-slate-900/20"></td>
                                    </tr>
                                ))
                            ) : alertsData?.results?.length > 0 ? (
                                alertsData.results.map((alert) => (
                                    <tr key={alert.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                    alert.severity === 'high' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                    }`}>
                                                    <Bell className={`w-4 h-4 ${alert.severity === 'critical' ? 'animate-pulse' : ''}`} />
                                                </div>
                                                <span className="font-semibold text-slate-800 dark:text-white">{alert.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {alert.county_name} {alert.sub_county_name ? `/ ${alert.sub_county_name}` : ''}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                alert.status === 'active' ? 'danger' :
                                                    alert.status === 'acknowledged' ? 'warning' : 'success'
                                            }>
                                                {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                            {new Date(alert.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                onClick={() => navigate(`/alerts/${alert.id}`)}
                                            >
                                                View Details
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No alerts found matching the selected filters.
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

export function AlertDetailPage() {
    usePageTitle('Alert Details');
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const addToast = useAlertStore((state) => state.addToast);

    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchAlert = async () => {
        setLoading(true);
        try {
            const res = await client.get(`/api/alerts/${id}/`);
            setAlert(res.data);
        } catch (err) {
            addToast('Failed to load alert details', 'error');
            navigate('/alerts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlert();
    }, [id]);

    const handleAction = async (action) => {
        setActionLoading(true);
        try {
            await client.patch(`/api/alerts/${id}/${action}/`);
            addToast(`Alert ${action}d successfully`, 'success');
            fetchAlert(); // Refresh data
        } catch (err) {
            addToast(`Failed to ${action} alert`, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center animate-pulse text-slate-500">Retrieving intelligence...</div>;
    if (!alert) return null;

    const isCritical = alert.severity === 'critical';

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" className="text-slate-500 mb-2 hover:bg-slate-100" onClick={() => navigate(-1)}>
                ← Back to Alerts
            </Button>

            <Card className={`border-t-4 shadow-xl overflow-hidden ${alert.severity === 'critical' ? 'border-red-600 border-red-200' :
                alert.severity === 'high' ? 'border-amber-500 border-amber-200' : 'border-blue-600 border-blue-200'
                }`}>
                <CardHeader className="p-8 bg-white dark:bg-slate-800">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Badge variant={alert.status === 'active' ? 'danger' : alert.status === 'acknowledged' ? 'warning' : 'success'} className="px-3 py-1 uppercase tracking-wider text-xs">
                                    {alert.severity}
                                </Badge>
                                <span className="text-slate-400 text-sm flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)} &middot; {new Date(alert.created_at).toLocaleString()}
                                </span>
                            </div>
                            <CardTitle className="text-3xl font-bold text-slate-800 dark:text-white leading-tight">
                                {alert.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Shield className="w-4 h-4" />
                                Issued by {alert.created_by_name} for {alert.county_name} {alert.sub_county_name ? `(${alert.sub_county_name})` : ''}
                            </div>
                        </div>

                        <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                            {alert.status === 'active' && user?.role === 'responder' && (
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                                    loading={actionLoading}
                                    onClick={() => handleAction('acknowledge')}
                                >
                                    Acknowledge
                                </Button>
                            )}
                            {alert.status !== 'resolved' && (user?.role === 'national_ops' || (user?.role === 'county_officer' && user.county_id === alert.county)) && (
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                                    loading={actionLoading}
                                    onClick={() => handleAction('resolve')}
                                >
                                    Mark Resolved
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-8 pb-8 pt-0 space-y-8 bg-white dark:bg-slate-800">
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg border-l-4 border-slate-100 dark:border-slate-700 pl-6 py-2">
                        {alert.description}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold mb-4">
                            <AlertCircle className="w-5 h-5 text-flood-600" />
                            Operational Directives:
                        </div>
                        <ul className="space-y-3">
                            {[
                                isCritical ? "Initiate immediate evacuation protocols for low-lying zones." : "Monitor water levels at critical bridge crossings.",
                                "Pre-position response units at designated staging points.",
                                "Maintain continuous radio contact with coordination center."
                            ].map((directive, i) => (
                                <li key={i} className="flex gap-3 text-slate-600 dark:text-slate-400 text-sm">
                                    <span className="text-flood-500 font-bold">•</span>
                                    {directive}
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export { default as ReportsPage } from './ReportsPage';


export function AdminPage() {
    usePageTitle('Admin Panel');
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">System Administration</h2>
            <Card className="border-slate-200 shadow-sm border-t-4 border-t-slate-800">
                <CardHeader className="border-b bg-slate-50">
                    <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> User Management</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                            <input type="text" placeholder="Search users by email or role..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <Button className="bg-blue-600 text-white shadow-sm">Invite User</Button>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                        <Shield className="w-12 h-12 text-slate-400 mb-4" />
                        <h3 className="font-semibold text-slate-700 text-lg mb-2">Access Control Center</h3>
                        <p className="text-slate-500 max-w-md">Manage roles, permissions, and audit logs. All administrative actions are recorded securely.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
