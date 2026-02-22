/**
 * store/authStore.js
 *
 * Single source of truth for authentication state.
 *
 * Security model:
 *  - Access token lives in MEMORY only (this store) — never localStorage / cookies
 *    so it cannot be stolen via XSS reading storage.
 *  - Refresh token is persisted to localStorage("cl-refresh") ONLY so the user
 *    survives hard refreshes without re-logging-in. On logout it is removed.
 *  - AuthProvider silently exchanges the stored refresh token for a fresh access
 *    token on every cold start (hard refresh / new tab).
 */
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
    /** Full user profile returned by /api/auth/me/ */
    user: null,

    /** Short-lived JWT access token — in memory only, never persisted */
    accessToken: null,

    /** Derived flag — true when we have a live access token */
    isAuthenticated: false,

    /**
     * Called after a successful login or silent token rehydration.
     * Stores the access token in memory; the refresh token is written
     * to localStorage by the caller (AuthProvider / LoginPage).
     */
    login: (accessToken, user) =>
        set({ accessToken, user, isAuthenticated: true }),

    /**
     * Wipes in-memory token + user and removes the persisted refresh token.
     * Always call this on explicit logout OR when refresh fails.
     */
    logout: () => {
        localStorage.removeItem('cl-refresh');
        set({ accessToken: null, user: null, isAuthenticated: false });
    },

    /** Called by the Axios 401 interceptor after a silent token refresh. */
    setAccessToken: (accessToken) => set({ accessToken }),
}));
