/**
 * CameraDrawer.jsx — Side panel for camera feed details
 * Slides in from the right over the camera grid.
 */
import React, { useEffect, useRef, useState } from 'react';
import Map, { Marker, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import Hls from 'hls.js';
import { Camera, ExternalLink, Globe, Info, WifiOff, X, Clock, Activity, Radio, Maximize2 } from 'lucide-react';

const ESRI_SATELLITE_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [{ id: 'sat', type: 'raster', source: 'satellite' }],
};

const STATUS_DOT = { online: 'bg-emerald-400', degraded: 'bg-amber-400', offline: 'bg-red-500' };
const STATUS_TEXT = { online: 'text-emerald-400', degraded: 'text-amber-400', offline: 'text-red-400' };

function HLSPlayer({ src }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!src || !ref.current) return;
    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(ref.current);
      return () => hls.destroy();
    } else if (ref.current.canPlayType('application/vnd.apple.mpegurl')) {
      ref.current.src = src;
    }
  }, [src]);
  return <video ref={ref} autoPlay muted playsInline className="w-full h-full object-cover" />;
}

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return <span className="tabular-nums">{t.toLocaleTimeString('en-KE', { hour12: false })} EAT</span>;
}

const TYPE_AGENCY = {
  cctv: 'NTSA / KMD CCTV',
  drone: 'Drone Recon (KDF/LVBC)',
  river: 'KenHA River Station',
  satellite: 'LVBC Satellite Downlink',
  weather: 'KMD Weather Station',
};

export default function CameraDrawer({ camera, onClose, onFullscreen }) {
  const isHLS   = camera?.stream_url?.includes('.m3u8');
  const isMJPEG = camera?.stream_url?.includes('mjpeg') || camera?.stream_url?.includes('mjpg');
  const useMap  = !camera?.stream_url && camera?.lat && camera?.lon;

  if (!camera) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-surface border-l border-surface-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[camera.status] || 'bg-slate-600'}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{camera.name}</p>
              <p className="text-[10px] font-mono text-slate-500 truncate">{camera.location_label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onFullscreen?.(camera)} className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-surface-raised transition-colors">
              <Maximize2 size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-surface-raised transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Feed area */}
        <div className="aspect-video bg-slate-900 relative shrink-0">
          {camera.status === 'offline' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <WifiOff size={32} className="text-slate-600" />
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Feed Offline</span>
            </div>
          ) : isHLS ? (
            <HLSPlayer src={camera.stream_url} />
          ) : isMJPEG ? (
            <img src={camera.stream_url} alt={camera.name} className="w-full h-full object-cover" />
          ) : useMap ? (
            <Map
              initialViewState={{ longitude: camera.lon, latitude: camera.lat, zoom: camera.defaultZoom ?? 15 }}
              mapStyle={ESRI_SATELLITE_STYLE}
              style={{ width: '100%', height: '100%' }}
              attributionControl={false}
            >
              <NavigationControl position="top-right" />
              <Marker longitude={camera.lon} latitude={camera.lat} anchor="center">
                <div className="w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-lg" />
              </Marker>
            </Map>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Camera size={32} className="text-slate-600" />
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">No Stream Configured</span>
            </div>
          )}

          {/* Live badge */}
          {camera.status !== 'offline' && (
            <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[8px] font-mono text-white uppercase tracking-widest">LIVE</span>
            </div>
          )}
          {/* Clock */}
          <div className="absolute bottom-2 right-2 pointer-events-none bg-black/70 px-1.5 py-0.5 rounded-sm">
            <span className="text-[9px] font-mono text-white"><LiveClock /></span>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status row */}
          <div className="flex items-center gap-3">
            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
              camera.status === 'online'   ? 'border-emerald-800 bg-emerald-900/20 text-emerald-400' :
              camera.status === 'degraded' ? 'border-amber-800 bg-amber-900/20 text-amber-400' :
                                            'border-red-800 bg-red-900/20 text-red-400'
            }`}>{camera.status}</span>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{camera.feed_type}</span>
            <span className="text-[9px] font-mono text-slate-600 ml-auto"><LiveClock /></span>
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
