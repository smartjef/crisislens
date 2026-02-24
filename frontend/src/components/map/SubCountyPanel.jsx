import React from "react";
import { Clock, Droplets, TriangleAlert, Waves, X } from "lucide-react";

export default function SubCountyPanel({ county, areaRiskEntry, topAreas, onClose }) {
    if (!county) return null;

    return (
        <div className="w-80 bg-white border border-slate-200 shadow-md rounded-xl flex flex-col h-full overflow-y-auto transform transition-transform duration-300">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">{county.name} County</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md">
                            <Waves className="w-3 h-3" /> {county.risk_category || "Flood"}
                        </span>
                        {county.lead_time_days && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md">
                                <Clock className="w-3 h-3" /> {county.lead_time_days}-day alert
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-5 flex-1 flex flex-col gap-6 text-sm text-slate-600">
                <div>
                    <p className="font-semibold text-slate-800 mb-1">Selected Area</p>
                    <p className="text-slate-700">
                        {areaRiskEntry
                            ? `${areaRiskEntry.name} \u00B7 ${areaRiskEntry.flood_probability || "N/A"}% risk`
                            : "Click a map area to see its severity."}
                    </p>
                </div>

                <div>
                    <p className="font-semibold text-slate-800 mb-3">Top Affected Areas</p>
                    <ul className="space-y-3">
                        {topAreas.map((area) => (
                            <li key={area.id} className="flex items-center gap-2">
                                {area.flood_probability >= 75 ? (
                                    <TriangleAlert className="w-4 h-4 text-red-600 shrink-0" />
                                ) : (
                                    <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
                                )}
                                <span>
                                    <span className="font-medium text-slate-700">{area.name}</span>
                                    <span className="text-slate-500 ml-1">
                                        &middot; {area.flood_probability}%
                                    </span>
                                </span>
                            </li>
                        ))}
                        {topAreas.length === 0 && (
                            <li className="text-slate-500 italic">No sub-county data available.</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
