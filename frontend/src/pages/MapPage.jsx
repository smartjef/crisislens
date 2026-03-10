import React, { useState, useMemo } from "react";
import useCounties from "../hooks/useCounties";
import useSubCountyRisk from "../hooks/useSubCountyRisk";
import Skeleton from "../components/ui/Skeleton";
import ErrorCard from "../components/ui/ErrorCard";
import LeafletMap from "../components/map/LeafletMap";
import CountySelector from "../components/map/CountySelector";
import SubCountyPanel from "../components/map/SubCountyPanel";
import MapLegend from "../components/map/MapLegend";

// Local GeoJSON files for boundaries 
import kenyaCountiesRaw from "../data/ken_admin1.geojson?raw";
import kenyaAreasRaw from "../data/ken_admin2.geojson?raw";

const kenyaCounties = JSON.parse(kenyaCountiesRaw);
const kenyaAreas = JSON.parse(kenyaAreasRaw);

// We still restrict map rendering to specific focus counties 
// to avoid loading down the UI with unused polygons
const FOCUS_COUNTY_NAMES = new Set(["Kisumu", "Siaya", "Homa Bay"]);

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
    const [selectedCounties, setSelectedCounties] = useState(["Kisumu", "Siaya", "Homa Bay"]);
    const [selectedAreaName, setSelectedAreaName] = useState("");
    const [mapInstance, setMapInstance] = useState(null);

    const { data: allCounties, loading: countiesLoading, error: countiesError, refetch: refetchCounties } = useCounties();

    // Ensure we only use counties from our focus set
    const counties = useMemo(() => {
        if (!allCounties) return [];
        return allCounties.filter(c => FOCUS_COUNTY_NAMES.has(c.name));
    }, [allCounties]);

    // Figure out which county should drive the right-side Panel.
    // If an area is selected, its parent county drives it. Otherwise, if EXACTLY ONE county is selected, that county drives it.
    let panelCountyObj = null;
    if (selectedAreaName) {
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
    };

    const handleAreaClick = (countyName, areaName) => {
        if (!selectedCounties.includes(countyName)) {
            setSelectedCounties(prev => [...prev, countyName]);
        }
        setSelectedAreaName(areaName);
    };

    const isPanelOpen = !!panelCountyObj;

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
        <div className="flex h-full gap-3 p-3 bg-white dark:bg-surface relative overflow-hidden transition-colors duration-200">
            {/* Left side: Map and selectors */}
            <div className="flex-1 flex flex-col gap-3">
                {/* Header/Legend bar - Highly Compact */}
                <div className="flex justify-between items-center bg-white dark:bg-surface-raised p-3 rounded-sm border border-slate-200 dark:border-surface-border transition-colors">
                    <div>
                        <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Tactical Risk Map</h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Lake Victoria Basin Monitoring Engine</p>
                    </div>
                    <MapLegend />
                </div>

                {/* The map wrapper */}
                <div className="flex-1 rounded-sm overflow-hidden bg-white dark:bg-surface-raised border border-slate-200 dark:border-surface-border p-1 relative z-0 transition-colors">
                    <LeafletMap
                        focusCountiesGeoJSON={focusCountiesGeoJSON}
                        focusAreasGeoJSON={focusAreasGeoJSON}
                        riskByCounty={riskByCounty}
                        areaRiskByKey={robustAreaRiskByKey}
                        onCountyClick={handleCountyToggle}
                        onAreaClick={handleAreaClick}
                        mapInstance={mapInstance}
                        setMapInstance={setMapInstance}
                        selectedCounties={selectedCounties}
                    />
                </div>

                {/* Bottom county selector pills - Compact */}
                <div className="bg-white dark:bg-surface-raised p-3 rounded-sm border border-slate-200 dark:border-surface-border transition-colors">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">
                        Operational Jurisdictions
                    </h3>
                    <CountySelector
                        counties={counties}
                        selectedCounties={selectedCounties}
                        onToggleCounty={handleCountyToggle}
                    />

                    {/* Sub-county dropdown filter - Compact */}
                    {selectedCounties.length === 1 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-surface-border flex items-center gap-3">
                            <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">Sector Zoom:</label>
                            <select
                                className="px-2 py-1 bg-slate-50 dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm text-[10px] font-black text-slate-700 dark:text-slate-200 outline-none focus:border-flood-500 transition-all cursor-pointer uppercase"
                                value={selectedAreaName}
                                onChange={(e) => {
                                    setSelectedAreaName(e.target.value);
                                }}
                            >
                                <option value="">-- All Sectors in {selectedCounties[0]} --</option>
                                {subCounties
                                    .filter(s => kenyaAreas.features.some(f => f.properties.adm2_name === s.name && f.properties.adm1_name === selectedCounties[0]))
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(area => (
                                        <option key={area.id} value={area.name}>{area.name}</option>
                                    ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Backdrop */}
            {isPanelOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] md:hidden animate-in fade-in duration-300"
                    onClick={() => setSelectedAreaName("")}
                />
            )}

            {/* Right side / Bottom: Detail Panel (slides in if open) - Compact width */}
            <div className={`
                fixed bottom-0 left-0 right-0 h-[60vh] w-full transform transition-transform duration-300 ease-out z-[100]
                ${isPanelOpen ? "translate-y-0" : "translate-y-full"}
                md:relative md:top-0 md:h-full md:w-80 md:translate-y-0
                md:transform-none
            `}>
                <div className={`
                    w-full h-full transform transition-transform duration-300 ease-out
                    md:transform md:transition-transform md:duration-300
                    ${isPanelOpen ? "md:translate-x-0" : "md:translate-x-full"}
                `}>
                    {isPanelOpen && (
                        <div className="w-full h-full rounded-t-sm md:rounded-sm overflow-hidden border-t border-x md:border border-slate-200 dark:border-surface-border bg-white dark:bg-surface-raised transition-colors">
                            {subCountiesError ? (
                                <div className="h-full p-4">
                                    <ErrorCard message="Failed to load sub-county data." onRetry={refetchSubCounties} />
                                </div>
                            ) : subCountiesLoading ? (
                                <div className="w-full h-full flex flex-col gap-3 p-4">
                                    <Skeleton className="h-20 w-full rounded-sm" />
                                    <Skeleton className="flex-1 w-full rounded-sm" />
                                </div>
                            ) : (
                                <SubCountyPanel
                                    county={panelCountyObj}
                                    areaRiskEntry={selectedAreaObj}
                                    topAreas={topAreas}
                                    onClose={() => setSelectedAreaName("")}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
