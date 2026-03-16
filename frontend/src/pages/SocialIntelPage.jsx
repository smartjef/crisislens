/**
 * SocialIntelPage.jsx
 *
 * Social intelligence feed — ingested news + community reports.
 * Features:
 *   - Live RSS-ingested items from Nation, Standard, KBC, The Star
 *   - Sentiment badges: URGENT / NEGATIVE / NEUTRAL / POSITIVE
 *   - Analyst flag controls: Verify / Escalate / False
 *   - Filters: sentiment, source, county, flag status
 *   - Linked to map via county tag
 */
import React, { useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  ExternalLink, Filter, Loader2, Radio, RefreshCw, XCircle,
} from "lucide-react";
import client from "../api/client";

const SENTIMENT_STYLES = {
  urgent:   { cls: "bg-red-50 dark:bg-red-900/40    border-red-400 dark:border-red-700    text-red-600 dark:text-red-400",   icon: <AlertTriangle className="w-3 h-3" /> },
  negative: { cls: "bg-amber-50 dark:bg-amber-900/40  border-amber-400 dark:border-amber-700  text-amber-600 dark:text-amber-400", icon: <ChevronDown className="w-3 h-3" /> },
  neutral:  { cls: "bg-slate-100 dark:bg-slate-800     border-slate-300 dark:border-slate-700  text-slate-600 dark:text-slate-400", icon: null },
  positive: { cls: "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400", icon: <ChevronUp className="w-3 h-3" /> },
};

const FLAG_STYLES = {
  unreviewed: "text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600",
  verified:   "text-emerald-600 dark:text-emerald-400 border-emerald-400 dark:border-emerald-700",
  false:      "text-red-600 dark:text-red-400 border-red-400 dark:border-red-700",
  escalated:  "text-orange-600 dark:text-orange-400 border-orange-400 dark:border-orange-700",
};

const SOURCE_LABELS = {
  news_rss: "RSS",
  twitter:  "Twitter",
  facebook: "Facebook",
  radio:    "Radio",
  manual:   "Manual",
};

function IntelCard({ item, onFlag }) {
  const [expanded, setExpanded] = useState(false);
  const sent = SENTIMENT_STYLES[item.sentiment] || SENTIMENT_STYLES.neutral;

  const flagItem = (flag) => {
    client.patch(`/api/social-intel/${item.id}/flag/`, { flag })
      .then(() => onFlag(item.id, flag))
      .catch(() => {});
  };

  return (
    <div className={`rounded border ${sent.cls} bg-white dark:bg-surface-raised p-3 space-y-2`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border ${sent.cls}`}>
              {sent.icon}{item.sentiment}
            </span>
            <span className="text-[9px] font-mono text-slate-500 uppercase">{SOURCE_LABELS[item.source] || item.source}</span>
            {item.county_name && (
              <span className="text-[9px] font-mono text-cyan-500 uppercase">{item.county_name}</span>
            )}
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${FLAG_STYLES[item.flag]}`}>
              {item.flag}
            </span>
          </div>
          {item.title && (
            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2">{item.title}</p>
          )}
        </div>
        <div className="text-[9px] font-mono text-slate-500 shrink-0 text-right">
          {item.source_published_at
            ? new Date(item.source_published_at).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
            : new Date(item.ingested_at).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Snippet */}
      <p className={`text-[11px] text-slate-400 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
        {item.snippet}
      </p>
      {item.snippet?.length > 140 && (
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-cyan-500 font-mono">
          {expanded ? "Show less ↑" : "Show more ↓"}
        </button>
      )}

      {/* Tags */}
      {item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 6).map((t) => (
            <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-cyan-500 font-mono hover:underline">
            <ExternalLink className="w-3 h-3" />Source
          </a>
        )}
        <div className="flex-1" />
        {/* Analyst flag buttons */}
        {item.flag !== "verified" && (
          <button onClick={() => flagItem("verified")}
            className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 hover:text-emerald-300 border border-emerald-800 hover:border-emerald-600 px-1.5 py-0.5 rounded">
            <CheckCircle className="w-2.5 h-2.5" />Verify
          </button>
        )}
        {item.flag !== "escalated" && (
          <button onClick={() => flagItem("escalated")}
            className="flex items-center gap-1 text-[9px] font-mono text-orange-400 hover:text-orange-300 border border-orange-800 hover:border-orange-600 px-1.5 py-0.5 rounded">
            <AlertTriangle className="w-2.5 h-2.5" />Escalate
          </button>
        )}
        {item.flag !== "false" && (
          <button onClick={() => flagItem("false")}
            className="flex items-center gap-1 text-[9px] font-mono text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-700 px-1.5 py-0.5 rounded">
            <XCircle className="w-2.5 h-2.5" />Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export default function SocialIntelPage() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [hasNext, setHasNext]     = useState(false);
  const [sentiment, setSentiment] = useState("all");
  const [source, setSource]       = useState("all");
  const [flag, setFlag]           = useState("all");

  const load = (reset = false) => {
    const p = reset ? 1 : page;
    setLoading(true);
    const params = new URLSearchParams({ page: p, page_size: 20 });
    if (sentiment !== "all") params.set("sentiment", sentiment);
    if (source !== "all")    params.set("source",    source);
    if (flag !== "all")      params.set("flag",       flag);

    client.get(`/api/social-intel/?${params}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setItems(reset ? data : (prev) => [...prev, ...data]);
        setHasNext(!!res.data.next);
        if (reset) setPage(1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(true); }, [sentiment, source, flag]);

  const handleFlag = (id, newFlag) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, flag: newFlag } : i));
  };

  const urgentCount   = items.filter((i) => i.sentiment === "urgent").length;
  const verifiedCount = items.filter((i) => i.flag === "verified").length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200 font-['IBM_Plex_Condensed']">
            SOCIAL INTELLIGENCE FEED
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-widest">
            {items.length} items · {urgentCount} urgent · {verifiedCount} verified
          </p>
        </div>
        <button onClick={() => load(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 dark:border-surface-border text-[11px] font-mono text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:border-slate-500 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Urgent",   value: items.filter(i=>i.sentiment==="urgent").length,   color: "text-red-400" },
          { label: "Negative", value: items.filter(i=>i.sentiment==="negative").length, color: "text-amber-400" },
          { label: "Verified", value: verifiedCount,                                    color: "text-emerald-400" },
          { label: "Escalated",value: items.filter(i=>i.flag==="escalated").length,     color: "text-orange-400" },
        ].map((s) => (
          <div key={s.label} className="rounded border border-slate-200 dark:border-surface-border bg-white dark:bg-surface-raised px-3 py-2">
            <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-surface-border flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <div className="flex gap-1.5 flex-wrap">
          {["all", "urgent", "negative", "neutral", "positive"].map((s) => (
            <button key={s} onClick={() => setSentiment(s)}
              className={`text-[9px] font-mono uppercase px-2 py-1 rounded border transition-colors
                ${sentiment === s ? "border-flood-600 text-flood-400 bg-flood-900/30" : "border-slate-200 dark:border-surface-border text-slate-500 hover:text-slate-700 dark:text-slate-300"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-slate-200 dark:bg-surface-border" />
        <div className="flex gap-1.5 flex-wrap">
          {["all", "news_rss", "twitter", "manual"].map((s) => (
            <button key={s} onClick={() => setSource(s)}
              className={`text-[9px] font-mono uppercase px-2 py-1 rounded border transition-colors
                ${source === s ? "border-flood-600 text-flood-400 bg-flood-900/30" : "border-slate-200 dark:border-surface-border text-slate-500 hover:text-slate-700 dark:text-slate-300"}`}>
              {SOURCE_LABELS[s] || s}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-slate-200 dark:bg-surface-border" />
        <div className="flex gap-1.5 flex-wrap">
          {["all", "unreviewed", "verified", "escalated", "false"].map((f) => (
            <button key={f} onClick={() => setFlag(f)}
              className={`text-[9px] font-mono uppercase px-2 py-1 rounded border transition-colors
                ${flag === f ? "border-flood-600 text-flood-400 bg-flood-900/30" : "border-slate-200 dark:border-surface-border text-slate-500 hover:text-slate-700 dark:text-slate-300"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No intel items found.</p>
          <p className="text-xs mt-1 text-slate-600">The ingest task runs every 15 minutes via Celery.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <IntelCard key={item.id} item={item} onFlag={handleFlag} />
          ))}
          {hasNext && (
            <button
              onClick={() => { setPage((p) => p + 1); load(false); }}
              disabled={loading}
              className="w-full py-2 text-[11px] font-mono text-slate-400 border border-slate-200 dark:border-surface-border rounded hover:bg-white dark:bg-surface-raised transition-colors disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
