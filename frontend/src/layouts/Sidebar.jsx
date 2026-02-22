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
        <div className={`flex flex-col h-full bg-white dark:bg-surface-raised border-r border-gray-200 dark:border-surface-border transition-all duration-300 ${!isMobile ? (isCollapsed ? 'w-20' : 'w-60') : 'w-64'}`}>

            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-surface-border">
                <div className="flex items-center space-x-2 overflow-hidden">
                    <Activity className="w-6 h-6 text-flood-600 flex-shrink-0" />
                    {(!isCollapsed || isMobile) && <span className="font-bold text-lg whitespace-nowrap dark:text-white">CrisisLens</span>}
                </div>
                {isMobile && (
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                )}
            </div>

            {/* Nav Links */}
            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                {navLinks.map((link) => (
                    <a
                        key={link.name}
                        href={link.path}
                        className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-border hover:text-gray-900 dark:hover:text-white transition-colors
              ${isCollapsed && !isMobile ? 'justify-center' : ''}`}
                        title={isCollapsed && !isMobile ? link.name : ''}
                    >
                        <link.icon className="w-5 h-5 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && <span className="ml-3 font-medium whitespace-nowrap">{link.name}</span>}
                    </a>
                ))}
            </nav>

            {/* Collapse Toggle for Desktop */}
            {!isMobile && (
                <div className="p-4 border-t border-gray-200 dark:border-surface-border border-b">
                    <button
                        onClick={toggleCollapse}
                        className="w-full flex items-center justify-center py-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-border rounded-lg transition-colors"
                        title="Toggle Sidebar"
                    >
                        {isCollapsed ? <ChevronsRight className="w-5 h-5 flex-shrink-0" /> : <ChevronsLeft className="w-5 h-5 flex-shrink-0" />}
                    </button>
                </div>
            )}

            {/* User Profile */}
            <div className={`p-4 ${isCollapsed && !isMobile ? 'flex justify-center' : 'flex items-center space-x-3'} overflow-hidden`}>
                <Avatar name="Jane Doe" size="md" />
                {(!isCollapsed || isMobile) && (
                    <div className="flex flex-col whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Jane Doe</span>
                        <span className="text-xs font-medium text-flood-600 dark:text-flood-400">COUNTY OFFICER</span>
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
