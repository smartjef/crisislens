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
import { AlertsPage, AlertDetailPage, ReportsPage, AdminPage } from '../pages/GenericPages';
import SettingsPage from '../pages/SettingsPage';
import { ProfilePage } from '../pages/ProfilePage';
import CrisisLensAI from '../pages/CrisisLensAI';

// Enterprise pages
import IncidentPage   from '../pages/IncidentPage';
import BroadcastPage  from '../pages/BroadcastPage';
import CameraPage       from '../pages/CameraPage';
import CameraManagement from '../pages/CameraManagement';
import SocialIntelPage from '../pages/SocialIntelPage';
import ContactsPage   from '../pages/ContactsPage';
import PublicPortal   from '../pages/PublicPortal';

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* ── Fully public ──────────────────────────────────── */}
                <Route path="/login"        element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="/"             element={<PublicPortal />} />

                {/* ── Authenticated app shell ────────────────────────── */}
                <Route element={<AppShell />}>
                    <Route path="/map"      element={<PrivateRoute><MapPage /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
                    <Route path="/profile"  element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                    <Route path="/crisis-ai" element={<PrivateRoute><CrisisLensAI /></PrivateRoute>} />

                    {/* Dashboard gateway */}
                    <Route path="/dashboard" element={<PrivateRoute><DashboardRouter /></PrivateRoute>} />
                    <Route path="/dashboard/national"
                        element={<PrivateRoute allowedRoles={['national_ops','super_admin']}><NationalOpsDashboard /></PrivateRoute>} />
                    <Route path="/dashboard/county"
                        element={<PrivateRoute allowedRoles={['county_officer']}><CountyDashboard /></PrivateRoute>} />
                    <Route path="/dashboard/responder"
                        element={<PrivateRoute allowedRoles={['responder']}><ResponderDashboard /></PrivateRoute>} />
                    <Route path="/dashboard/analyst"
                        element={<PrivateRoute allowedRoles={['analyst']}><AnalystDashboard /></PrivateRoute>} />

                    {/* Alerts */}
                    <Route path="/alerts"
                        element={<PrivateRoute allowedRoles={['national_ops','county_officer','responder','super_admin']}><AlertsPage /></PrivateRoute>} />
                    <Route path="/alerts/:id"
                        element={<PrivateRoute allowedRoles={['national_ops','county_officer','responder','super_admin']}><AlertDetailPage /></PrivateRoute>} />

                    {/* Reports */}
                    <Route path="/reports"
                        element={<PrivateRoute allowedRoles={['analyst','national_ops','super_admin']}><ReportsPage /></PrivateRoute>} />

                    {/* ── Enterprise routes ──────────────────────────── */}
                    <Route path="/incidents"
                        element={<PrivateRoute allowedRoles={['national_ops','county_officer','responder','super_admin']}><IncidentPage /></PrivateRoute>} />

                    <Route path="/broadcasts"
                        element={<PrivateRoute allowedRoles={['national_ops','county_officer','super_admin']}><BroadcastPage /></PrivateRoute>} />

                    <Route path="/contacts"
                        element={<PrivateRoute allowedRoles={['super_admin','national_ops','county_officer']}><ContactsPage /></PrivateRoute>} />

                    <Route path="/cameras"
                        element={<PrivateRoute><CameraPage /></PrivateRoute>} />

                    <Route path="/intel"
                        element={<PrivateRoute allowedRoles={['analyst','national_ops','super_admin']}><SocialIntelPage /></PrivateRoute>} />

                    {/* Admin */}
                    <Route path="/admin"
                        element={<PrivateRoute allowedRoles={['super_admin']}><AdminPage /></PrivateRoute>} />
                    <Route path="/admin/cameras"
                        element={<PrivateRoute allowedRoles={['super_admin']}><CameraManagement /></PrivateRoute>} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
}
