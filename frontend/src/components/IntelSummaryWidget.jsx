import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, AlertTriangle, ChevronRight } from 'lucide-react';
import client from '../api/client';

export default function IntelSummaryWidget({ countyId }) {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);

        client.get('/api/intel/', { params: { page_size: 100 } })
            .then(res => {
                if (cancelled) return;
                const data = res.data?.results ?? res.data ?? [];
                setItems(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, []);

    const { total, urgentCount, topCounties } = useMemo(() => {
        const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;

        // Filter to last 6h; optionally filter by countyId
        const recent = items.filter(item => {
            const ts = item.created_at ? new Date(item.created_at).getTime() : 0;
            if (ts < sixHoursAgo) return false;
            if (countyId && item.county_id && String(item.county_id) !== String(countyId)) return false;
            return true;
        });

        const urgent = recent.filter(
            item => item.sentiment === 'urgent' || item.sentiment === 'negative'
        ).length;

        // Group by county_name
        const countyMap = {};
        recent.forEach(item => {
            const name = item.county_name || 'Unknown';
            countyMap[name] = (countyMap[name] || 0) + 1;
        });

        const top = Object.entries(countyMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        return { total: recent.length, urgentCount: urgent, topCounties: top };
    }, [items, countyId]);

    /* ── Loading skeleton ── */
    if (loading) {
        return (
            <div className="rounded border border-surface-border bg-surface-raised p-4 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-surface-border/50" />
                    <div className="h-2 w-28 bg-surface-border/50 rounded" />
                </div>
                <div className="h-8 w-16 bg-surface-border/40 rounded mb-2" />
                <div className="h-2 w-32 bg-surface-border/30 rounded mb-4" />
                <div className="space-y-2">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="h-2 w-20 bg-surface-border/30 rounded" />
                            <div className="h-4 w-6 bg-surface-border/20 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    /* ── Error / empty state ── */
    if (error || (!loading && items.length === 0)) {
        return (
            <div className="rounded border border-surface-border bg-surface-raised p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Radio size={11} className="text-slate-600" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                        Social Intel · 6H
                    </span>
                </div>
                <p className="text-[10px] font-mono text-slate-600">No intel data</p>
            </div>
        );
    }

    /* ── Widget ── */
    return (
        <div className="rounded border border-surface-border bg-surface-raised p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Radio size={11} className="text-flood-400" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Social Intel · 6H
                </span>
            </div>

            {/* Main count */}
            <p className="text-xl font-bold font-mono text-slate-200 tabular-nums leading-none">
                {total}
            </p>
            <p className="text-[9px] font-mono text-slate-500 mt-0.5 mb-3">
                mentions tracked
            </p>

            {/* Urgent sub-line */}
            {urgentCount > 0 && (
                <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle size={10} className="text-red-400 shrink-0" />
                    <span className="text-[10px] font-mono text-red-400 font-semibold">
                        {urgentCount} urgent mention{urgentCount !== 1 ? 's' : ''}
                    </span>
                </div>
            )}

            {/* Top counties */}
            {topCounties.length > 0 && (
                <div className="space-y-1.5 mb-3">
                    {topCounties.map(([name, count]) => (
                        <div key={name} className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide truncate max-w-[70%]">
                                {name}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-slate-300 tabular-nums bg-surface px-1.5 py-0.5 rounded border border-surface-border">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* View all link */}
            <button
                onClick={() => navigate('/intel')}
                className="flex items-center gap-1 text-[9px] font-mono text-flood-400 hover:text-flood-300 transition-colors mt-1 uppercase tracking-widest"
            >
                View all
                <ChevronRight size={10} />
            </button>
        </div>
    );
}
