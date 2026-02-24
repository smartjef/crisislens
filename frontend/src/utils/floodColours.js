/**
 * Interpolate between pale blue (low risk) and deep navy (high risk).
 * Input range normalised: 40 % → t=0 (#bfdbfe), 90 % → t=1 (#1e3a8a)
 */
export const getFloodFillColor = (riskPercent) => {
    const t = Math.max(0, Math.min(1, (riskPercent - 40) / 50));
    const r = Math.round(191 + (30 - 191) * t);   // 191 → 30
    const g = Math.round(219 + (58 - 219) * t);   // 219 → 58
    const b = Math.round(254 + (138 - 254) * t);  // 254 → 138
    return `rgb(${r},${g},${b})`;
};
