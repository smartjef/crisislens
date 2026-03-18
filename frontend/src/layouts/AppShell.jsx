import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MissionStatusBar from '../components/MissionStatusBar';
import { PageTitleProvider } from '../hooks/usePageTitle';
import { useAlertStore } from '../store/useAlertStore';
import { useAuthStore } from '../store/authStore';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

function ToastContainer() {
    const toasts = useAlertStore(s => s.toasts);
    const removeToast = useAlertStore(s => s.removeToast);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`flex items-center gap-3 min-w-[280px] p-3 rounded-sm border animate-in slide-in-from-right-5 fade-in duration-300
                        ${t.type === 'error' ? 'bg-danger-600 text-white border-danger-700' :
                            t.type === 'success' ? 'bg-success-600 text-white border-success-700' :
                                'bg-flood-600 text-white border-flood-700'}`}
                >
                    {t.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
                        t.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
                            <Info className="w-4 h-4" />}
                    <span className="flex-1 text-[10px] font-black uppercase tracking-wider">{t.message}</span>
                    <button onClick={() => removeToast(t.id)} className="p-1 hover:bg-white/10 rounded-sm transition-colors">
                        <X className="w-3.5 h-3.5" />
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

    // 30-min inactivity auto-logout
    useEffect(() => {
        let timer;
        const reset = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                useAuthStore.getState().logout();
                window.location.href = '/login';
            }, 30 * 60 * 1000); // 30 minutes
        };
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, reset, { passive: true }));
        reset(); // start timer
        return () => {
            clearTimeout(timer);
            events.forEach(e => window.removeEventListener(e, reset));
        };
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
                    <MissionStatusBar />

                    <main className="flex-1 overflow-hidden">
                        <Outlet />
                    </main>
                </div>
                <ToastContainer />
            </div>
        </PageTitleProvider>
    );
}
