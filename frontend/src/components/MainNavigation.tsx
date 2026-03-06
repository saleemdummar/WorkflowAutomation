'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationBell } from './NotificationBell';
import { NavDropdown, type NavItem } from './NavDropdown';
import { useAuth } from '../contexts/AuthContext';
import {
    Home,
    FileText,
    Send,
    Folder,
    Layout,
    Menu,
    X,
    CheckSquare,
    Bell,
    ListTodo,
    Shield,
    Users,
    User,
    LogOut,
    ChevronDown,
    BarChart3,
    Archive,
    Settings,
    Zap,
    Activity,
    PlusCircle,
} from 'lucide-react';

export const MainNavigation: React.FC = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const { user, isAuthenticated, logout, hasRole, hasAnyRole, isAdmin, isSuperAdmin } = useAuth();

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // Don't close if clicking on a link (let it navigate)
            if (target.tagName === 'A' || target.closest('a')) {
                return;
            }

            // Don't close if clicking inside user menu
            if (userMenuRef.current && userMenuRef.current.contains(target)) {
                return;
            }

            // Check if click is inside any dropdown container
            let clickedInsideDropdown = false;
            Object.entries(dropdownRefs.current).forEach(([key, ref]) => {
                if (ref && ref.contains(target)) {
                    clickedInsideDropdown = true;
                }
            });

            // Only close if click is truly outside
            if (!clickedInsideDropdown) {
                setIsUserMenuOpen(false);
                setOpenDropdown(null);
            }
        };

        // Use click event with a small delay to allow link navigation first
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
        };
    }, [hoverTimeout]);

    const handleMouseEnter = (key: string) => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }
        setOpenDropdown(key);
    };

    const handleMouseLeave = (key: string) => {
        const timeout = setTimeout(() => {
            setOpenDropdown((prev) => (prev === key ? null : prev));
        }, 150); // Small delay to allow moving to dropdown
        setHoverTimeout(timeout);
    };

    // Main navigation items (always visible)
    const mainNavItems = [
        { href: '/', icon: Home, label: 'Dashboard', roles: [] },
        { href: '/approvals', icon: CheckSquare, label: 'Approvals', roles: ['super-admin', 'admin', 'approver'] },
        { href: '/notifications', icon: Bell, label: 'Notifications', roles: [] },
        { href: '/categories', icon: Folder, label: 'Categories', roles: ['super-admin', 'admin', 'form-designer'] },
        { href: '/templates', icon: Layout, label: 'Templates', roles: [] },
    ];

    // Forms dropdown items
    const formsItems = [
        { href: '/forms', icon: ListTodo, label: 'All Forms', roles: [] },
        { href: '/forms/new', icon: FileText, label: 'Create Form', roles: ['super-admin', 'admin', 'form-designer'] },
        { href: '/forms/archived', icon: Archive, label: 'Archived', roles: ['super-admin', 'admin'] },
    ];

    // Submissions dropdown items
    const submissionsItems = [
        { href: '/submissions', icon: Send, label: 'My Submissions', roles: [] },
        { href: '/submissions/drafts', icon: Archive, label: 'Drafts', roles: [] },
        { href: '/submissions/analytics', icon: BarChart3, label: 'Analytics', roles: ['super-admin', 'admin'] },
    ];

    // Workflows dropdown items
    const workflowsItems = [
        { href: '/workflows', icon: Layout, label: 'All Workflows', roles: ['super-admin', 'admin', 'workflow-designer'] },
        { href: '/workflows/new', icon: PlusCircle, label: 'Create Workflow', roles: ['super-admin', 'admin', 'workflow-designer'] },
        { href: '/workflows/executions', icon: Activity, label: 'Executions', roles: ['super-admin', 'admin', 'workflow-designer'] },
        { href: '/workflows/analytics', icon: BarChart3, label: 'Analytics', roles: ['super-admin', 'admin'] },
        { href: '/admin/escalation-rules', icon: Zap, label: 'Escalations', roles: ['super-admin', 'admin', 'workflow-designer'] },
    ];

    // Admin dropdown items
    const adminItems = [
        { href: '/admin/users', icon: Users, label: 'User Management', roles: ['super-admin'] },
        { href: '/admin/roles', icon: Shield, label: 'Roles', roles: ['super-admin'] },
        { href: '/admin/audit-logs', icon: Shield, label: 'Audit Logs', roles: ['super-admin', 'admin'] },
        { href: '/admin/performance', icon: Settings, label: 'Performance', roles: ['super-admin', 'admin'] },
        { href: '/admin/settings', icon: Settings, label: 'System Settings', roles: ['super-admin', 'admin'] },
    ];

    // Filter items by roles (memoized to prevent recalculation on every render)
    const filterItems = (items: NavItem[]) =>
        items.filter(item => item.roles.length === 0 || hasAnyRole(item.roles));

    const visibleMainItems = useMemo(() => filterItems(mainNavItems), [hasAnyRole]);
    const visibleFormsItems = useMemo(() => filterItems(formsItems), [hasAnyRole]);
    const visibleSubmissionsItems = useMemo(() => filterItems(submissionsItems), [hasAnyRole]);
    const visibleWorkflowsItems = useMemo(() => filterItems(workflowsItems), [hasAnyRole]);
    const visibleAdminItems = useMemo(() => filterItems(adminItems), [hasAnyRole]);

    const closeDropdown = () => setOpenDropdown(null);

    const setDropdownRef = (key: string, el: HTMLDivElement | null) => {
        dropdownRefs.current[key] = el;
    };

    const isActive = (href: string) => {
        if (href === '/') {
            return pathname === href;
        }
        return pathname?.startsWith(href);
    };

    const toggleDropdown = (key: string) => {
        setOpenDropdown(openDropdown === key ? null : key);
    };

    const handleLogout = async () => {
        setIsUserMenuOpen(false);
        await logout();
    };

    const initials = user
        ? `${(user.firstName?.[0] ?? '').toUpperCase()}${(user.lastName?.[0] ?? '').toUpperCase()}` || user.username?.[0]?.toUpperCase() || '?'
        : '?';

    return (
        <header className="bg-fcc-midnight border-b border-fcc-border sticky top-0 z-50 shadow-lg">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link href="/" className="flex items-center space-x-3 group transition-transform hover:scale-105">
                        <div className="w-9 h-9 bg-fcc-gold flex items-center justify-center rounded-md shadow-md group-hover:shadow-lg transition-shadow">
                            <span className="text-fcc-charcoal font-black text-lg">W</span>
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight hidden md:block">
                            Workflow Builder
                        </span>
                    </Link>
                    <nav className="hidden lg:flex items-center space-x-1">
                        {/* Main navigation items */}
                        {visibleMainItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-md border-b-2 ${active
                                        ? 'text-fcc-gold border-fcc-gold bg-fcc-charcoal/30'
                                        : 'text-white/90 border-transparent hover:text-fcc-gold hover:border-fcc-gold/50 hover:bg-fcc-charcoal/20'
                                        }`}
                                    title={item.label}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}

                        {/* Forms Dropdown */}
                        <NavDropdown
                            dropdownKey="forms"
                            label="Forms"
                            icon={FileText}
                            items={visibleFormsItems}
                            isOpen={openDropdown === 'forms'}
                            onToggle={toggleDropdown}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onItemClick={closeDropdown}
                            setRef={setDropdownRef}
                        />

                        {/* Submissions Dropdown */}
                        <NavDropdown
                            dropdownKey="submissions"
                            label="Submissions"
                            icon={Send}
                            items={visibleSubmissionsItems}
                            isOpen={openDropdown === 'submissions'}
                            onToggle={toggleDropdown}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onItemClick={closeDropdown}
                            setRef={setDropdownRef}
                        />

                        {/* Workflows Dropdown */}
                        <NavDropdown
                            dropdownKey="workflows"
                            label="Workflows"
                            icon={Layout}
                            items={visibleWorkflowsItems}
                            isOpen={openDropdown === 'workflows'}
                            onToggle={toggleDropdown}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onItemClick={closeDropdown}
                            setRef={setDropdownRef}
                        />

                        {/* Admin Dropdown */}
                        <NavDropdown
                            dropdownKey="admin"
                            label="Admin"
                            icon={Shield}
                            items={visibleAdminItems}
                            isOpen={openDropdown === 'admin'}
                            onToggle={toggleDropdown}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onItemClick={closeDropdown}
                            setRef={setDropdownRef}
                            align="right"
                            additionalActiveCheck={pathname?.startsWith('/admin') ?? false}
                        />
                    </nav>
                    <div className="flex items-center space-x-3">
                        <NotificationBell />

                        {/* User dropdown */}
                        {isAuthenticated && user && (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center space-x-2 text-white hover:text-fcc-gold transition-all duration-200 rounded-lg px-2 py-1.5 hover:bg-fcc-charcoal/30"
                                    aria-label="User menu"
                                >
                                    <div className="w-9 h-9 rounded-full bg-fcc-gold text-fcc-charcoal flex items-center justify-center font-bold text-sm shadow-md hover:shadow-lg transition-shadow">
                                        {initials}
                                    </div>
                                    <span className="hidden md:block text-sm font-medium max-w-35 truncate">
                                        {user.displayName || user.username}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 hidden md:block transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-72 bg-fcc-midnight border border-fcc-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-5 py-4 border-b border-fcc-border bg-fcc-charcoal/20">
                                            <p className="text-sm font-semibold text-white truncate mb-1">{user.displayName || user.username}</p>
                                            <p className="text-xs text-gray-400 truncate mb-3">{user.email}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {user.roles.filter(r => !r.startsWith('default-roles') && r !== 'offline_access' && r !== 'uma_authorization').map((role) => (
                                                    <span key={role} className="inline-block bg-fcc-charcoal text-fcc-gold text-[10px] font-bold px-2.5 py-1 rounded-md border border-fcc-gold/30">
                                                        {role}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="py-1.5">
                                            <Link
                                                href="/profile"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center space-x-3 px-5 py-2.5 text-sm text-white hover:bg-fcc-charcoal transition-colors duration-150"
                                            >
                                                <User className="w-4 h-4" />
                                                <span>Profile</span>
                                            </Link>
                                            {isSuperAdmin && (
                                                <Link
                                                    href="/admin/users"
                                                    onClick={() => setIsUserMenuOpen(false)}
                                                    className="flex items-center space-x-3 px-5 py-2.5 text-sm text-white hover:bg-fcc-charcoal transition-colors duration-150"
                                                >
                                                    <Users className="w-4 h-4" />
                                                    <span>User Management</span>
                                                </Link>
                                            )}
                                            <div className="border-t border-fcc-border my-1"></div>
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center space-x-3 w-full px-5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-150"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden text-white hover:text-fcc-gold p-2 rounded-md hover:bg-fcc-charcoal/30 transition-all duration-200"
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
                {isMenuOpen && (
                    <div className="lg:hidden border-t border-fcc-border py-3 animate-in slide-in-from-top duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
                        <nav className="space-y-1">
                            {/* Main navigation items */}
                            {visibleMainItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-150 rounded-md ${active
                                            ? 'text-fcc-gold bg-fcc-charcoal border-l-4 border-fcc-gold'
                                            : 'text-white hover:text-fcc-gold hover:bg-fcc-charcoal/50'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}

                            {/* Forms Dropdown (Mobile) */}
                            <NavDropdown
                                variant="mobile"
                                dropdownKey="forms-mobile"
                                label="Forms"
                                icon={FileText}
                                items={visibleFormsItems}
                                isOpen={openDropdown === 'forms-mobile'}
                                onToggle={toggleDropdown}
                                onItemClick={() => { setIsMenuOpen(false); setOpenDropdown(null); }}
                            />

                            {/* Submissions Dropdown (Mobile) */}
                            <NavDropdown
                                variant="mobile"
                                dropdownKey="submissions-mobile"
                                label="Submissions"
                                icon={Send}
                                items={visibleSubmissionsItems}
                                isOpen={openDropdown === 'submissions-mobile'}
                                onToggle={toggleDropdown}
                                onItemClick={() => { setIsMenuOpen(false); setOpenDropdown(null); }}
                            />

                            {/* Workflows Dropdown (Mobile) */}
                            <NavDropdown
                                variant="mobile"
                                dropdownKey="workflows-mobile"
                                label="Workflows"
                                icon={Layout}
                                items={visibleWorkflowsItems}
                                isOpen={openDropdown === 'workflows-mobile'}
                                onToggle={toggleDropdown}
                                onItemClick={() => { setIsMenuOpen(false); setOpenDropdown(null); }}
                            />

                            {/* Admin Dropdown (Mobile) */}
                            <NavDropdown
                                variant="mobile"
                                dropdownKey="admin-mobile"
                                label="Admin"
                                icon={Shield}
                                items={visibleAdminItems}
                                isOpen={openDropdown === 'admin-mobile'}
                                onToggle={toggleDropdown}
                                onItemClick={() => { setIsMenuOpen(false); setOpenDropdown(null); }}
                                additionalActiveCheck={pathname?.startsWith('/admin') ?? false}
                            />
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
};
