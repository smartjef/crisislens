/**
 * BroadcastLog.jsx
 * 
 * Detailed delivery report for a specific broadcast.
 * Shows recipient-level success/failure and errors.
 */
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, Search, Filter, Download, 
  CheckCircle2, XCircle, Clock, AlertTriangle, 
  ChevronRight, RefreshCw, Send, Mail
} from "lucide-react";
import client from "../api/client";

const STATUS_ICONS = {
  sent:      <CheckCircle2 className="w-4 h-4 text-cyan-500" />,
  delivered: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  failed:    <XCircle className="w-4 h-4 text-red-500" />,
};

const STATUS_LABELS = {
  sent:      "Dispatched",
  delivered: "Delivered",
  failed:    "Failed",
};

export default function BroadcastLog() {
  const { id } = useParams();
  const [broadcast, setBroadcast] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get(`/api/broadcasts/${id}/`),
      client.get(`/api/broadcast-delivery-logs/?broadcast=${id}&page_size=1000`)
    ]).then(([bRes, lRes]) => {
      setBroadcast(bRes.data);
      setLogs(lRes.data.results || lRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.contact.toLowerCase().includes(search.toLowerCase()) || 
                          (log.error_message || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading && !broadcast) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumbs / Back */}
      <div className="flex items-center gap-4">
        <Link 
          to="/broadcasts" 
          className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white font-['IBM_Plex_Condensed']">
            DELIVERY REPORT
          </h1>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
            Broadcast #{id} · {broadcast?.channel?.toUpperCase()} · {new Date(broadcast?.sent_at).toLocaleString()}
          </p>
        </div>
        
        <div className="ml-auto flex gap-2">
           <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-surface-border text-[11px] font-mono text-slate-400 hover:text-white transition-colors">
             <Download size={14} /> Export CSV
           </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded border border-surface-border bg-surface-raised">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Total Recipients</p>
          <p className="text-2xl font-bold text-white font-mono">{broadcast?.recipient_count || 0}</p>
        </div>
        <div className="p-4 rounded border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[10px] font-mono text-emerald-500/60 uppercase tracking-widest mb-1">Success</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono">{broadcast?.delivered_count || 0}</p>
          <p className="text-[10px] text-emerald-600 mt-1 font-mono">
            {Math.round((broadcast?.delivered_count / broadcast?.recipient_count) * 100) || 0}%
          </p>
        </div>
        <div className="p-4 rounded border border-red-500/20 bg-red-500/5">
          <p className="text-[10px] font-mono text-red-500/60 uppercase tracking-widest mb-1">Failed</p>
          <p className="text-2xl font-bold text-red-400 font-mono">{broadcast?.failed_count || 0}</p>
          <p className="text-[10px] text-red-600 mt-1 font-mono">
            {Math.round((broadcast?.failed_count / broadcast?.recipient_count) * 100) || 0}%
          </p>
        </div>
        <div className="p-4 rounded border border-surface-border bg-surface-raised">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Current Status</p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${broadcast?.status === 'sent' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <p className="text-sm font-semibold text-white uppercase tracking-wider">{broadcast?.status}</p>
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="p-5 rounded border border-surface-border bg-white/[0.02] space-y-3">
        <h3 className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">Broadcast Message</h3>
        <div className="text-sm text-slate-300 font-mono leading-relaxed bg-black/40 p-4 rounded border border-white/5">
          {broadcast?.message}
        </div>
      </div>

      {/* Logs Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-slate-200">RECIPIENT LOGS</h2>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input 
                type="text"
                placeholder="Search phone/email..."
                className="pl-9 pr-4 py-1.5 rounded bg-surface border border-surface-border text-[11px] focus:outline-none focus:border-flood-600 w-48 transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <select 
              className="bg-surface border border-surface-border text-[11px] rounded px-3 py-1.5 text-slate-300 focus:outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="sent">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="rounded border border-surface-border overflow-hidden bg-surface-raised">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-surface-border text-slate-400 font-mono uppercase text-[10px] tracking-widest">
                <th className="py-3 px-4 text-left font-medium">Recipient</th>
                <th className="py-3 px-4 text-left font-medium">Channel</th>
                <th className="py-3 px-4 text-left font-medium">Status</th>
                <th className="py-3 px-4 text-left font-medium">Timestamp</th>
                <th className="py-3 px-4 text-left font-medium">Provider Details / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 italic">
                    No matching logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300">{log.contact}</td>
                    <td className="py-3 px-4">
                      {broadcast?.channel === 'sms' ? (
                        <div className="flex items-center gap-1.5 text-cyan-500 font-mono text-[10px] uppercase">
                          <Send size={12} /> SMS
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-violet-500 font-mono text-[10px] uppercase">
                          <Mail size={12} /> Email
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {STATUS_ICONS[log.status]}
                        <span className="font-medium text-slate-200">{STATUS_LABELS[log.status]}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4">
                      {log.status === 'failed' ? (
                        <div className="flex items-center gap-1.5 text-red-400">
                          <AlertTriangle size={12} />
                          <span className="text-[11px]">{log.error_message || "Unknown error"}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-mono">OK</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
