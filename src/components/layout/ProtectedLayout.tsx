import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader } from '../ui/Loader';
import { LogOut, LayoutDashboard, Users, Calendar, CreditCard, Menu, X } from 'lucide-react';
import { useState } from 'react';

export const ProtectedLayout = () => {
    const { user, loading, signOut } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[#fdfcfb]">
                <Loader />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const navItems = [
        { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
        { label: 'Miembros', icon: <Users size={20} />, path: '/members' },
        { label: 'Calendario', icon: <Calendar size={20} />, path: '/schedule' },
        { label: 'Pagos', icon: <CreditCard size={20} />, path: '/payments' },
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-[#fdfcfb] flex flex-col md:flex-row">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-100 shadow-premium z-20">
                <div className="p-8">
                    <div className="flex items-center gap-3 group px-2 mb-10">
                        <div className="w-10 h-10 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <span className="text-white text-xl font-bold">P</span>
                        </div>
                        <span className="text-xl font-bold text-primary-900 tracking-tight">Pilates Studio</span>
                    </div>

                    <nav className="space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${isActive(item.path)
                                    ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/20 translate-x-1'
                                    : 'text-slate-400 hover:text-primary-600 hover:bg-primary-50'
                                    }`}
                            >
                                {item.icon}
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-8 border-t border-slate-100">
                    <div className="bg-slate-50/50 p-4 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                                {user.first_name[0]}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-primary-900 truncate max-w-[120px]">
                                    {user.first_name}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {user.role.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={signOut}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <LogOut size={14} />
                            Desconectarse
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden bg-white/70 backdrop-blur-xl border-b border-white/50 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shadow-md">
                        <span className="text-white text-lg font-bold">P</span>
                    </div>
                    <span className="font-bold text-primary-900">Studio</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-primary-900 bg-primary-50 rounded-xl"
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-primary-900/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}>
                    <div className="w-72 h-full bg-white p-8 animate-in slide-in-from-left-4 duration-300" onClick={e => e.stopPropagation()}>
                        <nav className="space-y-4 pt-10">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold transition-all ${isActive(item.path)
                                        ? 'bg-primary-600 text-white shadow-lg'
                                        : 'text-slate-500 hover:bg-primary-50'
                                        }`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                            <button
                                onClick={signOut}
                                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all mt-10"
                            >
                                <LogOut size={20} />
                                Cerrar Sesión
                            </button>
                        </nav>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden relative">
                {/* Background decorative elements */}
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-100/30 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-primary-50/40 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
