import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import client from '../../api/client';
import Button from '../../components/ui/Button';
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
        <div className={`bg-surface-raised border border-surface-border rounded ${className}`}>
            {title && (
                <div className="px-5 py-3 border-b border-surface-border">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{title}</span>
                </div>
            )}
            {children}
        </div>
    );
}

function SeverityBar({ severity }) {
    const colors = { critical: 'bg-red-500', high: 'bg-amber-500', medium: 'bg-flood-500', low: 'bg-emerald-500' };
    return <div className={`w-1 self-stretch rounded-full ${colors[severity] || 'bg-slate-500'} shrink-0`} />;
}

export default function ResponderDashboard() {
    usePageTitle('Responder — Field Operations');
    const [counties, setCounties] = useState([]);
    const [ackedIds, setAckedIds] = useState(new Set());

    const { data: alertsData, loading } = useAlerts({ status: 'active' }, { pollInterval: 60000 });

    useEffect(() => {
        client.get('/api/counties/').then(r => setCounties(r.data.slice(0, 3))).catch(() => {});
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
        <div className="flex items-center justify-center min-h-[400px] gap-3">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Initializing field comms...</span>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="pb-4 border-b border-surface-border">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1">Emergency Response Unit</p>
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-slate-200">Field Operations Queue</h1>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-surface-border">
                        {alerts.length > 0 ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] font-mono text-red-400">{alerts.length} PENDING RESPONSE</span>
                            </>
                        ) : (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-mono text-emerald-400">ALL CLEAR</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Alert queue */}
                <div className="lg:col-span-3 space-y-3">
                    {alerts.length === 0 ? (
                        <Panel>
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <CheckCircle2 size={32} className="text-emerald-500" />
                                <h3 className="text-sm font-semibold text-slate-300">Status: Nominal</h3>
                                <p className="text-xs text-slate-600 text-center max-w-xs">
                                    No active emergency dispatches assigned to your jurisdiction.
                                </p>
                            </div>
                        </Panel>
                    ) : alerts.map(alert => (
                        <div key={alert.id} className="bg-surface-raised border border-surface-border rounded flex overflow-hidden">
                            <SeverityBar severity={alert.severity} />
                            <div className="flex flex-col md:flex-row flex-1 divide-y md:divide-y-0 md:divide-x divide-surface-border">
                                <div className="p-5 flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                                            alert.severity === 'critical' ? 'text-red-400 bg-red-900/20 border-red-800/30' :
                                            alert.severity === 'high'     ? 'text-amber-400 bg-amber-900/20 border-amber-800/30' :
                                            'text-flood-400 bg-flood-900/20 border-flood-800/30'
                                        }`}>{alert.severity}</span>
                                        <span className="text-[10px] font-mono text-slate-600">
                                            {alert.county_name} · {alert.sub_county_name || 'County Wide'}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-200 mb-2 leading-snug">{alert.title}</h3>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{alert.description}</p>
                                    <div className="flex items-center gap-4 mt-3 text-[10px] font-mono text-slate-600 uppercase">
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={11} />
                                            {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Navigation size={11} />
                                            {alert.created_by_name || 'OPS'}
                                        </span>
                                    </div>
                                </div>
                                <div className="px-5 py-4 flex items-center justify-center bg-surface/30 shrink-0 md:w-44">
                                    <Button
                                        onClick={() => handleAck(alert.id)}
                                        className="w-full bg-flood-700 hover:bg-flood-600 text-white text-xs font-semibold py-2.5 rounded font-mono uppercase tracking-wider"
                                    >
                                        Acknowledge
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Intel sidebar */}
                <div className="space-y-4">
                    <Panel title="Strategic Area">
                        <div className="h-40">
                            <MapContainer center={[0.0236, 34.7679]} zoom={8} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} className="h-full w-full">
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                <GeoJSON data={focusGeoJSON} style={f => {
                                    const severe = alerts.some(a => a.sub_county_name === f.properties.adm2_name && ['critical','high'].includes(a.severity));
                                    return { fillColor: severe ? '#ef4444' : '#334155', weight: 1, color: '#475569', fillOpacity: severe ? 0.7 : 0.3 };
                                }} />
                            </MapContainer>
                        </div>
                    </Panel>
                    <Panel title="Jurisdiction Risk">
                        <div className="divide-y divide-surface-border">
                            {counties.map(c => (
                                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                                    <div>
                                        <p className="text-xs font-medium text-slate-300">{c.name}</p>
                                        <p className="text-[10px] font-mono text-slate-600 uppercase">{c.lead_time_days}d lead</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-slate-300 tabular-nums">{c.flood_probability}%</p>
                                        <span className={`text-[9px] font-mono uppercase ${c.risk_category === 'High' ? 'text-red-400' : 'text-amber-400'}`}>{c.risk_category}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
