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
            // The Leaflet map uses riskPercent/riskType, so map our backend fields to that
            acc[county.name] = {
                ...county,
                riskPercent: county.flood_probability,
                riskType: "flood",
            };
            return acc;
        }, {});
    }, [counties]);

    const areaRiskByKey = useMemo(() => {
        // We need to map subCounties and figure out their parent county string to match GeoJSON properties.
        return subCounties.reduce((acc, area) => {
            // Find the parent county name using the county ID
            const parentCounty = counties.find(c => c.id === area.county || c.url?.endsWith(`/${area.county}/`));
            // Hack: For the Map GeoJSON mapping, we just assume the API subcounty name matches the GeoJSON name exactly.
            // E.g 'Kisumu::Nyando'
            // To correctly map, we should just let the API give us the names directly.
            // But if we don't know the parent county string exactly, we can just index by the area name if unique.

            // Since our API currently doesn't return parent County name in SubCountyListSerializer,
            // we'll try to guess it or rely on the frontend filtering logic. 
            // Actually, looking at the GeoJSON, the subcounty names are unique enough.
            // Wait, let's look at the GeoJSON: adm1_name is county, adm2_name is subcounty.
            // Let's create a map based on SubCounty API name.
            acc[area.name] = {
                ...area,
                riskPercent: area.flood_probability,
                riskType: "flood"
            };
            return acc;
        }, {});
    }, [subCounties, counties]);

    // Adjust areaRiskByKey to map directly by 'adm2_name' since the GeoJSON adm2 names 
    // are robust enough to match the seeded DB names.
    const robustAreaRiskByKey = useMemo(() => {
        const acc = {};
        kenyaAreas.features.forEach(f => {
            const areaName = f.properties.adm2_name;
            const countyName = f.properties.adm1_name;
            // Find the backend record that matches exactly the GeoJSON adm2_name
            const backendArea = subCounties.find(s => s.name === areaName);
            if (backendArea) {
                // Key it as County::Subcounty to be safe for LeafletMap
                acc[`${countyName}::${areaName}`] = {
                    ...backendArea,
                    riskPercent: backendArea.flood_probability,
                    riskType: "flood"
                };
            }
        });

        console.log("MAPPED GEOJSON Subcounties: ", Object.keys(acc));
        console.log("AVAILABLE API Subcounties: ", subCounties.map(s => s.name));
        return acc;
    }, [subCounties, kenyaAreas]);

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
            <div className="flex items-center justify-center p-8 h-full bg-slate-50">
                <ErrorCard message="Failed to load county data." onRetry={refetchCounties} />
            </div>
        );
    }

    if (countiesLoading) {
        return (
            <div className="flex h-full gap-4 p-4 bg-slate-50">
                <div className="flex-1 flex flex-col gap-4">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="flex-1 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-4 p-4 bg-slate-50 relative overflow-hidden">
            {/* Left side: Map and selectors */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Header/Legend bar */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Risk Map</h1>
                        <p className="text-sm text-slate-500">Live probabilities driven by backend real data.</p>
                    </div>
                    <MapLegend />
                </div>

                {/* The map wrapper */}
                <div className="flex-1 shadow-sm rounded-xl overflow-hidden bg-white border border-slate-200 p-2 relative z-0">
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

                {/* Bottom county selector pills */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        Focus Counties
                    </h3>
                    <CountySelector
                        counties={counties}
                        selectedCounties={selectedCounties}
                        onToggleCounty={handleCountyToggle}
                    />

                    {/* Sub-county dropdown filter when exactly 1 county is selected */}
                    {selectedCounties.length === 1 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                            <label className="text-sm font-semibold text-slate-600">Zoom to Area:</label>
                            <select
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                                value={selectedAreaName}
                                onChange={(e) => {
                                    setSelectedAreaName(e.target.value);
                                }}
                            >
                                <option value="">-- All Areas in {selectedCounties[0]} --</option>
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

            {/* Right side: Detail Panel (slides in if open) */}
            {/* On Desktop it's absolute so the map always gets full width, but panel obscures it playfully */}
            <div className={`
                fixed top-[64px] right-0 h-[calc(100vh-64px)] w-96 transform transition-transform duration-300 ease-in-out z-[100]
                ${isPanelOpen ? "translate-x-0" : "translate-x-full"}
                md:relative md:top-0 md:h-full md:z-10
            `}>
                {isPanelOpen && (
                    <div className="w-full h-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">
                        {subCountiesError ? (
                            <div className="h-full p-4">
                                <ErrorCard message="Failed to load sub-county data." onRetry={refetchSubCounties} />
                            </div>
                        ) : subCountiesLoading ? (
                            <div className="w-full h-full flex flex-col gap-4 p-6">
                                <Skeleton className="h-24 w-full rounded-xl" />
                                <Skeleton className="flex-1 w-full rounded-xl" />
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
    );
}
