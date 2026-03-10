import React from "react";
import { Droplets } from "lucide-react";

export default function CountySelector({ counties, selectedCounties = [], onToggleCounty }) {
    if (!counties || counties.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5">
            {counties.map((county) => {
                const isActive = selectedCounties.includes(county.name);
                return (
                    <button
                        key={county.id}
                        type="button"
                        onClick={() => onToggleCounty(county.name)}
                        className={`
                            flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider transition-all border
                            ${isActive
                                ? "bg-flood-600 text-white border-flood-600 shadow-none"
                                : "bg-white dark:bg-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-surface-border hover:bg-slate-50 dark:hover:bg-surface-raised hover:border-slate-300 dark:hover:border-slate-600"
                            }
                        `}
                    >
                        <Droplets className={`w-3 h-3 ${isActive ? 'text-white' : 'text-flood-500'}`} />
                        <span>{county.name}</span>
                        <span className="opacity-50 mx-0.5">·</span>
                        <span className="tabular-nums">{county.flood_probability || "0"}%</span>
                    </button>
                );
            })}
        </div>
    );
}
