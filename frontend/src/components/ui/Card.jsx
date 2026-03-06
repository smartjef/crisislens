import React from 'react';

export default function Card({ className = '', children, ...props }) {
    return (
        <div className={`bg-white dark:bg-surface-raised rounded border border-slate-200 dark:border-surface-border shadow-sm overflow-hidden ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ className = '', children, ...props }) {
    return (
        <div className={`px-5 py-3 border-b border-slate-200 dark:border-surface-border ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ className = '', children, ...props }) {
    return (
        <h3 className={`text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 ${className}`} {...props}>
            {children}
        </h3>
    );
}

export function CardContent({ className = '', children, ...props }) {
    return (
        <div className={`px-5 py-4 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ className = '', children, ...props }) {
    return (
        <div className={`px-5 py-3 border-t border-slate-200 dark:border-surface-border bg-slate-50 dark:bg-surface ${className}`} {...props}>
            {children}
        </div>
    );
}
