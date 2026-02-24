import React from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { getFloodFillColor } from "../../utils/floodColours";

export default function LeafletMap({
    focusCountiesGeoJSON,
    focusAreasGeoJSON,
    riskByCounty,
    areaRiskByKey,
    onCountyClick,
    onAreaClick,
    setMapInstance,
}) {
    // County outlines — transparent fill so sub-county color shading shows through.
    const geoJsonStyle = () => ({
        fillColor: "transparent",
        fillOpacity: 0,
        color: "#0f172a",
        weight: 2.5,
        dashArray: "6 4",
    });

    // Sub-county polygons — color-interpolated from pale blue (low) to deep navy (high).
    const areaGeoJsonStyle = (feature) => {
        const areaName = feature.properties.adm2_name;
        const countyName = feature.properties.adm1_name;
        const risk = areaRiskByKey[`${countyName}::${areaName}`];

        return {
            fillColor: getFloodFillColor(risk?.riskPercent || 40),
            fillOpacity: 0.78,
            color: "#1e3a8a",
            weight: 1,
        };
    };

    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
            <MapContainer
                center={[-0.2, 34.6]}
                zoom={9}
                scrollWheelZoom
                className="h-full w-full"
                whenCreated={setMapInstance}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* County outlines for the 3 Lake Victoria focus counties */}
                <GeoJSON
                    key={`counties-${riskByCounty ? "loaded" : "loading"}`}
                    data={focusCountiesGeoJSON}
                    style={geoJsonStyle}
                    onEachFeature={(feature, layer) => {
                        const countyName = feature.properties.adm1_name;
                        const risk = riskByCounty[countyName];
                        const riskLabel = risk?.riskType === "flood" ? "Flood" : "Drought";
                        const percentage = risk ? `${risk.riskPercent}% affected` : "N/A";

                        layer.bindTooltip(
                            `<strong>${countyName}</strong><br/>&#128167; ${riskLabel} &middot; ${percentage}`,
                            { sticky: true }
                        );
                        layer.on({
                            click: () => onCountyClick(countyName, layer.getBounds()),
                        });
                    }}
                />
                {/* All 21 sub-county polygons across the 3 focus counties */}
                <GeoJSON
                    key={`areas-focus-${areaRiskByKey ? "loaded" : "loading"}`}
                    data={focusAreasGeoJSON}
                    style={areaGeoJsonStyle}
                    onEachFeature={(feature, layer) => {
                        const areaName = feature.properties.adm2_name;
                        const countyName = feature.properties.adm1_name;
                        const risk = areaRiskByKey[`${countyName}::${areaName}`];
                        const percentage = risk ? `${risk.riskPercent}% affected` : "N/A";

                        layer.bindTooltip(
                            `<strong>${areaName}</strong><br/>Flood risk: ${percentage}`,
                            { sticky: true }
                        );
                        layer.on({
                            click: () => onAreaClick(countyName, areaName),
                        });
                    }}
                />
            </MapContainer>
        </div>
    );
}
