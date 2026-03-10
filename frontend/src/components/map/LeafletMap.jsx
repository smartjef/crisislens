import React, { useEffect } from "react";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { getFloodFillColor } from "../../utils/floodColours";

export default function LeafletMap({
    focusCountiesGeoJSON,
    focusAreasGeoJSON,
    riskByCounty,
    areaRiskByKey,
    onCountyClick,
    onAreaClick,
    mapInstance,
    setMapInstance,
    selectedCounties = [],
    selectedArea = null,
}) {
    // Automatically fit map bounds when county selection changes
    useEffect(() => {
        if (!mapInstance) return;

        if (selectedCounties.length === 0) {
            // Revert to national/regional overview
            mapInstance.setView([-0.2, 34.6], 9);
            return;
        }

        // Combine bounds of all selected counties
        const featuresToBound = focusCountiesGeoJSON.features.filter(f =>
            selectedCounties.includes(f.properties.adm1_name)
        );

        if (featuresToBound.length > 0) {
            const tempLayer = L.geoJSON({ type: "FeatureCollection", features: featuresToBound });
            mapInstance.fitBounds(tempLayer.getBounds(), { padding: [30, 30], maxZoom: 10 });
        }
    }, [selectedCounties, mapInstance, focusCountiesGeoJSON]);

    // County outlines — transparent fill so sub-county color shading shows through if selected.
    // If no specific county is selected, tint them slightly so the user knows they are clickable.
    const geoJsonStyle = (feature) => {
        const isSelected = selectedCounties.includes(feature.properties.adm1_name);
        const noSelection = selectedCounties.length === 0;

        return {
            fillColor: isSelected ? "transparent" : (noSelection ? "#e2e8f0" : "#f8fafc"),
            fillOpacity: isSelected ? 0 : (noSelection ? 0.3 : 0.1),
            color: "#0f172a",
            weight: isSelected ? 3 : 1.5,
            dashArray: "6 4",
        };
    };

    // Sub-county polygons — color-interpolated from pale blue (low) to deep navy (high).
    const areaGeoJsonStyle = (feature) => {
        const areaName = feature.properties.adm2_name;
        const countyName = feature.properties.adm1_name;
        const risk = areaRiskByKey[`${countyName}::${areaName}`];
        const isSelected = areaName === selectedArea;

        return {
            fillColor: getFloodFillColor(risk?.riskPercent || 40),
            fillOpacity: isSelected ? 0.95 : 0.78,
            color: isSelected ? "#facc15" : "#1e3a8a",
            weight: isSelected ? 3 : 1,
        };
    };

    // Filter subcounties so we ONLY draw them for the currently clicked counties.
    const filteredAreasGeoJSON = {
        ...focusAreasGeoJSON,
        features: focusAreasGeoJSON.features.filter(
            (f) => selectedCounties.includes(f.properties.adm1_name)
        )
    };

    return (
        <div className="h-[500px] w-full rounded-sm overflow-hidden border border-slate-200 dark:border-surface-border relative z-0">
            <MapContainer
                center={[-0.2, 34.6]}
                zoom={9}
                scrollWheelZoom
                className="h-full w-full"
                ref={setMapInstance}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* County outlines for the 3 Lake Victoria focus counties */}
                <GeoJSON
                    key={`counties-${Object.keys(riskByCounty || {}).length}-${selectedCounties.join(",")}`}
                    data={focusCountiesGeoJSON}
                    style={geoJsonStyle}
                    onEachFeature={(feature, layer) => {
                        const countyName = feature.properties.adm1_name;
                        const risk = riskByCounty[countyName];
                        const riskLabel = risk?.riskType === "flood" ? "Flood" : "Drought";
                        const percentage = risk ? `${risk.riskPercent}% affected` : "Data unavailable";

                        // We only show the county tooltip if we aren't already zoomed into it entirely
                        if (!selectedCounties.includes(countyName)) {
                            layer.bindTooltip(
                                `<strong>${countyName}</strong><br/>&#128167; ${riskLabel} &middot; ${percentage} <br/><span style="font-size:0.8em; color:#666;">Click to view Sub-Counties</span>`,
                                { sticky: true }
                            );
                        }

                        // Just pass the name back up, MapPage handles the math bounds now if it wants or LeafletMap effect handles it
                        layer.on({
                            click: () => onCountyClick(countyName),
                        });
                    }}
                />

                {/* Draw sub-county polygons ONLY for the selected counties */}
                {selectedCounties.length > 0 && (
                    <GeoJSON
                        key={`areas-${selectedCounties.join(",")}-${Object.keys(areaRiskByKey || {}).length}-${selectedArea}`}
                        data={filteredAreasGeoJSON}
                        style={areaGeoJsonStyle}
                        onEachFeature={(feature, layer) => {
                            const areaName = feature.properties.adm2_name;
                            const countyName = feature.properties.adm1_name;
                            const risk = areaRiskByKey[`${countyName}::${areaName}`];

                            const percentage = risk?.riskPercent ? `${risk.riskPercent}% affected` : "Data unavailable";

                            // Always bind tooltip for subcounties
                            layer.bindTooltip(
                                `<strong>${areaName}</strong><br/>Flood risk: ${percentage}`,
                                { sticky: true }
                            );
                            layer.on({
                                click: () => {
                                    onAreaClick(countyName, areaName);
                                    if (layer._map) {
                                        layer._map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 11 });
                                    }
                                }
                            });
                        }}
                    />
                )}
            </MapContainer>
        </div>
    );
}
