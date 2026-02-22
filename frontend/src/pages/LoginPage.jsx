/**
 * pages/LoginPage.jsx — Issue #10
 *
 * Production split-screen login page.
 *
 * Layout
 * ──────
 *  Left (40%, hidden on mobile)  — dark navy brand panel
 *    • CrisisLens logo + wordmark
 *    • Tagline
 *    • 3 stat pills
 *    • Footer attribution
 *
 *  Right (100% / 60% desktop)    — white/light auth panel
 *    • "Sign in" heading
 *    • Email + password inputs with inline validation
 *    • Inline 401 error banner
 *    • Sign In button (loading state while request is in-flight)
 *    • "Quick Access" divider + 5 demo role buttons
 *
 * Auth flow
 * ─────────
 *  1. POST /api/auth/login/ { email, password }
 *  2. Store refresh token in localStorage("cl-refresh")
 *  3. Call useAuthStore.login(access, user) — access stays in memory
 *  4. Navigate to the originally requested URL (or /dashboard)
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, AlertTriangle, Users, MapPin, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { loginRequest, getMeRequest } from '../api/auth';
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
    const [demoLoading, setDemoLoading] = useState(null); // index of active demo btn

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

            // Persist the refresh token so AuthProvider can silently rehydrate on
            // the next hard refresh. Access token stays in memory via the store.
            localStorage.setItem('cl-refresh', tokens.refresh);

            // Fetch full user profile using the new access token.
            // The request interceptor in client.js attaches the Bearer header
            // as soon as we call setAccessToken, but here we're mid-flow so we
            // pass the token manually via getMeRequest (client picks it up via store
            // after login is called — but we haven't called login yet).
            // Simplest approach: call getMeRequest after a temporary store update.
            useAuthStore.getState().setAccessToken(tokens.access);
            const { data: user } = await getMeRequest();

            // Full hydration — replaces the temporary setAccessToken call above.
            login(tokens.access, user);

            navigate(from, { replace: true });
        } catch (err) {
            // Reset any temporary token we set during the flow.
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
                            className={[
                                'w-full flex items-center justify-center gap-2',
                                'bg-flood-600 hover:bg-flood-700 active:bg-flood-800',
                                'text-white text-sm font-medium',
                                'px-4 py-2.5 rounded',
                                'focus:outline-none focus:ring-2 focus:ring-flood-500 focus:ring-offset-2',
                                'transition-colors duration-150',
                                'disabled:opacity-60 disabled:cursor-not-allowed',
                            ].join(' ')}
                        >
                            {loading && <Spinner size="sm" />}
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    {/* Demo accounts divider */}
                    <div className="my-6 flex items-center gap-3">
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
                                className={[
                                    'w-full flex items-center justify-between',
                                    'bg-white hover:bg-slate-50 active:bg-slate-100',
                                    'border border-slate-200 hover:border-slate-300',
                                    'text-slate-700 text-xs',
                                    'px-3 py-2 rounded',
                                    'focus:outline-none focus:ring-2 focus:ring-flood-500 focus:ring-offset-1',
                                    'transition-colors duration-100',
                                    'disabled:opacity-50 disabled:cursor-not-allowed',
                                ].join(' ')}
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
                </div>
            </main>
        </div>
    );
}
