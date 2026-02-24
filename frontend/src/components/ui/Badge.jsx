import React from 'react';

export default function Badge({ variant = 'info', pulse = false, className = '', children }) {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    const variantClasses = {
        critical: 'bg-red-600 text-white',
        high: 'bg-orange-500 text-white',
        moderate: 'bg-amber-500 text-white',
        low: 'bg-blue-600 text-white',
        info: 'bg-slate-500 text-white',
        danger: 'bg-red-100 text-red-700 border border-red-200',
        warning: 'bg-amber-100 text-amber-700 border border-amber-200',
        success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        outline: 'border border-slate-200 text-slate-600 bg-white',
    };

    const dotClasses = {
        critical: 'bg-white',
        high: 'bg-white',
        moderate: 'bg-white',
        low: 'bg-white',
        info: 'bg-white',
        danger: 'bg-red-500',
        warning: 'bg-amber-500',
        success: 'bg-emerald-500',
        outline: 'bg-slate-400',
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
