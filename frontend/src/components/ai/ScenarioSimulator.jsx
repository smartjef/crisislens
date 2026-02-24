import React, { useState } from 'react';
import { Play, RotateCcw, TrendingUp, TrendingDown, Layers, Droplets, Mountain } from 'lucide-react';
import client from '../../api/client';
import Button from '../ui/Button';

export default function ScenarioSimulator({ subCounty, onSimulated }) {
    const [inputs, setInputs] = useState({
        rainfall_accumulation: subCounty?.rainfall_accumulation || 150,
        soil_moisture: subCounty?.soil_moisture || 0.7,
        elevation: subCounty?.elevation || 1150,
        past_flood_occurrence: subCounty?.past_flood_occurrence || false
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSimulate = async () => {
        setLoading(true);
        try {
            const res = await client.post('/api/flood/predict/', inputs);
            setResult(res.data);
            if (onSimulated) onSimulated(res.data);
        } catch (e) {
            console.error("Simulation failed", e);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setInputs({
            rainfall_accumulation: subCounty?.rainfall_accumulation || 150,
            soil_moisture: subCounty?.soil_moisture || 0.7,
            elevation: subCounty?.elevation || 1150,
            past_flood_occurrence: subCounty?.past_flood_occurrence || false
        });
        setResult(null);
    };

    const currentProb = subCounty?.flood_probability || 0;
    const diff = result ? result.flood_probability - currentProb : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-5">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-500" /> Rainfall Accumulation
                            </label>
                            <span className="text-sm font-bold text-blue-600">{inputs.rainfall_accumulation} mm</span>
                        </div>
                        <input
                            type="range" min="0" max="300" step="5"
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            value={inputs.rainfall_accumulation}
                            onChange={(e) => setInputs({ ...inputs, rainfall_accumulation: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Droplets className="w-4 h-4 text-blue-500" /> Soil Moisture
                            </label>
                            <span className="text-sm font-bold text-blue-600">{(inputs.soil_moisture * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01"
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            value={inputs.soil_moisture}
                            onChange={(e) => setInputs({ ...inputs, soil_moisture: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Mountain className="w-4 h-4 text-blue-500" /> Elevation
                            </label>
                            <span className="text-sm font-bold text-blue-600">{inputs.elevation} m</span>
                        </div>
                        <input
                            type="range" min="1100" max="1400" step="1"
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            value={inputs.elevation}
                            onChange={(e) => setInputs({ ...inputs, elevation: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                            type="checkbox" id="past_flood"
                            className="w-5 h-5 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            checked={inputs.past_flood_occurrence}
                            onChange={(e) => setInputs({ ...inputs, past_flood_occurrence: e.target.checked })}
                        />
                        <label htmlFor="past_flood" className="text-sm font-semibold text-slate-700 cursor-pointer">Past Flood Occurrence</label>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            onClick={handleSimulate}
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md h-12 text-base font-bold"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Simulating...
                                </div>
                            ) : (
                                <><Play className="w-5 h-5 mr-2 fill-current" /> Run Scenario</>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="border-slate-300 text-slate-600 h-12 w-12 p-0 flex items-center justify-center hover:bg-slate-50"
                            title="Reset to defaults"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Results */}
                <div className="flex flex-col">
                    <div className={`flex-1 border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all duration-500 h-full ${result ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50'
                        }`}>
                        {!result ? (
                            <div className="text-slate-400 max-w-[200px]">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6 opacity-40">
                                    <Play className="w-8 h-8 text-blue-500 fill-blue-500" />
                                </div>
                                <p className="text-sm font-semibold leading-relaxed">Adjust indicators on the left and click <br /><span className="text-blue-500 underline decoration-2 underline-offset-4">Run Scenario</span></p>
                            </div>
                        ) : (
                            <div className="w-full space-y-8 animate-in zoom-in-95 duration-500">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/60 drop-shadow-sm">Simulated Forecast</p>
                                    <div className="text-7xl font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm">
                                        {result.flood_probability}<span className="text-blue-500 text-4xl">%</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-sm text-left">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Risk Level</p>
                                        <p className={`text-sm font-black uppercase ${result.risk_category === 'High' ? 'text-red-600' :
                                            result.risk_category === 'Moderate' ? 'text-amber-600' : 'text-emerald-600'
                                            }`}>
                                            {result.risk_category}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-sm text-left">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Confidence</p>
                                        <p className="text-sm font-black text-slate-800 uppercase">
                                            {(result.confidence * 100).toFixed(0)}%
                                        </p>
                                    </div>
                                </div>

                                <div className={`flex flex-col gap-2 p-5 rounded-2xl shadow-lg border-2 transition-all ${diff > 0 ? 'bg-red-50 border-red-200' : diff < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Baseline Context</span>
                                        <span className="text-[10px] font-black uppercase text-slate-600">{currentProb}% Probability</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            {diff > 0 ? <TrendingUp className="w-5 h-5 text-red-600" /> : <TrendingDown className="w-5 h-5 text-emerald-600" />}
                                            <span className={`text-lg font-black tracking-tight ${diff > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                                Δ Change: {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                            </span>
                                        </div>
                                        <span className={`text-xs font-black uppercase px-3 py-1 rounded-lg ${diff > 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                            {diff > 0 ? '↑ Risk Inc' : '↓ Risk Dec'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-500 mt-1">
                                        {diff > 0 ? 'Predicted escalation. Advise active surveillance.' : 'Model indicates vulnerability reduction.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
