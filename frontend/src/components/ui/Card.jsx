import React from 'react';

export default function Card({ header, footer, className = '', children }) {
    return (
        <div className={`bg-white dark:bg-surface-raised rounded-2xl shadow-md overflow-hidden ${className}`}>
            {header && <div className="px-6 py-4 border-b border-gray-200 dark:border-surface-border">{header}</div>}
            <div className="px-6 py-4">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface">{footer}</div>}
        </div>
    );
}
