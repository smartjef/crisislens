import { useState, useEffect, useCallback } from "react";
import client from "../api/client";

export default function useFloodRisk(countyId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchRisk = useCallback(async () => {
        if (!countyId) return;
        setLoading(true);
        setError(null);
        try {
            // The API endpoint /api/counties/{countyId}/risk/
            const res = await client.get(`/api/counties/${countyId}/risk/`);
            setData(res.data);
        } catch (err) {
            setError(err);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [countyId]);

    useEffect(() => {
        fetchRisk();
    }, [fetchRisk]);

    return { data, loading, error, refetch: fetchRisk };
}
