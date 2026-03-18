import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';

export default function MissionStatusBar() {
  const { user } = useAuthStore();
  const [alertCount, setAlertCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [ar, ir] = await Promise.all([
          client.get('/api/alerts/?status=active&page_size=1'),
          client.get('/api/incidents/?status=open&page_size=1'),
        ]);
        setAlertCount(ar.data.count || 0);
        setIncidentCount(ir.data.count || 0);
      } catch {}
    };
    fetchCounts();
    const t = setInterval(fetchCounts, 60000);
    return () => clearInterval(t);
  }, []);

  const phase = alertCount === 0 ? 'MONITORING' : alertCount <= 3 ? 'ELEVATED' : 'ACTION REQUIRED';
  const phaseColor = alertCount === 0
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : alertCount <= 3
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse';

  return (
    <div className="h-8 border-b border-surface-border bg-surface flex items-center px-4 gap-5 shrink-0">
      <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${phaseColor}`}>
        {phase}
      </span>
      <span className="text-[9px] font-mono text-slate-500 tracking-widest">
        <span className="text-slate-400 font-semibold">{alertCount}</span> ALERTS
      </span>
      <span className="text-[9px] font-mono text-slate-500 tracking-widest">
        <span className="text-slate-400 font-semibold">{incidentCount}</span> INCIDENTS
      </span>
      <span className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
      </span>
      {user && (
        <span className="ml-auto text-[9px] font-mono text-slate-600 tracking-widest">
          DUTY: {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
        </span>
      )}
    </div>
  );
}
