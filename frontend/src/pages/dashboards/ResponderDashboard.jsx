import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Clock, Navigation, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import kenyaAreasRaw from '../../data/ken_admin2.geojson?raw';
import useAlerts from '../../hooks/useAlerts';

const kenyaAreas = JSON.parse(kenyaAreasRaw);
const FOCUS = new Set(['Kisumu', 'Siaya', 'Homa Bay']);
const focusGeoJSON = { ...kenyaAreas, features: kenyaAreas.features.filter(f => FOCUS.has(f.properties.adm1_name)) };

function Panel({ title, children, className = '' }) {
    return (
        <Card className={`overflow-hidden ${className}`}>
            {title && (
                <div className="px-4 py-2 border-b border-slate-200 dark:border-surface-border bg-slate-50/50 dark:bg-surface/50">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{title}</span>
                </div>
            )}
            {children}
        </Card>
    );
}

function SeverityBar({ severity }) {
    const colors = { critical: 'bg-red-500', high: 'bg-amber-500', medium: 'bg-flood-500', low: 'bg-emerald-500' };
    return <div className={`w-1 self-stretch ${colors[severity] || 'bg-slate-400'} shrink-0`} />;
}

export default function ResponderDashboard() {
    usePageTitle('Responder — Field Operations');
    const [counties, setCounties] = useState([]);
    const [ackedIds, setAckedIds] = useState(new Set());
    const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

    const { data: alertsData, loading } = useAlerts({ status: 'active' }, { pollInterval: 60000 });

    useEffect(() => {
        client.get('/api/counties/').then(r => setCounties(r.data.slice(0, 3))).catch(() => { });

        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const alerts = (alertsData?.results || [])
        .filter(a => !ackedIds.has(a.id))
        .sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return (order[a.severity] - order[b.severity]) || (new Date(b.created_at) - new Date(a.created_at));
        });

    const handleAck = async (id) => {
        setAckedIds(prev => new Set(prev).add(id));
        try {
            await client.patch(`/api/alerts/${id}/acknowledge/`);
        } catch {
            setAckedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    if (loading && alerts.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Initializing Field Comms...</span>
        </div>
    );

    const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    return (
        <div className="space-y-4 animate-in fade-in duration-500">

            {/* Header - Highly Compact */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200 dark:border-surface-border">
                <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-1">Emergency Response Unit</p>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Field Operations Queue</h1>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm">
                    {alerts.length > 0 ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">{alerts.length} Tasks Pending</span>
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Sector Clear</span>
                        </>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

                {/* Alert queue - Compact */}
                <div className="lg:col-span-3 space-y-3">
                    {alerts.length === 0 ? (
                        <Card className="flex flex-col items-center justify-center py-12 gap-3 bg-slate-50/30 dark:bg-surface/10 border-dashed border-2">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600">
                                <CheckCircle2 size={24} strokeWidth={1.5} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-0.5">Status: Operational</h3>
                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-tight">
                                    No active emergency dispatches currently assigned to your sector units.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        alerts.map(alert => (
                            <Card key={alert.id} className="flex overflow-hidden transition-all hover:bg-slate-50/50 dark:hover:bg-surface/30 group">
                                <SeverityBar severity={alert.severity} />
                                <div className="flex flex-col md:flex-row flex-1 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-surface-border">
                                    <div className="p-4 flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${alert.severity === 'critical' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30' :
                                                    alert.severity === 'high' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30' :
                                                        'text-flood-600 dark:text-flood-400 bg-flood-50 dark:bg-flood-950/20 border-flood-100 dark:border-flood-900/30'
                                                }`}>{alert.severity}</span>
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                {alert.county_name} · {alert.sub_county_name || 'Jurisdiction Wide'}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white mb-2 tracking-tight group-hover:text-flood-600 dark:group-hover:text-flood-400 transition-colors uppercase">{alert.title}</h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug mb-3">{alert.description}</p>
                                        <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={10} strokeWidth={3} className="text-slate-300" />
                                                {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Navigation size={10} strokeWidth={3} className="text-slate-300" />
                                                Dispatcher: {alert.created_by_name || 'NOC'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="px-4 py-4 flex items-center justify-center bg-slate-50/50 dark:bg-surface/30 shrink-0 md:w-36">
                                        <Button
                                            onClick={() => handleAck(alert.id)}
                                            className="w-full h-8 px-0 font-black uppercase tracking-widest text-[9px]"
                                        >
                                            Acknowledge
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* Intel sidebar - Compact */}
                <aside className="space-y-4">
                    <Panel title="Sector Geometry">
                        <div className="h-32 bg-slate-100 dark:bg-surface transition-colors">
                            <MapContainer center={[0.0236, 34.7679]} zoom={8} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} className="h-full w-full grayscale opacity-80 contrast-125 dark:invert dark:opacity-60">
                                <TileLayer url={tileUrl} />
                                <GeoJSON data={focusGeoJSON} style={f => {
                                    const severe = alerts.some(a => a.sub_county_name === f.properties.adm2_name && ['critical', 'high'].includes(a.severity));
                                    return {
                                        fillColor: severe ? '#ef4444' : '#334155',
                                        weight: 1.5,
                                        color: isDark ? '#475569' : '#cbd5e1',
                                        fillOpacity: severe ? 0.8 : 0.2
                                    };
                                }} />
                            </MapContainer>
                        </div>
                    </Panel>

                    <Panel title="Risk Telemetry">
                        <div className="divide-y divide-slate-100 dark:divide-surface-border">
                            {counties.map(c => (
                                <div key={c.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/50 dark:hover:bg-surface/30 transition-colors">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 capitalize tracking-tight leading-none mb-1">{c.name}</p>
                                        <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase italic leading-none">{c.lead_time_days}d Lead window</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-900 dark:text-white tabular-nums leading-none mb-1">{c.flood_probability}%</p>
                                        <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${c.risk_category === 'High' ? 'text-red-500' : 'text-amber-500'}`}>{c.risk_category}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </aside>
            </div>
        </div>
    );
}
