import { create } from 'zustand';

export const useAlertStore = create(() => ({
    unreadCount: 3, // Mocked initial unread count
}));
