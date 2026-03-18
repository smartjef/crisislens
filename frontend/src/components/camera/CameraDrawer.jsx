/**
 * CameraDrawer.jsx — Side panel for camera feed details
 * Slides in from the right over the camera grid.
 */
import React, { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Camera, ExternalLink, Globe, Info, WifiOff, X, Clock, Activity, Radio, Maximize2 } from 'lucide-react';
import { HLSPlayer, SatelliteMapView, LiveOverlay, TelemetryTicker, ESRI_SATELLITE_STYLE } from './CameraFeedCard';

// Shared helpers are now imported from CameraFeedCard

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return <span className="tabular-nums">{t.toLocaleTimeString('en-KE', { hour12: false })} EAT</span>;
}

const STATUS_DOT = {
  online:   'bg-emerald-400',
  degraded: 'bg-amber-400',
  offline:  'bg-red-500',
};

const TYPE_AGENCY = {
  cctv: 'NTSA / KMD CCTV',
  drone: 'Drone Recon (KDF/LVBC)',
  river: 'KenHA River Station',
  satellite: 'LVBC Satellite Downlink',
  weather: 'KMD Weather Station',
};

export default function CameraDrawer({ camera, onClose, onFullscreen }) {
  const containerRef = useRef(null);
  const [hlsError, setHlsError] = useState(false);
  const isHLS   = camera?.stream_url?.includes('.m3u8');
  const isMJPEG = camera?.stream_url?.includes('mjpeg') || camera?.stream_url?.includes('mjpg');
  const useMap  = ((camera?.feed_type === 'satellite' || camera?.feed_type === 'river') && camera?.lat && camera?.lon)
                   || (hlsError && camera?.lat && camera?.lon);

  // Reset HLS error when camera changes
  useEffect(() => { setHlsError(false); }, [camera?.id]);

  const handleFullscreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    } else if (onFullscreen) {
      onFullscreen(camera);
    }
  };

  if (!camera) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white dark:bg-surface border-l border-slate-200 dark:border-surface-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-surface-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[camera.status] || 'bg-slate-400'}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">{camera.name}</p>
              <p className="text-[10px] font-mono text-slate-500 truncate">{camera.location_label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleFullscreen} className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-raised transition-colors">
              <Maximize2 size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-raised transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Feed area */}
        <div ref={containerRef} className="aspect-video bg-slate-200 dark:bg-slate-900 relative shrink-0 overflow-hidden">
          {camera.status === 'offline' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-900">
              <WifiOff size={32} className="text-slate-400 dark:text-slate-600" />
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-widest">Feed Offline</span>
            </div>
          ) : isHLS && !hlsError ? (
            <HLSPlayer src={camera.stream_url} onError={() => setHlsError(true)} />
          ) : isMJPEG ? (
            <img src={camera.stream_url} alt={camera.name} className="w-full h-full object-cover" />
          ) : useMap ? (
            <SatelliteMapView
              lat={camera.lat}
              lon={camera.lon}
              zoom={camera.defaultZoom ?? 15}
              compact={false}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-900">
              <Camera size={32} className="text-slate-400 dark:text-slate-600" />
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-widest">No Stream Configured</span>
            </div>
          )}

          {/* Overlays */}
          {camera.status !== 'offline' && (
            <div className="absolute inset-0 pointer-events-none">
              <LiveOverlay isSatellite={camera.feed_type === 'satellite'} />
              <TelemetryTicker cameraId={camera.id} />
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status row */}
          <div className="flex items-center gap-3">
            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
              camera.status === 'online'   ? 'border-emerald-400 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
              camera.status === 'degraded' ? 'border-amber-400 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                                            'border-red-400 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}>{camera.status}</span>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{camera.feed_type}</span>
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-600 ml-auto"><LiveClock /></span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Agency', value: TYPE_AGENCY[camera.feed_type] || 'Unknown' },
              { label: 'Protocol', value: isHLS ? 'HLS/RTSP' : isMJPEG ? 'MJPEG' : useMap ? 'Satellite' : 'Not configured' },
              { label: 'Latitude',  value: camera.lat  ? camera.lat.toFixed(5)  : '—' },
              { label: 'Longitude', value: camera.lon  ? camera.lon.toFixed(5)  : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-raised border border-surface-border rounded px-3 py-2">
                <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{label}</p>
                <p className="text-xs font-mono text-slate-300 mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Stream URL */}
          {camera.stream_url && (
            <div className="bg-surface-raised border border-surface-border rounded px-3 py-2">
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">Stream URL</p>
              <p className="text-[10px] font-mono text-flood-400 break-all">{camera.stream_url}</p>
            </div>
          )}

          {/* Notes */}
          {camera.notes && (
            <div className="bg-surface-raised border border-surface-border rounded px-3 py-2">
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">Notes</p>
              <p className="text-xs text-slate-400">{camera.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
