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

export function ReportsPage() {
    usePageTitle('Reports');
    const addToast = useAlertStore(s => s.addToast);

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Filter states
    const [filterType, setFilterType] = useState("");
    const [filterCounty, setFilterCounty] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");

    // For the modal
    const [showModal, setShowModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [selectedCounty, setSelectedCounty] = useState("");
    const [selectedType, setSelectedType] = useState("bulletin");
    const [counties, setCounties] = useState([]);

    useEffect(() => {
        fetchReports();
        fetchCounties();
    }, [filterType, filterCounty, filterStartDate, filterEndDate]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterType) params.append('report_type', filterType);
            if (filterCounty) params.append('county', filterCounty);
            if (filterStartDate) params.append('start_date', filterStartDate);
            if (filterEndDate) params.append('end_date', filterEndDate);

            const res = await client.get(`/api/reports/?${params.toString()}`);
            setReports(res.data);
        } catch (e) {
            console.error("Failed to load reports", e);
            addToast("Failed to load reports", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchCounties = async () => {
        try {
            const res = await client.get('/api/counties/');
            setCounties(res.data);
        } catch (e) {
            console.error("Failed to load counties", e);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const typeLabel = selectedType === 'bulletin' ? 'Bulletin' : selectedType === 'situation' ? 'SitRep' : 'AI Briefing';
            const countyLabel = selectedCounty ? counties.find(c => c.id == selectedCounty)?.name : "National";
            const title = newTitle || `${typeLabel} — ${countyLabel}`;

            const payload = {
                report_type: selectedType,
                county: selectedCounty || null,
                title: title
            };
            await client.post('/api/reports/', payload);
            setShowModal(false);
            setNewTitle("");
            addToast("Report generated successfully", "success");
            fetchReports();
        } catch (e) {
            console.error("Failed to generate report", e);
            addToast("Error generating report", "error");
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async (id, format = 'pdf') => {
        try {
            const response = await client.get(`/api/reports/${id}/download/?fmt=${format}`, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], {
                type: format === 'csv' ? 'text/csv' : 'application/pdf'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${id}.${format === 'csv' ? 'csv' : 'pdf'}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed", error);
            addToast("Failed to download report", "error");
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'situation': return <Activity className="w-4 h-4" />;
            case 'ai_brief': return <Cpu className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'situation': return 'text-amber-600 bg-amber-50';
            case 'ai_brief': return 'text-purple-600 bg-purple-50';
            default: return 'text-blue-600 bg-blue-50';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Operational Reports</h2>
                    <p className="text-slate-500">Official Situation Reports and Bulletins.</p>
                </div>
                <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-11 px-6">
                    <Plus className="w-5 h-5 mr-2" /> Generate Report
                </Button>
            </div>

            {/* Filter Bar */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                        <select
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="bulletin">Flood Risk Bulletin</option>
                            <option value="situation">Situation Report</option>
                            <option value="ai_brief">AI Briefing Summary</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">County</label>
                        <select
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterCounty}
                            onChange={(e) => setFilterCounty(e.target.value)}
                        >
                            <option value="">All Counties</option>
                            {counties.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">From Date</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">To Date</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Reports List - Table Layout */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Report Title</th>
                                <th className="px-6 py-4 font-semibold">Type</th>
                                <th className="px-6 py-4 font-semibold">Author</th>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">Loading reports...</td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic">No reports yet. Generate your first report above.</td>
                                </tr>
                            ) : (
                                reports.map((r) => (
                                    <tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${getTypeColor(r.report_type)}`}>
                                                    {getTypeIcon(r.report_type)}
                                                </div>
                                                <span className="font-semibold text-slate-800">{r.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline">{r.report_type_display}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {r.generated_by_name || "System"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(r.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    onClick={() => handleDownload(r.id, 'pdf')}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 font-medium"
                                                >
                                                    <Download className="w-4 h-4 mr-1" /> PDF
                                                </Button>
                                                <Button
                                                    onClick={() => handleDownload(r.id, 'csv')}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 h-8 font-medium"
                                                >
                                                    <Download className="w-4 h-4 mr-1" /> CSV
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Generate Report Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-slate-900">
                    <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b bg-slate-50 px-6 py-4 flex flex-row items-center justify-between">
                            <CardTitle>Generate New Report</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)} className="p-0 h-8 w-8 rounded-full">
                                <Plus className="w-5 h-5 rotate-45" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Report Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'bulletin', label: 'Bulletin', icon: <FileText className="w-4 h-4 mb-1" /> },
                                        { id: 'situation', label: 'SitRep', icon: <Activity className="w-4 h-4 mb-1" /> },
                                        { id: 'ai_brief', label: 'AI Brief', icon: <Cpu className="w-4 h-4 mb-1" /> }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setSelectedType(type.id)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${selectedType === type.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                                        >
                                            {type.icon}
                                            <span className="text-xs font-medium">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Scope / Region</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                                    value={selectedCounty}
                                    onChange={(e) => setSelectedCounty(e.target.value)}
                                >
                                    <option value="">National Overview (All Counties)</option>
                                    {counties.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Custom Title (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Enter custom title or leave blank for auto"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-2 pt-4">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-lg py-6" onClick={handleGenerate} disabled={generating}>
                                    {generating ? "Compiling Report..." : "Generate Analysis"}
                                </Button>
                                <Button className="w-full" variant="ghost" onClick={() => setShowModal(false)} disabled={generating}>
                                    Discard
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}


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
