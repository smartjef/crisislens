import React from 'react';

export default function Avatar({ src, name, size = 'md', className = '' }) {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-14 h-14 text-base',
    };

    const getInitials = (n) => {
        if (!n) return '?';
        const parts = n.split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return n.slice(0, 2).toUpperCase();
    };

    return (
        <div className={`relative flex-shrink-0 inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-200 dark:bg-surface-border text-gray-600 dark:text-gray-300 ${sizeClasses[size]} ${className}`}>
            {src ? (
                <img src={src} alt={name || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
                <span className="font-medium">{getInitials(name)}</span>
            )}
        </div>
    );
}
