import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';

export function AlertsPage() {
    const { setTitle } = usePageTitle('Alerts');
    return <div className="p-6">Alerts Listing Here</div>;
}

export function AlertDetailPage() {
    const { setTitle } = usePageTitle('Alert Details');
    return <div className="p-6">Alert Details Here</div>;
}

export function ReportsPage() {
    const { setTitle } = usePageTitle('Reports');
    return <div className="p-6">Reports and Documents</div>;
}

export function SettingsPage() {
    const { setTitle } = usePageTitle('Settings');
    return <div className="p-6">User Settings</div>;
}

export function AdminPage() {
    const { setTitle } = usePageTitle('Admin Panel');
    return <div className="p-6">Global Administration</div>;
}
