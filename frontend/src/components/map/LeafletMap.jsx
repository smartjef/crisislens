import React, { useEffect, useState } from "react";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, Marker, Tooltip, Circle, useMapEvents } from "react-leaflet";
import { getFloodFillColor } from "../../utils/floodColours";

export default function LeafletMap({
    focusCountiesGeoJSON,
    focusAreasGeoJSON,
    riskByCounty,
    areaRiskByKey,
    onCountyClick,
    onAreaClick,
    onHotspotClick,
    onCustomPinDrop,
    mapInstance,
    setMapInstance,
    selectedCounties = [],
    selectedArea = null,
    isSimulating = false,
    selectedCustomPin = null, // { lat: number, lng: number }
}) {
    // Automatically fit map bounds when county selection changes
    useEffect(() => {
        if (!mapInstance) return;

        if (selectedCounties.length === 0) {
            // Revert to national/regional overview
            mapInstance.setView([-1.2863, 36.8172], 7); // Center on Kenya/Nairobi
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

    // --- Simulation Logic ---
    const [simRadiusMultiplier, setSimRadiusMultiplier] = useState(1);

    useEffect(() => {
        let interval;
        if (isSimulating) {
            // Expand the radius every 2 seconds to simulate spreading water
            interval = setInterval(() => {
                setSimRadiusMultiplier(prev => {
                    const next = prev + 0.15;
                    return next > 3.5 ? 3.5 : next; // Cap expansion to prevent map flooding completely
                });
            }, 2000);
        } else {
            setSimRadiusMultiplier(1); // Reset when halted
        }
        return () => clearInterval(interval);
    }, [isSimulating]);

    // Define source water bodies for the simulation (Coords: [lat, lng])
    const simOriginPoints = [
        { id: "sim-1", pos: [-0.17, 34.75], name: "Lake Victoria Surge", baseRadius: 6000 },
        { id: "sim-2", pos: [-1.22, 36.88], name: "Nairobi River Overflow", baseRadius: 2000 },
        { id: "sim-3", pos: [-1.10, 37.01], name: "Athi River Swell", baseRadius: 3500 },
        { id: "sim-4", pos: [-1.45, 36.95], name: "Athi River South", baseRadius: 3000 },
    ];

    // Simulated Responder Data & Dynamic Hotspots
    const responders = [
        { id: 1, name: "Unit-01 (Kibra)", pos: [-1.31, 36.79], status: "Active" },
        { id: 2, name: "Unit-04 (Mathare)", pos: [-1.26, 36.86], status: "Active" },
        { id: 3, name: "Unit-08 (Nyando)", pos: [-0.17, 34.91], status: "En Route" },
        { id: 4, name: "Med-02 (Kisumu)", pos: [-0.10, 34.75], status: "At Station" },
    ];

    const hotspots = [
        { id: "hs-1", title: "Bridge Washout", pos: [-1.15, 36.96], county: "Kiambu", area: "Juja", type: "infrastructure" },
        { id: "hs-2", title: "Levee Breach", pos: [-0.15, 34.85], county: "Kisumu", area: "Nyando", type: "water" },
        { id: "hs-3", title: "Power Failure", pos: [-1.28, 36.82], county: "Nairobi", area: "Nairobi Central", type: "power" },
        { id: "hs-4", title: "Evacuation Route Cut", pos: [-1.55, 37.26], county: "Machakos", area: "Machakos Town", type: "infrastructure" },
    ];

    const responderIcon = L.divIcon({
        html: `<div class="w-4 h-4 bg-flood-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
                 <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
               </div>`,
        className: "custom-div-icon",
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const hotspotIcon = L.divIcon({
        html: `<div class="w-5 h-5 bg-red-600 border-2 border-white rounded-sm shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse flex items-center justify-center relative">
                 <div class="absolute -inset-1 border border-red-500 rounded-sm animate-ping opacity-75"></div>
                 <div class="w-1.5 h-1.5 bg-white rounded-sm"></div>
               </div>`,
        className: "custom-div-icon hotspot-pin",
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const customPinIcon = L.divIcon({
        html: `<div class="w-4 h-4 bg-purple-600 border-2 border-white rounded-full shadow-[0_0_10px_rgba(147,51,234,0.6)] flex items-center justify-center">
                 <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
               </div>`,
        className: "custom-div-icon custom-pin",
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    // Map Event Listener Component
    const MapEvents = () => {
        useMapEvents({
            contextmenu(e) {
                // If a user right-clicks the map layer, drop a custom pin.
                if (onCustomPinDrop) {
                    onCustomPinDrop(e.latlng);
                }
            },
        });
        return null;
    };

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
                <MapEvents />
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
                            contextmenu: (e) => {
                                if (onCustomPinDrop) onCustomPinDrop(e.latlng);
                            }
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
                                },
                                contextmenu: (e) => {
                                    if (onCustomPinDrop) onCustomPinDrop(e.latlng);
                                }
                            });
                        }}
                    />
                )}

                {/* Responder GPS Markers (Simulated) */}
                {responders.map(r => (
                    <Marker key={r.id} position={r.pos} icon={responderIcon}>
                        <Tooltip sticky>
                            <div className="text-[10px] font-black uppercase">
                                <span className="text-flood-600">{r.name}</span><br />
                                <span className="text-slate-400">Status: {r.status}</span>
                            </div>
                        </Tooltip>
                    </Marker>
                ))}

                {/* Dynamic Intel Hotspots */}
                {hotspots.map((hs) => {
                    const isVisible = selectedCounties.length === 0 || selectedCounties.includes(hs.county);
                    if (!isVisible) return null;

                    return (
                        <Marker
                            key={hs.id}
                            position={hs.pos}
                            icon={hotspotIcon}
                            eventHandlers={{
                                click: () => {
                                    if (onHotspotClick) onHotspotClick(hs);
                                }
                            }}
                        >
                            <Tooltip sticky>
                                <div className="text-[10px] font-black uppercase">
                                    <span className="text-red-500 animate-pulse">■ CRITICAL ALERT</span><br />
                                    <span className="text-slate-900 dark:text-white">{hs.title}</span><br />
                                    <span className="text-slate-400 text-[8px]">{hs.area}, {hs.county}</span>
                                </div>
                            </Tooltip>
                        </Marker>
                    );
                })}

                {/* Flood Spread Simulation Overlays */}
                {isSimulating && simOriginPoints.map((sim) => (
                    <Circle
                        key={sim.id}
                        center={sim.pos}
                        pathOptions={{
                            fillColor: '#3b82f6',
                            fillOpacity: 0.3,
                            color: '#2563eb',
                            weight: 1,
                            dashArray: '4 4'
                        }}
                        radius={sim.baseRadius * simRadiusMultiplier}
                    >
                        <Tooltip sticky>
                            <div className="text-[10px] font-black uppercase">
                                <span className="text-flood-500">Predicted Inundation</span><br />
                                <span className="text-slate-900 dark:text-white">{sim.name}</span><br />
                                <span className="text-slate-400 text-[8px]">T+{(simRadiusMultiplier - 1).toFixed(1) * 20} Hours</span>
                            </div>
                        </Tooltip>
                    </Circle>
                ))}

                {/* Custom User Tactical Pin */}
                {selectedCustomPin && (
                    <Marker position={[selectedCustomPin.lat, selectedCustomPin.lng]} icon={customPinIcon}>
                        <Tooltip sticky>
                            <div className="text-[10px] font-black uppercase text-purple-600">
                                Tactical Target Locked
                            </div>
                        </Tooltip>
                    </Marker>
                )}

            </MapContainer>
        </div>
    );
}
