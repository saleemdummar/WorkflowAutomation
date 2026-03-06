'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Legacy callback route kept for safety; redirect to home if anyone lands here.
export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-fcc-charcoal">
            <p className="text-gray-400">Redirecting…</p>
        </div>
    );
}
