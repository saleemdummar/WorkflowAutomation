import { create } from 'zustand';

export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    username: string;
    roles: string[];
}

interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    accessToken: string | null;

    // Actions
    setUser: (user: AuthUser | null) => void;
    setLoading: (loading: boolean) => void;
    setAccessToken: (token: string | null) => void;

    // Role helpers
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    isAdmin: () => boolean;
    isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    accessToken: null,

    setUser: (user) =>
        set({
            user,
            isAuthenticated: !!user,
        }),

    setLoading: (isLoading) => set({ isLoading }),

    setAccessToken: (accessToken) => set({ accessToken }),

    hasRole: (role) => {
        const { user } = get();
        return user?.roles?.includes(role) ?? false;
    },

    hasAnyRole: (roles) => {
        const { user } = get();
        return roles.some((role) => user?.roles?.includes(role)) ?? false;
    },

    isAdmin: () => {
        const { user } = get();
        const roles = user?.roles ?? [];
        return roles.includes('super-admin') || roles.includes('admin');
    },

    isSuperAdmin: () => {
        const { user } = get();
        return user?.roles?.includes('super-admin') ?? false;
    },
}));
