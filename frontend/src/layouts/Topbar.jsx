import React, { useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDarkMode } from '../hooks/useDarkMode';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/useAlertStore';
import { Avatar, Badge } from '../components/ui';
import { Menu, Bell, Sun, Moon, Monitor } from 'lucide-react';

export default function Topbar({ onMenuClick, isSidebarCollapsed, isMobile }) {
    const { title } = usePageTitle();
    const { theme, setTheme } = useDarkMode();
    const unreadCount = useAlertStore((state) => state.unreadCount);

    const [profileOpen, setProfileOpen] = useState(false);
    const [themeOpen, setThemeOpen] = useState(false);

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
                <button className="relative text-slate-500 hover:text-slate-900 dark:hover:text-white focus:outline-none">
                    <Bell className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-danger rounded-full transform translate-x-1/4 -translate-y-1/4">
                            {unreadCount}
                        </span>
                    )}
                </button>

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
