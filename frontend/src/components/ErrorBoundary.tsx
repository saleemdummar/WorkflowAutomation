'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="min-h-screen bg-fcc-charcoal flex items-center justify-center p-6">
                    <div className="max-w-2xl w-full bg-fcc-midnight rounded-lg border border-fcc-border p-8">
                        <div className="flex items-start gap-4">
                            <div className="shrink-0">
                                <AlertTriangle className="h-12 w-12 text-red-500" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-white mb-2">
                                    Something went wrong
                                </h1>
                                <p className="text-gray-400 mb-6">
                                    An unexpected error occurred while rendering this component.
                                    The error has been logged for investigation.
                                </p>
                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <div className="mb-6 bg-fcc-charcoal rounded-lg p-4 border border-red-500/30">
                                        <h3 className="text-sm font-bold text-red-400 mb-2">Error Details:</h3>
                                        <pre className="text-xs text-gray-300 overflow-auto max-h-48">
                                            {this.state.error.toString()}
                                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                                        </pre>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        onClick={this.handleReset}
                                        className="flex items-center gap-2 px-6 py-3 bg-fcc-gold hover:bg-yellow-500 text-fcc-charcoal font-bold rounded-lg transition-colors"
                                    >
                                        <RefreshCw className="h-5 w-5" />
                                        Try Again
                                    </button>
                                    <Link
                                        href="/"
                                        className="flex items-center gap-2 px-6 py-3 bg-fcc-midnight hover:bg-fcc-charcoal text-white font-bold rounded-lg border border-fcc-border transition-colors"
                                    >
                                        <Home className="h-5 w-5" />
                                        Go Home
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
export const withErrorBoundary = <P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode,
    onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
    const WrappedComponent = (props: P) => (
        <ErrorBoundary fallback={fallback} onError={onError}>
            <Component {...props} />
        </ErrorBoundary>
    );

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

    return WrappedComponent;
};
