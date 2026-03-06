'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, type LucideIcon } from 'lucide-react';

export interface NavItem {
    href: string;
    icon: LucideIcon;
    label: string;
    roles: string[];
}

interface NavDropdownBaseProps {
    /** Unique key for this dropdown */
    dropdownKey: string;
    /** Display label for the dropdown trigger */
    label: string;
    /** Icon for the dropdown trigger */
    icon: LucideIcon;
    /** Menu items */
    items: NavItem[];
    /** Whether this dropdown is currently open */
    isOpen: boolean;
    /** Called to toggle or open this dropdown */
    onToggle: (key: string) => void;
    /** Called when a menu item is clicked */
    onItemClick: () => void;
    /** Additional active check beyond items (e.g., pathname starts with '/admin') */
    additionalActiveCheck?: boolean;
}

interface DesktopNavDropdownProps extends NavDropdownBaseProps {
    variant?: 'desktop';
    /** Called on mouse enter (desktop only) */
    onMouseEnter: (key: string) => void;
    /** Called on mouse leave (desktop only) */
    onMouseLeave: (key: string) => void;
    /** Ref callback for the container (desktop only) */
    setRef: (key: string, el: HTMLDivElement | null) => void;
    /** Alignment of the dropdown panel (default: 'left') */
    align?: 'left' | 'right';
}

interface MobileNavDropdownProps extends NavDropdownBaseProps {
    variant: 'mobile';
    onMouseEnter?: never;
    onMouseLeave?: never;
    setRef?: never;
    align?: never;
}

type NavDropdownProps = DesktopNavDropdownProps | MobileNavDropdownProps;


export const NavDropdown: React.FC<NavDropdownProps> = (props) => {
    const {
        dropdownKey,
        label,
        icon: TriggerIcon,
        items,
        isOpen,
        onToggle,
        onItemClick,
        additionalActiveCheck = false,
    } = props;
    const variant = props.variant ?? 'desktop';
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/') return pathname === href;
        return pathname?.startsWith(href);
    };

    const isDropdownActive = items.some(item => isActive(item.href)) || additionalActiveCheck;

    if (items.length === 0) return null;

    // --- Mobile variant ---
    if (variant === 'mobile') {
        return (
            <div>
                <button
                    onClick={() => onToggle(dropdownKey)}
                    className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium transition-all duration-150 rounded-md ${isDropdownActive
                        ? 'text-fcc-gold bg-fcc-charcoal border-l-4 border-fcc-gold'
                        : 'text-white hover:text-fcc-gold hover:bg-fcc-charcoal/50'
                        }`}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                >
                    <div className="flex items-center space-x-3">
                        <TriggerIcon className="w-5 h-5" />
                        <span>{label}</span>
                    </div>
                    <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>
                {isOpen && (
                    <div className="pl-8 space-y-1" role="menu">
                        {items.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onItemClick}
                                    role="menuitem"
                                    className={`flex items-center space-x-3 px-4 py-2.5 text-sm transition-all duration-150 rounded-md ${active
                                        ? 'text-fcc-gold bg-fcc-charcoal/50'
                                        : 'text-gray-300 hover:text-fcc-gold hover:bg-fcc-charcoal/30'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // --- Desktop variant ---
    const { onMouseEnter, onMouseLeave, setRef, align = 'left' } = props as DesktopNavDropdownProps;

    return (
        <div
            className="relative"
            ref={(el) => setRef(dropdownKey, el)}
            onMouseEnter={() => onMouseEnter(dropdownKey)}
            onMouseLeave={() => onMouseLeave(dropdownKey)}
        >
            <button
                onClick={() => onToggle(dropdownKey)}
                className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-md border-b-2 ${isDropdownActive
                    ? 'text-fcc-gold border-fcc-gold bg-fcc-charcoal/30'
                    : 'text-white/90 border-transparent hover:text-fcc-gold hover:border-fcc-gold/50 hover:bg-fcc-charcoal/20'
                    }`}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <TriggerIcon className="w-4 h-4" />
                <span>{label}</span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {isOpen && (
                <div
                    className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1 w-56 bg-fcc-midnight border border-fcc-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}
                    onMouseEnter={() => onMouseEnter(dropdownKey)}
                    onMouseLeave={() => onMouseLeave(dropdownKey)}
                    role="menu"
                >
                    {items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onItemClick}
                                role="menuitem"
                                className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors duration-150 ${active
                                    ? 'text-fcc-gold bg-fcc-charcoal/30'
                                    : 'text-white hover:text-fcc-gold hover:bg-fcc-charcoal/20'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NavDropdown;
