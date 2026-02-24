import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAlertStore } from '../store/useAlertStore';
import { Bell, FileText, Settings, Shield, Plus, Search, Filter, AlertCircle, Download } from 'lucide-react';

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

    // For the modal
    const [showModal, setShowModal] = useState(false);
    const [selectedCounty, setSelectedCounty] = useState("");
    const [counties, setCounties] = useState([]);

    useEffect(() => {
        fetchReports();
        fetchCounties();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await client.get('/api/reports/');
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
            const payload = selectedCounty ? { county: selectedCounty, title: `${counties.find(c => c.id == selectedCounty)?.name || "County"} Risk Report` } : { title: "National Risk Overview" };
            await client.post('/api/reports/', payload);
            setShowModal(false);
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
                type: format === 'csv' ? 'text/csv' : 'text/html'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${id}.${format === 'csv' ? 'csv' : 'html'}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed", error);
            addToast("Failed to download report", "error");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Generated Reports</h2>
                    <p className="text-slate-500">Official Situation Reports for distribution.</p>
                </div>
                <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Generate Report
                </Button>
            </div>

            {loading ? (
                <div className="text-slate-500 py-10 text-center">Loading reports...</div>
            ) : reports.length === 0 ? (
                <div className="text-slate-500 py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    No reports generated yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {reports.map((r) => (
                        <Card key={r.id} className="border-slate-200 shadow-sm hover:border-blue-300 transition-colors flex flex-col">
                            <CardContent className="p-6 flex-1 flex flex-col break-words">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg w-max mb-4">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 mb-1">{r.title || `${r.county_name || "National"} Outlook`}</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    Generated on {new Date(r.created_at).toLocaleDateString()}
                                    <br />
                                    By: {r.generated_by_name || "System"}
                                </p>
                                <div className="flex gap-2 w-full mt-4">
                                    <Button
                                        onClick={() => handleDownload(r.id, 'pdf')}
                                        variant="outline"
                                        className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center min-w-0 px-2"
                                        title="Download PDF"
                                    >
                                        <Download className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">PDF</span>
                                    </Button>
                                    <Button
                                        onClick={() => handleDownload(r.id, 'csv')}
                                        variant="outline"
                                        className="flex-1 text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center min-w-0 px-2"
                                        title="Download CSV"
                                    >
                                        <Download className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">CSV</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b bg-slate-50">
                            <CardTitle>Generate New Report</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Region</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedCounty}
                                    onChange={(e) => setSelectedCounty(e.target.value)}
                                >
                                    <option value="">National Overview (All Counties)</option>
                                    {counties.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="ghost" onClick={() => setShowModal(false)} disabled={generating}>Cancel</Button>
                                <Button className="bg-blue-600 text-white" onClick={handleGenerate} disabled={generating}>
                                    {generating ? "Compiling..." : "Generate"}
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
