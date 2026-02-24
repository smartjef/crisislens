import React from "react";
import { Droplets } from "lucide-react";

export default function CountySelector({ counties, selectedCounty, onSelectCounty }) {
    if (!counties || counties.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {counties.map((county) => {
                const isActive = selectedCounty === county.name;
                return (
                    <button
                        key={county.id}
                        type="button"
                        onClick={() => onSelectCounty(county.name)}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border
              ${isActive
                                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                            }
            `}
                    >
                        <Droplets className="w-4 h-4" />
                        {county.name} &middot; {county.flood_probability || "N/A"}%
                    </button>
                );
            })}
        </div>
    );
}
