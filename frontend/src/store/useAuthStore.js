import { create } from 'zustand';

// Mock auth store for testing RBAC routing
export const useAuthStore = create((set) => ({
    isAuthenticated: true, // Default to true for easy dev
    user: {
        name: 'Jane Doe',
        role: 'national_ops', // national_ops, super_admin, county_officer, responder, analyst
    },
    login: (role = 'national_ops') => set({ isAuthenticated: true, user: { name: 'Test User', role } }),
    logout: () => set({ isAuthenticated: false, user: null }),
    setRole: (role) => set((state) => ({ user: { ...state.user, role } })),
}));
