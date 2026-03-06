'use client';

import React from 'react';

interface LoadingSkeletonProps {
    variant?: 'text' | 'card' | 'table' | 'form';
    count?: number;
    className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
    variant = 'text',
    count = 1,
    className = '',
}) => {
    const renderSkeleton = () => {
        switch (variant) {
            case 'text':
                return (
                    <div className={`space-y-3 ${className}`}>
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-4 bg-fcc-midnight rounded w-full"></div>
                            </div>
                        ))}
                    </div>
                );

            case 'card':
                return (
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border animate-pulse">
                                <div className="h-6 bg-fcc-charcoal rounded w-3/4 mb-4"></div>
                                <div className="h-4 bg-fcc-charcoal rounded w-full mb-2"></div>
                                <div className="h-4 bg-fcc-charcoal rounded w-5/6 mb-4"></div>
                                <div className="flex gap-2">
                                    <div className="h-8 bg-fcc-charcoal rounded w-20"></div>
                                    <div className="h-8 bg-fcc-charcoal rounded w-20"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'table':
                return (
                    <div className={`bg-fcc-midnight rounded-lg border border-fcc-border overflow-hidden ${className}`}>
                        <div className="animate-pulse">
                            <div className="grid grid-cols-4 gap-4 p-4 border-b border-fcc-border">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-4 bg-fcc-charcoal rounded"></div>
                                ))}
                            </div>
                            {Array.from({ length: count }).map((_, i) => (
                                <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b border-fcc-border last:border-0">
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <div key={j} className="h-4 bg-fcc-charcoal rounded"></div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'form':
                return (
                    <div className={`space-y-6 ${className}`}>
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-4 bg-fcc-midnight rounded w-32 mb-2"></div>
                                <div className="h-10 bg-fcc-midnight rounded w-full"></div>
                            </div>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    return <>{renderSkeleton()}</>;
};
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
    <LoadingSkeleton variant="table" count={rows} />
);

export const CardSkeleton: React.FC<{ cards?: number }> = ({ cards = 3 }) => (
    <LoadingSkeleton variant="card" count={cards} />
);

export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
    <LoadingSkeleton variant="form" count={fields} />
);

export const TextSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
    <LoadingSkeleton variant="text" count={lines} />
);
