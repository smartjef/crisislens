import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ShieldAlert, Info, Bell, PlusCircle, ArrowRight, Droplets, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlertCreateModal from '../../components/alerts/AlertCreateModal';
import useSubCountyRisk from '../../hooks/useSubCountyRisk';
import useAlerts from '../../hooks/useAlerts';
import { getFloodFillColor } from '../../utils/floodColours';

export default function CountyDashboard() {
    const user = useAuthStore(state => state.user);
    const [county, setCounty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    usePageTitle(`${county?.name || 'County'} Dashboard`);

    const { data: subCounties, loading: subLoading } = useSubCountyRisk(user?.county_id);
    const { data: alertsData, loading: alertsLoading } = useAlerts(
        { county: user?.county_id },
        { pollInterval: 60000 }
    );

    useEffect(() => {
        if (user?.county_id) {
            fetchCountyDetail();
        }
    }, [user?.county_id]);

    const fetchCountyDetail = async () => {
        try {
            const res = await client.get(`/api/counties/${user.county_id}/`);
            setCounty(res.data);
        } catch (e) {
            console.error("Failed to fetch county detail", e);
        } finally {
            setLoading(false);
        }
    };

    const sortedSubCounties = [...(subCounties || [])].sort((a, b) => b.flood_probability - a.flood_probability);
    const alerts = alertsData?.results || [];

    const getRecommendedActions = (subName, prob) => {
        if (prob >= 75) return {
            text: `Issue evacuation advisory for ${subName}`,
            class: "text-red-700 bg-red-50 border-red-200",
            icon: <ShieldAlert className="w-5 h-5 text-red-600" />
        };
        if (prob >= 50) return {
            text: `Pre-position relief teams in ${subName}`,
            class: "text-amber-700 bg-amber-50 border-amber-200",
            icon: <Info className="w-5 h-5 text-amber-600" />
        };
        return {
            text: `Monitor river/lake levels in ${subName}`,
            class: "text-blue-700 bg-blue-50 border-blue-200",
            icon: <Droplets className="w-5 h-5 text-blue-600" />
        };
    };

    if ((loading || subLoading || alertsLoading) && !county) return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 font-bold animate-pulse">Loading Local Intelligence...</p>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-1000" />
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-500" /> REGIONAL AUTHORITY STATUS
                    </p>
                    <h2 className="text-5xl font-black text-slate-800 tracking-tighter leading-tight">{county?.name} County</h2>
                    <div className="flex flex-wrap gap-2 mt-6">
                        <Badge variant={county?.risk_category === 'High' ? 'danger' : 'warning'} className="px-4 py-2 font-black uppercase tracking-widest text-[10px] ring-2 ring-white shadow-md">
                            {county?.risk_category} Risk Level
                        </Badge>
                        <Badge variant="outline" className="px-4 py-2 font-black border-slate-200 text-slate-500 uppercase tracking-widest text-[10px] bg-white shadow-sm">
                            {county?.lead_time_days}-Day Early Warning
                        </Badge>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 relative z-10 w-full md:w-auto">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
                        Last Intelligence Update: {new Date().toLocaleTimeString()}
                    </p>
                    {(user.role === 'county_officer' || user.role === 'national_ops') && (
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 px-8 rounded-2xl shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2 group/btn"
                        >
                            <PlusCircle className="w-5 h-5 group-hover/btn:rotate-90 transition-transform" /> Issue New Alert
                        </Button>
                    )}
                </div>
            </div>

            <AlertCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchCountyData}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sub-county Risk Table */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-slate-50 py-6 bg-slate-50/20">
                        <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-[0.1em]">Vulnerability Matrix</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                <tr>
                                    <th className="px-6 py-4">Sub-County</th>
                                    <th className="px-6 py-4">Risk Aggregation</th>
                                    <th className="px-6 py-4 text-center">Protocol Level</th>
                                    <th className="px-6 py-4 text-center">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 italic font-medium">
                                {sortedSubCounties.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs opacity-50 italic">No jurisdictional data available</td></tr>
                                ) : sortedSubCounties.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-emerald-50/20 transition-colors group/row">
                                        <td className="px-6 py-5 font-black text-slate-700 group-hover/row:text-emerald-700 transition-colors tracking-tight">{sub.name}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner flex">
                                                    <div
                                                        className="h-full transition-all duration-1000 ease-out shadow-sm"
                                                        style={{
                                                            width: `${sub.flood_probability}%`,
                                                            backgroundColor: getFloodFillColor(sub.flood_probability)
                                                        }}
                                                    />
                                                </div>
                                                <span className="font-black text-slate-900 tabular-nums w-10 text-right text-xs tracking-tighter">{sub.flood_probability}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <Badge variant={sub.risk_category === 'High' ? 'danger' : sub.risk_category === 'Moderate' ? 'warning' : 'success'} className="font-black text-[9px] uppercase px-2.5 py-1 ring-1 ring-white shadow-sm">
                                                {sub.risk_category}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5 text-center font-black text-slate-400 tabular-nums italic text-xs">{sub.lead_time_days}D</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Recommended Actions */}
                <Card className="border-slate-200 shadow-sm flex flex-col bg-slate-50/10">
                    <CardHeader className="border-b border-slate-50 py-6 bg-slate-50/20">
                        <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-[0.1em]">Protocol Advisories</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4 max-h-[460px] overflow-y-auto scrollbar-hide">
                        {sortedSubCounties.length === 0 ? (
                            <div className="p-10 text-center text-slate-300 italic text-xs font-black uppercase tracking-widest">Awaiting sector analysis...</div>
                        ) : sortedSubCounties.map((sub) => {
                            const action = getRecommendedActions(sub.name, sub.flood_probability);
                            return (
                                <div key={sub.id} className={`p-5 rounded-2xl border-2 ${action.class} shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-default group/action`}>
                                    <div className="flex items-start gap-5">
                                        <div className="mt-1 bg-white p-2 rounded-xl shadow-sm border border-white/50 group-hover/action:scale-110 transition-transform">
                                            {action.icon}
                                        </div>
                                        <div>
                                            <p className="font-black text-sm leading-tight tracking-tight mb-1">{action.text}</p>
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Priority Protocol Response</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>

            {/* County Alerts Feed */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-50 bg-white py-6 flex justify-between items-center px-8">
                    <CardTitle className="text-lg font-black text-slate-800 tracking-tight uppercase tracking-widest">Active County Broadcasts</CardTitle>
                    <Badge variant="info" pulse className="font-black uppercase tracking-widest text-[9px] px-3 py-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">Live Broadcast</Badge>
                </CardHeader>
                <div className="divide-y divide-slate-100">
                    {alerts.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 italic font-medium">No alerts currently broadcasted for this jurisdiction.</div>
                    ) : alerts.map((alert) => (
                        <div key={alert.id} className="p-8 hover:bg-slate-50 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                            <div className="flex gap-6 items-start">
                                <div className={`p-4 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-500 ease-out border border-white ${alert.severity === 'critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                    <Bell className="w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-xl tracking-tighter group-hover:text-emerald-600 transition-colors leading-none mb-2">{alert.title}</h4>
                                    <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">
                                        {alert.sub_county_name || 'All Sectors'} <span className="mx-2 opacity-50">|</span>
                                        Published {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                <Badge variant={alert.severity === 'critical' ? 'critical' : 'warning'} pulse={alert.severity === 'critical'} className="px-5 py-2 font-black uppercase tracking-[0.2em] text-[10px] shadow-sm">
                                    {alert.severity}
                                </Badge>
                                <Link to="/dashboard/alerts" className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-300 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all group-hover:translate-x-1 shadow-sm bg-white">
                                    <ArrowRight className="w-6 h-6" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
