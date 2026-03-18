import React, { useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDarkMode } from '../hooks/useDarkMode';
import { useAuthStore } from '../store/authStore';
import { Badge } from '../components/ui';
import { Menu, Bell, Sun, Moon, Monitor, AlertCircle, LogOut, User as UserIcon } from 'lucide-react';
import useAlerts from '../hooks/useAlerts';
import { Link, useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
    super_admin:    'Super Admin',
    national_ops:   'National Ops',
    county_officer: 'County Officer',
    responder:      'Responder',
    analyst:        'Analyst',
};

function formatTime() {
    return new Date().toLocaleTimeString('en-KE', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        timeZone: 'Africa/Nairobi',
    });
}

export default function Topbar({ onMenuClick }) {
    const { title } = usePageTitle();
    const { theme, setTheme } = useDarkMode();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { data: alertsData } = useAlerts({ status: 'active' }, { pollInterval: 60000 });
    const unreadCount = alertsData?.results?.length || 0;

    const [notifOpen, setNotifOpen]   = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [themeOpen, setThemeOpen]   = useState(false);
    const [, forceUpdate] = useState(0);

    // live clock tick
    React.useEffect(() => {
        const t = setInterval(() => forceUpdate(n => n + 1), 1000);
        return () => clearInterval(t);
    }, []);

    const closeAll = () => { setNotifOpen(false); setProfileOpen(false); setThemeOpen(false); };

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-border bg-surface-raised px-4 shrink-0">

            {/* Left: hamburger + breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="text-slate-500 hover:text-slate-200 focus:outline-none rounded p-1 hover:bg-white/5 transition-colors shrink-0"
                >
                    <Menu size={18} />
                </button>
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest hidden sm:block">CrisisLens</span>
                    <span className="text-slate-600 hidden sm:block">/</span>
                    <span className="text-sm font-medium text-slate-300 truncate">{title}</span>
                </div>
            </div>

            {/* Right: status strip + controls */}
            <div className="flex items-center gap-1 shrink-0">

                {/* Operational clock */}
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded border border-surface-border mr-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-slate-500 tracking-wider">EAT {formatTime()}</span>
                </div>

                {/* Active alerts count */}
                {unreadCount > 0 && (
                    <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-red-900/20 border border-red-800/30 mr-1">
                        <AlertCircle size={11} className="text-red-400" />
                        <span className="text-[10px] font-mono text-red-400 font-semibold">{unreadCount} ACTIVE</span>
                    </div>
                )}

                {/* Theme toggle */}
                <div className="relative">
                    <button
                        className="p-1.5 rounded text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
                        onClick={() => { closeAll(); setThemeOpen(v => !v); }}
                        title="Appearance"
                    >
                        {theme === 'light' ? <Sun size={15} /> : theme === 'dark' ? <Moon size={15} /> : <Monitor size={15} />}
                    </button>
                    {themeOpen && (
                        <div className="absolute right-0 mt-1 w-32 bg-surface-raised border border-surface-border rounded shadow-xl z-50 py-1">
                            {[
                                { id: 'light', icon: <Sun size={12} />, label: 'Light' },
                                { id: 'dark',  icon: <Moon size={12} />, label: 'Dark' },
                                { id: 'system',icon: <Monitor size={12} />, label: 'System' },
                            ].map(m => (
                                <button key={m.id} onClick={() => { setTheme(m.id); setThemeOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${theme === m.id ? 'text-flood-400 bg-flood-600/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                >
                                    {m.icon} {m.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notification bell */}
                <div className="relative">
                    <button
                        className="relative p-1.5 rounded text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
                        onClick={() => { closeAll(); setNotifOpen(v => !v); }}
                    >
                        <Bell size={15} />
                        {unreadCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 w-3 h-3 text-[8px] font-bold text-white bg-red-600 rounded-full flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {notifOpen && (
                        <div className="absolute right-0 mt-1 w-80 bg-surface-raised border border-surface-border rounded shadow-2xl z-50 overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-surface-border flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Active Alerts</span>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-mono text-red-400">{unreadCount} active</span>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto divide-y divide-surface-border">
                                {unreadCount === 0 ? (
                                    <div className="p-6 text-center text-slate-600 text-xs">No active alerts</div>
                                ) : alertsData.results.slice(0, 6).map(alert => (
                                    <Link
                                        key={alert.id}
                                        to={`/alerts/${alert.id}`}
                                        onClick={closeAll}
                                        className="block px-4 py-3 hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'high' ? 'text-amber-400' : 'text-flood-400'}`}>
                                                {alert.severity}
                                            </span>
                                            <span className="text-[10px] text-slate-600 font-mono">
                                                {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium text-slate-300 truncate">{alert.title}</p>
                                        <p className="text-[10px] text-slate-600 mt-0.5 uppercase font-mono tracking-wide">{alert.county_name}</p>
                                    </Link>
                                ))}
                            </div>
                            <Link to="/alerts" onClick={closeAll}
                                className="block px-4 py-2 text-center text-[10px] font-semibold text-flood-400 hover:text-flood-300 border-t border-surface-border bg-surface transition-colors uppercase tracking-wider"
                            >
                                View All Alerts
                            </Link>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div className="relative ml-1">
                    <button
                        className="flex items-center gap-2 pl-2 pr-1 py-1 rounded hover:bg-white/5 transition-colors"
                        onClick={() => { closeAll(); setProfileOpen(v => !v); }}
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-medium text-slate-300 leading-none">
                                {user ? `${user.first_name} ${user.last_name}`.trim() || user.email : '—'}
                            </p>
                            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mt-0.5">
                                {user ? (ROLE_LABELS[user.role] || user.role) : ''}
                            </p>
                        </div>
                        <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-300 font-mono shrink-0">
                            {user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '?'}
                        </div>
                    </button>

                    {profileOpen && (
                        <div className="absolute right-0 mt-1 w-44 bg-surface-raised border border-surface-border rounded shadow-xl z-50 py-1">
                            <Link to="/profile" onClick={closeAll}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                            >
                                <UserIcon size={12} /> My Profile
                            </Link>
                            <Link to="/settings" onClick={closeAll}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                            >
                                <Monitor size={12} /> Settings
                            </Link>
                            <div className="border-t border-surface-border my-1" />
                            <button
                                onClick={() => { closeAll(); useAuthStore.getState().logout(); navigate('/login'); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                            >
                                <LogOut size={12} /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
