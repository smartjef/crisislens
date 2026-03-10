import { useState, useEffect, useCallback, useRef } from "react";
import client from "../api/client";

export default function useAlerts(filters = {}, options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Track last filters to prevent infinite loops if passed as inline object
    const filtersRef = useRef(filters);
    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    const filtersStr = JSON.stringify(filters);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const cleanFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== "" && v !== "undefined")
            );
            const params = new URLSearchParams(cleanFilters).toString();
            const res = await client.get(`/api/alerts/?${params}`);
            setData(res.data);
        } catch (err) {
            setError(err);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [filtersStr]); // Re-fetch only when filter values actually change

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Polling logic
    useEffect(() => {
        if (options.pollInterval) {
            const intervalId = setInterval(fetchData, options.pollInterval);
            return () => clearInterval(intervalId);
        }
    }, [fetchData, options.pollInterval]);

    return { data, loading, error, refetch: fetchData };
}
