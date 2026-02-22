/**
 * api/auth.js
 *
 * Thin wrappers around the backend auth endpoints.
 * All calls go through `client` so they benefit from the JWT interceptors.
 *
 * Endpoint notes (backend uses simplejwt with USERNAME_FIELD = "email"):
 *   POST /api/auth/login/   { email, password }        → { access, refresh }
 *   POST /api/auth/refresh/ { refresh }                → { access, refresh }
 *   POST /api/auth/logout/  { refresh }                → { detail }
 *   GET  /api/auth/me/                                  → UserSerializer
 */
import client from './client';

/**
 * Exchange email + password for a token pair.
 * The simplejwt login serializer respects USERNAME_FIELD so we send "email"
 * as the key directly — no mapping needed.
 */
export const loginRequest = (email, password) =>
    client.post('/api/auth/login/', { email, password });

/**
 * Blacklist the current refresh token on the backend.
 * Call before calling useAuthStore.logout() so the token cannot be reused.
 */
export const logoutRequest = (refresh) =>
    client.post('/api/auth/logout/', { refresh });

/**
 * Fetch the authenticated user's profile.
 * The Bearer token is attached by the request interceptor.
 */
export const getMeRequest = () =>
    client.get('/api/auth/me/');

/**
 * Explicitly refresh the access token.
 * Normally handled transparently by the 401 interceptor in client.js,
 * but exported here so AuthProvider can call it on cold start.
 */
export const refreshRequest = (refreshToken) =>
    client.post('/api/auth/refresh/', { refresh: refreshToken });
