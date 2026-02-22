/**
 * CrisisLens Design Tokens
 *
 * Re-exported as plain JS constants for use in Leaflet, Recharts,
 * and any context that cannot use Tailwind utility classes (inline styles).
 *
 * Keep in sync with tailwind.config.js
 */

export const FLOOD_COLORS = {
  50:  '#ecfeff',
  100: '#cffafe',
  200: '#a5f3fc',
  300: '#67e8f9',
  400: '#22d3ee',
  500: '#06b6d4',
  600: '#0891b2', // PRIMARY
  700: '#0e7490',
  800: '#155e75',
  900: '#164e63',
}

export const RISK_COLORS = {
  critical: '#ef4444', // danger
  high:     '#f59e0b', // warning
  moderate: '#0891b2', // flood-600
  low:      '#10b981', // success
}

/** Map risk percentage (0–100) to a hex colour using flood palette */
export function riskToColor(pct) {
  if (pct >= 80) return RISK_COLORS.critical
  if (pct >= 60) return RISK_COLORS.high
  if (pct >= 40) return RISK_COLORS.moderate
  return RISK_COLORS.low
}

export const SURFACE = {
  DEFAULT: '#0f172a',
  raised:  '#1e293b',
  border:  '#334155',
}

export const DANGER  = { DEFAULT: '#ef4444', dark: '#dc2626' }
export const WARNING = { DEFAULT: '#f59e0b', dark: '#d97706' }
export const SUCCESS = { DEFAULT: '#10b981', dark: '#059669' }
