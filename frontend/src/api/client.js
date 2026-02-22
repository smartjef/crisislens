/**
 * api/client.js
 *
 * Pre-configured Axios instance with two interceptors:
 *
 * REQUEST  → attaches the in-memory Bearer access token to every call.
 * RESPONSE → on 401, attempts one silent refresh using the stored refresh
 *             token; if that also fails (or no refresh token exists) it
 *             calls logout() and lets the AuthProvider redirect to /login.
 *
 * We read the store via `useAuthStore.getState()` instead of the React hook
 * so this module works outside of the React component tree.
 */
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
});

/* ── REQUEST: attach Bearer token ─────────────────────────────────────── */
client.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

/* ── RESPONSE: silent token refresh on 401 ────────────────────────────── */
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        // Only attempt silent refresh on 401 and only once per request.
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;

            const refresh = localStorage.getItem('cl-refresh');
            if (refresh) {
                try {
                    // Use a bare axios call (not `client`) to avoid the interceptor loop.
                    const { data } = await axios.post(
                        `${client.defaults.baseURL}/api/auth/refresh/`,
                        { refresh },
                        { headers: { 'Content-Type': 'application/json' } },
                    );

                    // simplejwt returns both a new access and (with ROTATE_REFRESH_TOKENS) a new refresh.
                    useAuthStore.getState().setAccessToken(data.access);
                    if (data.refresh) {
                        localStorage.setItem('cl-refresh', data.refresh);
                    }

                    // Retry the original request with the new access token.
                    original.headers.Authorization = `Bearer ${data.access}`;
                    return client(original);
                } catch {
                    // Refresh also failed — log the user out completely.
                    useAuthStore.getState().logout();
                }
            } else {
                useAuthStore.getState().logout();
            }
        }

        return Promise.reject(error);
    },
);

export default client;
