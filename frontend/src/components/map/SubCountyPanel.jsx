import { useRef, useEffect, useState } from "react";
import { Clock, Droplets, TriangleAlert, Waves, X, ExternalLink, Bot, MousePointer2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import Skeleton from "../ui/Skeleton";

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
        navigate(`/dashboard/analyst?county=${county.name}&area=${areaRiskEntry.name}`);
    };

    return (
        <div
            ref={panelRef}
            tabIndex={-1}
            className="w-full md:w-96 bg-white border-l border-slate-200 flex flex-col h-full outline-none"
            role="dialog"
            aria-labelledby="panel-title"
        >
            {/* Mobile Drag Handle */}
            <div className="md:hidden flex justify-center pt-3 pb-1 bg-slate-50">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 relative">
                <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-3">Tactical Detail &middot; {county?.name}</p>
                    <h2 id="panel-title" className="text-3xl font-black text-slate-800 leading-none tracking-tighter pr-8">
                        {areaRiskEntry?.name}
                    </h2>

                    {areaRiskEntry && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-semibold rounded-md shadow-sm">
                                <Waves className="w-4 h-4" /> {areaRiskEntry.risk_category || "Normal"}
                            </span>
                            {areaRiskEntry.lead_time_days && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-semibold rounded-md shadow-sm">
                                    <Clock className="w-4 h-4" /> {areaRiskEntry.lead_time_days}-day alert
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="absolute top-6 right-5 bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all p-1.5 rounded-full shadow-sm"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 bg-white">
                {loading ? (
                    <div className="space-y-6">
                        <Skeleton className="h-28 w-full rounded-xl" />
                        <Skeleton className="h-40 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                ) : details ? (
                    <>
                        {/* Risk Metric Hero */}
                        <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <div className="shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-xl shadow-md">
                                {details.flood_probability || 0}%
                            </div>
                            <div>
                                <h3 className="text-slate-800 font-semibold mb-1">Calculated Probability</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">Based on combined current situational indicators and predictive models.</p>
                            </div>
                        </div>

                        {/* Ask AI Context Button */}
                        <button
                            onClick={handleAskAI}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md transition-all font-semibold"
                        >
                            <Bot className="w-5 h-5" />
                            Ask AI About This Area
                            <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                        </button>

                        {/* Detailed Indicators */}
                        {details.latest_observation && (
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Droplets className="w-5 h-5 text-blue-500" />
                                    Latest Indicators
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Rainfall</p>
                                        <p className="font-semibold text-slate-700 mt-1">{details.latest_observation.rainfall_accumulation} mm</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Soil Moisture</p>
                                        <p className="font-semibold text-slate-700 mt-1">{(details.latest_observation.soil_moisture * 100).toFixed(0)}%</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Elevation</p>
                                        <p className="font-semibold text-slate-700 mt-1">{details.latest_observation.elevation} m</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Past Occurrence</p>
                                        <p className="font-semibold text-slate-700 mt-1">{details.latest_observation.past_flood_occurrence ? "Yes" : "No"}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top Hotspots List */}
                        <div>
                            <h3 className="font-bold text-slate-800 mb-4">Other Hotspots in {county?.name}</h3>
                            <ul className="space-y-3">
                                {topAreas.filter(a => a.id !== areaRiskEntry?.id).map((area) => (
                                    <li key={area.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                        <div className="flex items-center gap-3">
                                            {area.flood_probability >= 75 ? (
                                                <TriangleAlert className="w-5 h-5 text-red-500 shrink-0" />
                                            ) : (
                                                <Droplets className="w-5 h-5 text-blue-500 shrink-0" />
                                            )}
                                            <span className="font-semibold text-slate-700">{area.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                            {area.flood_probability}%
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center p-8 text-slate-500 italic text-center">
                        Select an area on the map to view detailed risk intelligence.
                    </div>
                )}
            </div>
        </div>
    );
}
