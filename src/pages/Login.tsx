import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { user } = useAuth();

    // Redirect if already logged in
    if (user) {
        return <p>Redirecting to dashboard...</p>;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200/30 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary-100/40 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-md w-full px-6 relative z-10">
                <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-premium border border-white/50">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-lg shadow-primary-500/30 mb-6 group transition-transform hover:scale-105">
                            <span className="text-white text-2xl font-bold">P</span>
                        </div>
                        <h2 className="text-3xl font-bold text-primary-900 tracking-tight mb-2">
                            Bienvenido de nuevo
                        </h2>
                        <p className="text-slate-500 text-sm">
                            Tu portal exclusivo de Pilates Studio
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm font-medium border border-red-100 mb-6 flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email-address" className="block text-xs font-semibold text-primary-900/50 uppercase tracking-widest mb-2 ml-1">
                                Correo Electrónico
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 placeholder-slate-400 text-primary-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 sm:text-sm"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-primary-900/50 uppercase tracking-widest mb-2 ml-1">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="block w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 placeholder-slate-400 text-primary-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 sm:text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-end">
                            <button type="button" className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/20 disabled:opacity-50 transition-all duration-300 shadow-xl shadow-primary-600/20 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Iniciando sesión...
                                    </span>
                                ) : 'Entrar al Studio'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center border-t border-slate-100 pt-8">
                        <p className="text-xs text-slate-400">
                            Professional Pilates Management System &copy; 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
