/**
 * CameraGrid.jsx
 *
 * Renders a 3-column responsive grid of CameraFeedCard tiles.
 * Handles loading skeleton (6 cards) and empty-state messaging.
 *
 * Props:
 *   cameras  — array of camera objects to display
 *   loading  — boolean; shows skeleton when true
 *   onExpand — callback(camera) invoked when a card's expand button is clicked
 */
import React from "react";
import { Camera } from "lucide-react";
import CameraFeedCard from "./CameraFeedCard";

// ── Loading skeleton card ──────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded border border-slate-200 dark:border-surface-border bg-white dark:bg-surface-raised animate-pulse">
      <div className="aspect-video bg-slate-100 dark:bg-slate-800" />
      <div className="p-3 space-y-1.5">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
    </div>
  );
}

// ── Grid (default export) ──────────────────────────────────────────────────────
export default function CameraGrid({ cameras = [], loading = false, onExpand, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No feeds match the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cameras.map((cam) => (
        <CameraFeedCard key={cam.id} camera={cam} onExpand={onExpand} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
