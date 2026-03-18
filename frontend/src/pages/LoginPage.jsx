import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, AlertTriangle, Users, MapPin, Eye, EyeOff, ShieldCheck, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { loginRequest, getMeRequest } from '../api/auth';
import client from '../api/client';
import Spinner from '../components/ui/Spinner';

/* ── Demo accounts (Quick Access) ──────────────────────────────────────── */
const DEMO_ACCOUNTS = [
    { label: 'National Ops',              email: 'ops@crisislens.go.ke',       password: 'Demo1234!' },
    { label: 'County Officer (Kisumu)',   email: 'kisumu@crisislens.go.ke',    password: 'Demo1234!' },
    { label: 'County Officer (Siaya)',    email: 'siaya@crisislens.go.ke',     password: 'Demo1234!' },
    { label: 'Responder',                 email: 'responder@crisislens.go.ke', password: 'Demo1234!' },
    { label: 'Analyst',                   email: 'analyst@crisislens.go.ke',   password: 'Demo1234!' },
];

/* ── Stat pill (left panel) ─────────────────────────────────────────────── */
function StatPill({ icon: Icon, value, label }) {
    return (
        <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded px-3 py-2">
            <Icon size={14} className="text-flood-400 shrink-0" />
            <span className="text-white text-xs font-semibold font-mono">{value}</span>
            <span className="text-slate-400 text-xs">{label}</span>
        </div>
    );
}

/* ── Input field ────────────────────────────────────────────────────────── */
function Field({ id, label, type = 'text', value, onChange, error, autoComplete, rightElement }) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    className={[
                        'w-full px-3 py-2 text-sm bg-white border rounded',
                        'text-slate-900 placeholder-slate-400',
                        'focus:outline-none focus:ring-2 focus:ring-flood-500 focus:border-transparent',
                        'transition-colors duration-150',
                        error
                            ? 'border-red-400 focus:ring-red-400'
                            : 'border-slate-300 hover:border-slate-400',
                        rightElement ? 'pr-10' : '',
                    ].join(' ')}
                    placeholder={type === 'email' ? 'you@example.com' : '••••••••'}
                />
                {rightElement && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {rightElement}
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle size={11} />
                    {error}
                </p>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function LoginPage() {
    const navigate   = useNavigate();
    const location   = useLocation();
    const { login }  = useAuthStore();

    const from = location.state?.from?.pathname || '/dashboard';

    /* Form state */
    const [email,       setEmail]       = useState('');
    const [password,    setPassword]    = useState('');
    const [showPwd,     setShowPwd]     = useState(false);
    const [errors,      setErrors]      = useState({});
    const [apiError,    setApiError]    = useState('');
    const [loading,     setLoading]     = useState(false);
    const [demoLoading, setDemoLoading] = useState(null);

    /* TOTP step */
    const [totpStep,         setTotpStep]         = useState(false);
    const [partialToken,     setPartialToken]     = useState('');
    const [totpCode,         setTotpCode]         = useState('');
    const [totpLoading,      setTotpLoading]      = useState(false);
    const [totpError,        setTotpError]        = useState('');
    const totpInputRef = useRef(null);

    /* ── Validation ────────────────────────────────────────────────────── */
    function validate(em, pw) {
        const e = {};
        if (!em.trim())                      e.email    = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(em))  e.email    = 'Enter a valid email address';
        if (!pw)                             e.password = 'Password is required';
        return e;
    }

    /* ── Core sign-in logic ─────────────────────────────────────────────── */
    async function signIn(em, pw, demoIdx = null) {
        setApiError('');
        setErrors({});

        const validationErrors = validate(em, pw);
        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            return;
        }

        if (demoIdx !== null) setDemoLoading(demoIdx);
        else setLoading(true);

        try {
            const { data: tokens } = await loginRequest(em, pw);

            // Check if TOTP step is required
            if (tokens.requires_totp) {
                setPartialToken(tokens.partial_token);
                setTotpStep(true);
                setTimeout(() => totpInputRef.current?.focus(), 100);
                return;
            }

            localStorage.setItem('cl-refresh', tokens.refresh);
            useAuthStore.getState().setAccessToken(tokens.access);
            const { data: user } = await getMeRequest();
            login(tokens.access, user);
            navigate(from, { replace: true });
        } catch (err) {
            useAuthStore.getState().setAccessToken(null);
            const status = err.response?.status;
            if (status === 401) {
                setApiError('Invalid email or password. Please try again.');
            } else if (status >= 500) {
                setApiError('Server error — please try again in a moment.');
            } else {
                setApiError('Unable to connect. Check your network and try again.');
            }
        } finally {
            setLoading(false);
            setDemoLoading(null);
        }
    }

    /* ── TOTP verify ────────────────────────────────────────────────────── */
    async function handleTotpVerify(e) {
        e.preventDefault();
        if (totpCode.length < 6) { setTotpError('Enter the 6-digit code from your authenticator app.'); return; }
        setTotpLoading(true);
        setTotpError('');
        try {
            const { data } = await client.post('/api/auth/totp/confirm/', { partial_token: partialToken, code: totpCode });
            localStorage.setItem('cl-refresh', data.refresh);
            useAuthStore.getState().setAccessToken(data.access);
            const { data: user } = await getMeRequest();
            login(data.access, user);
            navigate(from, { replace: true });
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.detail || 'Invalid code. Please try again.';
            setTotpError(msg);
            setTotpCode('');
            totpInputRef.current?.focus();
        } finally {
            setTotpLoading(false);
        }
    }

    /* ── Form submit ────────────────────────────────────────────────────── */
    function handleSubmit(e) {
        e.preventDefault();
        signIn(email, password);
    }

    /* ── Demo button ────────────────────────────────────────────────────── */
    function handleDemo(account, idx) {
        setEmail(account.email);
        setPassword(account.password);
        signIn(account.email, account.password, idx);
    }

    const busy = loading || demoLoading !== null;

    /* ══════════════════════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen flex">

            {/* ══ LEFT — Brand panel (hidden on mobile) ══════════════════════════ */}
            <aside className="hidden lg:flex lg:w-2/5 flex-col justify-between bg-surface p-10 relative overflow-hidden">

                {/* Decorative background blobs */}
                <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-flood-600/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-flood-800/20 blur-3xl pointer-events-none" />

                {/* Logo + wordmark */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-9 h-9 rounded bg-flood-600 flex items-center justify-center shrink-0">
                            <Activity size={18} className="text-white" />
                        </div>
                        <span className="text-white font-semibold text-lg tracking-tight font-mono">
                            CrisisLens
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-white leading-snug mb-3">
                        National Predictive Risk<br />
                        &amp; Early Warning System
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                        Real-time flood risk intelligence for Kenya's Lake Victoria Basin —
                        enabling faster, evidence-based emergency response.
                    </p>
                </div>

                {/* Stat pills */}
                <div className="relative z-10 space-y-2.5">
                    <StatPill icon={MapPin} value="3"     label="Counties monitored" />
                    <StatPill icon={MapPin} value="21"    label="Sub-counties covered" />
                    <StatPill icon={Users}  value="3.28M" label="People in coverage area" />
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <div className="w-8 h-px bg-flood-600 mb-3" />
                    <p className="text-slate-500 text-xs">Lake Victoria Basin · Kenya</p>
                    <p className="text-slate-600 text-xs mt-0.5">Operational intelligence platform</p>
                </div>
            </aside>

            {/* ══ RIGHT — Auth panel ═════════════════════════════════════════════ */}
            <main className="flex-1 flex flex-col justify-center items-center bg-slate-50 px-6 py-12">
                <div className="w-full max-w-sm">

                    {/* Mobile-only logo */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-8 h-8 rounded bg-flood-600 flex items-center justify-center">
                            <Activity size={16} className="text-white" />
                        </div>
                        <span className="font-semibold text-slate-900 font-mono">CrisisLens</span>
                    </div>

                    {totpStep ? (
                        /* ── TOTP verification step ─────────────────────────────────── */
                        <>
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck size={18} className="text-flood-500" />
                                    <h2 className="text-xl font-semibold text-slate-900">Two-Factor Authentication</h2>
                                </div>
                                <p className="text-slate-500 text-sm">Enter the 6-digit code from your authenticator app.</p>
                            </div>

                            {totpError && (
                                <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2.5">
                                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                                    <span>{totpError}</span>
                                </div>
                            )}

                            <form onSubmit={handleTotpVerify} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Authentication Code</label>
                                    <input
                                        ref={totpInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={8}
                                        value={totpCode}
                                        onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                        placeholder="000000"
                                        className="w-full px-3 py-2.5 text-center text-xl tracking-[0.5em] font-mono bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-flood-500 focus:border-transparent placeholder-slate-300"
                                        autoComplete="one-time-code"
                                    />
                                    <p className="mt-1.5 text-xs text-slate-400">Backup codes (8 chars) are also accepted.</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={totpLoading || totpCode.length < 6}
                                    className="w-full flex items-center justify-center gap-2 bg-flood-600 hover:bg-flood-700 text-white text-sm font-medium px-4 py-2.5 rounded focus:outline-none focus:ring-2 focus:ring-flood-500 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {totpLoading && <Spinner size="sm" />}
                                    {totpLoading ? 'Verifying…' : 'Verify & Sign In'}
                                </button>
                            </form>

                            <button
                                type="button"
                                onClick={() => { setTotpStep(false); setTotpCode(''); setTotpError(''); }}
                                className="mt-4 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <ChevronLeft size={13} /> Back to sign in
                            </button>
                        </>
                    ) : (
                        /* ── Credentials form ───────────────────────────────────────── */
                        <>
                            {/* Page heading */}
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-slate-900">Sign in to CrisisLens</h2>
                                <p className="text-slate-500 text-sm mt-0.5">Enter your credentials to continue</p>
                            </div>

                            {/* API error banner */}
                            {apiError && (
                                <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2.5">
                                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                                    <span>{apiError}</span>
                                </div>
                            )}

                            {/* Credentials form */}
                            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                                <Field
                                    id="email"
                                    label="Email address"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    error={errors.email}
                                    autoComplete="email"
                                />

                                <Field
                                    id="password"
                                    label="Password"
                                    type={showPwd ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    error={errors.password}
                                    autoComplete="current-password"
                                    rightElement={
                                        <button
                                            type="button"
                                            onClick={() => setShowPwd(!showPwd)}
                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                            aria-label={showPwd ? 'Hide password' : 'Show password'}
                                        >
                                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    }
                                />

                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="w-full flex items-center justify-center gap-2 bg-flood-600 hover:bg-flood-700 active:bg-flood-800 text-white text-sm font-medium px-4 py-2.5 rounded focus:outline-none focus:ring-2 focus:ring-flood-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading && <Spinner size="sm" />}
                                    {loading ? 'Signing in…' : 'Sign In'}
                                </button>
                            </form>

                            {/* SSO / Federated Access */}
                            <div className="my-5 flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs text-slate-400 shrink-0">Federated Access</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-5">
                                {[
                                    { label: 'GoK ICTA SSO', sub: 'SAML 2.0' },
                                    { label: 'Microsoft Entra', sub: 'Azure AD / OAuth2' },
                                ].map(s => (
                                    <button
                                        key={s.label}
                                        type="button"
                                        title="SSO integration — coming soon"
                                        disabled
                                        className="flex flex-col items-center justify-center gap-0.5 border border-slate-200 rounded px-3 py-2.5 text-slate-400 bg-white opacity-60 cursor-not-allowed"
                                    >
                                        <span className="text-xs font-medium">{s.label}</span>
                                        <span className="text-[10px] font-mono text-slate-300">{s.sub}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Demo accounts divider */}
                            <div className="my-5 flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs text-slate-400 shrink-0">Quick Access</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            {/* Demo role buttons */}
                            <div className="space-y-1.5">
                                {DEMO_ACCOUNTS.map((account, idx) => (
                                    <button
                                        key={account.email}
                                        type="button"
                                        onClick={() => handleDemo(account, idx)}
                                        disabled={busy}
                                        className="w-full flex items-center justify-between bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-flood-500 focus:ring-offset-1 transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="font-medium">{account.label}</span>
                                        <span className="flex items-center gap-1.5 text-slate-400">
                                            {demoLoading === idx
                                                ? <Spinner size="sm" />
                                                : <span className="font-mono text-[10px]">{account.email.split('@')[0]}</span>
                                            }
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Demo password note */}
                            <p className="mt-5 text-center text-xs text-slate-400">
                                Demo password: <span className="font-mono text-slate-500">Demo1234!</span>
                            </p>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
