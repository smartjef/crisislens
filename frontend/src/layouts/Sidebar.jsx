import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Map, LayoutDashboard, Bell, FileText, Settings, Shield, X, ChevronsRight, ChevronsLeft, Activity, BrainCircuit, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

/* Role → allowed paths */
const ROLE_PATHS = {
    super_admin:    ['/map', '/dashboard', '/alerts', '/reports', '/crisis-ai', '/admin', '/settings'],
    national_ops:   ['/map', '/dashboard', '/alerts', '/reports', '/crisis-ai', '/settings'],
    county_officer: ['/map', '/dashboard', '/alerts', '/crisis-ai', '/settings'],
    responder:      ['/map', '/dashboard', '/alerts', '/crisis-ai', '/settings'],
    analyst:        ['/map', '/dashboard', '/reports', '/crisis-ai', '/settings'],
};

const ALL_NAV = [
    { name: 'Dashboard',  icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Live Map',   icon: Map,              path: '/map' },
    { name: 'Alerts',     icon: Bell,             path: '/alerts' },
    { name: 'Reports',    icon: FileText,         path: '/reports' },
    { name: 'Crisis AI',  icon: BrainCircuit,     path: '/crisis-ai' },
    { name: 'Admin',      icon: Shield,           path: '/admin' },
    { name: 'Settings',   icon: Settings,         path: '/settings' },
];

const ROLE_LABELS = {
    super_admin:    'Super Admin',
    national_ops:   'National Ops',
    county_officer: 'County Officer',
    responder:      'Responder',
    analyst:        'Analyst',
};

const ROLE_COLORS = {
    super_admin:    'text-purple-400',
    national_ops:   'text-flood-400',
    county_officer: 'text-emerald-400',
    responder:      'text-amber-400',
    analyst:        'text-slate-400',
};

export default function Sidebar({ isOpen, onClose, isCollapsed, toggleCollapse }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { user } = useAuthStore();
    const location = useLocation();

    const allowed = user ? (ROLE_PATHS[user.role] || []) : [];
    const navLinks = ALL_NAV.filter(link => allowed.includes(link.path));

    const roleLabel = user ? (ROLE_LABELS[user.role] || user.role) : '';
    const roleColor = user ? (ROLE_COLORS[user.role] || 'text-slate-400') : 'text-slate-400';
    const initials = user
        ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase()
        : '?';

    const expanded = !isCollapsed || isMobile;

    const content = (
        <div className={`flex flex-col h-full bg-surface border-r border-surface-border transition-all duration-200 ${!isMobile ? (isCollapsed ? 'w-[60px]' : 'w-[220px]') : 'w-[220px]'}`}>

            {/* Logo */}
            <div className="flex items-center justify-between h-14 px-3 border-b border-surface-border shrink-0">
                <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-7 h-7 rounded bg-flood-600 flex items-center justify-center shrink-0">
                        <Activity size={14} className="text-white" />
                    </div>
                    {expanded && (
                        <div className="overflow-hidden">
                            <span className="font-semibold text-white text-sm tracking-tight font-mono whitespace-nowrap">CrisisLens</span>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest whitespace-nowrap font-mono">GOK Early Warning</p>
                        </div>
                    )}
                </div>
                {isMobile && (
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors ml-1">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                {navLinks.map((link) => {
                    const isActive = location.pathname === link.path || location.pathname.startsWith(link.path + '/');
                    return (
                        <Link
                            key={link.name}
                            to={link.path}
                            onClick={isMobile ? onClose : undefined}
                            title={!expanded ? link.name : undefined}
                            className={[
                                'flex items-center rounded px-2 py-2 text-xs font-medium transition-colors group',
                                isActive
                                    ? 'bg-flood-600/10 text-flood-400 border border-flood-600/20'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent',
                                !expanded ? 'justify-center' : 'gap-2.5',
                            ].join(' ')}
                        >
                            <link.icon size={15} className="shrink-0" />
                            {expanded && <span>{link.name}</span>}
                            {isActive && expanded && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-flood-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse toggle (desktop) */}
            {!isMobile && (
                <div className="px-2 py-2 border-t border-surface-border">
                    <button
                        onClick={toggleCollapse}
                        title="Toggle Sidebar"
                        className="w-full flex items-center justify-center py-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/5 rounded transition-colors"
                    >
                        {isCollapsed
                            ? <ChevronsRight size={14} />
                            : <span className="flex items-center gap-1 text-[10px] text-slate-600"><ChevronsLeft size={14} /> Collapse</span>
                        }
                    </button>
                </div>
            )}

            {/* User section */}
            <div className={`border-t border-surface-border p-2 ${!expanded ? 'flex justify-center' : ''}`}>
                {expanded ? (
                    <div className="flex items-center gap-2.5 p-2 rounded hover:bg-white/5 group">
                        <div className="w-7 h-7 rounded bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0 font-mono">
                            {initials}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-medium text-slate-300 truncate">
                                {user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'Unknown'}
                            </p>
                            <p className={`text-[10px] font-mono uppercase tracking-wider ${roleColor}`}>{roleLabel}</p>
                        </div>
                        <button
                            onClick={() => useAuthStore.getState().logout()}
                            title="Sign out"
                            className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <LogOut size={13} />
                        </button>
                    </div>
                ) : (
                    <div
                        title={user ? `${user.first_name} ${user.last_name}` : 'User'}
                        className="w-7 h-7 rounded bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 font-mono"
                    >
                        {initials}
                    </div>
                )}
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <div className={`fixed inset-0 z-40 transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="fixed inset-0 bg-black/60" onClick={onClose} />
                <div className="absolute inset-y-0 left-0 z-10">{content}</div>
            </div>
        );
    }

    return <div className="hidden md:block flex-shrink-0 h-screen sticky top-0">{content}</div>;
}
