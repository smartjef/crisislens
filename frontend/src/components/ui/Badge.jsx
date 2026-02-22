import React from 'react';

export default function Badge({ variant = 'info', pulse = false, className = '', children }) {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    const variantClasses = {
        critical: 'bg-danger text-white dark:bg-danger-dark',
        high: 'bg-orange-500 text-white dark:bg-orange-600',
        moderate: 'bg-amber-500 text-white dark:bg-amber-600',
        low: 'bg-flood-600 text-white dark:bg-flood-700',
        info: 'bg-slate-500 text-white dark:bg-slate-600',
    };

    const dotClasses = {
        critical: 'bg-white',
        high: 'bg-white',
        moderate: 'bg-white',
        low: 'bg-white',
        info: 'bg-white',
    };

    return (
        <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {pulse && (
                <span className="relative flex h-2 w-2 mr-1.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClasses[variant]}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClasses[variant]}`}></span>
                </span>
            )}
            {children}
        </span>
    );
}
