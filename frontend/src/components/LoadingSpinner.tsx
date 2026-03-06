'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
    fullScreen?: boolean;
    className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    message,
    fullScreen = false,
    className = '',
}) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    const spinner = (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <Loader2 className={`${sizeClasses[size]} animate-spin text-fcc-gold`} />
            {message && (
                <p className="text-gray-400 mt-4 text-sm">{message}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-fcc-charcoal/80 backdrop-blur-sm flex items-center justify-center z-50">
                {spinner}
            </div>
        );
    }

    return spinner;
};
export const LoadingButton: React.FC<{
    loading: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'secondary' | 'danger';
}> = ({
    loading,
    children,
    onClick,
    disabled,
    className = '',
    variant = 'primary',
}) => {
        const variantClasses = {
            primary: 'bg-fcc-gold hover:bg-yellow-500 text-fcc-charcoal',
            secondary: 'bg-fcc-midnight hover:bg-fcc-charcoal text-white border border-fcc-border',
            danger: 'bg-red-500 hover:bg-red-600 text-white',
        };

        return (
            <button
                onClick={onClick}
                disabled={disabled || loading}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
            >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {children}
            </button>
        );
    };
