/**
 * router/PrivateRoute.jsx
 *
 * Guards a route by:
 *  1. Checking `isAuthenticated` from the real authStore.
 *     — Unauthenticated → redirect to /login, saving the attempted URL so we
 *       can send them back after a successful sign-in.
 *  2. Optionally checking `allowedRoles`.
 *     — Wrong role → redirect to /unauthorized.
 *
 * AuthProvider has already handled the silent rehydration on cold start,
 * so by the time this component renders `isAuthenticated` is authoritative.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function PrivateRoute({ children, allowedRoles }) {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}
