'use client';

import React from 'react';
import Link from 'next/link';
import { MainNavigation } from '@/components/MainNavigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Users, Shield, Activity, Settings, ScrollText, Zap } from 'lucide-react';

function AdminHomePage() {
    const adminSections = [
        {
            href: '/admin/users',
            title: 'User Management',
            description: 'Create users, assign roles, and manage account status.',
            icon: Users,
        },
        {
            href: '/admin/roles',
            title: 'Roles',
            description: 'Review available roles and permission boundaries.',
            icon: Shield,
        },
        {
            href: '/admin/audit-logs',
            title: 'Audit Logs',
            description: 'Track actions, entity changes, and user activity.',
            icon: ScrollText,
        },
        {
            href: '/admin/performance',
            title: 'Performance',
            description: 'Monitor system metrics and API performance health.',
            icon: Activity,
        },
        {
            href: '/admin/settings',
            title: 'System Settings',
            description: 'Configure operational settings and platform behavior.',
            icon: Settings,
        },
        {
            href: '/admin/escalation-rules',
            title: 'Escalation Rules',
            description: 'Define workflow escalation paths and SLA reminders.',
            icon: Zap,
        },
    ];

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Admin Console</h1>
                    <p className="text-gray-400 mt-2">Manage users, governance, and operational settings from one place.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminSections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <Link
                                key={section.href}
                                href={section.href}
                                className="bg-fcc-midnight border border-fcc-border rounded-lg p-5 hover:border-fcc-gold transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-2 rounded bg-fcc-charcoal border border-fcc-border">
                                        <Icon size={18} className="text-fcc-gold" />
                                    </div>
                                    <div>
                                        <h2 className="text-white font-semibold">{section.title}</h2>
                                        <p className="text-gray-400 text-sm mt-1">{section.description}</p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

export default function AdminHomePageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin']}>
            <AdminHomePage />
        </AuthGuard>
    );
}
