import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, className = '' }) {
    const modalRef = useRef(null);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
            // Simple focus trap: focus the modal container
            if (modalRef.current) {
                modalRef.current.focus();
            }
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
            <div
                ref={modalRef}
                tabIndex="-1"
                className={`bg-white dark:bg-surface-raised w-full max-w-lg rounded-sm border border-slate-200 dark:border-surface-border overflow-hidden outline-none animate-in zoom-in-95 duration-200 ${className}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
            >
                {title && (
                    <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100 dark:border-surface-border">
                        <h2 id="modal-title" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white transition-colors p-1"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <div className="px-5 py-5">{children}</div>
            </div>
        </div>
    );
}
