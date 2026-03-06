'use client';

import React, { useState } from 'react';
import { Palette, Type, BoxSelect, Maximize2, AlignLeft, ChevronDown, ChevronRight } from 'lucide-react';

interface StyleEditorProps {
    theme: {
        primaryColor: string;
        backgroundColor: string;
        textColor: string;
        fontFamily?: string;
        baseFontSize?: string;
        borderRadius?: string;
        inputBorderColor?: string;
        labelColor?: string;
        errorColor?: string;
        successColor?: string;
        spacing?: string;
    };
    onThemeChange: (theme: StyleEditorProps['theme']) => void;
}

const fontFamilyOptions = [
    { value: 'Inter, sans-serif', label: 'Inter (Default)' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'Roboto, sans-serif', label: 'Roboto' },
    { value: 'Open Sans, sans-serif', label: 'Open Sans' },
    { value: 'Lato, sans-serif', label: 'Lato' },
];

const fontSizeOptions = [
    { value: '12px', label: 'Extra Small (12px)' },
    { value: '14px', label: 'Small (14px)' },
    { value: '16px', label: 'Medium (16px)' },
    { value: '18px', label: 'Large (18px)' },
    { value: '20px', label: 'Extra Large (20px)' },
];

const spacingOptions = [
    { value: '0.5rem', label: 'Compact' },
    { value: '1rem', label: 'Normal' },
    { value: '1.5rem', label: 'Relaxed' },
    { value: '2rem', label: 'Spacious' },
];

const borderRadiusOptions = [
    { value: '0', label: 'None (Square)' },
    { value: '4px', label: 'Small' },
    { value: '8px', label: 'Medium' },
    { value: '12px', label: 'Large' },
    { value: '9999px', label: 'Full (Pill)' },
];

const SectionHeader = ({ title, icon: Icon, section, expandedSections, toggleSection }: {
    title: string;
    icon: React.ElementType;
    section: string;
    expandedSections: Record<string, boolean>;
    toggleSection: (section: string) => void;
}) => (
    <button
        onClick={() => toggleSection(section)}
        className="flex items-center justify-between w-full py-2 text-left"
    >
        <div className="flex items-center space-x-2">
            <Icon size={16} className="text-fcc-gold" />
            <h4 className="text-sm font-bold text-white">{title}</h4>
        </div>
        {expandedSections[section] ? (
            <ChevronDown size={16} className="text-gray-400" />
        ) : (
            <ChevronRight size={16} className="text-gray-400" />
        )}
    </button>
);

export const StyleEditor: React.FC<StyleEditorProps> = ({
    theme,
    onThemeChange
}) => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        colors: true,
        typography: false,
        borders: false,
        spacing: false,
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const updateTheme = (key: string, value: string) => {
        onThemeChange({ ...theme, [key]: value });
    };

    return (
        <div className="space-y-1">
            {/* Colors Section */}
            <div className="border-b border-fcc-border pb-2">
                <SectionHeader title="Colors" icon={Palette} section="colors" expandedSections={expandedSections} toggleSection={toggleSection} />
                {expandedSections.colors && (
                    <div className="space-y-2 mt-2">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Primary Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={theme.primaryColor}
                                    onChange={(e) => updateTheme('primaryColor', e.target.value)}
                                    className="w-10 h-8 bg-fcc-charcoal border border-fcc-border rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={theme.primaryColor}
                                    onChange={(e) => updateTheme('primaryColor', e.target.value)}
                                    className="flex-1 bg-fcc-midnight border border-fcc-border text-white text-xs px-2 py-1 rounded"
                                    placeholder="#FFD700"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Background Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={theme.backgroundColor}
                                    onChange={(e) => updateTheme('backgroundColor', e.target.value)}
                                    className="w-10 h-8 bg-fcc-charcoal border border-fcc-border rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={theme.backgroundColor}
                                    onChange={(e) => updateTheme('backgroundColor', e.target.value)}
                                    className="flex-1 bg-fcc-midnight border border-fcc-border text-white text-xs px-2 py-1 rounded"
                                    placeholder="#1a1a2e"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Text Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={theme.textColor}
                                    onChange={(e) => updateTheme('textColor', e.target.value)}
                                    className="w-10 h-8 bg-fcc-charcoal border border-fcc-border rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={theme.textColor}
                                    onChange={(e) => updateTheme('textColor', e.target.value)}
                                    className="flex-1 bg-fcc-midnight border border-fcc-border text-white text-xs px-2 py-1 rounded"
                                    placeholder="#ffffff"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Label Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={theme.labelColor || '#9ca3af'}
                                    onChange={(e) => updateTheme('labelColor', e.target.value)}
                                    className="w-10 h-8 bg-fcc-charcoal border border-fcc-border rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={theme.labelColor || '#9ca3af'}
                                    onChange={(e) => updateTheme('labelColor', e.target.value)}
                                    className="flex-1 bg-fcc-midnight border border-fcc-border text-white text-xs px-2 py-1 rounded"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Input Border Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={theme.inputBorderColor || '#374151'}
                                    onChange={(e) => updateTheme('inputBorderColor', e.target.value)}
                                    className="w-10 h-8 bg-fcc-charcoal border border-fcc-border rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={theme.inputBorderColor || '#374151'}
                                    onChange={(e) => updateTheme('inputBorderColor', e.target.value)}
                                    className="flex-1 bg-fcc-midnight border border-fcc-border text-white text-xs px-2 py-1 rounded"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Error Color</label>
                                <input
                                    type="color"
                                    value={theme.errorColor || '#ef4444'}
                                    onChange={(e) => updateTheme('errorColor', e.target.value)}
                                    className="w-full h-8 bg-fcc-charcoal border border-fcc-border rounded cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Success Color</label>
                                <input
                                    type="color"
                                    value={theme.successColor || '#10b981'}
                                    onChange={(e) => updateTheme('successColor', e.target.value)}
                                    className="w-full h-8 bg-fcc-charcoal border border-fcc-border rounded cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Typography Section */}
            <div className="border-b border-fcc-border pb-2">
                <SectionHeader title="Typography" icon={Type} section="typography" expandedSections={expandedSections} toggleSection={toggleSection} />
                {expandedSections.typography && (
                    <div className="space-y-2 mt-2">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Font Family</label>
                            <select
                                value={theme.fontFamily || 'Inter, sans-serif'}
                                onChange={(e) => updateTheme('fontFamily', e.target.value)}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white text-xs px-2 py-2 rounded"
                            >
                                {fontFamilyOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Base Font Size</label>
                            <select
                                value={theme.baseFontSize || '16px'}
                                onChange={(e) => updateTheme('baseFontSize', e.target.value)}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white text-xs px-2 py-2 rounded"
                            >
                                {fontSizeOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="p-2 bg-fcc-midnight rounded border border-fcc-border">
                            <p
                                className="text-center"
                                style={{
                                    fontFamily: theme.fontFamily || 'Inter, sans-serif',
                                    fontSize: theme.baseFontSize || '16px',
                                    color: theme.textColor
                                }}
                            >
                                Preview Text
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Borders Section */}
            <div className="border-b border-fcc-border pb-2">
                <SectionHeader title="Borders & Corners" icon={BoxSelect} section="borders" expandedSections={expandedSections} toggleSection={toggleSection} />
                {expandedSections.borders && (
                    <div className="space-y-2 mt-2">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Border Radius</label>
                            <select
                                value={theme.borderRadius || '8px'}
                                onChange={(e) => updateTheme('borderRadius', e.target.value)}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white text-xs px-2 py-2 rounded"
                            >
                                {borderRadiusOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-center p-4 bg-fcc-midnight rounded border border-fcc-border">
                            <div
                                className="w-24 h-12 border-2"
                                style={{
                                    borderRadius: theme.borderRadius || '8px',
                                    borderColor: theme.primaryColor,
                                    backgroundColor: theme.backgroundColor
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Spacing Section */}
            <div className="pb-2">
                <SectionHeader title="Layout & Spacing" icon={Maximize2} section="spacing" expandedSections={expandedSections} toggleSection={toggleSection} />
                {expandedSections.spacing && (
                    <div className="space-y-2 mt-2">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Field Spacing</label>
                            <select
                                value={theme.spacing || '1rem'}
                                onChange={(e) => updateTheme('spacing', e.target.value)}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white text-xs px-2 py-2 rounded"
                            >
                                {spacingOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="p-2 bg-fcc-midnight rounded border border-fcc-border">
                            <div className="space-y-1" style={{ gap: theme.spacing || '1rem' }}>
                                <div className="h-4 bg-fcc-gold/30 rounded" style={{ marginBottom: theme.spacing || '1rem' }} />
                                <div className="h-4 bg-fcc-gold/30 rounded" style={{ marginBottom: theme.spacing || '1rem' }} />
                                <div className="h-4 bg-fcc-gold/30 rounded" />
                            </div>
                            <p className="text-xs text-gray-500 text-center mt-2">Spacing Preview</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-fcc-border">
                <label className="block text-xs text-gray-400 mb-2">Quick Presets</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onThemeChange({
                            ...theme,
                            primaryColor: '#FFD700',
                            backgroundColor: '#1a1a2e',
                            textColor: '#ffffff',
                            labelColor: '#9ca3af',
                            inputBorderColor: '#374151',
                        })}
                        className="px-2 py-1.5 text-xs bg-linear-to-r from-yellow-600 to-yellow-800 text-white rounded hover:opacity-80 transition-opacity"
                    >
                        Gold Dark
                    </button>
                    <button
                        onClick={() => onThemeChange({
                            ...theme,
                            primaryColor: '#3B82F6',
                            backgroundColor: '#ffffff',
                            textColor: '#1f2937',
                            labelColor: '#4b5563',
                            inputBorderColor: '#d1d5db',
                        })}
                        className="px-2 py-1.5 text-xs bg-linear-to-r from-blue-500 to-blue-700 text-white rounded hover:opacity-80 transition-opacity"
                    >
                        Blue Light
                    </button>
                    <button
                        onClick={() => onThemeChange({
                            ...theme,
                            primaryColor: '#10B981',
                            backgroundColor: '#0f172a',
                            textColor: '#e2e8f0',
                            labelColor: '#94a3b8',
                            inputBorderColor: '#334155',
                        })}
                        className="px-2 py-1.5 text-xs bg-gradient-to-r from-green-500 to-green-700 text-white rounded hover:opacity-80 transition-opacity"
                    >
                        Green Dark
                    </button>
                    <button
                        onClick={() => onThemeChange({
                            ...theme,
                            primaryColor: '#8B5CF6',
                            backgroundColor: '#faf5ff',
                            textColor: '#1e1b4b',
                            labelColor: '#6b7280',
                            inputBorderColor: '#c4b5fd',
                        })}
                        className="px-2 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded hover:opacity-80 transition-opacity"
                    >
                        Purple Light
                    </button>
                </div>
            </div>
        </div>
    );
};