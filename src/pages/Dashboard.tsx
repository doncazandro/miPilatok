import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from '../components/ui/Loader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Users, Calendar, CreditCard, Activity, ArrowUpRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const DashboardHome = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>({});
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    const isAdmin = user?.role === 'super_admin' || user?.role === 'center_admin';

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            if (isAdmin) {
                // 1. Members count
                const { count: memberCount } = await supabase
                    .from('members')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active');

                // 2. Today's classes
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const { count: classesToday } = await supabase
                    .from('class_slots')
                    .select('*', { count: 'exact', head: true })
                    .eq('date', todayStr);

                // 3. Monthly revenue
                const firstDayMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
                const { data: payments } = await supabase
                    .from('payments')
                    .select('amount')
                    .eq('status', 'paid')
                    .gte('paid_at', firstDayMonth);

                const revenue = payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

                // 4. Recent reservations
                const { data: activity } = await supabase
                    .from('reservations')
                    .select(`
                        id,
                        booked_at,
                        member:members(first_name, last_name),
                        slot:class_slots(
                            start_time,
                            class:classes(name)
                        )
                    `)
                    .order('booked_at', { ascending: false })
                    .limit(5);

                setStats({
                    memberCount: memberCount || 0,
                    classesToday: classesToday || 0,
                    revenue: revenue,
                    attendance: '94%' // Still static or would need complex join
                });
                setRecentActivity(activity || []);
            } else {
                // Member specific data
                const { count: myReservations } = await supabase
                    .from('reservations')
                    .select('*', { count: 'exact', head: true })
                    .eq('member_id', user?.id)
                    .gte('booked_at', format(new Date(), 'yyyy-MM-dd'));

                const { data: upcoming } = await supabase
                    .from('reservations')
                    .select(`
                        id,
                        slot:class_slots(
                            date,
                            start_time,
                            class:classes(name, color_hex)
                        )
                    `)
                    .eq('member_id', user?.id)
                    .order('booked_at', { ascending: true })
                    .limit(3);

                setStats({
                    reservationCount: myReservations || 0,
                    membership: 'Premium',
                    daysLeft: 12
                });
                setRecentActivity(upcoming || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold text-primary-900 tracking-tight">
                    Hola, <span className="text-gradient">{user?.first_name}</span>
                </h1>
                <p className="text-slate-500 font-medium tracking-tight">
                    {isAdmin ? 'Aquí tienes un resumen de tu Studio para hoy.' : 'Gestiona tus clases y progreso desde aquí.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isAdmin ? (
                    <>
                        <DashboardStats
                            title="Miembros Activos"
                            value={stats.memberCount}
                            icon={<Users size={20} />}
                            trend="+12%"
                            trendLabel="este mes"
                            to="/members"
                            color="emerald"
                        />
                        <DashboardStats
                            title="Clases Hoy"
                            value={stats.classesToday}
                            icon={<Calendar size={20} />}
                            trend="95%"
                            trendLabel="ocupación"
                            to="/schedule"
                            color="primary"
                        />
                        <DashboardStats
                            title="Ingresos (Mes)"
                            value={`$${stats.revenue?.toLocaleString() || 0}`}
                            icon={<CreditCard size={20} />}
                            trend="+5%"
                            trendLabel="vs prev."
                            to="/payments"
                            color="accent"
                        />
                        <DashboardStats
                            title="Asistencia"
                            value={stats.attendance}
                            icon={<Activity size={20} />}
                            trend="Estable"
                            trendLabel="promedio"
                            to="/reports"
                            color="emerald"
                        />
                    </>
                ) : (
                    <>
                        <DashboardStats
                            title="Mis Reservas"
                            value={stats.reservationCount}
                            icon={<Calendar size={20} />}
                            trend="Próxima"
                            trendLabel={recentActivity[0]?.slot?.start_time || 'N/A'}
                            to="/schedule"
                            color="primary"
                        />
                        <DashboardStats
                            title="Membresía"
                            value={stats.membership}
                            icon={<CreditCard size={20} />}
                            trend={`${stats.daysLeft} días`}
                            trendLabel="vencimiento"
                            to="/payments"
                            color="accent"
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 overflow-hidden border-none shadow-premium relative bg-white/70 backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Activity size={120} />
                    </div>
                    <div className="flex justify-between items-center mb-8 p-1 px-1">
                        <div>
                            <h2 className="text-xl font-bold text-primary-900">
                                {isAdmin ? 'Actividad Reciente' : 'Mis Próximas Clases'}
                            </h2>
                            <p className="text-sm text-slate-400 mt-1 font-medium tracking-tight">
                                {isAdmin ? 'Últimas reservas realizadas' : 'Tus sesiones programadas'}
                            </p>
                        </div>
                        <Link to={isAdmin ? "/schedule" : "/schedule"} className="text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-widest flex items-center gap-1 group">
                            Ver todo <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader />
                            </div>
                        ) : recentActivity.length > 0 ? (
                            recentActivity.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl hover:bg-white transition-all group border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isAdmin ? 'bg-primary-50 text-primary-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {isAdmin ? <Users size={20} /> : <Calendar size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-primary-900">
                                                {isAdmin ? `${item.member?.first_name} reservó ${item.slot?.class?.name}` : item.slot?.class?.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock size={12} className="text-slate-300" />
                                                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">
                                                    {isAdmin
                                                        ? format(parseISO(item.booked_at), "d 'de' MMM, HH:mm", { locale: es })
                                                        : `${format(parseISO(item.slot?.date), "d 'de' MMMM", { locale: es })} a las ${item.slot?.start_time.slice(0, 5)}`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant={isAdmin ? "info" : "success"} className="group-hover:scale-105 transition-transform">
                                        {isAdmin ? "Confirmado" : "Próxima"}
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-slate-400 font-medium">No hay actividad reciente.</p>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-primary-900 text-white border-none shadow-xl overflow-hidden relative group p-8 min-h-[320px]">
                        <div className="absolute inset-0 bg-linear-to-br from-primary-800 to-primary-950 opacity-100 transition-opacity group-hover:opacity-90" />
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                                <Activity className="text-white" size={24} />
                            </div>
                            <h2 className="text-XL font-black mb-4 uppercase tracking-widest">Anuncio del Studio</h2>
                            <p className="text-primary-100 text-sm leading-relaxed mb-6 font-medium">
                                ¡Nuevas clases de Reformer Avanzado disponibles a partir de la próxima semana! Reserva tu cupo ahora.
                            </p>
                            <div className="mt-auto">
                                <Link to="/schedule" className="block w-full text-center bg-white text-primary-900 font-bold py-4 rounded-2xl hover:bg-primary-50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10">
                                    Explorar Clases
                                </Link>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

interface DashboardStatsProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend: string;
    trendLabel?: string;
    to: string;
    color: 'emerald' | 'primary' | 'accent';
}

const DashboardStats = ({ title, value, icon, trend, trendLabel, to, color }: DashboardStatsProps) => {
    const colorMap = {
        emerald: 'bg-emerald-50 text-emerald-600',
        primary: 'bg-primary-50 text-primary-600',
        accent: 'bg-yellow-50 text-yellow-600',
    };

    return (
        <Link to={to} className="group block focus:outline-none h-full">
            <Card className="p-5 h-full relative overflow-hidden active:scale-[0.98] border-none shadow-premium bg-white/70 backdrop-blur-sm transition-all hover:bg-white">
                <div className="flex justify-between items-start mb-6">
                    <div className={`p-2.5 rounded-xl ${colorMap[color]} transition-colors group-hover:scale-110 duration-300`}>
                        {icon}
                    </div>
                    <div className="text-slate-300 group-hover:text-primary-400 transition-colors">
                        <ArrowUpRight size={18} />
                    </div>
                </div>
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-primary-900 mb-2 truncate">{value}</span>
                        <div className="flex items-center gap-2">
                            <Badge variant={trend.includes('+') ? 'success' : 'info'} className="text-[9px] px-1.5 font-black">
                                {trend}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">
                                {trendLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
};
