import React, { useState, useEffect } from 'react';
import { Settings, Shield, User, Bell, Monitor, Moon, Sun, Lock, Save } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/useAlertStore';
import { useDarkMode } from '../hooks/useDarkMode';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';

function Panel({ title, icon: Icon, children }) {
    return (
        <div className="bg-surface-raised border border-surface-border rounded">
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-surface-border">
                {Icon && <Icon size={13} className="text-slate-500" />}
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{title}</span>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">{label}</label>
            {children}
            {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
    );
}

const INPUT = 'w-full bg-surface border border-surface-border rounded px-3 py-2 text-xs font-mono text-slate-300 placeholder-slate-700 focus:ring-1 focus:ring-flood-500 outline-none transition-all';
const INPUT_ERR = 'w-full bg-surface border border-red-700 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-red-500 outline-none transition-all';
const INPUT_DISABLED = 'w-full bg-surface border border-surface-border rounded px-3 py-2 text-xs font-mono text-slate-600 cursor-not-allowed outline-none';

export default function SettingsPage() {
    usePageTitle('Settings');
    const { user, setUser } = useAuthStore();
    const addToast = useAlertStore(s => s.addToast);
    const { theme, setTheme } = useDarkMode();

    const [profileData, setProfileData] = useState({ first_name: '', last_name: '', phone: '', organization: '' });
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState({});
    const [notifPref, setNotifPref] = useState(() => localStorage.getItem('cl-notif-pref') || 'all');

    useEffect(() => {
        if (user) setProfileData({ first_name: user.first_name || '', last_name: user.last_name || '', phone: user.phone || '', organization: user.organization || '' });
    }, [user]);

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            const res = await client.patch('/api/auth/me/', profileData);
            setUser({ ...user, ...res.data });
            addToast('Profile updated', 'success');
        } catch {
            addToast('Failed to update profile', 'error');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        setPasswordLoading(true);
        setPasswordErrors({});
        try {
            await client.post('/api/auth/change-password/', passwordData);
            addToast('Password changed', 'success');
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            if (err.response?.data) setPasswordErrors(err.response.data);
            else addToast('Failed to change password', 'error');
        } finally {
            setPasswordLoading(false);
        }
    };

    if (!user) return null;

    const ROLE_LABEL = { super_admin: 'Super Admin', national_ops: 'National Ops', county_officer: 'County Officer', responder: 'Responder', analyst: 'Analyst' };

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="pb-4 border-b border-surface-border">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1">Account Management</p>
                <h1 className="text-xl font-semibold text-slate-200">Settings</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Summary sidebar */}
                <div className="space-y-3">
                    <div className="bg-surface-raised border border-surface-border rounded p-5">
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-surface-border">
                            <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center font-semibold text-slate-200 text-sm font-mono shrink-0">
                                {user.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-slate-200 truncate">{user.first_name} {user.last_name}</p>
                                <p className="text-[10px] text-slate-600 truncate font-mono">{user.email}</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-xs">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Role</p>
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-flood-400 bg-flood-900/20 border-flood-800/30">
                                    {ROLE_LABEL[user.role] || user.role}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">County</p>
                                <p className="font-mono text-slate-400">{user.county_name || 'National HQ'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Member Since</p>
                                <p className="font-mono text-slate-400">
                                    {user.date_joined ? new Date(user.date_joined).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-surface-raised border border-surface-border rounded divide-y divide-surface-border">
                        {[
                            { label: 'Profile Details', href: '#profile',     icon: User },
                            { label: 'Security',        href: '#security',    icon: Lock },
                            { label: 'Preferences',     href: '#preferences', icon: Monitor },
                        ].map(({ label, href, icon: Icon }) => (
                            <a key={href} href={href} className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
                                <Icon size={12} /> {label}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Forms */}
                <div className="lg:col-span-2 space-y-4">
                    <section id="profile">
                        <Panel title="Profile Settings" icon={User}>
                            <form onSubmit={handleProfileSave} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="First Name">
                                        <input type="text" value={profileData.first_name}
                                            onChange={e => setProfileData(p => ({ ...p, first_name: e.target.value }))}
                                            className={INPUT} />
                                    </Field>
                                    <Field label="Last Name">
                                        <input type="text" value={profileData.last_name}
                                            onChange={e => setProfileData(p => ({ ...p, last_name: e.target.value }))}
                                            className={INPUT} />
                                    </Field>
                                    <Field label="Email (Read-only)">
                                        <input type="email" value={user.email} disabled className={INPUT_DISABLED} />
                                    </Field>
                                    <Field label="Phone Number">
                                        <input type="tel" value={profileData.phone}
                                            onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                                            className={INPUT} />
                                    </Field>
                                </div>
                                <Field label="Organisation">
                                    <input type="text" value={profileData.organization}
                                        onChange={e => setProfileData(p => ({ ...p, organization: e.target.value }))}
                                        className={INPUT} />
                                </Field>
                                <div className="flex justify-end pt-1">
                                    <button type="submit" disabled={profileLoading}
                                        className="flex items-center gap-1.5 bg-flood-700 hover:bg-flood-600 text-white text-xs font-medium px-4 py-2 rounded disabled:opacity-50 transition-colors"
                                    >
                                        <Save size={12} /> {profileLoading ? 'Saving…' : 'Save Profile'}
                                    </button>
                                </div>
                            </form>
                        </Panel>
                    </section>

                    <section id="security">
                        <Panel title="Security" icon={Shield}>
                            <form onSubmit={handlePasswordSave} className="space-y-4">
                                <Field label="Current Password" error={passwordErrors.current_password?.[0]}>
                                    <input type="password" value={passwordData.current_password}
                                        onChange={e => setPasswordData(p => ({ ...p, current_password: e.target.value }))}
                                        className={passwordErrors.current_password ? INPUT_ERR : INPUT} />
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="New Password" error={passwordErrors.new_password?.[0]}>
                                        <input type="password" value={passwordData.new_password}
                                            onChange={e => setPasswordData(p => ({ ...p, new_password: e.target.value }))}
                                            className={passwordErrors.new_password ? INPUT_ERR : INPUT} />
                                    </Field>
                                    <Field label="Confirm Password" error={passwordErrors.confirm_password?.[0]}>
                                        <input type="password" value={passwordData.confirm_password}
                                            onChange={e => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))}
                                            className={passwordErrors.confirm_password ? INPUT_ERR : INPUT} />
                                    </Field>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button type="submit" disabled={passwordLoading}
                                        className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium px-4 py-2 rounded disabled:opacity-50 transition-colors"
                                    >
                                        <Lock size={12} /> {passwordLoading ? 'Changing…' : 'Change Password'}
                                    </button>
                                </div>
                            </form>
                        </Panel>
                    </section>

                    <section id="preferences">
                        <Panel title="Preferences" icon={Settings}>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Appearance</p>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'light', icon: <Sun size={12} />, label: 'Light' },
                                            { id: 'dark',  icon: <Moon size={12} />, label: 'Dark' },
                                            { id: 'system',icon: <Monitor size={12} />, label: 'System' },
                                        ].map(m => (
                                            <button key={m.id} onClick={() => setTheme(m.id)}
                                                className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded border transition-colors ${theme === m.id ? 'border-flood-700 bg-flood-900/20 text-flood-400' : 'border-surface-border text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                                            >
                                                {m.icon} {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t border-surface-border" />
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1 flex items-center gap-1.5">
                                        <Bell size={10} /> Alert Notifications
                                    </p>
                                    <p className="text-[10px] text-slate-700 mb-3">Control which alerts trigger browser notifications.</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {[
                                            { id: 'all',      label: 'All Alerts',    desc: 'Every event' },
                                            { id: 'critical', label: 'High Priority', desc: 'High & Critical only' },
                                            { id: 'none',     label: 'Minimal',       desc: 'Critical only' },
                                        ].map(p => (
                                            <button key={p.id} onClick={() => { setNotifPref(p.id); localStorage.setItem('cl-notif-pref', p.id); }}
                                                className={`flex flex-col text-left px-3 py-2.5 rounded border transition-colors ${notifPref === p.id ? 'border-flood-700 bg-flood-900/20' : 'border-surface-border hover:border-slate-600'}`}
                                            >
                                                <span className={`text-xs font-medium ${notifPref === p.id ? 'text-flood-400' : 'text-slate-400'}`}>{p.label}</span>
                                                <span className="text-[10px] text-slate-600 mt-0.5">{p.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Panel>
                    </section>
                </div>
            </div>
        </div>
    );
}
