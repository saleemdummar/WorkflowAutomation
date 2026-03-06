'use client';

import React, { createContext, useContext, useCallback, useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { setAccessTokenGetter } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import type { AuthUser } from '../stores/useAuthStore';

// ---------- Types ----------

export type { AuthUser };

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    accessToken: string | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
}

// ---------- Context ----------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}

// ---------- Provider ----------

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const setStoreUser = useAuthStore((s) => s.setUser);
    const setStoreLoading = useAuthStore((s) => s.setLoading);
    const setStoreToken = useAuthStore((s) => s.setAccessToken);

    // Always call useSession - it will handle its own loading state
    // The key is to use getSession() for initial server-side fetch
    const { data: sessionData, isPending } = authClient.useSession();

    // Map Better Auth session to our AuthUser shape
    const user = useMemo<AuthUser | null>(() => {
        if (!sessionData?.user) return null;
        const u = sessionData.user;
        const roleStr = (u as Record<string, unknown>).role as string | undefined;
        const roles = roleStr ? roleStr.split(',').map((r: string) => r.trim()).filter(Boolean) : [];
        const nameParts = (u.name || '').split(' ');
        return {
            id: u.id,
            email: u.email || '',
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            displayName: u.name || u.email || '',
            username: u.email || '',
            roles,
        };
    }, [sessionData]);

    // Session token for .NET backend API calls
    const sessionToken = sessionData?.session?.token ?? null;

    // Sync to Zustand store whenever auth state changes
    useEffect(() => {
        setStoreUser(user);
        setStoreLoading(isPending);
        setStoreToken(sessionToken);
    }, [user, isPending, sessionToken, setStoreUser, setStoreLoading, setStoreToken]);

    // ---------- Actions ----------

    const login = useCallback(async () => {
        router.push('/auth/login');
    }, [router]);

    const logout = useCallback(async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push('/auth/login');
                },
            },
        });
    }, [router]);

    const getAccessToken = useCallback(async (): Promise<string | null> => {
        if (sessionToken) return sessionToken;

        const session = await authClient.getSession();
        return session?.data?.session?.token ?? null;
    }, [sessionToken]);

    // Wire up the token getter so api.ts can attach Bearer header
    // Must be in useEffect to avoid side-effects during render
    useEffect(() => {
        setAccessTokenGetter(getAccessToken);
    }, [getAccessToken]);

    // ---------- Role helpers ----------

    const roles = user?.roles ?? [];

    const hasRole = useCallback(
        (role: string) => roles.includes(role),
        [roles],
    );

    const hasAnyRole = useCallback(
        (r: string[]) => r.some((role) => roles.includes(role)),
        [roles],
    );

    const isSuperAdmin = roles.includes('super-admin');
    const isAdmin = isSuperAdmin || roles.includes('admin');

    // Memoize context value to prevent unnecessary consumer re-renders
    const contextValue = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: !!user,
            isLoading: isPending,
            accessToken: sessionToken,
            login,
            logout,
            getAccessToken,
            hasRole,
            hasAnyRole,
            isAdmin,
            isSuperAdmin,
        }),
        [user, isPending, sessionToken, login, logout, getAccessToken, hasRole, hasAnyRole, isAdmin, isSuperAdmin],
    );

    // ---------- Render ----------

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}
