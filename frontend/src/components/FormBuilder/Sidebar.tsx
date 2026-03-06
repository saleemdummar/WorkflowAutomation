'use client';

import React from 'react';
import { FormElementType } from '../../types/form-builder';
import {
    Type,
    Hash,
    AlignLeft,
    ChevronDown,
    CheckSquare,
    CircleDot,
    Calendar,
    Mail,
    Phone,
    Upload,
    FileText,
    Star,
    PenTool
} from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

interface SidebarItemProps {
    type: FormElementType;
    label: string;
    icon: React.ReactNode;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ type, label, icon }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `sidebar-${type}`,
        data: { type: 'new-element', elementType: type }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`flex items-center space-x-3 p-3 bg-fcc-charcoal border border-fcc-border cursor-grab hover:border-fcc-gold hover:text-fcc-gold transition-all group ${isDragging ? 'opacity-50' : ''
                }`}
        >
            <div className="text-fcc-gold group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <span className="text-sm font-bold text-white group-hover:text-fcc-gold">{label}</span>
        </div>
    );
};

export const Sidebar: React.FC = () => {
    const elementTypes: { type: FormElementType; label: string; icon: React.ReactNode }[] = [
        { type: 'text', label: 'Short Text', icon: <Type size={18} /> },
        { type: 'textarea', label: 'Long Text', icon: <AlignLeft size={18} /> },
        { type: 'number', label: 'Number', icon: <Hash size={18} /> },
        { type: 'email', label: 'Email', icon: <Mail size={18} /> },
        { type: 'phone', label: 'Phone', icon: <Phone size={18} /> },
        { type: 'select', label: 'Dropdown', icon: <ChevronDown size={18} /> },
        { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={18} /> },
        { type: 'radio', label: 'Multiple Choice', icon: <CircleDot size={18} /> },
        { type: 'date', label: 'Date', icon: <Calendar size={18} /> },
        { type: 'file', label: 'File Upload', icon: <Upload size={18} /> },
        { type: 'richtext', label: 'Rich Text', icon: <FileText size={18} /> },
        { type: 'rating', label: 'Rating', icon: <Star size={18} /> },
        { type: 'signature', label: 'Signature', icon: <PenTool size={18} /> },
    ];

    return (
        <aside className="hidden md:flex md:flex-col w-48 lg:w-64 bg-fcc-midnight border-r border-fcc-border p-3 lg:p-4 space-y-4 shrink-0">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Elements</h3>
            <div className="space-y-2">
                {elementTypes.map((item) => (
                    <SidebarItem key={item.type} {...item} />
                ))}
            </div>
        </aside>
    );
};
