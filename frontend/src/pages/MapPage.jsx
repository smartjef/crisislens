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
    const [selectedCountyName, setSelectedCountyName] = useState("Kisumu");
    const [selectedAreaName, setSelectedAreaName] = useState("");
    const [mapInstance, setMapInstance] = useState(null);

    const { data: allCounties, loading: countiesLoading, error: countiesError, refetch: refetchCounties } = useCounties();

    // Ensure we only use counties from our focus set
    const counties = useMemo(() => {
        if (!allCounties) return [];
        return allCounties.filter(c => FOCUS_COUNTY_NAMES.has(c.name));
    }, [allCounties]);

    const selectedCountyObj = counties.find(c => c.name === selectedCountyName);

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
        if (!selectedCountyObj) return [];
        // We can filter by county property if the API provided it as an ID, 
        // but we can also just use the robustAreaRiskByKey keys to find matching areas.
        const areasInCounty = kenyaAreas.features
            .filter(f => f.properties.adm1_name === selectedCountyName)
            .map(f => f.properties.adm2_name);

        // Return backend SubCounty objects that match those names, sorted by risk
        return subCounties
            .filter(s => areasInCounty.includes(s.name))
            .sort((a, b) => b.flood_probability - a.flood_probability)
            .slice(0, 6);
    }, [selectedCountyName, subCounties]);


    const handleCountyClick = (name, bounds) => {
        setSelectedCountyName(name);
        setSelectedAreaName("");
        if (mapInstance && bounds) {
            mapInstance.fitBounds(bounds, { padding: [20, 20] });
        }
    };

    const handleAreaClick = (countyName, areaName) => {
        setSelectedCountyName(countyName);
        setSelectedAreaName(areaName);
    };

    const isPanelOpen = !!selectedCountyObj;

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
        <div className="flex h-full gap-4 p-4 bg-slate-50">
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
                <div className="flex-1 shadow-sm rounded-xl overflow-hidden bg-white border border-slate-200 p-2">
                    <LeafletMap
                        focusCountiesGeoJSON={focusCountiesGeoJSON}
                        focusAreasGeoJSON={focusAreasGeoJSON}
                        riskByCounty={riskByCounty}
                        areaRiskByKey={robustAreaRiskByKey}
                        onCountyClick={handleCountyClick}
                        onAreaClick={handleAreaClick}
                        setMapInstance={setMapInstance}
                    />
                </div>

                {/* Bottom county selector pills */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        Focus Counties
                    </h3>
                    <CountySelector
                        counties={counties}
                        selectedCounty={selectedCountyName}
                        onSelectCounty={(name) => {
                            setSelectedCountyName(name);
                            setSelectedAreaName("");
                        }}
                    />
                </div>
            </div>

            {/* Right side: Detail Panel (slides in if open) */}
            {isPanelOpen && (
                <div className="w-80 shrink-0">
                    {subCountiesError ? (
                        <div className="h-full">
                            <ErrorCard message="Failed to load sub-county data." onRetry={refetchSubCounties} />
                        </div>
                    ) : subCountiesLoading ? (
                        <div className="w-full h-full flex flex-col gap-4">
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <Skeleton className="flex-1 w-full rounded-xl" />
                        </div>
                    ) : (
                        <SubCountyPanel
                            county={selectedCountyObj}
                            areaRiskEntry={selectedAreaObj}
                            topAreas={topAreas}
                            onClose={() => setSelectedCountyName("")}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
