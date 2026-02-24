import React from "react";

export default function MapLegend() {
    return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3 text-xs font-medium text-slate-600">
            <span>Flood Risk Target:</span>
            <div className="flex bg-gradient-to-r from-[#bfdbfe] to-[#1e3a8a] h-3 w-32 rounded-sm" />
            <div className="flex justify-between w-32 -ml-[136px] px-1 pointer-events-none text-[10px] text-white mix-blend-difference">
                <span>Low</span>
                <span>High</span>
            </div>
        </div>
    );
}
