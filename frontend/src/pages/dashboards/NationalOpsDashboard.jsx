import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ShieldAlert, MapPin, Users, Clock, ArrowRight, TrendingUp, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlertCreateModal from '../../components/alerts/AlertCreateModal';
import { useAlertStore } from '../../store/useAlertStore';

export default function NationalOpsDashboard() {
    usePageTitle('National Operations - CrisisLens');
    const [stats, setStats] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [countiesData, setCountiesData] = useState([]);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'flood_probability', direction: 'desc' });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [statsRes, trendRes, countiesRes, alertsRes] = await Promise.all([
                client.get('/api/counties/stats/'),
                client.get('/api/counties/trend/'),
                client.get('/api/counties/'),
                client.get('/api/alerts/?limit=10')
            ]);
            setStats(statsRes.data);
            setTrendData(trendRes.data);
            setCountiesData(countiesRes.data);
            setRecentAlerts(alertsRes.data.results || alertsRes.data);
        } catch (e) {
            console.error("Failed to load national dashboard", e);
        } finally {
            setLoading(false);
        }
    };

    const sortedTableData = useMemo(() => {
        let items = [...countiesData];
        if (sortConfig.key) {
            items.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return items;
    }, [countiesData, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // Format trend data for Recharts (Pivot by date)
    const chartData = useMemo(() => {
        const pivot = {};
        trendData.forEach(d => {
            const dateStr = new Date(d.date).toLocaleDateString();
            if (!pivot[dateStr]) pivot[dateStr] = { date: dateStr };
            pivot[dateStr][d.county] = d.probability;
        });
        return Object.values(pivot).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [trendData]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 font-bold animate-pulse">Loading Operational Intelligence...</p>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
            {/* Header with Title and Action */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">National Operations Center</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Strategic flood monitoring and crisis coordination.</p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-100 dark:shadow-none font-bold px-6"
                >
                    <Plus className="w-4 h-4 mr-2" /> Broadcast Alert
                </Button>
            </div>

            <AlertCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchDashboardData}
            />
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Active Alerts" value={stats?.active_alerts} icon={<ShieldAlert className="w-6 h-6" />} color="red" />
                <KPICard title="High Risk Zones" value={stats?.high_risk_count} icon={<MapPin className="w-6 h-6" />} color="amber" />
                <KPICard title="Population at Risk" value={stats?.pop_at_risk.toLocaleString()} icon={<Users className="w-6 h-6" />} color="blue" />
                <KPICard title="Avg Lead Time" value={`${stats?.avg_lead_time} Days`} icon={<Clock className="w-6 h-6" />} color="indigo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/20">
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            30-Day Flood Probability Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80 p-6 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorKisumu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSiaya" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorHoma" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Prob. %', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Area type="monotone" name="Kisumu" dataKey="Kisumu" stroke="#2563eb" fillOpacity={1} fill="url(#colorKisumu)" strokeWidth={3} />
                                <Area type="monotone" name="Siaya" dataKey="Siaya" stroke="#7c3aed" fillOpacity={1} fill="url(#colorSiaya)" strokeWidth={3} />
                                <Area type="monotone" name="Homa Bay" dataKey="Homa Bay" stroke="#0891b2" fillOpacity={1} fill="url(#colorHoma)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Recent Alerts Feed */}
                <Card className="border-slate-200 shadow-sm flex flex-col">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/20">
                        <CardTitle className="text-lg font-bold text-slate-800">Recent Alerts Feed</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-hide max-h-[352px]">
                        <div className="divide-y divide-slate-100">
                            {recentAlerts.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 italic text-sm">No recent alerts recorded.</div>
                            ) : recentAlerts.map((alert) => (
                                <div key={alert.id} className="p-4 hover:bg-slate-50 transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'info'} className="text-[9px] uppercase font-black px-2 py-0.5">
                                            {alert.severity}
                                        </Badge>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                            {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-700 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">{alert.title}</h4>
                                    <div className="flex items-center justify-between mt-3">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wide">{alert.county_name}</p>
                                        <Link to="/dashboard/alerts" className="text-xs text-blue-600 font-black flex items-center gap-1 hover:translate-x-1 transition-transform">
                                            VIEW <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Risk Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5">
                    <CardTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">National Risk Analytics Matrix</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5 font-black cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('name')}>County / Region</th>
                                <th className="px-6 py-5 font-black cursor-pointer hover:text-blue-600 transition-colors text-center" onClick={() => handleSort('flood_probability')}>Max Probability</th>
                                <th className="px-6 py-5 font-black text-center">Operational Tier</th>
                                <th className="px-6 py-5 font-black cursor-pointer hover:text-blue-600 transition-colors text-center" onClick={() => handleSort('lead_time_days')}>Alert Lead Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedTableData.map((c) => (
                                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                <div className={`h-full transition-all duration-1000 ${c.flood_probability >= 75 ? 'bg-red-500' : c.flood_probability >= 50 ? 'bg-amber-500' : 'bg-blue-600'
                                                    }`} style={{ width: `${c.flood_probability}%` }} />
                                            </div>
                                            <span className="font-black text-slate-700 w-8">{c.flood_probability}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant={c.risk_category === 'High' ? 'danger' : c.risk_category === 'Moderate' ? 'warning' : 'success'} className="px-3 py-1 font-bold">
                                            {c.risk_category}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-600 font-bold italic">{c.lead_time_days} Days</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function KPICard({ title, value, icon, color }) {
    const colorClasses = {
        red: 'bg-red-50 text-red-600 ring-red-100',
        amber: 'bg-amber-50 text-amber-600 ring-amber-100',
        blue: 'bg-blue-50 text-blue-600 ring-blue-100',
        indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    };
    return (
        <Card className="border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">{title}</p>
                    <h3 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter tabular-nums">{value ?? '--'}</h3>
                </div>
                <div className={`p-4 rounded-3xl shadow-sm ring-4 ${colorClasses[color]} transition-all group-hover:scale-110`}>
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}
