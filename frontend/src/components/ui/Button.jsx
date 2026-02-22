import React from 'react';
import Spinner from './Spinner';

export default function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    className = '',
    disabled,
    children,
    ...props
}) {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    const variantClasses = {
        primary: 'bg-flood-600 text-white hover:bg-flood-700 dark:hover:bg-flood-500 focus:ring-flood-500',
        ghost: 'bg-transparent text-flood-600 dark:text-flood-400 hover:bg-flood-50 dark:hover:bg-surface-border focus:ring-flood-500',
        danger: 'bg-danger text-white hover:bg-danger-dark focus:ring-danger',
        outline: 'bg-transparent border-2 border-flood-600 text-flood-600 dark:border-flood-500 dark:text-flood-400 hover:bg-flood-50 dark:hover:bg-surface-border focus:ring-flood-500',
    };

    return (
        <button
            className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Spinner size="sm" className="mr-2" />}
            {children}
        </button>
    );
}
