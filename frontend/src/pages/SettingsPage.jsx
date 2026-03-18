import React, { useState, useEffect } from 'react';
import { Settings, Shield, User, Bell, Monitor, Moon, Sun, Lock, Save, Landmark, Smartphone, Check, X, RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/useAlertStore';
import { useDarkMode } from '../hooks/useDarkMode';
import { usePageTitle } from '../hooks/usePageTitle';
import client from '../api/client';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

function Panel({ title, icon: Icon, children, id }) {
    return (
        <Card id={id} className="overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-2 border-b border-slate-200 dark:border-surface-border bg-slate-50/50 dark:bg-surface/50">
                {Icon && <Icon size={12} className="text-slate-500 dark:text-slate-400" />}
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</span>
            </div>
            <div className="p-4">{children}</div>
        </Card>
    );
}

function Field({ label, error, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</label>
            {children}
            {error && <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-tighter">{error}</p>}
        </div>
    );
}

const INPUT = 'w-full bg-slate-50 dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm px-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:ring-1 focus:ring-flood-500 outline-none transition-all focus:border-flood-500';
const INPUT_ERR = 'w-full bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-sm px-3 py-2 text-xs text-red-900 dark:text-red-200 outline-none transition-all focus:ring-1 focus:ring-red-500';
const INPUT_DISABLED = 'w-full bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm px-3 py-2 text-xs text-slate-400 dark:text-slate-600 cursor-not-allowed outline-none';

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

    /* MFA / TOTP */
    const [totpEnabled,    setTotpEnabled]    = useState(false);
    const [totpEnrolling,  setTotpEnrolling]  = useState(false);
    const [totpUri,        setTotpUri]        = useState('');
    const [totpSecret,     setTotpSecret]     = useState('');
    const [totpCode,       setTotpCode]       = useState('');
    const [totpCodes,      setTotpCodes]      = useState([]); // backup codes after enroll
    const [totpSubmitting, setTotpSubmitting] = useState(false);
    const [totpError,      setTotpError]      = useState('');
    const [showSecret,     setShowSecret]     = useState(false);
    const [showBackup,     setShowBackup]     = useState(false);
    const [disableLoading, setDisableLoading] = useState(false);

    /* Check initial TOTP status — GET also pre-generates secret but we only use it if user starts enroll */
    useEffect(() => {
        client.get('/api/auth/totp/setup/')
            .then(r => { setTotpEnabled(!!r.data.is_active); })
            .catch(() => { setTotpEnabled(false); });
    }, []);

    const startEnroll = async () => {
        setTotpEnrolling(true);
        setTotpError('');
        try {
            const { data } = await client.get('/api/auth/totp/setup/');
            setTotpUri(data.provisioning_uri || data.uri || '');
            setTotpSecret(data.secret || '');
        } catch { addToast('Could not start TOTP setup', 'error'); setTotpEnrolling(false); }
    };

    const cancelEnroll = () => { setTotpEnrolling(false); setTotpUri(''); setTotpSecret(''); setTotpCode(''); setTotpError(''); setTotpCodes([]); };

    const confirmEnroll = async () => {
        if (totpCode.length < 6) { setTotpError('Enter the 6-digit code from your app'); return; }
        setTotpSubmitting(true); setTotpError('');
        try {
            const { data } = await client.post('/api/auth/totp/setup/', { code: totpCode });
            setTotpEnabled(true);
            setTotpCodes(data.backup_codes || []);
            setTotpCode('');
            setTotpUri('');
            addToast('2FA enabled successfully', 'success');
        } catch (err) {
            setTotpError(err.response?.data?.error || 'Invalid code');
        } finally { setTotpSubmitting(false); }
    };

    const disableTotp = async () => {
        setDisableLoading(true);
        try {
            await client.delete('/api/auth/totp/setup/');
            setTotpEnabled(false);
            setTotpCodes([]);
            cancelEnroll();
            addToast('2FA disabled', 'success');
        } catch { addToast('Failed to disable 2FA', 'error'); } finally { setDisableLoading(false); }
    };

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

    /* Password strength */
    const pw = passwordData.new_password;
    const pwChecks = [
        { label: '10+ chars',       ok: pw.length >= 10 },
        { label: 'Uppercase',       ok: /[A-Z]/.test(pw) },
        { label: 'Digit',           ok: /[0-9]/.test(pw) },
        { label: 'Special char',    ok: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]`~;\'@#]/.test(pw) },
    ];
    const pwScore = pwChecks.filter(c => c.ok).length;
    const pwStrengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwScore];
    const pwStrengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'][pwScore];

    return (
        <div className="p-4 md:p-5 space-y-4 animate-in fade-in duration-500">
            {/* Header - Highly Compact */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-surface-border">
                <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-1">Account & Governance</p>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">System Settings</h1>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Summary sidebar */}
                <div className="space-y-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-surface-border">
                            <div className="w-10 h-10 rounded-sm bg-slate-900 dark:bg-surface-border flex items-center justify-center font-black text-white dark:text-slate-200 text-sm shrink-0">
                                {user.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{user.first_name} {user.last_name}</p>
                                <p className="text-[9px] text-slate-500 dark:text-slate-500 truncate font-bold uppercase tracking-widest">{user.email}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Role Authority</p>
                                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border text-flood-600 dark:text-flood-400 bg-flood-50 dark:bg-flood-950/20 border-flood-100 dark:border-flood-900/30">
                                    {ROLE_LABEL[user.role] || user.role}
                                </span>
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Jurisdiction</p>
                                <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{user.county_name || 'National HQ'}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Commissioned</p>
                                <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                    {user.date_joined ? new Date(user.date_joined).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="divide-y divide-slate-100 dark:divide-surface-border overflow-hidden">
                        {[
                            { label: 'Profile Settings', action: () => document.getElementById('profile-sec')?.scrollIntoView({ behavior: 'smooth' }), icon: User },
                            { label: 'Security & Auth', action: () => document.getElementById('security-sec')?.scrollIntoView({ behavior: 'smooth' }), icon: Lock },
                            { label: 'UI Preferences', action: () => document.getElementById('pref-sec')?.scrollIntoView({ behavior: 'smooth' }), icon: Monitor },
                        ].map(({ label, action, icon: Icon }) => (
                            <button key={label} onClick={action} className="w-full flex items-center gap-2.5 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-flood-600 dark:hover:text-flood-400 hover:bg-slate-50 dark:hover:bg-surface/50 transition-all text-left">
                                <Icon size={12} /> {label}
                            </button>
                        ))}
                    </Card>
                </div>

                {/* Forms */}
                <div className="lg:col-span-2 space-y-5">
                    <section id="profile-sec">
                        <Panel title="Personnel Information" icon={User}>
                            <form onSubmit={handleProfileSave} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <Field label="Email (System Locked)">
                                        <input type="email" value={user.email} disabled className={INPUT_DISABLED} />
                                    </Field>
                                    <Field label="Mobile Comms">
                                        <input type="tel" value={profileData.phone}
                                            onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                                            className={INPUT} />
                                    </Field>
                                </div>
                                <Field label="Assigned Organisation">
                                    <div className="relative">
                                        <input type="text" value={profileData.organization}
                                            onChange={e => setProfileData(p => ({ ...p, organization: e.target.value }))}
                                            className={INPUT + " pl-9"} />
                                        <Landmark size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </Field>
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={profileLoading} className="h-9 px-6 font-black uppercase tracking-widest text-[9px] flex items-center gap-2">
                                        <Save size={12} strokeWidth={3} /> {profileLoading ? 'TRANSMITTING…' : 'UPDATE PROFILE'}
                                    </Button>
                                </div>
                            </form>
                        </Panel>
                    </section>

                    <section id="security-sec">
                        <Panel title="Authentication Security" icon={Shield}>
                            <form onSubmit={handlePasswordSave} className="space-y-4">
                                <Field label="Current Password" error={passwordErrors.current_password?.[0]}>
                                    <input type="password" value={passwordData.current_password}
                                        onChange={e => setPasswordData(p => ({ ...p, current_password: e.target.value }))}
                                        className={passwordErrors.current_password ? INPUT_ERR : INPUT} />
                                </Field>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="New Secure Password" error={passwordErrors.new_password?.[0]}>
                                        <input type="password" value={passwordData.new_password}
                                            onChange={e => setPasswordData(p => ({ ...p, new_password: e.target.value }))}
                                            className={passwordErrors.new_password ? INPUT_ERR : INPUT} />
                                        {pw.length > 0 && (
                                            <div className="mt-2 space-y-1.5">
                                                <div className="flex gap-1 h-1">
                                                    {[0,1,2,3].map(i => (
                                                        <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < pwScore ? pwStrengthColor : 'bg-slate-200 dark:bg-surface-border'}`} />
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-3 flex-wrap">
                                                        {pwChecks.map(c => (
                                                            <span key={c.label} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${c.ok ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-600'}`}>
                                                                {c.ok ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} />} {c.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {pwStrengthLabel && <span className={`text-[9px] font-black uppercase tracking-widest ${pwStrengthColor.replace('bg-', 'text-')}`}>{pwStrengthLabel}</span>}
                                                </div>
                                            </div>
                                        )}
                                    </Field>
                                    <Field label="Confirm Passcode" error={passwordErrors.confirm_password?.[0]}>
                                        <input type="password" value={passwordData.confirm_password}
                                            onChange={e => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))}
                                            className={passwordErrors.confirm_password ? INPUT_ERR : INPUT} />
                                    </Field>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={passwordLoading} variant="outline" className="h-9 px-6 font-black uppercase tracking-widest text-[9px] flex items-center gap-2">
                                        <Lock size={12} strokeWidth={3} /> {passwordLoading ? 'ENCRYPTING…' : 'MODIFY PASSWORD'}
                                    </Button>
                                </div>
                            </form>
                        </Panel>

                        {/* MFA / TOTP panel */}
                        <div className="mt-5">
                        <Panel title="Two-Factor Authentication" icon={Smartphone} id="mfa-sec">
                            {!totpEnabled && !totpEnrolling && (
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Protect your account with a time-based one-time password (TOTP) app such as Google Authenticator, Authy, or 1Password.</p>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 px-1.5 py-0.5 rounded-sm">Not Enabled</span>
                                    </div>
                                    <Button onClick={startEnroll} className="shrink-0 h-8 px-4 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <Smartphone size={11} /> Enable 2FA
                                    </Button>
                                </div>
                            )}

                            {totpEnabled && !totpEnrolling && totpCodes.length === 0 && (
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Two-factor authentication is active. Your account requires a TOTP code at each login.</p>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 px-1.5 py-0.5 rounded-sm">Active</span>
                                    </div>
                                    <Button onClick={disableTotp} disabled={disableLoading} variant="outline" className="shrink-0 h-8 px-4 text-[9px] font-black uppercase tracking-widest text-red-500 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/10 flex items-center gap-1.5">
                                        <X size={11} /> {disableLoading ? 'Disabling…' : 'Disable 2FA'}
                                    </Button>
                                </div>
                            )}

                            {/* Backup codes shown after fresh enroll */}
                            {totpEnabled && totpCodes.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-0.5">2FA Enabled</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Save these backup codes securely. Each can be used once if you lose your authenticator.</p>
                                        </div>
                                        <button onClick={() => setShowBackup(v => !v)} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                                            {showBackup ? <EyeOff size={11} /> : <Eye size={11} />} {showBackup ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    {showBackup && (
                                        <div className="grid grid-cols-2 gap-1.5 p-3 bg-slate-50 dark:bg-surface border border-slate-200 dark:border-surface-border rounded-sm">
                                            {totpCodes.map((c, i) => (
                                                <span key={i} className="font-mono text-xs text-slate-700 dark:text-slate-300 tracking-widest">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={() => navigator.clipboard?.writeText(totpCodes.join('\n'))} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-surface-border rounded-sm px-3 py-1.5 transition-all">
                                            <Copy size={10} /> Copy Codes
                                        </button>
                                        <Button onClick={() => setTotpCodes([])} variant="outline" className="h-7 px-4 text-[9px] font-black uppercase tracking-widest">
                                            Done
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Enroll flow */}
                            {totpEnrolling && (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Step 1 — Scan QR code</p>
                                        <div className="flex gap-5 items-start flex-wrap">
                                            {totpUri && (
                                                <div className="p-2 bg-white border border-slate-200 dark:border-surface-border rounded-sm shrink-0">
                                                    <QRCodeSVG value={totpUri} size={140} />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-[160px]">
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Scan with Google Authenticator, Authy, or any TOTP app. Or enter the key manually:</p>
                                                <div className="flex items-center gap-2">
                                                    <code className={`text-xs font-mono text-slate-700 dark:text-slate-300 tracking-widest break-all ${showSecret ? '' : 'blur-sm select-none'}`}>{totpSecret}</code>
                                                    <button onClick={() => setShowSecret(v => !v)} className="shrink-0 text-slate-400 hover:text-slate-600">
                                                        {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                                                    </button>
                                                    {showSecret && <button onClick={() => navigator.clipboard?.writeText(totpSecret)} className="shrink-0 text-slate-400 hover:text-slate-600"><Copy size={12} /></button>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Step 2 — Verify code</p>
                                        <div className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <input
                                                    type="text" inputMode="numeric" maxLength={6}
                                                    value={totpCode}
                                                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    placeholder="000000"
                                                    className={`${INPUT} text-center tracking-[0.4em] font-mono text-lg w-full`}
                                                />
                                                {totpError && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase">{totpError}</p>}
                                            </div>
                                            <Button onClick={confirmEnroll} disabled={totpSubmitting || totpCode.length < 6} className="h-9 px-5 shrink-0 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                {totpSubmitting ? <><RefreshCw size={10} className="animate-spin" /> Verifying</> : <><Check size={10} strokeWidth={3} /> Confirm</>}
                                            </Button>
                                        </div>
                                    </div>
                                    <button onClick={cancelEnroll} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest font-black">Cancel</button>
                                </div>
                            )}
                        </Panel>
                        </div>
                    </section>

                    <section id="pref-sec">
                        <Panel title="UI Workspace Preferences" icon={Settings}>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3">System Aesthetics</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'light', icon: <Sun size={12} />, label: 'Standard Light' },
                                            { id: 'dark', icon: <Moon size={12} />, label: 'Tactical Dark' },
                                            { id: 'system', icon: <Monitor size={12} />, label: 'OS Adaptive' },
                                        ].map(m => (
                                            <button key={m.id} onClick={() => setTheme(m.id)}
                                                className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm border transition-all ${theme === m.id ? 'border-flood-500 bg-flood-50 dark:bg-flood-950/20 text-flood-600 dark:text-flood-400' : 'border-slate-200 dark:border-surface-border text-slate-500 hover:border-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                            >
                                                {m.icon} {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 dark:border-surface-border" />
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
                                        <Bell size={10} /> Notification Protocol
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium mb-3">Filter critical telemetry alerts for browser-level push notifications.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {[
                                            { id: 'all', label: 'Verbose', desc: 'Unfiltered events' },
                                            { id: 'critical', label: 'Balanced', desc: 'High severity only' },
                                            { id: 'none', label: 'Minimal', desc: 'Critical response' },
                                        ].map(p => (
                                            <button key={p.id} onClick={() => { setNotifPref(p.id); localStorage.setItem('cl-notif-pref', p.id); }}
                                                className={`flex flex-col text-left px-3 py-2.5 rounded-sm border transition-all ${notifPref === p.id ? 'border-flood-500 bg-flood-50 dark:bg-flood-950/20' : 'border-slate-200 dark:border-surface-border hover:border-slate-400'}`}
                                            >
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${notifPref === p.id ? 'text-flood-600 dark:text-flood-400' : 'text-slate-600 dark:text-slate-400'}`}>{p.label}</span>
                                                <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">{p.desc}</span>
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
