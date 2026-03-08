'use client';

import React, { useState, useCallback, useRef } from 'react';

interface ConfirmDialogOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmDialogState extends ConfirmDialogOptions {
    isOpen: boolean;
}

/**
 * A hook that provides a promise-based confirm dialog replacement for native confirm().
 * Returns [confirmFn, DialogComponent].
 *
 * Usage:
 *   const [confirm, ConfirmDialog] = useConfirmDialog();
 *   // In handler:
 *   if (await confirm({ message: 'Delete this item?' })) { ... }
 *   // In JSX:
 *   <ConfirmDialog />
 */
export function useConfirmDialog(): [
    (options: ConfirmDialogOptions) => Promise<boolean>,
    React.FC
] {
    const [state, setState] = useState<ConfirmDialogState>({
        isOpen: false,
        message: '',
    });
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
            setState({ ...options, isOpen: true });
        });
    }, []);

    const handleClose = useCallback((result: boolean) => {
        setState((prev) => ({ ...prev, isOpen: false }));
        resolveRef.current?.(result);
        resolveRef.current = null;
    }, []);

    const ConfirmDialog: React.FC = useCallback(() => {
        if (!state.isOpen) return null;

        const variantColors = {
            danger: {
                icon: '⚠️',
                button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
            },
            warning: {
                icon: '⚠️',
                button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
            },
            info: {
                icon: 'ℹ️',
                button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
            },
        };

        const variant = state.variant ?? 'danger';
        const colors = variantColors[variant];

        return (
            <div className="fixed inset-0 z-200 flex items-center justify-center">
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={() => handleClose(false)}
                />
                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">{colors.icon}</span>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {state.title ?? 'Confirm'}
                            </h3>
                            <p className="mt-2 text-sm text-gray-600">{state.message}</p>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => handleClose(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                        >
                            {state.cancelLabel ?? 'Cancel'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleClose(true)}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.button}`}
                            autoFocus
                        >
                            {state.confirmLabel ?? 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }, [state.isOpen, state.message, state.title, state.variant, state.confirmLabel, state.cancelLabel, handleClose]);

    return [confirm, ConfirmDialog];
}
