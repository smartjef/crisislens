import React, { useState, useEffect } from 'react';
import { X, Crosshair, Map, Activity, Battery, Signal, Camera, AlertTriangle } from 'lucide-react';

export default function DroneReconModal({ isOpen, onClose, coordinates }) {
    const [status, setStatus] = useState('connecting'); // 'connecting', 'live'
    const [alt, setAlt] = useState(380.5);
    const [heading, setHeading] = useState(144.2);
    const [isThermal, setIsThermal] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);

    const handleSnapshot = () => {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 150);
    };

    // Simulated Uplink
    useEffect(() => {
        if (isOpen) {
            setStatus('connecting');
            const timer = setTimeout(() => {
                setStatus('live');
            }, 2500); // 2.5s connection simulation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Randomize telemetry slightly
    useEffect(() => {
        if (status !== 'live') return;
        const interval = setInterval(() => {
            setAlt(prev => prev + (Math.random() * 2 - 1));
            setHeading(prev => prev + (Math.random() * 0.5 - 0.25));
        }, 500);
        return () => clearInterval(interval);
    }, [status]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 font-mono">
            {/* Modal Container */}
            <div className="relative w-full h-full max-w-6xl max-h-[800px] bg-slate-950 border border-slate-700/50 rounded-lg shadow-2xl overflow-hidden flex flex-col">

                {/* Header / Top Bar */}
                <div className="h-12 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900 shadow-sm z-50">
                    <div className="flex items-center gap-6 text-green-500 text-xs">
                        <span className="flex items-center gap-2 font-bold tracking-widest">
                            <Signal size={14} className={status === 'live' ? "animate-pulse" : "opacity-50"} />
                            UPLINK: {status === 'live' ? 'STABLE' : 'CONNECTING...'}
                        </span>
                        <span className="flex items-center gap-2 opacity-70 tracking-widest">
                            <Battery size={14} />
                            PWR: 84%
                        </span>
                        <span className="text-slate-500 tracking-widest">
                            ID: UAV-RECON-77
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                        title="Close Tactical Feed"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Feed Area */}
                <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
                    {status === 'connecting' ? (
                        <div className="text-green-500 font-mono flex flex-col items-center">
                            <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mb-6" />
                            <p className="animate-pulse text-lg tracking-widest">ESTABLISHING SECURE SATELLITE UPLINK...</p>
                            <p className="opacity-50 text-sm mt-3 font-medium">ENCRYPTING FEED TO COORD [{coordinates?.lat?.toFixed(4)}, {coordinates?.lng?.toFixed(4)}]</p>
                        </div>
                    ) : (
                        <div className="w-full h-full relative group">
                            {/* The Image (panning slowly via CSS) */}
                            <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">
                                <img
                                    src="/images/synthetic_drone_flood.jpg"
                                    alt="Live Drone Feed"
                                    className={`w-full h-full object-cover scale-[1.12] opacity-80 tactical-drone-pan transition-all duration-1000 ${isThermal ? 'invert sepia saturate-[3] hue-rotate-[320deg] contrast-[1.5]' : ''
                                        }`}
                                />
                                {isFlashing && (
                                    <div className="absolute inset-0 bg-white z-[100] opacity-100 mix-blend-screen" />
                                )}
                            </div>

                            {/* Vignette & Scanline Overlay */}
                            <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)]" />
                            <div className="absolute inset-x-0 h-1 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.6)] z-20 tactical-scanline" />

                            {/* HUD Elements */}
                            <div className="absolute inset-0 z-30 pointer-events-none p-8 flex flex-col justify-between">
                                {/* Top HUD row */}
                                <div className="flex justify-between items-start text-green-400 text-sm font-bold tracking-wider">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-red-500 mb-4 bg-black/40 px-3 py-1 rounded w-fit border border-red-500/30">
                                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                                            REC
                                        </div>
                                        <div className="bg-black/50 px-3 py-1.5 backdrop-blur-sm rounded border border-green-500/30">
                                            LAT: {coordinates?.lat?.toFixed(6)}
                                        </div>
                                        <div className="bg-black/50 px-3 py-1.5 backdrop-blur-sm rounded border border-green-500/30">
                                            LNG: {coordinates?.lng?.toFixed(6)}
                                        </div>
                                    </div>
                                    <div className="text-right space-y-2">
                                        <div className="bg-black/50 px-3 py-1.5 backdrop-blur-sm rounded border border-green-500/30">
                                            ALT: {alt.toFixed(1)}m
                                        </div>
                                        <div className="bg-black/50 px-3 py-1.5 backdrop-blur-sm rounded border border-green-500/30">
                                            HDG: {heading.toFixed(1)}°
                                        </div>
                                        <div className="bg-black/50 px-3 py-1.5 backdrop-blur-sm rounded border border-green-500/30">
                                            SPD: 24.5 m/s
                                        </div>
                                    </div>
                                </div>

                                {/* Center Crosshair */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70 flex items-center justify-center">
                                    <Crosshair size={140} strokeWidth={1} className="text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                                    <div className="absolute w-20 h-20 border border-t-green-500 border-r-green-500 border-b-transparent border-l-transparent rounded-full animate-[spin_6s_linear_infinite]" />
                                    <div className="absolute w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                </div>

                                {/* Artificial Target Boxes (Animated) */}
                                <div className="absolute top-[35%] left-[40%] w-24 h-24 border-2 border-green-500/60 bg-green-500/10 animate-[pulse_3s_ease-in-out_infinite] shadow-[inset_0_0_10px_rgba(34,197,94,0.2)]">
                                    <span className="absolute -top-5 left-0 text-[10px] bg-green-500 text-black px-1.5 py-0.5 font-bold">OBJ-CIVILIAN</span>
                                </div>
                                <div className="absolute top-[60%] left-[65%] w-16 h-16 border-2 border-orange-500/60 bg-orange-500/10 shadow-[inset_0_0_10px_rgba(249,115,22,0.2)]">
                                    <span className="absolute -top-5 left-0 text-[10px] bg-orange-500 text-black px-1.5 py-0.5 font-bold">THERMAL: HIGH</span>
                                    <div className="w-full h-full border border-orange-500 animate-[ping_2s_ease-out_infinite]" />
                                </div>

                                {/* Bottom HUD row */}
                                <div className="flex justify-between items-end text-green-400 text-xs font-mono">
                                    <div className="w-64">
                                        <div className="flex justify-between mb-1.5">
                                            <span>GIMBAL PITCH</span>
                                            <span>-45.0°</span>
                                        </div>
                                        <div className="h-1.5 bg-green-900/50 rounded-full">
                                            <div className="h-full bg-green-500 rounded-full w-[80%] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                        </div>
                                    </div>
                                    <div>
                                        <span className="bg-red-500/20 px-3 py-1.5 text-red-400 border border-red-500/50 rounded flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                            <AlertTriangle size={14} />
                                            ELEVATION CRITICAL ZONE
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Hardware Controls */}
                <div className="h-16 border-t border-slate-800 bg-slate-900 flex items-center justify-between px-6 z-50 shadow-inner">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSnapshot}
                            className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-300 hover:text-white px-4 py-2 rounded border border-slate-700 hover:border-slate-500 bg-slate-800 hover:bg-slate-700 transition-all active:scale-95"
                        >
                            <Camera size={14} /> CAPTURE SNAPSHOT
                        </button>
                        <button
                            onClick={() => setIsThermal(!isThermal)}
                            className={`flex items-center gap-2 text-xs font-bold tracking-widest px-4 py-2 rounded border transition-all active:scale-95 ${isThermal
                                    ? 'text-orange-400 border-orange-500/50 bg-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                                    : 'text-slate-300 hover:text-white border-slate-700 hover:border-slate-500 bg-slate-800 hover:bg-slate-700'
                                }`}
                        >
                            <Map size={14} /> {isThermal ? 'DISABLE THERMAL' : 'ENABLE THERMAL'}
                        </button>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 tracking-widest font-bold">
                        <span>DATA LINK ACTIVE</span>
                        <div className="flex gap-1" title="Signal Strength">
                            <div className="w-1.5 h-2 bg-green-500 rounded-[1px]" />
                            <div className="w-1.5 h-3 bg-green-500 rounded-[1px]" />
                            <div className="w-1.5 h-4 bg-green-500 rounded-[1px]" />
                            <div className="w-1.5 h-5 bg-green-500 rounded-[1px]" />
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .tactical-scanline {
                    animation: scan 4s linear infinite;
                }
                .tactical-drone-pan {
                    transform-origin: center;
                    animation: pan 25s ease-in-out infinite alternate;
                }
                @keyframes scan {
                    0% { top: -10%; }
                    100% { top: 110%; }
                }
                @keyframes pan {
                    0% { transform: scale(1.1) translate(0, 0); }
                    25% { transform: scale(1.15) translate(-1%, 2%); }
                    50% { transform: scale(1.12) translate(1%, -1%); }
                    75% { transform: scale(1.18) translate(-0.5%, -1.5%); }
                    100% { transform: scale(1.1) translate(0, 0); }
                }
            `}</style>
        </div>
    );
}
