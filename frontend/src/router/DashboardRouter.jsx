import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

/**
 * A gateway route for /dashboard that reads the user's role and redirects
 * to the appropriate sub-dashboard.
 */
export default function DashboardRouter() {
    const { user } = useAuthStore();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    switch (user.role) {
        case 'national_ops':
        case 'super_admin':
            return <Navigate to="/dashboard/national" replace />;
        case 'county_officer':
            return <Navigate to="/dashboard/county" replace />;
        case 'responder':
            return <Navigate to="/dashboard/responder" replace />;
        case 'analyst':
            return <Navigate to="/dashboard/analyst" replace />;
        default:
            return <Navigate to="/unauthorized" replace />;
    }
}
