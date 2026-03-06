'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter, ChevronDown, ChevronUp, Calendar, User, Tag } from 'lucide-react';

interface AdvancedSearchProps {
    onSearch: (query: string, filters: SearchFilters) => void;
    placeholder?: string;
    debounceMs?: number;
    showAdvancedFilters?: boolean;
    filterOptions?: {
        statuses?: { value: string; label: string }[];
        categories?: { value: string; label: string }[];
        users?: { value: string; label: string }[];
    };
}

export interface SearchFilters {
    status?: string;
    category?: string;
    createdBy?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
    onSearch,
    placeholder = 'Search...',
    debounceMs = 300,
    showAdvancedFilters = true,
    filterOptions = {}
}) => {
    const [query, setQuery] = useState('');
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({});
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const debouncedSearch = useCallback((searchQuery: string, searchFilters: SearchFilters) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            onSearch(searchQuery, searchFilters);
        }, debounceMs);
    }, [onSearch, debounceMs]);

    useEffect(() => {
        debouncedSearch(query, filters);
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query, filters, debouncedSearch]);

    const handleClearSearch = () => {
        setQuery('');
        setFilters({});
        onSearch('', {});
    };

    const handleFilterChange = (key: keyof SearchFilters, value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: value || undefined
        }));
    };

    const activeFilterCount = Object.values(filters).filter(v => v).length;

    return (
        <div className="w-full">
            <div className="relative flex items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-10 pr-10 py-3 bg-fcc-midnight border border-fcc-border rounded-lg text-gray-200 placeholder-gray-500 focus:border-fcc-gold focus:ring-1 focus:ring-fcc-gold transition"
                    />
                    {(query || activeFilterCount > 0) && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {showAdvancedFilters && (
                    <button
                        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                        className={`ml-3 px-4 py-3 flex items-center border rounded-lg transition ${isAdvancedOpen || activeFilterCount > 0
                            ? 'bg-fcc-gold/20 border-fcc-gold text-fcc-gold'
                            : 'bg-fcc-midnight border-fcc-border text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            }`}
                    >
                        <Filter className="w-5 h-5 mr-2" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-fcc-gold text-fcc-midnight rounded-full font-bold">
                                {activeFilterCount}
                            </span>
                        )}
                        {isAdvancedOpen ? (
                            <ChevronUp className="w-4 h-4 ml-2" />
                        ) : (
                            <ChevronDown className="w-4 h-4 ml-2" />
                        )}
                    </button>
                )}
            </div>
            {isAdvancedOpen && (
                <div className="mt-4 p-4 bg-fcc-midnight border border-fcc-border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filterOptions.statuses && filterOptions.statuses.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
                                    <Tag className="w-4 h-4 mr-1" />
                                    Status
                                </label>
                                <select
                                    value={filters.status || ''}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full bg-fcc-charcoal border border-fcc-border rounded-md text-gray-200 focus:border-fcc-gold focus:ring-fcc-gold"
                                >
                                    <option value="">All Statuses</option>
                                    {filterOptions.statuses.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {filterOptions.categories && filterOptions.categories.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
                                    <Tag className="w-4 h-4 mr-1" />
                                    Category
                                </label>
                                <select
                                    value={filters.category || ''}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    className="w-full bg-fcc-charcoal border border-fcc-border rounded-md text-gray-200 focus:border-fcc-gold focus:ring-fcc-gold"
                                >
                                    <option value="">All Categories</option>
                                    {filterOptions.categories.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {filterOptions.users && filterOptions.users.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
                                    <User className="w-4 h-4 mr-1" />
                                    Created By
                                </label>
                                <select
                                    value={filters.createdBy || ''}
                                    onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                                    className="w-full bg-fcc-charcoal border border-fcc-border rounded-md text-gray-200 focus:border-fcc-gold focus:ring-fcc-gold"
                                >
                                    <option value="">Anyone</option>
                                    {filterOptions.users.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Sort By</label>
                            <div className="flex space-x-2">
                                <select
                                    value={filters.sortBy || ''}
                                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                    className="flex-1 bg-fcc-charcoal border border-fcc-border rounded-md text-gray-200 focus:border-fcc-gold focus:ring-fcc-gold"
                                >
                                    <option value="">Default</option>
                                    <option value="name">Name</option>
                                    <option value="createdAt">Created Date</option>
                                    <option value="updatedAt">Updated Date</option>
                                </select>
                                <button
                                    onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className={`px-3 border rounded-md transition ${filters.sortOrder === 'asc'
                                        ? 'bg-fcc-gold/20 border-fcc-gold text-fcc-gold'
                                        : 'bg-fcc-charcoal border-fcc-border text-gray-400 hover:text-gray-200'
                                        }`}
                                >
                                    {filters.sortOrder === 'asc' ? '↑' : '↓'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                From Date
                            </label>
                            <input
                                type="date"
                                value={filters.dateFrom || ''}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                className="w-full bg-fcc-charcoal border border-fcc-border rounded-md text-gray-200 focus:border-fcc-gold focus:ring-fcc-gold"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                To Date
                            </label>
                            <input
                                type="date"
                                value={filters.dateTo || ''}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                className="w-full bg-fcc-charcoal border border-fcc-border rounded-md text-gray-200 focus:border-fcc-gold focus:ring-fcc-gold"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4 pt-4 border-t border-fcc-border">
                        <button
                            onClick={handleClearSearch}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition"
                        >
                            Clear All Filters
                             </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedSearch;
