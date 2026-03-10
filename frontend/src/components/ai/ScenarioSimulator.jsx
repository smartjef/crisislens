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
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-flood-500" /> Rainfall Accumulation
                            </label>
                            <span className="text-[10px] font-black text-flood-600 uppercase tracking-widest">{inputs.rainfall_accumulation} MM</span>
                        </div>
                        <input
                            type="range" min="0" max="300" step="5"
                            className="w-full h-1.5 bg-slate-200 dark:bg-surface-border/20 rounded-full appearance-none cursor-pointer accent-flood-600"
                            value={inputs.rainfall_accumulation}
                            onChange={(e) => setInputs({ ...inputs, rainfall_accumulation: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Droplets className="w-3.5 h-3.5 text-flood-500" /> Soil Moisture
                            </label>
                            <span className="text-[10px] font-black text-flood-600 uppercase tracking-widest">{(inputs.soil_moisture * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01"
                            className="w-full h-1.5 bg-slate-200 dark:bg-surface-border/20 rounded-full appearance-none cursor-pointer accent-flood-600"
                            value={inputs.soil_moisture}
                            onChange={(e) => setInputs({ ...inputs, soil_moisture: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Mountain className="w-3.5 h-3.5 text-flood-500" /> Elevation Parameters
                            </label>
                            <span className="text-[10px] font-black text-flood-600 uppercase tracking-widest">{inputs.elevation} M</span>
                        </div>
                        <input
                            type="range" min="1100" max="1400" step="1"
                            className="w-full h-1.5 bg-slate-200 dark:bg-surface-border/20 rounded-full appearance-none cursor-pointer accent-flood-600"
                            value={inputs.elevation}
                            onChange={(e) => setInputs({ ...inputs, elevation: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-surface-border/10 rounded-sm border border-slate-200 dark:border-surface-border cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        <input
                            type="checkbox" id="past_flood"
                            className="w-4 h-4 text-flood-600 bg-white dark:bg-surface border-slate-300 dark:border-surface-border rounded-sm focus:ring-flood-500 cursor-pointer"
                            checked={inputs.past_flood_occurrence}
                            onChange={(e) => setInputs({ ...inputs, past_flood_occurrence: e.target.checked })}
                        />
                        <label htmlFor="past_flood" className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 cursor-pointer">Historical Data Override</label>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={handleSimulate}
                            disabled={loading}
                            className="flex-1 bg-flood-600 hover:bg-flood-700 text-white h-11 text-[10px] font-black uppercase tracking-[0.15em]"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    PROCESSING...
                                </div>
                            ) : (
                                <><Play className="w-4 h-4 mr-2 fill-current" /> EXECUTE SIMULATION</>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="border-slate-200 dark:border-surface-border text-slate-400 h-11 w-11 p-0 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/5"
                            title="Reset Parameters"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Results */}
                <div className="flex flex-col">
                    <div className={`flex-1 border border-dashed rounded-sm p-6 flex flex-col items-center justify-center text-center transition-all duration-300 h-full ${result ? 'border-flood-400 bg-flood-50/10' : 'border-slate-200 dark:border-surface-border bg-slate-50/20'
                        }`}>
                        {!result ? (
                            <div className="text-slate-400 max-w-[200px] opacity-40">
                                <div className="w-12 h-12 bg-white dark:bg-surface rounded-sm border border-slate-100 dark:border-surface-border flex items-center justify-center mx-auto mb-5">
                                    <Play className="w-5 h-5 text-flood-500 fill-flood-500" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Adjust indicators & execute simulation</p>
                            </div>
                        ) : (
                            <div className="w-full space-y-6 animate-in zoom-in-95 duration-300">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-flood-500/60">Simulated Probability</p>
                                    <div className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums drop-shadow-sm">
                                        {result.flood_probability}<span className="text-flood-500 text-3xl">%</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white dark:bg-surface-raised rounded-sm border border-slate-100 dark:border-surface-border text-left">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Vector Risk</p>
                                        <p className={`text-[10px] font-black uppercase tracking-tight ${result.risk_category === 'High' ? 'text-danger-600' :
                                            result.risk_category === 'Moderate' ? 'text-warning-600' : 'text-success-600'
                                            }`}>
                                            {result.risk_category} Phase
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-surface-raised rounded-sm border border-slate-100 dark:border-surface-border text-left">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Confidence</p>
                                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                                            {(result.confidence * 100).toFixed(0)}% Accuracy
                                        </p>
                                    </div>
                                </div>

                                <div className={`flex flex-col gap-1.5 p-4 rounded-sm border transition-all ${diff > 0 ? 'bg-danger-500/5 border-danger-500/20' : diff < 0 ? 'bg-success-500/5 border-success-500/20' : 'bg-slate-500/5 border-slate-500/20'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Baseline Context</span>
                                        <span className="text-[8px] font-black uppercase text-slate-500">{currentProb}% Prob</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            {diff > 0 ? <TrendingUp className="w-4 h-4 text-danger-600" /> : <TrendingDown className="w-4 h-4 text-success-600" />}
                                            <span className={`text-sm font-black tracking-tight ${diff > 0 ? 'text-danger-700 dark:text-danger-400' : 'text-success-700 dark:text-success-400'}`}>
                                                Δ {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                            </span>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-sm ${diff > 0 ? 'bg-danger-600 text-white' : 'bg-success-600 text-white'}`}>
                                            {diff > 0 ? 'Escalation' : 'Reduction'}
                                        </span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-1">
                                        {diff > 0 ? 'Predicted vulnerability increase. Advise countermeasures.' : 'Model indicates vulnerability reduction.'}
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
