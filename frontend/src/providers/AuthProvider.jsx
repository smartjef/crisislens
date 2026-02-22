/**
 * providers/AuthProvider.jsx
 *
 * Runs once on cold start (hard refresh, new tab, Cmd+R).
 *
 * Flow:
 *  1. Check localStorage for "cl-refresh".
 *  2. If found, POST /api/auth/refresh/ to get a new access token.
 *  3. Store the new refresh token (simplejwt rotates it).
 *  4. Call GET /api/auth/me/ to load the full user profile.
 *  5. Hydrate the authStore — user is logged in without seeing the login page.
 *
 * While booting, render a minimal splash screen to prevent a flash to /login.
 * Any failure clears the stored refresh token and shows children unauthenticated.
 */
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { refreshRequest, getMeRequest } from '../api/auth';

export default function AuthProvider({ children }) {
    const [booting, setBooting] = useState(true);
    const { login } = useAuthStore();

    useEffect(() => {
        const stored = localStorage.getItem('cl-refresh');

        if (!stored) {
            setBooting(false);
            return;
        }

        refreshRequest(stored)
            .then(({ data }) => {
                // Persist the rotated refresh token before fetching the user.
                if (data.refresh) {
                    localStorage.setItem('cl-refresh', data.refresh);
                }
                // Return both the new access token and the /me/ call in parallel.
                return Promise.all([data.access, getMeRequest()]);
            })
            .then(([access, meRes]) => {
                login(access, meRes.data);
            })
            .catch(() => {
                // Refresh token expired or blacklisted — clear it and start fresh.
                localStorage.removeItem('cl-refresh');
            })
            .finally(() => {
                setBooting(false);
            });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (booting) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="flex flex-col items-center gap-3">
                    <svg
                        className="w-8 h-8 text-flood-600 animate-pulse"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                    <span className="text-slate-400 text-xs font-mono tracking-widest uppercase">
                        Initialising…
                    </span>
                </div>
            </div>
        );
    }

    return children;
}
