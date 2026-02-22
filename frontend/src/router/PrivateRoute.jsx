import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

/**
 * A wrapper for guarded routes. 
 * Checks if the user is authenticated; if not, redirects to login with the attempted URL in state.
 * If authorized roles are provided, checks against the user's role; redirects to unauthorized if it doesn't match.
 */
export default function PrivateRoute({ children, allowedRoles }) {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
        // User is logged in but does not have the required role
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}
