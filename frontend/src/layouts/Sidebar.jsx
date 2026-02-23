import React, { useState, useEffect } from 'react';
import { Avatar } from '../components/ui';
import { Map, LayoutDashboard, Bell, FileText, Settings, Shield, X, ChevronsRight, ChevronsLeft, Activity } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, isCollapsed, toggleCollapse }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navLinks = [
        { name: 'Map', icon: Map, path: '/map' },
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Alerts', icon: Bell, path: '/alerts' },
        { name: 'Reports', icon: FileText, path: '/reports' },
        { name: 'Settings', icon: Settings, path: '/settings' },
        { name: 'Admin', icon: Shield, path: '/admin' },
    ];

    /* Desktop Render Strategy:
       Sidebar width is 240px when expanded, 80px when collapsed.
       
       Mobile Render Strategy:
       Sidebar is a full overlay or fixed modal.
    */

    const content = (
        <div className={`flex flex-col h-full bg-surface relative overflow-hidden transition-all duration-300 ${!isMobile ? (isCollapsed ? 'w-20' : 'w-60') : 'w-64'}`}>

            {/* Decorative background blobs (from Login) */}
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-flood-600/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-flood-800/20 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between h-16 px-4 border-b border-white/5">
                <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-8 h-8 rounded bg-flood-600 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-white" />
                    </div>
                    {(!isCollapsed || isMobile) && <span className="font-semibold text-white tracking-tight font-mono whitespace-nowrap">CrisisLens</span>}
                </div>
                {isMobile && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                )}
            </div>

            {/* Nav Links */}
            <nav className="relative z-10 flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {navLinks.map((link) => (
                    <a
                        key={link.name}
                        href={link.path}
                        className={`flex items-center px-3 py-2.5 rounded text-slate-400 hover:bg-white/5 hover:text-white transition-colors
              ${isCollapsed && !isMobile ? 'justify-center' : ''}`}
                        title={isCollapsed && !isMobile ? link.name : ''}
                    >
                        <link.icon className="w-5 h-5 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && <span className="ml-3 text-sm font-medium whitespace-nowrap">{link.name}</span>}
                    </a>
                ))}
            </nav>

            {/* Collapse Toggle for Desktop */}
            {!isMobile && (
                <div className="relative z-10 px-3 py-3 border-t border-white/5">
                    <button
                        onClick={toggleCollapse}
                        className="w-full flex items-center justify-center py-2 text-slate-500 hover:text-white hover:bg-white/5 rounded transition-colors"
                        title="Toggle Sidebar"
                    >
                        {isCollapsed ? <ChevronsRight className="w-5 h-5 flex-shrink-0" /> : <ChevronsLeft className="w-5 h-5 flex-shrink-0" />}
                    </button>
                </div>
            )}

            {/* User Profile */}
            <div className={`relative z-10 p-4 border-t border-white/5 ${isCollapsed && !isMobile ? 'flex justify-center' : 'flex items-center space-x-3'} overflow-hidden`}>
                <Avatar name="Jane Doe" size="md" />
                {(!isCollapsed || isMobile) && (
                    <div className="flex flex-col whitespace-nowrap">
                        <span className="text-sm font-medium text-white">Jane Doe</span>
                        <span className="text-xs text-slate-400">COUNTY OFFICER</span>
                    </div>
                )}
            </div>

        </div>
    );

    if (isMobile) {
        return (
            <div className={`fixed inset-0 z-40 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
                <div className="absolute inset-y-0 left-0">
                    {content}
                </div>
            </div>
        );
    }

    return <div className="hidden md:block flex-shrink-0 h-screen sticky top-0">{content}</div>;
}
