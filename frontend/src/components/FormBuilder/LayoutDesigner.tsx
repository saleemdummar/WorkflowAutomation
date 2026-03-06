'use client';

import React from 'react';
import { Columns, Grid, LayoutGrid } from 'lucide-react';
import { FormLayoutConfig, FormLayoutType } from '../../types/form-builder';

interface LayoutDesignerProps {
    layout: FormLayoutConfig;
    onLayoutChange: (layout: FormLayoutConfig) => void;
}

export const LayoutDesigner: React.FC<LayoutDesignerProps> = ({
    layout,
    onLayoutChange
}) => {
    const updateLayout = (updates: Partial<FormLayoutConfig>) => {
        onLayoutChange({ ...layout, ...updates });
    };

    const updateLayoutType = (type: FormLayoutType) => {
        const defaultColumns = type === 'grid' ? 3 : type === 'two-column' ? 2 : 1;
        updateLayout({ type, columns: layout.columns ?? defaultColumns });
    };

    const columnsValue = layout.type === 'grid' ? (layout.columns ?? 3) : layout.type === 'two-column' ? 2 : 1;
    const rowGapValue = layout.rowGap ?? 24;
    const columnGapValue = layout.columnGap ?? 24;
    const paddingValue = layout.padding ?? 24;
    const maxWidthValue = layout.maxWidth ?? 900;

    return (
        <div className="space-y-3">
            <div className="flex items-center space-x-2">
                <Columns size={16} className="text-fcc-gold" />
                <h4 className="text-sm font-bold text-white">Layout</h4>
            </div>

            <div className="flex space-x-2">
                <button
                    onClick={() => updateLayoutType('single-column')}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm border transition-all ${layout.type === 'single-column'
                        ? 'border-fcc-gold text-fcc-gold bg-fcc-charcoal'
                        : 'border-fcc-border text-gray-400 hover:border-fcc-gold hover:text-fcc-gold'
                        }`}
                >
                    <Grid size={16} />
                    <span>Single Column</span>
                </button>
                <button
                    onClick={() => updateLayoutType('two-column')}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm border transition-all ${layout.type === 'two-column'
                        ? 'border-fcc-gold text-fcc-gold bg-fcc-charcoal'
                        : 'border-fcc-border text-gray-400 hover:border-fcc-gold hover:text-fcc-gold'
                        }`}
                >
                    <Columns size={16} />
                    <span>Two Column</span>
                </button>
                <button
                    onClick={() => updateLayoutType('grid')}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm border transition-all ${layout.type === 'grid'
                        ? 'border-fcc-gold text-fcc-gold bg-fcc-charcoal'
                        : 'border-fcc-border text-gray-400 hover:border-fcc-gold hover:text-fcc-gold'
                        }`}
                >
                    <LayoutGrid size={16} />
                    <span>Grid</span>
                </button>
            </div>

            <div className="space-y-3">
                {layout.type === 'grid' && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Grid Columns</label>
                        <input
                            type="number"
                            min={2}
                            max={6}
                            value={columnsValue}
                            onChange={(e) => updateLayout({ columns: Math.max(2, Math.min(6, Number(e.target.value))) })}
                            className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white text-sm focus:border-fcc-gold outline-none"
                        />
                    </div>
                )}
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Row Gap (px)</label>
                    <input
                        type="number"
                        min={0}
                        max={80}
                        value={rowGapValue}
                        onChange={(e) => updateLayout({ rowGap: Math.max(0, Number(e.target.value)) })}
                        className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white text-sm focus:border-fcc-gold outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Column Gap (px)</label>
                    <input
                        type="number"
                        min={0}
                        max={80}
                        value={columnGapValue}
                        onChange={(e) => updateLayout({ columnGap: Math.max(0, Number(e.target.value)) })}
                        className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white text-sm focus:border-fcc-gold outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Form Padding (px)</label>
                    <input
                        type="number"
                        min={0}
                        max={80}
                        value={paddingValue}
                        onChange={(e) => updateLayout({ padding: Math.max(0, Number(e.target.value)) })}
                        className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white text-sm focus:border-fcc-gold outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Width (px)</label>
                    <input
                        type="number"
                        min={320}
                        max={1400}
                        value={maxWidthValue}
                        onChange={(e) => updateLayout({ maxWidth: Math.max(320, Number(e.target.value)) })}
                        className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white text-sm focus:border-fcc-gold outline-none"
                    />
                </div>
            </div>
        </div>
    );
};