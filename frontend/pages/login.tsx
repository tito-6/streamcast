import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Lock, User, ArrowRight } from 'lucide-react';
import Head from 'next/head';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                router.push('/admin');
            } else {
                setError('Invalid credentials');
            }
        } catch (err) {
            setError('Login failed. Check server connection.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-midnight-black relative overflow-hidden">
            <Head>
                <title>Admin Login | StreamCast</title>
            </Head>
            {/* Background elements */}
            <div className="geometric-pattern" />

            <div className="w-full max-w-md p-8 glass-panel z-10 mx-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">
                        STREAMCAST
                    </h1>
                    <p className="text-gray-400">Secure Admin Access</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                placeholder="Enter username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2 group"
                    >
                        <span>Login to Dashboard</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
}
