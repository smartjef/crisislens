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

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams(filtersRef.current).toString();
            const res = await client.get(`/api/alerts/?${params}`);
            setData(res.data);
        } catch (err) {
            setError(err);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

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
