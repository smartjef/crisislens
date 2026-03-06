import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../store/authStore';
import { Mail, Briefcase, MapPin, ShieldCheck, Phone } from 'lucide-react';

export function ProfilePage() {
    usePageTitle('My Profile');
    const { user } = useAuthStore();

    if (!user) return (
        <div className="flex items-center justify-center min-h-[300px]">
            <span className="text-xs font-mono text-slate-600 uppercase tracking-wider">Loading profile...</span>
        </div>
    );

    const ROLE_LABELS = {
        super_admin:    'Super Admin',
        national_ops:   'National Operations',
        county_officer: 'County Officer',
        responder:      'Emergency Responder',
        analyst:        'Data Analyst',
    };

    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase();

    const details = [
        { icon: Mail,        label: 'Email Address',    value: user.email },
        { icon: ShieldCheck, label: 'Role',             value: ROLE_LABELS[user.role] || user.role },
        { icon: MapPin,      label: 'County Assignment', value: user.county_name || 'National HQ' },
        { icon: Briefcase,   label: 'Organisation',      value: user.organization || '—' },
        { icon: Phone,       label: 'Phone',             value: user.phone || '—' },
    ];

    return (
        <div className="max-w-3xl space-y-4">
            <div className="pb-4 border-b border-surface-border">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1">Account</p>
                <h1 className="text-xl font-semibold text-slate-200">User Profile</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Identity card */}
                <div className="bg-surface-raised border border-surface-border rounded p-5 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded bg-slate-700 flex items-center justify-center font-semibold text-slate-200 text-xl font-mono mb-4">
                        {initials}
                    </div>
                    <h2 className="text-sm font-semibold text-slate-200">{user.first_name} {user.last_name}</h2>
                    <p className="text-[10px] font-mono text-slate-600 mt-0.5 mb-3">{user.email}</p>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-flood-400 bg-flood-900/20 border-flood-800/30">
                        {ROLE_LABELS[user.role] || user.role}
                    </span>
                    {user.date_joined && (
                        <p className="text-[10px] font-mono text-slate-700 mt-4 uppercase tracking-wider">
                            Member since {new Date(user.date_joined).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </p>
                    )}
                </div>

                {/* Details */}
                <div className="md:col-span-2 bg-surface-raised border border-surface-border rounded overflow-hidden">
                    <div className="px-5 py-3 border-b border-surface-border">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Personnel Information</span>
                    </div>
                    <div className="divide-y divide-surface-border">
                        {details.map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center gap-4 px-5 py-3">
                                <Icon size={13} className="text-slate-600 shrink-0" />
                                <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
                                    <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-600 shrink-0 w-36">{label}</span>
                                    <span className="text-xs font-mono text-slate-400 truncate">{value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="px-5 py-3 border-t border-surface-border flex justify-end">
                        <a href="/settings#profile"
                            className="text-[10px] font-mono text-flood-400 hover:text-flood-300 uppercase tracking-wider hover:underline"
                        >
                            Edit in Settings →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
