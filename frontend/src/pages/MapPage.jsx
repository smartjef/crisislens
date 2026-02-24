import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
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
    const [counties, setCounties] = useState([]);
    const [subCounties, setSubCounties] = useState([]);
    const [selectedCountyName, setSelectedCountyName] = useState("Kisumu");
    const [selectedAreaName, setSelectedAreaName] = useState("");
    const [mapInstance, setMapInstance] = useState(null);

    // Fetch live risk data from the backend
    useEffect(() => {
        async function fetchData() {
            try {
                const [countyRes, subRes] = await Promise.all([
                    axios.get("http://localhost:8000/api/counties/"),
                    axios.get("http://localhost:8000/api/sub-counties/")
                ]);

                // Ensure we only use counties from our focus set
                const focusData = countyRes.data.filter(c => FOCUS_COUNTY_NAMES.has(c.name));
                setCounties(focusData);
                setSubCounties(subRes.data);
            } catch (err) {
                console.error("Error fetching map risk data:", err);
            }
        }
        fetchData();
    }, []);

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

    // Adjust areaRiskByKey so it uses `${countyName}::${areaName}` to be extremely robust like before.
    const robustAreaRiskByKey = useMemo(() => {
        const acc = {};
        kenyaAreas.features.forEach(f => {
            const areaName = f.properties.adm2_name;
            const countyName = f.properties.adm1_name;
            // Find the backend record that matches exactly
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

    const selectedCountyObj = counties.find(c => c.name === selectedCountyName);
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
                    <SubCountyPanel
                        county={selectedCountyObj}
                        areaRiskEntry={selectedAreaObj}
                        topAreas={topAreas}
                        onClose={() => setSelectedCountyName("")}
                    />
                </div>
            )}
        </div>
    );
}
