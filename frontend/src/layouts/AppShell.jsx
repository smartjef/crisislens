import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { PageTitleProvider } from '../hooks/usePageTitle';

export default function AppShell() {
    const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cl-sidebar');
            return saved === 'collapsed';
        }
        return false;
    });

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebarCollapse = () => {
        const newVal = !isSidebarCollapsed;
        setIsSidebarCollapsed(newVal);
        if (typeof window !== 'undefined') {
            localStorage.setItem('cl-sidebar', newVal ? 'collapsed' : 'expanded');
        }
    };

    const toggleMobileSidebar = () => {
        setIsSidebarOpenMobile((prev) => !prev);
    };

    return (
        <PageTitleProvider>
            <div className="flex h-screen bg-slate-50 dark:bg-surface text-slate-900 dark:text-slate-100 overflow-hidden font-sans">

                {/* Sidebar handles both mobile full-overlay and desktop rendering */}
                <Sidebar
                    isOpen={isSidebarOpenMobile}
                    onClose={() => setIsSidebarOpenMobile(false)}
                    isCollapsed={isSidebarCollapsed}
                    toggleCollapse={toggleSidebarCollapse}
                />

                {/* Main Content Area */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <Topbar
                        onMenuClick={isMobile ? toggleMobileSidebar : toggleSidebarCollapse}
                        isSidebarCollapsed={isSidebarCollapsed}
                        isMobile={isMobile}
                    />

                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <div className="mx-auto max-w-7xl">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </PageTitleProvider>
    );
}
