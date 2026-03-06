'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        const { data, error: signUpError } = await authClient.signUp.email({
            email,
            password,
            name,
        });

        setLoading(false);

        if (signUpError) {
            setError(signUpError.message || 'Registration failed. Please try again.');
            return;
        }

        if (data) {
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-fcc-charcoal">
            <div className="w-full max-w-md">
                <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-8 shadow-xl">
                    {/* Logo */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="w-12 h-12 bg-fcc-gold flex items-center justify-center mr-3">
                            <span className="text-fcc-charcoal font-black text-2xl">W</span>
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">
                            Workflow Builder
                        </span>
                    </div>

                    <h2 className="text-xl font-semibold text-white text-center mb-6">
                        Create your account
                    </h2>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                                Full Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-fcc-charcoal border border-fcc-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fcc-gold focus:border-transparent"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 bg-fcc-charcoal border border-fcc-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fcc-gold focus:border-transparent"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-fcc-charcoal border border-fcc-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fcc-gold focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-fcc-charcoal border border-fcc-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fcc-gold focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-fcc-gold text-fcc-charcoal font-semibold py-2.5 rounded-lg hover:bg-fcc-gold/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-400 mt-6">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-fcc-gold hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
