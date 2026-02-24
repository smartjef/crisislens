import React, { useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDarkMode } from '../hooks/useDarkMode';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/useAlertStore';
import { Avatar, Badge } from '../components/ui';
import { Menu, Bell, Sun, Moon, Monitor, ArrowRight, AlertCircle } from 'lucide-react';
import useAlerts from '../hooks/useAlerts';
import { Link } from 'react-router-dom';

export default function Topbar({ onMenuClick, isSidebarCollapsed, isMobile }) {
    const { title } = usePageTitle();
    const { theme, setTheme } = useDarkMode();
    const { data: alertsData } = useAlerts({ status: 'active' }, { pollInterval: 30000 });
    const unreadCount = alertsData?.results?.length || 0;

    const [profileOpen, setProfileOpen] = useState(false);
    const [themeOpen, setThemeOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 dark:border-surface-border bg-white dark:bg-surface-raised px-4 shadow-sm">
            <div className="flex items-center">
                <button
                    onClick={onMenuClick}
                    className="mr-3 text-slate-500 hover:text-slate-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-flood-500 rounded-lg p-1"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
            </div>

            <div className="flex items-center space-x-4">
                {/* Theme Toggle Dropdown */}
                <div className="relative">
                    <button
                        className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-surface-border hover:text-slate-900 dark:hover:text-white focus:outline-none transition-colors"
                        onClick={() => { setThemeOpen(!themeOpen); setProfileOpen(false); }}
                    >
                        {theme === 'light' && <Sun className="w-6 h-6" />}
                        {theme === 'dark' && <Moon className="w-6 h-6" />}
                        {theme === 'system' && <Monitor className="w-6 h-6" />}
                    </button>
                    {themeOpen && (
                        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-surface-raised rounded-lg shadow-lg py-1 border border-slate-200 dark:border-surface-border z-40">
                            <button
                                onClick={() => { setTheme('light'); setThemeOpen(false); }}
                                className={`w-full text-left flex items-center px-4 py-2 text-sm ${theme === 'light' ? 'text-flood-600 bg-slate-50 dark:bg-surface-border' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-border'}`}
                            >
                                <Sun className="w-4 h-4 mr-2" /> Light
                            </button>
                            <button
                                onClick={() => { setTheme('dark'); setThemeOpen(false); }}
                                className={`w-full text-left flex items-center px-4 py-2 text-sm ${theme === 'dark' ? 'text-flood-600 bg-slate-50 dark:bg-surface-border' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-border'}`}
                            >
                                <Moon className="w-4 h-4 mr-2" /> Dark
                            </button>
                            <button
                                onClick={() => { setTheme('system'); setThemeOpen(false); }}
                                className={`w-full text-left flex items-center px-4 py-2 text-sm ${theme === 'system' ? 'text-flood-600 bg-slate-50 dark:bg-surface-border' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-border'}`}
                            >
                                <Monitor className="w-4 h-4 mr-2" /> System
                            </button>
                        </div>
                    )}
                </div>

                {/* Notification Bell */}
                <div className="relative">
                    <button
                        className="relative text-slate-500 hover:text-slate-900 dark:hover:text-white focus:outline-none p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-border transition-colors"
                        onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); setThemeOpen(false); }}
                    >
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-full transform translate-x-1/4 -translate-y-1/4 animate-bounce">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {notificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-raised rounded-xl shadow-2xl py-0 border border-slate-200 dark:border-surface-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-red-500" /> Notifications
                                </h3>
                                <Badge variant="danger" className="text-[10px] px-2">{unreadCount} Active</Badge>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {unreadCount === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm italic">
                                        No active situational alerts.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {alertsData.results.slice(0, 5).map(alert => (
                                            <Link
                                                key={alert.id}
                                                to={`/alerts/${alert.id}`}
                                                onClick={() => setNotificationsOpen(false)}
                                                className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <Badge variant={alert.severity === 'critical' ? 'danger' : 'warning'} className="text-[9px] uppercase px-1.5 py-0.5">
                                                        {alert.severity}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-400">{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-white line-clamp-1 group-hover:text-flood-600 transition-colors">
                                                    {alert.title}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
                                                    {alert.county_name} &middot; {alert.sub_county_name || 'All Areas'}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Link
                                to="/alerts"
                                onClick={() => setNotificationsOpen(false)}
                                className="block p-3 bg-slate-50 dark:bg-slate-900/50 text-center text-xs font-bold text-flood-600 hover:text-flood-700 dark:text-flood-400 border-t border-slate-100 dark:border-slate-700"
                            >
                                View All Alerts
                            </Link>
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        className="flex items-center focus:outline-none"
                        onClick={() => { setProfileOpen(!profileOpen); setThemeOpen(false); }}
                    >
                        <Avatar name="Jane Doe" size="sm" className="cursor-pointer" />
                    </button>

                    {profileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-surface-raised rounded-lg shadow-lg py-1 border border-slate-200 dark:border-surface-border z-40">
                            <a href="/profile" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-border">Profile</a>
                            <button
                                onClick={() => {
                                    setProfileOpen(false);
                                    useAuthStore.getState().logout();
                                }}
                                className="w-full text-left block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-surface-border"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
