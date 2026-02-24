import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Bell, Map as MapIcon, ShieldAlert, CheckCircle2, Navigation, Clock, TriangleAlert } from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Local GeoJSON files for boundaries 
import kenyaAreasRaw from "../../data/ken_admin2.geojson?raw";
const kenyaAreas = JSON.parse(kenyaAreasRaw);
const FOCUS_COUNTY_NAMES = new Set(["Kisumu", "Siaya", "Homa Bay"]);
const focusAreasGeoJSON = {
    ...kenyaAreas,
    features: kenyaAreas.features.filter(
        (f) => FOCUS_COUNTY_NAMES.has(f.properties.adm1_name)
    )
};
import useAlerts from '../../hooks/useAlerts';

export default function ResponderDashboard() {
    usePageTitle('Responder Dashboard');
    const [counties, setCounties] = useState([]);
    const [optimisticAcks, setOptimisticAcks] = useState(new Set());

    // Fetch alerts with polling
    const { data: alertsData, loading: alertsLoading } = useAlerts(
        { status: 'active' },
        { pollInterval: 60000 }
    );

    useEffect(() => {
        fetchCounties();
    }, []);

    const fetchCounties = async () => {
        try {
            const res = await client.get('/api/counties/');
            setCounties(res.data.slice(0, 3));
        } catch (e) {
            console.error("Failed to fetch counties", e);
        }
    };

    // Derived and sorted alerts list
    const alerts = (alertsData?.results || [])
        .filter(a => !optimisticAcks.has(a.id))
        .sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (sevDiff !== 0) return sevDiff;
            return new Date(b.created_at) - new Date(a.created_at);
        });

    const handleAcknowledge = async (id) => {
        // Optimistic update using a tracking set
        setOptimisticAcks(prev => new Set(prev).add(id));

        try {
            await client.patch(`/api/alerts/${id}/acknowledge/`);
        } catch (e) {
            console.error("Failed to acknowledge alert", e);
            setOptimisticAcks(prev => {
                const updated = new Set(prev);
                updated.delete(id);
                return updated;
            });
        }
    };

    if (alertsLoading && alerts.length === 0 && counties.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 font-black animate-pulse uppercase tracking-widest text-xs">Initializing Field Communications...</p>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Active Alerts Feed - Primary */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-sm animate-pulse-slow">
                                <Bell className="w-7 h-7" />
                            </div>
                            Field Operations Queue
                        </h2>
                        <Badge variant="outline" className="font-black border-slate-200 px-4 py-1 text-slate-400 tracking-tighter">
                            {alerts.length} PENDING RESPONSES
                        </Badge>
                    </div>

                    {alerts.length === 0 ? (
                        <div className="border-2 border-slate-200 bg-slate-50/50 border-dashed rounded-[2rem] flex flex-col items-center justify-center p-20 text-center animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Status: Nominal</h3>
                            <p className="text-sm text-slate-500 font-medium max-w-[280px] mt-2 leading-relaxed">No active emergency dispatches assigned to your jurisdiction at this time.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {alerts.map((alert) => (
                                <Card key={alert.id} className="border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden group">
                                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                                        <div className="p-8 flex-1">
                                            <div className="flex items-center gap-4 mb-4">
                                                <Badge variant={alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'high' : 'warning'} pulse={alert.severity === 'critical'} className="font-black uppercase tracking-[0.2em] text-[10px] px-4 py-1 shadow-sm">
                                                    {alert.severity}
                                                </Badge>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                    {alert.county_name} · {alert.sub_county_name || 'County Wide'}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-3 group-hover:text-blue-600 transition-colors leading-tight line-clamp-1">
                                                {alert.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 font-bold leading-relaxed italic opacity-80 border-l-4 border-slate-100 pl-4 py-1 line-clamp-2">
                                                {alert.description}
                                            </p>
                                            <div className="flex items-center gap-6 mt-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.1em]">
                                                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="flex items-center gap-2"><Navigation className="w-4 h-4" /> DISPATCHED BY {alert.created_by_name || 'OPS'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50/30 p-8 flex items-center justify-center shrink-0 w-full md:w-56">
                                            <Button
                                                onClick={() => handleAcknowledge(alert.id)}
                                                className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black h-16 rounded-2xl shadow-xl hover:shadow-blue-200 transition-all active:scale-90 group-hover:scale-105 duration-300 tracking-widest text-xs"
                                            >
                                                ACKNOWLEDGE
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar - Risk Summary & Map */}
                <div className="space-y-8">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase tracking-widest">
                        <MapIcon className="w-6 h-6 text-indigo-500" /> Intelligence
                    </h2>

                    <div className="relative group/map">
                        <Card className="border-slate-200 shadow-md overflow-hidden h-[200px] rounded-[2rem] bg-slate-50 ring-4 ring-slate-100 relative group">
                            <MapContainer
                                center={[0.0236, 34.7679]}
                                zoom={8}
                                zoomControl={false}
                                dragging={false}
                                scrollWheelZoom={false}
                                doubleClickZoom={false}
                                touchZoom={false}
                                boxZoom={false}
                                className="h-full w-full transition-all duration-700 group-hover:scale-105"
                            >
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                <GeoJSON
                                    data={focusAreasGeoJSON}
                                    style={(f) => {
                                        const hasSevereAlert = alerts.some(a =>
                                            a.sub_county_name === f.properties.adm2_name &&
                                            (a.severity === 'critical' || a.severity === 'high')
                                        );
                                        return {
                                            fillColor: hasSevereAlert ? '#ef4444' : '#94a3b8',
                                            weight: 1,
                                            opacity: 1,
                                            color: 'white',
                                            fillOpacity: hasSevereAlert ? 0.8 : 0.2
                                        };
                                    }}
                                />
                            </MapContainer>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none" />
                            <div className="absolute bottom-4 right-4 z-[400]">
                                <Badge variant="outline" className="bg-white/90 backdrop-blur-md pointer-events-none font-black shadow-lg border-white text-[8px] uppercase tracking-widest px-2">
                                    Strategic Focus
                                </Badge>
                            </div>
                        </Card>
                    </div>

                    {/* Regional Summary */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jurisdiction Overview</p>
                        {counties.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 italic text-xs">No regional data.</div>
                        ) : counties.map(c => (
                            <Card key={c.id} className="border-slate-200 shadow-sm p-5 hover:bg-slate-50 transition-all cursor-default rounded-3xl group/card relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50/50 rounded-bl-full -mr-6 -mt-6 group-hover/card:scale-150 transition-transform duration-500" />
                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.name}</span>
                                    <Badge variant={c.risk_category === 'High' ? 'danger' : 'info'} className="text-[8px] uppercase px-2 py-0.5 font-black ring-1 ring-white shadow-sm">
                                        {c.risk_category}
                                    </Badge>
                                </div>
                                <div className="flex items-end justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${c.flood_probability >= 75 ? 'bg-red-500 animate-ping' : 'bg-blue-500'}`} />
                                        <span className="text-3xl font-black text-slate-800 tabular-nums tracking-tighter">{c.flood_probability}%</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5">{c.lead_time_days}D LEAD</span>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <Button variant="outline" className="w-full border-slate-200 text-slate-400 font-black h-16 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300 shadow-sm uppercase tracking-widest text-[10px]">
                        <Navigation className="w-5 h-5" /> Open Tactical GIS
                    </Button>
                </div>
            </div>
        </div>
    );
}
