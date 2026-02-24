import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AppShell from '../layouts/AppShell';
import MapPage from '../pages/MapPage';

// Auth & Guards
import PrivateRoute from './PrivateRoute';
import DashboardRouter from './DashboardRouter';

// Pages
import LoginPage from '../pages/LoginPage';
import { UnauthorizedPage, NotFoundPage } from '../pages/ErrorPages';
import { NationalOpsDashboard, CountyDashboard, ResponderDashboard, AnalystDashboard } from '../pages/Dashboards';
import { AlertsPage, AlertDetailPage, ReportsPage, SettingsPage, AdminPage } from '../pages/GenericPages';
import { ProfilePage } from '../pages/ProfilePage';

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public / Unauthenticated */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* 
                  Redirect the root path. The issue doesn't strictly say where,
                  but typically it goes to dashboard or map. Let's send them to dashboard.
                */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Secure App Shell Routes */}
                <Route element={<AppShell />}>
                    {/* The any-auth map route */}
                    <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

                    {/* Dashboard Routing Gateway */}
                    <Route path="/dashboard" element={<PrivateRoute><DashboardRouter /></PrivateRoute>} />

                    {/* Role-specific Dashboards */}
                    <Route
                        path="/dashboard/national"
                        element={<PrivateRoute allowedRoles={['national_ops', 'super_admin']}><NationalOpsDashboard /></PrivateRoute>}
                    />
                    <Route
                        path="/dashboard/county"
                        element={<PrivateRoute allowedRoles={['county_officer']}><CountyDashboard /></PrivateRoute>}
                    />
                    <Route
                        path="/dashboard/responder"
                        element={<PrivateRoute allowedRoles={['responder']}><ResponderDashboard /></PrivateRoute>}
                    />
                    <Route
                        path="/dashboard/analyst"
                        element={<PrivateRoute allowedRoles={['analyst']}><AnalystDashboard /></PrivateRoute>}
                    />

                    {/* Alerts - national_ops, county_officer, responder */}
                    <Route
                        path="/alerts"
                        element={<PrivateRoute allowedRoles={['national_ops', 'county_officer', 'responder']}><AlertsPage /></PrivateRoute>}
                    />
                    <Route
                        path="/alerts/:id"
                        element={<PrivateRoute allowedRoles={['national_ops', 'county_officer', 'responder']}><AlertDetailPage /></PrivateRoute>}
                    />

                    {/* Reports - analyst, national_ops */}
                    <Route
                        path="/reports"
                        element={<PrivateRoute allowedRoles={['analyst', 'national_ops']}><ReportsPage /></PrivateRoute>}
                    />

                    {/* Admin - super_admin */}
                    <Route
                        path="/admin"
                        element={<PrivateRoute allowedRoles={['super_admin']}><AdminPage /></PrivateRoute>}
                    />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
}
