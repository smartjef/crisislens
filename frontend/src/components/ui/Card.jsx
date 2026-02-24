import React from 'react';

export default function Card({ className = '', children, ...props }) {
    return (
        <div className={`bg-white dark:bg-surface-raised rounded-2xl shadow-md overflow-hidden ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ className = '', children, ...props }) {
    return (
        <div className={`px-6 py-4 border-b border-slate-200 dark:border-surface-border ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ className = '', children, ...props }) {
    return (
        <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props}>
            {children}
        </h3>
    );
}

export function CardContent({ className = '', children, ...props }) {
    return (
        <div className={`px-6 py-4 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ className = '', children, ...props }) {
    return (
        <div className={`px-6 py-4 border-t border-slate-200 dark:border-surface-border bg-slate-50 dark:bg-surface ${className}`} {...props}>
            {children}
        </div>
    );
}
