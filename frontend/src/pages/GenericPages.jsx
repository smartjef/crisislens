import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAlertStore } from '../store/useAlertStore';
import { Bell, FileText, Settings, Shield, Plus, Search, Filter, AlertCircle, Download, Activity, Cpu, Calendar } from 'lucide-react';

export function AlertsPage() {
    usePageTitle('Alerts');
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Crisis Alerts</h2>
                    <p className="text-slate-500">Manage and respond to active situational alerts.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="bg-white border-slate-200 text-slate-700">
                        <Filter className="w-4 h-4 mr-2" /> Filter
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Create Alert
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Severity / Title</th>
                                <th className="px-6 py-4 font-semibold">Region</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Time Logged</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {[
                                { title: "Flash Flood Warning", region: "Kisumu / Nyando", severity: "Critical", status: "Active", time: "10 mins ago" },
                                { title: "River Level Surge", region: "Homa Bay / Ndhiwa", severity: "High", status: "Acknowledged", time: "2 hours ago" },
                                { title: "Heavy Downpour", region: "Siaya / Ugenya", severity: "Medium", status: "Resolved", time: "1 day ago" }
                            ].map((alert, i) => (
                                <tr key={i} className="bg-white hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${alert.severity === 'Critical' ? 'bg-red-100 text-red-600' : alert.severity === 'High' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <Bell className="w-4 h-4" />
                                            </div>
                                            <span className="font-semibold text-slate-800">{alert.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{alert.region}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={alert.status === 'Active' ? 'danger' : alert.status === 'Acknowledged' ? 'warning' : 'success'}>
                                            {alert.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{alert.time}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">View Details</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

export function AlertDetailPage() {
    usePageTitle('Alert Details');
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" className="text-slate-500 mb-4 hover:bg-slate-100">← Back to Alerts</Button>
            <Card className="border-red-200 shadow-md border-t-4 border-t-red-600">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge variant="danger" className="text-sm px-3 py-1 uppercase tracking-wider">Critical</Badge>
                                <span className="text-slate-500 text-sm">Active &middot; Logged 10 min ago</span>
                            </div>
                            <CardTitle className="text-3xl font-bold text-slate-800">Flash Flood Warning in Nyando Basin</CardTitle>
                        </div>
                        <Button variant="outline" className="border-slate-300">Acknowledge</Button>
                    </div>
                </CardHeader>
                <CardContent className="text-slate-700 leading-relaxed text-lg">
                    <p className="mb-4">Water levels at the primary gauge station have exceeded 5.2 meters, breaching the critical threshold. Imminent overbank flow is expected within the next 4 hours affecting low-lying settlements.</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                        <h4 className="font-semibold text-slate-800 mb-2">Recommended Actions:</h4>
                        <ul className="list-disc pl-5 space-y-2 text-slate-600">
                            <li>Initiate immediate evacuation of Zone A and Zone B.</li>
                            <li>Deploy search and rescue units to standard staging areas.</li>
                            <li>Broadcast emergency alerts via local radio and SMS gateways.</li>
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

export function SettingsPage() {
    usePageTitle('Settings');
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Account Settings</h2>
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b bg-slate-50">
                    <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Preferences</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b">
                        <div>
                            <h4 className="font-semibold text-slate-800">Email Notifications</h4>
                            <p className="text-sm text-slate-500">Receive alerts and daily summaries via email.</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-blue-600" />
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b">
                        <div>
                            <h4 className="font-semibold text-slate-800">SMS Alerts</h4>
                            <p className="text-sm text-slate-500">Critical notifications sent to your registered phone number.</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-blue-600" />
                    </div>
                    <div className="pt-2">
                        <Button className="bg-slate-800 text-white">Save Preferences</Button>
                    </div>
                </CardContent>
            </Card>
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
