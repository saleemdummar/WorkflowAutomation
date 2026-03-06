'use client';

import React from 'react';
import { Toast } from '../components/Toast';
import { useToastStore } from '../stores/useToastStore';

/**
 * useToast — Zustand-powered toast hook.
 * Drop-in replacement for the old React Context `useToast()`.
 */
export const useToast = () => {
    const showToast = useToastStore((s) => s.showToast);
    const success = useToastStore((s) => s.success);
    const error = useToastStore((s) => s.error);
    const info = useToastStore((s) => s.info);
    return { showToast, success, error, info };
};

/**
 * ToastProvider — renders the floating toast container.
 * No longer wraps children in a Context.Provider (Zustand is global),
 * but kept as a component so `layout.tsx` doesn't need restructuring.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const toasts = useToastStore((s) => s.toasts);
    const removeToast = useToastStore((s) => s.removeToast);

    return (
        <>
            {children}
            <div className="fixed top-6 right-6 z-[100] space-y-2">
                {toasts.map((toast, index) => (
                    <div key={toast.id} style={{ transform: `translateY(${index * 10}px)` }}>
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            duration={toast.duration}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </div>
        </>
    );
};
