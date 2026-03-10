import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../store/authStore';
import { Mail, Briefcase, MapPin, ShieldCheck, Phone, Clock, User } from 'lucide-react';
import Card from '../components/ui/Card';

export function ProfilePage() {
    usePageTitle('My Profile');
    const { user } = useAuthStore();

    if (!user) return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <div className="w-6 h-6 border-2 border-flood-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Personnel Dossier...</span>
        </div>
    );

    const ROLE_LABELS = {
        super_admin: 'Super Admin',
        national_ops: 'National Operations',
        county_officer: 'County Officer',
        responder: 'Emergency Responder',
        analyst: 'Data Analyst',
    };

    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase();

    const details = [
        { icon: Mail, label: 'Comms Vector', value: user.email },
        { icon: ShieldCheck, label: 'Auth Level', value: ROLE_LABELS[user.role] || user.role },
        { icon: MapPin, label: 'Operation Zone', value: user.county_name || 'National HQ' },
        { icon: Briefcase, label: 'Assigned Org', value: user.organization || '—' },
        { icon: Phone, label: 'Tactical Line', value: user.phone || '—' },
    ];

    return (
        <div className="p-4 md:p-5 max-w-4xl space-y-4 animate-in fade-in duration-500">
            <div className="pb-4 border-b border-slate-200 dark:border-surface-border">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-1">GOK · Personnel Record</p>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Operator Profile</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Identity card */}
                <Card className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-sm bg-slate-900 dark:bg-surface-border flex items-center justify-center font-black text-white dark:text-slate-200 text-2xl mb-5">
                        {initials}
                    </div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{user.first_name} {user.last_name}</h2>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 mt-1 mb-4 uppercase tracking-widest">{user.email}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm border text-flood-600 dark:text-flood-400 bg-flood-50 dark:bg-flood-950/20 border-flood-100 dark:border-flood-900/30">
                        {ROLE_LABELS[user.role] || user.role}
                    </span>
                    {user.date_joined && (
                        <div className="mt-6 flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.25em]">
                            <Clock size={10} /> Commissioned {new Date(user.date_joined).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </div>
                    )}
                </Card>

                {/* Details */}
                <Card className="md:col-span-2 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-surface-border bg-slate-50/50 dark:bg-surface/50">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <User size={12} /> Personnel Parameters
                        </span>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-surface-border">
                        {details.map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-surface/30 transition-colors">
                                <Icon size={13} className="text-slate-400 shrink-0" />
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 min-w-0">
                                    <span className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-500 dark:text-slate-500 shrink-0 sm:w-36">{label}</span>
                                    <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate">{value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-surface/30 border-t border-slate-100 dark:border-surface-border flex justify-end">
                        <a href="/settings#profile"
                            className="text-[9px] font-black text-flood-600 dark:text-flood-400 hover:text-flood-700 dark:hover:text-flood-300 uppercase tracking-[0.2em] transition-colors"
                        >
                            Modify Dossier in Settings →
                        </a>
                    </div>
                </Card>
            </div>
        </div>
    );
}
