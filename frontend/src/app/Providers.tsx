'use client';

import React from 'react';
import { QueryProvider } from '@/contexts/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ErrorBoundaryWrapper } from './ErrorBoundaryWrapper';

export function Providers({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    return (
        <ErrorBoundaryWrapper>
            <QueryProvider>
                <AuthProvider>
                    <ToastProvider>{children}</ToastProvider>
                </AuthProvider>
            </QueryProvider>
        </ErrorBoundaryWrapper>
    );
}