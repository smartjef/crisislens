import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';

export function NationalOpsDashboard() {
    const { setTitle } = usePageTitle('National Operations Dashboard');
    return <div className="p-6"><h2 className="text-xl font-bold mb-4">National Overview</h2><p>View nationwide crisis data...</p></div>;
}

export function CountyDashboard() {
    const { setTitle } = usePageTitle('County Officer Dashboard');
    return <div className="p-6"><h2 className="text-xl font-bold mb-4">County Overview</h2><p>View local county data...</p></div>;
}

export function ResponderDashboard() {
    const { setTitle } = usePageTitle('Responder Dashboard');
    return <div className="p-6"><h2 className="text-xl font-bold mb-4">Responder Tasks</h2><p>Active incidents and tasks...</p></div>;
}

export function AnalystDashboard() {
    const { setTitle } = usePageTitle('Analyst Dashboard');
    return <div className="p-6"><h2 className="text-xl font-bold mb-4">Data Analytics</h2><p>Deep-dive analysis tools...</p></div>;
}
