import React, { useState, useMemo } from "react";
import useCounties from "../hooks/useCounties";
import useSubCountyRisk from "../hooks/useSubCountyRisk";
import Skeleton from "../components/ui/Skeleton";
import ErrorCard from "../components/ui/ErrorCard";
import LeafletMap from "../components/map/LeafletMap";
import CountySelector from "../components/map/CountySelector";
import MapLegend from "../components/map/MapLegend";
import IntelSidebar from "../components/tactical/IntelSidebar";
import DroneReconModal from "../components/tactical/DroneReconModal";

// Local GeoJSON files for boundaries 
import kenyaCountiesRaw from "../data/ken_admin1.geojson?raw";
import kenyaAreasRaw from "../data/ken_admin2.geojson?raw";

const kenyaCounties = JSON.parse(kenyaCountiesRaw);
const kenyaAreas = JSON.parse(kenyaAreasRaw);

// We still restrict map rendering to specific focus counties 
// to avoid loading down the UI with unused polygons
const FOCUS_COUNTY_NAMES = new Set(["Kisumu", "Siaya", "Homa Bay", "Nairobi", "Kiambu", "Machakos", "Kajiado"]);

const focusCountiesGeoJSON = {
    ...kenyaCounties,
    features: kenyaCounties.features.filter(
        (f) => FOCUS_COUNTY_NAMES.has(f.properties.adm1_name)
    )
};

const focusAreasGeoJSON = {
    ...kenyaAreas,
    features: kenyaAreas.features.filter(
        (f) => FOCUS_COUNTY_NAMES.has(f.properties.adm1_name)
    )
};

export default function MapPage() {
    const [selectedCounties, setSelectedCounties] = useState(["Nairobi", "Kisumu", "Siaya", "Homa Bay"]);
    const [selectedAreaName, setSelectedAreaName] = useState("");
    const [selectedHotspot, setSelectedHotspot] = useState(null); // Track active hotspot
    const [selectedCustomPin, setSelectedCustomPin] = useState(null); // NEW: Track custom dropped pin
    const [isSimulating, setIsSimulating] = useState(false); // Track simulation state
    const [mapInstance, setMapInstance] = useState(null);
    const [isDroneModalOpen, setIsDroneModalOpen] = useState(false); // Global Drone UI

    const { data: allCounties, loading: countiesLoading, error: countiesError, refetch: refetchCounties } = useCounties();

    // Ensure we only use counties from our focus set
    const counties = useMemo(() => {
        if (!allCounties) return [];
        return allCounties.filter(c => FOCUS_COUNTY_NAMES.has(c.name));
    }, [allCounties]);

    // Figure out which county should drive the right-side Panel.
    // If a hotspot, area, or exactly one county is selected, that drives the panel.
    let panelCountyObj = null;
    if (selectedHotspot) {
        panelCountyObj = counties.find(c => c.name === selectedHotspot.county);
    } else if (selectedAreaName) {
        const feature = focusAreasGeoJSON.features.find(f => f.properties.adm2_name === selectedAreaName);
        if (feature) {
            panelCountyObj = counties.find(c => c.name === feature.properties.adm1_name);
        }
    } else if (selectedCounties.length === 1) {
        panelCountyObj = counties.find(c => c.name === selectedCounties[0]);
    }

    const { data: subCountiesData, loading: subCountiesLoading, error: subCountiesError, refetch: refetchSubCounties } = useSubCountyRisk();
    const subCounties = subCountiesData || [];

    // Map backend arrays into keyed lookups for the Leaflet component
    const riskByCounty = useMemo(() => {
        return counties.reduce((acc, county) => {
            acc[county.name] = {
                ...county,
                riskPercent: county.flood_probability,
                riskType: "flood",
            };
            return acc;
        }, {});
    }, [counties]);

    const robustAreaRiskByKey = useMemo(() => {
        const acc = {};
        kenyaAreas.features.forEach(f => {
            const areaName = f.properties.adm2_name;
            const countyName = f.properties.adm1_name;
            const backendArea = subCounties.find(s => s.name === areaName);
            if (backendArea) {
                acc[`${countyName}::${areaName}`] = {
                    ...backendArea,
                    riskPercent: backendArea.flood_probability,
                    riskType: "flood"
                };
            }
        });
        return acc;
    }, [subCounties]);

    const selectedAreaObj = subCounties.find(s => s.name === selectedAreaName);

    // Filter top subcounties for the panel
    const topAreas = useMemo(() => {
        if (!panelCountyObj) return [];
        const areasInCounty = kenyaAreas.features
            .filter(f => f.properties.adm1_name === panelCountyObj.name)
            .map(f => f.properties.adm2_name);

        return subCounties
            .filter(s => areasInCounty.includes(s.name))
            .sort((a, b) => b.flood_probability - a.flood_probability)
            .slice(0, 6);
    }, [panelCountyObj, subCounties]);

    const handleCountyToggle = (name) => {
        setSelectedCounties(prev => {
            if (prev.includes(name)) {
                return prev.filter(c => c !== name);
            }
            return [...prev, name];
        });
        setSelectedAreaName("");
        setSelectedHotspot(null);
        setSelectedCustomPin(null);
    };

    const handleAreaClick = (countyName, areaName) => {
        if (!selectedCounties.includes(countyName)) {
            setSelectedCounties(prev => [...prev, countyName]);
        }
        setSelectedAreaName(areaName);
        setSelectedHotspot(null); // Clear hotspot if clicking a general area
        setSelectedCustomPin(null);
    };

    const handleHotspotClick = (hotspot) => {
        if (!selectedCounties.includes(hotspot.county)) {
            setSelectedCounties(prev => [...prev, hotspot.county]);
        }
        setSelectedAreaName(hotspot.area); // Implicitly select the area the hotspot is in
        setSelectedHotspot(hotspot);
        setSelectedCustomPin(null);

        // Auto-zoom map to hotspot
        if (mapInstance && hotspot.pos) {
            mapInstance.setView(hotspot.pos, 13, { animate: true });
        }
    };

    const handleCustomPinDrop = (latlng) => {
        setSelectedCustomPin(latlng);
        setSelectedHotspot(null); // Explicitly clear any active hotspots
        setIsDroneModalOpen(false); // Make sure the modal doesn't persist if they drop a new pin
        // We don't automatically clear area/county here, as the pin might be inside them,
        // so the user still has broader context.
    };

    // Animate map center if pin is dropped near edges (optional UX)
    // Left as future enhancement if needed.

    const isPanelOpen = !!panelCountyObj || !!selectedCustomPin;

    if (countiesError) {
        return (
            <div className="flex items-center justify-center p-8 h-full bg-slate-50 dark:bg-surface">
                <ErrorCard message="Failed to load county data." onRetry={refetchCounties} />
            </div>
        );
    }

    if (countiesLoading) {
        return (
            <div className="flex h-full gap-3 p-3 bg-white dark:bg-surface transition-colors duration-200">
                <div className="flex-1 flex flex-col gap-3">
                    <Skeleton className="h-14 w-full rounded-sm" />
                    <Skeleton className="flex-1 w-full rounded-sm" />
                    <Skeleton className="h-20 w-full rounded-sm" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-slate-50 dark:bg-surface overflow-hidden transition-colors duration-200">
            {/* 1. LEFT CONSOLE: Tactical Controls & Alerts */}
            <aside className="w-72 flex flex-col border-r border-slate-200 dark:border-surface-border bg-white dark:bg-surface transition-colors">
                <div className="p-4 border-b border-slate-100 dark:border-surface-border">
                    <h1 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">Tactical Hub</h1>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest leading-none">Regional Monitoring</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {/* Focus Selector */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Jurisdictions</h3>
                            <button onClick={() => setSelectedCounties(["Nairobi", "Kisumu", "Siaya", "Homa Bay", "Kiambu", "Machakos", "Kajiado"])} className="text-[8px] font-bold text-flood-600 uppercase hover:underline">Select All</button>
                        </div>
                        <CountySelector
                            counties={counties}
                            selectedCounties={selectedCounties}
                            onToggleCounty={handleCountyToggle}
                        />
                    </div>

                    {/* Quick Sector Zoom */}
                    {selectedCounties.length === 1 && (
                        <div className="p-3 bg-slate-50 dark:bg-surface-border/5 border border-slate-200 dark:border-surface-border rounded-sm">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Sector Zoom</label>
                            <select
                                className="w-full px-2 py-1.5 bg-white dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm text-[10px] font-black text-slate-700 dark:text-slate-200 outline-none focus:border-flood-500 transition-all cursor-pointer uppercase"
                                value={selectedAreaName}
                                onChange={(e) => setSelectedAreaName(e.target.value)}
                            >
                                <option value="">-- All Sectors --</option>
                                {subCounties
                                    .filter(s => kenyaAreas.features.some(f => f.properties.adm2_name === s.name && f.properties.adm1_name === selectedCounties[0]))
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(area => (
                                        <option key={area.id} value={area.name}>{area.name}</option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {/* Simulation Controls */}
                    <div className="p-3 bg-white dark:bg-surface-border/10 border border-slate-200 dark:border-surface-border rounded-sm relative overflow-hidden">
                        {isSimulating && (
                            <div className="absolute inset-0 bg-flood-500/10 dark:bg-flood-500/20 animate-pulse pointer-events-none" />
                        )}
                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 relative z-10">Predictive Modeling</h3>
                        <button
                            onClick={() => setIsSimulating(!isSimulating)}
                            className={`w-full py-2.5 px-4 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 shadow-sm
                                ${isSimulating
                                    ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400 shadow-inner'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 dark:bg-surface dark:hover:bg-surface-raised dark:border-surface-border dark:text-slate-300'}`}
                        >
                            <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
                            {isSimulating ? 'Halt Simulation' : 'Run 48hr Flood Path'}
                        </button>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-surface-border bg-slate-50/50 dark:bg-surface-border/5">
                    <MapLegend />
                </div>
            </aside>

            {/* 2. CENTER CANVAS: GIS Map */}
            <main className="flex-1 relative flex flex-col min-w-0">
                <div className="flex-1 relative z-0">
                    <LeafletMap
                        focusCountiesGeoJSON={focusCountiesGeoJSON}
                        focusAreasGeoJSON={focusAreasGeoJSON}
                        riskByCounty={riskByCounty}
                        areaRiskByKey={robustAreaRiskByKey}
                        onCountyClick={handleCountyToggle}
                        onAreaClick={handleAreaClick}
                        onHotspotClick={handleHotspotClick}
                        onCustomPinDrop={handleCustomPinDrop}
                        mapInstance={mapInstance}
                        setMapInstance={setMapInstance}
                        selectedCounties={selectedCounties}
                        selectedArea={selectedAreaName}
                        isSimulating={isSimulating}
                        selectedCustomPin={selectedCustomPin}
                    />
                </div>
            </main>

            {/* 3. RIGHT SIDEBAR: Intel & Detailed Risk */}
            <aside className={`
                w-80 border-l border-slate-200 dark:border-surface-border transition-all duration-300 transform bg-white dark:bg-surface
                ${isPanelOpen ? "translate-x-0" : "translate-x-full fixed right-0 top-0 h-full"}
            `}>
                {isPanelOpen && (
                    <IntelSidebar
                        county={panelCountyObj}
                        area={selectedAreaName}
                        areaRiskEntry={selectedAreaObj}
                        selectedHotspot={selectedHotspot}
                        selectedCustomPin={selectedCustomPin} // Pass custom pin to sidebar
                        topAreas={topAreas}
                        onDeployDrone={() => setIsDroneModalOpen(true)}
                        onClose={() => {
                            setSelectedAreaName("");
                            setSelectedHotspot(null);
                            setSelectedCustomPin(null);
                        }}
                    />
                )}
            </aside>

            {/* Global Drone Recon Modal */}
            <DroneReconModal
                isOpen={isDroneModalOpen}
                onClose={() => setIsDroneModalOpen(false)}
                coordinates={selectedCustomPin}
            />
        </div>
    );
}
