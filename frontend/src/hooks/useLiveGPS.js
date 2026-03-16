/**
 * useLiveGPS.js
 *
 * Subscribes to ws/gps/<countyId>/ and maintains a map of unit positions.
 * Returns { units } — array of FieldUnit objects with live lat/lon.
 */
import { useEffect, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import client from "../api/client";

export function useLiveGPS(countyId) {
  const [units, setUnits] = useState([]);

  const { lastMessage } = useWebSocket(
    countyId ? `ws/gps/${countyId}/` : null,
    { enabled: !!countyId }
  );

  // Initial load
  useEffect(() => {
    const params = countyId ? `?county=${countyId}` : "";
    client.get(`/api/field-units/${params}`)
      .then((res) => setUnits(res.data.results || res.data))
      .catch(() => {});
  }, [countyId]);

  // Merge WS ping into units array
  useEffect(() => {
    if (!lastMessage) return;
    setUnits((prev) =>
      prev.map((u) =>
        u.id === lastMessage.unit_id
          ? { ...u, current_lat: lastMessage.lat, current_lon: lastMessage.lon, status: "active", last_ping: lastMessage.ts }
          : u
      )
    );
  }, [lastMessage]);

  return { units };
}
