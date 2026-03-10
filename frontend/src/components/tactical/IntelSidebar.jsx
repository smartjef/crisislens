import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Sparkles, ChevronRight, Info, AlertTriangle, MessageSquare } from 'lucide-react';
import AIChatPanel from '../ai/AIChatPanel';
import Badge from '../ui/Badge';
import client from '../../api/client';

export default function IntelSidebar({ county, area, areaRiskEntry, topAreas = [], selectedHotspot, selectedCustomPin, onClose, onDeployDrone }) {
    const [mode, setMode] = useState('risk'); // 'risk', 'briefing', 'chat'
    const [briefing, setBriefing] = useState('');
    const [loadingBriefing, setLoadingBriefing] = useState(false);
    const [prefillMessage, setPrefillMessage] = useState('');

    const handleDecisionSupport = (question) => {
        setPrefillMessage(question);
        setMode('chat');
    };

    // Auto-switch to briefing mode if a hotspot or custom pin is clicked
    useEffect(() => {
        if (selectedHotspot) {
            setMode('briefing');
            handleGetBriefing(true, false);
        } else if (selectedCustomPin) {
            setMode('briefing');
            handleGetBriefing(false, true);
        } else if (county || area) {
            handleGetBriefing(false, false);
        }
    }, [county, area, selectedHotspot, selectedCustomPin]);

    const handleGetBriefing = async (isHotspot = false, isCustomPin = false) => {
        setLoadingBriefing(true);
        try {
            let contextMessage = `Provide a critical tactical briefing for ${area || county?.name}. Focus on immediate flood risks, population vulnerability, and evacuation status. Be extremely concise (max 3 sentences).`;

            if (isHotspot && selectedHotspot) {
                contextMessage = `URGENT TACTICAL INCIDENT: Generate an immediate rapid-response briefing for a ${selectedHotspot.title} occurring at coords ${selectedHotspot.pos.join(", ")} in ${selectedHotspot.area}, ${selectedHotspot.county}. Focus strictly on operational impact and immediate dispatcher actions. Max 3 sentences.`;
            } else if (isCustomPin && selectedCustomPin) {
                contextMessage = `TARGET COORDINATES LOCKED: Generate a hyper-local tactical analysis for coordinate [${selectedCustomPin.lat.toFixed(4)}, ${selectedCustomPin.lng.toFixed(4)}]. Analyze likely terrain risks, proximity to water bodies, and accessibility for ground teams based on standard Kenyan geography. Max 3 sentences.`;
            }

            const payload = {
                message: contextMessage,
                // If it's a custom pin, we pass the generic active area/county, or "Custom Area" if none
                county: selectedHotspot?.county || (selectedCustomPin ? (county?.name || "Target Zone") : county?.name) || 'National',
                area: selectedHotspot?.area || (selectedCustomPin ? (area || "Unknown Sector") : area) || 'General'
            };

            const res = await client.post('/api/ai/chat/', payload);
            setBriefing(res.data.message);
        } catch (e) {
            console.error("Briefing failed", e);
            setBriefing("Tactical intelligence currently restricted. Signal interference detected.");
        } finally {
            setLoadingBriefing(false);
        }
    };

    // Determine what title to show at the top of the risk panel
    let displayTitle = area || county?.name || 'National Sector';
    if (selectedHotspot) displayTitle = selectedHotspot.title;
    if (selectedCustomPin) displayTitle = `COORD [${selectedCustomPin.lat.toFixed(2)}, ${selectedCustomPin.lng.toFixed(2)}]`;

    const isCritical = !!selectedHotspot || !!selectedCustomPin || areaRiskEntry?.risk_category === 'High';

    return (
        <div className="flex flex-col h-full bg-white dark:bg-surface-raised transition-colors overflow-hidden">
            {/* Intel Tabs */}
            <div className="flex border-b border-slate-100 dark:border-surface-border">
                <button
                    onClick={() => setMode('risk')}
                    className={`flex-1 py-3 px-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5
                        ${mode === 'risk'
                            ? 'bg-white dark:bg-surface text-flood-600 border-b-2 border-flood-600'
                            : 'bg-slate-50/50 dark:bg-surface-border/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <Info size={11} />
                    Risk
                </button>
                <button
                    onClick={() => setMode('briefing')}
                    className={`flex-1 py-3 px-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5
                        ${mode === 'briefing'
                            ? 'bg-white dark:bg-surface text-flood-600 border-b-2 border-flood-600'
                            : 'bg-slate-50/50 dark:bg-surface-border/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <AlertTriangle size={11} />
                    Briefing
                </button>
                <button
                    onClick={() => setMode('chat')}
                    className={`flex-1 py-3 px-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5
                        ${mode === 'chat'
                            ? 'bg-white dark:bg-surface text-flood-600 border-b-2 border-flood-600'
                            : 'bg-slate-50/50 dark:bg-surface-border/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <Sparkles size={11} />
                    AI Chat
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {mode === 'risk' && (
                    <div className="h-full overflow-y-auto p-5 custom-scrollbar space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                        {/* Selected Area/County/Hotspot Header */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant={isCritical ? 'danger' : 'warning'} className="text-[8px] h-4 font-black">
                                    {selectedHotspot ? 'ACTIVE INCIDENT' : selectedCustomPin ? 'TARGET ACQUIRED' : (areaRiskEntry?.risk_category || 'Normal')}
                                </Badge>
                                <h2 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    {displayTitle}
                                </h2>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {selectedHotspot
                                    ? `Loc: ${selectedHotspot.area}, ${selectedHotspot.county}`
                                    : selectedCustomPin
                                        ? 'Hyper-Local Reconnaissance'
                                        : 'Comprehensive Risk Analysis'}
                            </p>
                        </div>

                        {/* Risk Metric Card - Hide if we are specifically looking at a hotspot incident or custom pin */}
                        {!selectedHotspot && !selectedCustomPin && (
                            <div className="p-4 bg-slate-50 dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm shadow-sm transition-colors">
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Flood Probability</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                                        {areaRiskEntry?.flood_probability || county?.flood_probability || 0}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 dark:bg-surface-border/30 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${(areaRiskEntry?.flood_probability || county?.flood_probability || 0) > 70 ? 'bg-danger-500' : 'bg-warning-500'}`}
                                        style={{ width: `${areaRiskEntry?.flood_probability || county?.flood_probability || 0}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Sectors List (if showing County and NOT a hotspot/pin) */}
                        {!area && !selectedHotspot && !selectedCustomPin && topAreas?.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">High Risk Sectors</h3>
                                <div className="space-y-1.5">
                                    {topAreas.map(sub => (
                                        <div key={sub.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-surface border border-slate-100 dark:border-surface-border rounded-sm hover:border-flood-500/50 transition-all cursor-default shadow-sm">
                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{sub.name}</span>
                                            <span className={`text-[10px] font-black ${sub.flood_probability > 75 ? 'text-danger-500' : 'text-warning-500'}`}>
                                                {sub.flood_probability}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-slate-100 dark:border-surface-border space-y-2">
                            <button
                                onClick={() => setMode('briefing')}
                                className="w-full py-2.5 px-4 bg-flood-600 hover:bg-flood-700 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
                            >
                                <AlertTriangle size={13} />
                                Generate Tactical Brief
                            </button>

                            {/* Show Drone Deploy Button ONLY for Custom Pins */}
                            {selectedCustomPin && (
                                <button
                                    onClick={onDeployDrone}
                                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
                                >
                                    <Sparkles size={13} />
                                    Launch Recon Uplink
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {mode === 'briefing' && (
                    <div className={`h-full overflow-y-auto p-5 custom-scrollbar animate-in fade-in slide-in-from-right-2 duration-300 ${selectedHotspot ? 'bg-red-50/30 dark:bg-red-950/10' : 'bg-slate-50/50 dark:bg-surface/50'}`}>
                        <div className="flex items-center gap-2 mb-4">
                            <Bot size={14} className={selectedHotspot ? 'text-red-500 animate-pulse' : 'text-flood-600'} />

                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Active Intelligence Briefing</h3>
                        </div>

                        {loadingBriefing ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-3 bg-slate-200 dark:bg-surface-border rounded-sm w-full" />
                                <div className="h-4 bg-slate-200 dark:bg-surface-border rounded-sm w-[90%]" />
                                <div className="h-4 bg-slate-200 dark:bg-surface-border rounded-sm w-[95%]" />
                            </div>
                        ) : (
                            <div className="p-4 bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm shadow-md transition-all">
                                <div className="prose-tactical dark:prose-invert italic">
                                    <ReactMarkdown>{briefing || 'Awaiting telemetry...'}</ReactMarkdown>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-surface-border flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Verified by GPT-4o</span>
                                    <span>Real-time</span>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 p-4 border border-dashed border-slate-200 dark:border-surface-border rounded-sm bg-white/50 dark:bg-surface/50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Decision Support</p>
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleDecisionSupport(`What are the safest and fastest evacuation routes for civilians in ${area || county?.name || 'this sector'}? Include road access, bridge capacity concerns, and any flooding obstacles.`)}
                                    className="w-full py-2.5 bg-slate-100 dark:bg-surface hover:bg-white dark:hover:bg-surface-raised border border-slate-200 dark:border-surface-border rounded-sm text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 transition-all text-center shadow-sm"
                                >
                                    Analyze Evacuation Strategy
                                </button>
                                <button
                                    onClick={() => handleDecisionSupport(`For ${area || county?.name || 'this sector'}: What emergency logistics are needed right now? List shelter capacity requirements, food and water supplies, medical resources, and recommended deployment priorities.`)}
                                    className="w-full py-2.5 bg-slate-100 dark:bg-surface hover:bg-white dark:hover:bg-surface-raised border border-slate-200 dark:border-surface-border rounded-sm text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 transition-all text-center shadow-sm"
                                >
                                    Request Logistics Inventory
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'chat' && (
                    <div className="h-full animate-in fade-in duration-300">
                        <AIChatPanel
                            county={selectedHotspot?.county || (selectedCustomPin ? "Target Zone" : county?.name) || 'National'}
                            area={selectedHotspot ? `${selectedHotspot.area} (${selectedHotspot.title})` : (selectedCustomPin ? `Lat ${selectedCustomPin.lat.toFixed(2)}, Lng ${selectedCustomPin.lng.toFixed(2)}` : area) || 'General'}
                            prefillMessage={prefillMessage}
                            onClose={onClose}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
