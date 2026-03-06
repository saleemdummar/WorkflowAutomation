'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface AuthGuardProps {
    children: React.ReactNode;
    /** User must have at least ONE of these roles */
    requiredRoles?: string[];
    /** User must have ALL of these roles */
    requireAllRoles?: string[];
    /** Rendered when user is authenticated but lacks the required role */
    fallback?: React.ReactNode;
}

function AccessDenied() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-fcc-charcoal">
            <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-8 max-w-md text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-gray-400 mb-6">
                    You do not have permission to view this page. Contact your administrator if you believe this is an error.
                </p>
                <Link
                    href="/"
                    className="inline-block bg-fcc-gold text-fcc-charcoal font-semibold px-6 py-2 rounded hover:bg-fcc-gold/90 transition"
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
}

export function AuthGuard({ children, requiredRoles, requireAllRoles, fallback }: AuthGuardProps) {
    const { isAuthenticated, isLoading, login, hasRole, hasAnyRole } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            login();
        }
    }, [isLoading, isAuthenticated, login]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-fcc-charcoal">
                <div className="text-center">
                    <LoadingSpinner />
                    <p className="text-gray-400 mt-4">Checking authentication…</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-fcc-charcoal">
                <div className="text-center">
                    <LoadingSpinner />
                    <p className="text-gray-400 mt-4">Redirecting to login…</p>
                </div>
            </div>
        );
    }

    // Check requiredRoles (ANY match)
    if (requiredRoles && requiredRoles.length > 0) {
        if (!hasAnyRole(requiredRoles)) {
            return fallback ? <>{fallback}</> : <AccessDenied />;
        }
    }

    // Check requireAllRoles (ALL must match)
    if (requireAllRoles && requireAllRoles.length > 0) {
        const hasAll = requireAllRoles.every((role) => hasRole(role));
        if (!hasAll) {
            return fallback ? <>{fallback}</> : <AccessDenied />;
        }
    }

    return <>{children}</>;
}
