import { create } from 'zustand';

export const useAlertStore = create((set, get) => ({
    alerts: [],
    unreadCount: 0,
    toasts: [],

    // Load full alert list from REST
    setAlerts: (alerts) => {
        const activeCount = alerts.filter((a) => a.status === 'active').length;
        set({ alerts, unreadCount: activeCount });
    },

    // Merge a single WS-pushed alert (upsert by id)
    addAlert: (alert) => {
        set((state) => {
            const exists = state.alerts.find((a) => a.id === alert.id);
            const updated = exists
                ? state.alerts.map((a) => (a.id === alert.id ? { ...a, ...alert } : a))
                : [alert, ...state.alerts];
            const activeCount = updated.filter((a) => a.status === 'active').length;
            return { alerts: updated, unreadCount: activeCount };
        });

        // Also show a toast for new critical/high alerts
        if (alert.severity === 'critical' || alert.severity === 'high') {
            get().addToast(`${alert.severity.toUpperCase()}: ${alert.title} (${alert.county})`, 'error');
        }
    },

    addToast: (message, type = 'info') => {
        const id = Date.now().toString();
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, 5000);
    },

    removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    },
}));
