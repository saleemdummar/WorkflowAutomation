'use client';
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

const iconByType = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle
};

const styleByType = {
    success: 'border-green-500 text-green-300',
    error: 'border-red-500 text-red-300',
    info: 'border-blue-500 text-blue-300',
    warning: 'border-yellow-500 text-yellow-300'
};

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose(), duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const Icon = iconByType[type];

    return (
        <div className="fixed top-6 right-6 z-[100]">
            <div className={`flex items-center space-x-3 bg-fcc-midnight border ${styleByType[type]} px-4 py-3 shadow-lg`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm">{message}</span>
                <button
                    onClick={onClose}
                    className="ml-2 text-gray-400 hover:text-white"
                    aria-label="Close notification"
                >
                    ×
                </button>
            </div>
        </div>
    );
};
