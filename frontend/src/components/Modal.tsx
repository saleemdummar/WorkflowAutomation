'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Called when the modal should close (Escape key, overlay click, X button) */
    onClose: () => void;
    /** Modal title */
    title?: string;
    /** Modal content */
    children: React.ReactNode;
    /** Optional footer (action buttons) */
    footer?: React.ReactNode;
    /** Max width class (default: 'max-w-lg') */
    maxWidth?: string;
    /** Whether clicking the overlay closes the modal (default: true) */
    closeOnOverlayClick?: boolean;
    /** Whether to show the close (X) button (default: true) */
    showCloseButton?: boolean;
}

/**
 * Shared modal component with consistent styling, keyboard handling,
 * and accessibility. Replaces duplicated inline modal patterns.
 */
export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    maxWidth = 'max-w-lg',
    closeOnOverlayClick = true,
    showCloseButton = true,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose],
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
            // Focus trap: focus the modal on open
            modalRef.current?.focus();
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />

            {/* Modal panel */}
            <div
                ref={modalRef}
                tabIndex={-1}
                className={`relative ${maxWidth} w-full mx-4 bg-fcc-midnight border border-fcc-border rounded-lg shadow-2xl`}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-fcc-border">
                        {title && (
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-fcc-border flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
