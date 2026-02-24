import { useState, useEffect, useCallback } from "react";
import client from "../api/client";

export default function useSubCountyRisk(countyId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = countyId ? `/api/sub-counties/?county=${countyId}` : '/api/sub-counties/';
            const res = await client.get(url);
            setData(res.data);
        } catch (err) {
            setError(err);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [countyId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
