import React, { useState, useEffect } from 'react';
import { Settings, Shield, User, Bell, Monitor, Moon, Sun, Lock, Info, Save } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/useAlertStore';
import { useDarkMode } from '../hooks/useDarkMode';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function SettingsPage() {
    usePageTitle('Settings');
    const { user, setUser } = useAuthStore();
    const addToast = useAlertStore((state) => state.addToast);
    const { theme, setTheme } = useDarkMode();

    // Profile state
    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        organization: '',
    });
    const [profileLoading, setProfileLoading] = useState(false);

    // Password state
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState({});

    // Preferences state
    const [notifications, setNotifications] = useState(() => {
        return localStorage.getItem('cl-notif-pref') || 'all';
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                phone: user.phone || '',
                organization: user.organization || '',
            });
        }
    }, [user]);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            const res = await client.patch('/api/auth/me/', profileData);
            setUser({ ...user, ...res.data });
            addToast('Profile updated successfully', 'success');
        } catch (err) {
            addToast('Failed to update profile', 'error');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        if (passwordErrors[name]) {
            setPasswordErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        setPasswordLoading(true);
        setPasswordErrors({});
        try {
            await client.post('/api/auth/change-password/', passwordData);
            addToast('Password changed successfully', 'success');
            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: '',
            });
        } catch (err) {
            if (err.response?.data) {
                setPasswordErrors(err.response.data);
            } else {
                addToast('Failed to change password', 'error');
            }
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleNotifChange = (val) => {
        setNotifications(val);
        localStorage.setItem('cl-notif-pref', val);
        addToast('Notification preferences updated', 'success');
    };

    if (!user) return null;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Account Settings</h2>
                <p className="text-slate-500 dark:text-slate-400">Manage your profile, security, and preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Navigation/Summary */}
                <div className="space-y-6">
                    <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-700 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-flood-100 dark:bg-flood-900/30 flex items-center justify-center text-flood-600 dark:text-flood-400">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white truncate">{user.full_name}</h3>
                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                        </div>
                        <div className="p-2 space-y-1">
                            <a href="#profile" className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <User className="w-4 h-4" /> Profile Details
                            </a>
                            <a href="#security" className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Lock className="w-4 h-4" /> Security
                            </a>
                            <a href="#preferences" className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Monitor className="w-4 h-4" /> Preferences
                            </a>
                        </div>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                        <CardHeader className="p-4 border-b dark:border-slate-700">
                            <CardTitle className="text-sm flex items-center gap-2"><Info className="w-4 h-4 text-slate-400" /> Account Info</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</label>
                                <div className="mt-1">
                                    <Badge variant={user.role === 'super_admin' ? 'danger' : user.role === 'national_ops' ? 'warning' : 'info'}>
                                        {user.role.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">County Assignment</label>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">{user.county_name || 'National'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Member Since</label>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                                    {new Date(user.date_joined).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Forms */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile Section */}
                    <section id="profile">
                        <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
                            <CardHeader className="border-b dark:border-slate-700 bg-white dark:bg-slate-800">
                                <CardTitle className="flex items-center gap-2 text-xl"><User className="w-5 h-5 text-flood-600" /> Profile Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <form onSubmit={handleProfileSave} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">First Name</label>
                                            <input
                                                type="text"
                                                name="first_name"
                                                value={profileData.first_name}
                                                onChange={handleProfileChange}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-flood-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Last Name</label>
                                            <input
                                                type="text"
                                                name="last_name"
                                                value={profileData.last_name}
                                                onChange={handleProfileChange}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-flood-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address (Read-only)</label>
                                            <input
                                                type="email"
                                                value={user.email}
                                                disabled
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={profileData.phone}
                                                onChange={handleProfileChange}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-flood-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Organisation</label>
                                        <input
                                            type="text"
                                            name="organization"
                                            value={profileData.organization}
                                            onChange={handleProfileChange}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-flood-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="pt-4 flex justify-end">
                                        <Button
                                            type="submit"
                                            loading={profileLoading}
                                            className="bg-flood-600 hover:bg-flood-700 text-white min-w-[140px]"
                                        >
                                            <Save className="w-4 h-4 mr-2" /> Save Profile
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Security Section */}
                    <section id="security">
                        <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
                            <CardHeader className="border-b dark:border-slate-700 bg-white dark:bg-slate-800">
                                <CardTitle className="flex items-center gap-2 text-xl"><Shield className="w-5 h-5 text-amber-500" /> Security Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <form onSubmit={handlePasswordSave} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Password</label>
                                        <input
                                            type="password"
                                            name="current_password"
                                            value={passwordData.current_password}
                                            onChange={handlePasswordChange}
                                            className={`w-full px-4 py-2 rounded-lg border ${passwordErrors.current_password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-flood-500 outline-none transition-all`}
                                        />
                                        {passwordErrors.current_password && (
                                            <p className="text-xs text-red-500 mt-1">{passwordErrors.current_password[0]}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                                            <input
                                                type="password"
                                                name="new_password"
                                                value={passwordData.new_password}
                                                onChange={handlePasswordChange}
                                                className={`w-full px-4 py-2 rounded-lg border ${passwordErrors.new_password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-flood-500 outline-none transition-all`}
                                            />
                                            {passwordErrors.new_password && (
                                                <p className="text-xs text-red-500 mt-1">{passwordErrors.new_password[0]}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                                            <input
                                                type="password"
                                                name="confirm_password"
                                                value={passwordData.confirm_password}
                                                onChange={handlePasswordChange}
                                                className={`w-full px-4 py-2 rounded-lg border ${passwordErrors.confirm_password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-flood-500 outline-none transition-all`}
                                            />
                                            {passwordErrors.confirm_password && (
                                                <p className="text-xs text-red-500 mt-1">{passwordErrors.confirm_password[0]}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-4 flex justify-end">
                                        <Button
                                            type="submit"
                                            loading={passwordLoading}
                                            className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white min-w-[140px]"
                                        >
                                            Change Password
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Preferences Section */}
                    <section id="preferences">
                        <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
                            <CardHeader className="border-b dark:border-slate-700 bg-white dark:bg-slate-800">
                                <CardTitle className="flex items-center gap-2 text-xl"><Settings className="w-5 h-5 text-slate-600" /> Preferences</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-8">
                                {/* Dark Mode */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-slate-900 dark:text-white">Appearance</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Choose how CrisisLens looks on your screen.</p>
                                    </div>
                                    <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border dark:border-slate-700 w-fit">
                                        {[
                                            { id: 'light', icon: <Sun className="w-4 h-4" /> },
                                            { id: 'system', icon: <Monitor className="w-4 h-4" /> },
                                            { id: 'dark', icon: <Moon className="w-4 h-4" /> }
                                        ].map(mode => (
                                            <button
                                                key={mode.id}
                                                onClick={() => setTheme(mode.id)}
                                                className={`p-2 px-4 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${theme === mode.id ? 'bg-white dark:bg-slate-800 text-flood-600 dark:text-flood-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                            >
                                                {mode.icon}
                                                <span className="capitalize">{mode.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <hr className="border-slate-100 dark:border-slate-800" />

                                {/* Notifications */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Bell className="w-4 h-4 text-flood-600" /> Alert Notifications</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Control which alerts trigger browser/push notifications.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {[
                                            { id: 'all', title: 'All Alerts', desc: 'Every matching event' },
                                            { id: 'critical', title: 'High Priority', desc: 'High & Critical only' },
                                            { id: 'none', title: 'Minimal', desc: 'Critical alerts only' }
                                        ].map(pref => (
                                            <button
                                                key={pref.id}
                                                onClick={() => handleNotifChange(pref.id)}
                                                className={`p-4 text-left rounded-xl border-2 transition-all ${notifications === pref.id ? 'border-flood-600 bg-flood-50 dark:bg-flood-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                                            >
                                                <p className={`font-bold text-sm ${notifications === pref.id ? 'text-flood-700 dark:text-flood-400' : 'text-slate-700 dark:text-slate-300'}`}>{pref.title}</p>
                                                <p className="text-xs text-slate-500 mt-1">{pref.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </div>
    );
}
