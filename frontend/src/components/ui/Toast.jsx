import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ message, variant = 'info', duration = 3000, onClose }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => { if (onClose) onClose(); }, 300); // Wait for fade-out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const variantClasses = {
        success: 'bg-success text-white',
        error: 'bg-danger text-white dark:bg-danger-dark',
        info: 'bg-flood-600 text-white dark:bg-flood-700',
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
        error: <XCircle className="w-5 h-5 flex-shrink-0" />,
        info: <Info className="w-5 h-5 flex-shrink-0" />,
    };

    if (!isVisible && !message) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'} ${variantClasses[variant]}`}>
            {icons[variant]}
            <span className="font-medium text-sm">{message}</span>
            <button onClick={() => setIsVisible(false)} className="ml-2 opacity-75 hover:opacity-100 focus:outline-none flex-shrink-0">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
