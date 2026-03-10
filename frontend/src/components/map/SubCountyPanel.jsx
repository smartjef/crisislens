import { useRef, useEffect, useState } from "react";
import { Clock, Droplets, TriangleAlert, Waves, X, ExternalLink, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import Skeleton from "../ui/Skeleton";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Card from "../ui/Card";

export default function SubCountyPanel({ county, areaRiskEntry, topAreas, onClose }) {
    const navigate = useNavigate();
    const panelRef = useRef(null);
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);

    // Accessibility: Auto-focus and ESC support
    useEffect(() => {
        panelRef.current?.focus();

        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Fetch deep details on open
    useEffect(() => {
        if (!areaRiskEntry?.id) return;
        setLoading(true);
        client.get(`/api/sub-counties/${areaRiskEntry.id}/`)
            .then(res => setDetails(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [areaRiskEntry?.id]);

    const handleAskAI = () => {
        if (!county || !areaRiskEntry) return;
        navigate(`/crisis-ai?county=${county.name}&area=${areaRiskEntry.name}`);
    };

    return (
        <div
            ref={panelRef}
            tabIndex={-1}
            className="w-full md:w-80 bg-white dark:bg-surface-raised border-l border-slate-200 dark:border-surface-border flex flex-col h-full outline-none transition-colors duration-200"
            role="dialog"
            aria-labelledby="panel-title"
        >
            {/* Mobile Drag Handle */}
            <div className="md:hidden flex justify-center pt-2 pb-1 bg-slate-50 dark:bg-surface">
                <div className="w-8 h-1 bg-slate-200 dark:bg-surface-border rounded-full" />
            </div>

            <div className="px-4 py-3 border-b border-slate-100 dark:border-surface-border flex justify-between items-start bg-slate-50/50 dark:bg-surface relative">
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-flood-600 dark:text-flood-400 uppercase tracking-[0.2em] mb-1">Tactical Detail &middot; {county?.name}</p>
                    <h2 id="panel-title" className="text-xl font-black text-slate-900 dark:text-white leading-tight tracking-tight truncate pr-6 uppercase">
                        {areaRiskEntry?.name}
                    </h2>

                    {areaRiskEntry && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-5 flex items-center gap-1 border-flood-200 dark:border-flood-900/30 text-flood-600 dark:text-flood-400">
                                <Waves className="w-2.5 h-2.5" /> {areaRiskEntry.risk_category || "Normal"}
                            </Badge>
                            {areaRiskEntry.lead_time_days && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-5 flex items-center gap-1 border-amber-200 dark:border-amber-900/30 text-amber-600 dark:text-amber-400">
                                    <Clock className="w-2.5 h-2.5" /> {areaRiskEntry.lead_time_days}d Lead
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-white dark:bg-surface-raised custom-scrollbar">
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-20 w-full rounded-sm" />
                        <Skeleton className="h-10 w-full rounded-sm" />
                        <Skeleton className="h-32 w-full rounded-sm" />
                    </div>
                ) : details ? (
                    <>
                        {/* Risk Metric Compact Card */}
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-surface p-3 rounded-sm border border-slate-100 dark:border-surface-border">
                            <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-sm bg-flood-600 dark:bg-flood-700 text-white font-black text-sm">
                                {details.flood_probability || 0}%
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-slate-900 dark:text-white text-[11px] font-black uppercase tracking-wider">Risk Probability</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">Calculated situational risk index.</p>
                            </div>
                        </div>

                        {/* Ask AI Context Button - Compact */}
                        <Button
                            onClick={handleAskAI}
                            className="w-full flex items-center justify-center gap-2 h-10 text-[10px] font-black uppercase tracking-widest bg-flood-600 hover:bg-flood-700"
                        >
                            <Bot className="w-4 h-4" />
                            Query Intelligence
                            <ExternalLink className="w-3 h-3 opacity-60" />
                        </Button>

                        {/* Detailed Indicators - Compact Grid */}
                        {details.latest_observation && (
                            <div className="border-t border-slate-100 dark:border-surface-border pt-4">
                                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-widest">
                                    <Droplets className="w-3 h-3 text-flood-500" />
                                    Environmental Telemetry
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 dark:bg-surface p-2 rounded-sm border border-slate-100 dark:border-surface-border">
                                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-tighter">Rainfall</p>
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">{details.latest_observation.rainfall_accumulation} mm</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-surface p-2 rounded-sm border border-slate-100 dark:border-surface-border">
                                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-tighter">Soil Moisture</p>
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">{(details.latest_observation.soil_moisture * 100).toFixed(0)}%</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-surface p-2 rounded-sm border border-slate-100 dark:border-surface-border">
                                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-tighter">Elevation</p>
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">{details.latest_observation.elevation} m</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-surface p-2 rounded-sm border border-slate-100 dark:border-surface-border">
                                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-tighter">Past Events</p>
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">{details.latest_observation.past_flood_occurrence ? "Confirmed" : "None Recorded"}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top Hotspots List - Highly Compact */}
                        <div className="border-t border-slate-100 dark:border-surface-border pt-4">
                            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-widest">Regional Anomalies</h3>
                            <div className="space-y-1">
                                {topAreas.filter(a => a.id !== areaRiskEntry?.id).map((area) => (
                                    <div key={area.id} className="flex items-center justify-between p-2 rounded-sm hover:bg-slate-50 dark:hover:bg-surface transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {area.flood_probability >= 75 ? (
                                                <TriangleAlert className="w-3 h-3 text-red-500 shrink-0" />
                                            ) : (
                                                <Droplets className="w-3 h-3 text-flood-500 shrink-0" />
                                            )}
                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate tracking-tight">{area.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tabular-nums">
                                            {area.flood_probability}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center p-6 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center">
                        Select tactical sector for intelligence.
                    </div>
                )}
            </div>
        </div>
    );
}
