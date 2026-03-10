import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { PageTitleProvider } from '../hooks/usePageTitle';
import { useAlertStore } from '../store/useAlertStore';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

function ToastContainer() {
    const toasts = useAlertStore(s => s.toasts);
    const removeToast = useAlertStore(s => s.removeToast);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`flex items-center gap-3 min-w-[300px] p-4 rounded-xl shadow-lg border animate-in slide-in-from-bottom-5 fade-in duration-300
                        ${t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                            t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                                'bg-blue-50 border-blue-200 text-blue-800'}`}
                >
                    {t.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                        t.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                            <Info className="w-5 h-5 text-blue-500" />}
                    <span className="flex-1 font-medium text-sm">{t.message}</span>
                    <button onClick={() => removeToast(t.id)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

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
            <div className="flex h-screen bg-slate-50 dark:bg-surface text-slate-800 dark:text-slate-200 overflow-hidden font-sans">

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

                    <main className="flex-1 overflow-y-auto p-4 md:p-5">
                        <div className="mx-auto max-w-7xl">
                            <Outlet />
                        </div>
                    </main>
                </div>
                <ToastContainer />
            </div>
        </PageTitleProvider>
    );
}
