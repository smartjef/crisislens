import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ShieldAlert, Users, TrendingUp, AlertTriangle, FileText, CheckCircle } from 'lucide-react';

export function NationalOpsDashboard() {
    usePageTitle('National Operations Dashboard');
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">National Overview</h2>
                    <p className="text-slate-500">Live crisis metrics and high-level tracking across all counties.</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    Generate National Report
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Alerts</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">124</h3>
                        </div>
                        <div className="p-3 bg-red-50 text-red-600 rounded-full">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Affected Regions</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">12</h3>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Responders Deployed</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">1,048</h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                            <Users className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Risk Trend</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">+14%</h3>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Critical Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {[1, 2, 3].map((_, i) => (
                                <li key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-slate-800">Severe Flooding in Tana River Basin</h4>
                                        <p className="text-sm text-slate-500 mt-1">Water levels exceeded 4.5m mark. Mass evacuations required.</p>
                                    </div>
                                    <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">2 hrs ago</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Resource Allocation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">Medical Supplies</span>
                                    <span className="text-slate-500">85% Usage</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 w-[85%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">Evacuation Vehicles</span>
                                    <span className="text-slate-500">62% Usage</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 w-[62%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">Food Rations</span>
                                    <span className="text-slate-500">91% Usage</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 w-[91%]"></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export function CountyDashboard() {
    usePageTitle('County Officer Dashboard');
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Local County Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Vulnerable Sub-counties</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-500 mb-4">Immediate attention required in these areas based on forecasted rainfall.</p>
                        <div className="space-y-3">
                            {['Nyando', 'Muhoroni', 'Nyakach'].map(name => (
                                <div key={name} className="p-3 bg-red-50 text-red-800 rounded-lg flex justify-between items-center font-medium border border-red-100">
                                    <span>{name}</span>
                                    <span>Forecast: 150mm</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Local Deployment Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-500 mb-4">Teams currently active in the field.</p>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-full"><Users className="w-8 h-8" /></div>
                            <div>
                                <h4 className="text-2xl font-bold text-slate-800">45 Personnel</h4>
                                <span className="text-sm text-slate-500">Active across 3 zones</span>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full">Manage Field Teams</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export function ResponderDashboard() {
    usePageTitle('Responder Dashboard');
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Field Operations</h2>
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Your Assigned Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        <li className="p-4 border border-slate-200 rounded-xl flex items-start justify-between bg-white shadow-sm">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-slate-800">Evacuation Route Clearance</h4>
                                    <p className="text-sm text-slate-500 mt-1">Clear debris blocking the main evacuation artery on B1 Highway.</p>
                                </div>
                            </div>
                            <Button size="sm" className="bg-indigo-600 text-white shrink-0">Mark In-Progress</Button>
                        </li>
                        <li className="p-4 border border-slate-200 rounded-xl flex items-start justify-between bg-white shadow-sm">
                            <div className="flex gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-slate-800">Distribute Aid at Camp Bravo</h4>
                                    <p className="text-sm text-slate-500 mt-1">Deliver 500 dry ration packs to displaced persons.</p>
                                </div>
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-500 rounded-full shrink-0">Completed</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}

export function AnalystDashboard() {
    usePageTitle('Analyst Dashboard');
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Data Analytics & Forecasting</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Predictive Model Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-slate-600">Weather Integration (KMD)</span>
                                <span className="text-emerald-600 font-medium text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Syncing</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-slate-600">Satellite Imagery Pipeline</span>
                                <span className="text-emerald-600 font-medium text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Operational</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-slate-600">Hydrological Models</span>
                                <span className="text-amber-600 font-medium text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> 92% Confidence</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-indigo-50 border-indigo-100">
                    <CardContent className="p-6 flex flex-col justify-center items-center h-full text-center">
                        <TrendingUp className="w-12 h-12 text-indigo-500 mb-4" />
                        <h3 className="text-xl font-bold text-indigo-900 mb-2">Run Risk Simulations</h3>
                        <p className="text-indigo-700 text-sm mb-6">Execute Monte Carlo simulations for the upcoming 14-day rainfall forecast.</p>
                        <Button className="bg-indigo-600 text-white hover:bg-indigo-700 w-full rounded-xl">Initialize Simulation Engine</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
