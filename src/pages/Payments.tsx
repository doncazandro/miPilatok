import { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    Download,
    DollarSign,
    Trash2,
    Edit
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Payment {
    id: string;
    amount: number;
    paid_at: string;
    method: 'cash' | 'card' | 'transfer';
    status: 'paid' | 'pending' | 'failed' | 'voided';
    description: string;
    member_id: string;
    member: {
        first_name: string;
        last_name: string;
        email: string;
    } | null;
}

interface Member {
    id: string;
    first_name: string;
    last_name: string;
}

export const Payments = () => {
    const { showToast } = useToast();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        member_id: '',
        amount: '',
        method: 'cash' as Payment['method'],
        description: 'Pago de membresía',
        status: 'paid' as Payment['status']
    });

    const [stats, setStats] = useState({
        totalRevenue: 0,
        pendingAmount: 0,
        monthlyGrowth: 0,
        transactionCount: 0
    });

    useEffect(() => {
        fetchPayments();
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        const { data } = await supabase
            .from('members')
            .select('id, first_name, last_name')
            .eq('status', 'active')
            .order('first_name');
        if (data) setMembers(data);
    };

    const fetchPayments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('payments')
            .select(`
                id,
                amount,
                paid_at,
                method,
                status,
                description,
                member_id,
                member:members(first_name, last_name, email)
            `)
            .order('paid_at', { ascending: false });

        if (error) {
            showToast('Error al cargar pagos', 'error');
        } else {
            const formattedData = data as any[] || [];
            setPayments(formattedData);

            // Calculate stats (only 'paid' status)
            const paidPayments = formattedData.filter(p => p.status === 'paid');
            const total = paidPayments.reduce((acc, curr) => acc + Number(curr.amount), 0);
            const pending = formattedData.filter(p => p.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0);

            setStats({
                totalRevenue: total,
                pendingAmount: pending,
                monthlyGrowth: 15.2,
                transactionCount: paidPayments.length
            });
        }
        setLoading(false);
    };

    const handleOpenCreate = () => {
        setEditingPayment(null);
        setFormData({ member_id: '', amount: '', method: 'cash', description: 'Pago de membresía', status: 'paid' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (payment: Payment) => {
        setEditingPayment(payment);
        setFormData({
            member_id: payment.member_id,
            amount: payment.amount.toString(),
            method: payment.method,
            description: payment.description,
            status: payment.status
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);

        try {
            if (editingPayment) {
                const { error } = await supabase
                    .from('payments')
                    .update({
                        ...formData,
                        amount: Number(formData.amount)
                    })
                    .eq('id', editingPayment.id);
                if (error) throw error;
                showToast('Pago actualizado correctamente', 'success');
            } else {
                const { error } = await supabase
                    .from('payments')
                    .insert([{
                        ...formData,
                        amount: Number(formData.amount),
                        paid_at: new Date().toISOString()
                    }]);
                if (error) throw error;
                showToast('Pago registrado correctamente', 'success');
            }
            fetchPayments();
            setIsModalOpen(false);
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleVoid = async (id: string) => {
        if (!window.confirm('¿Deseas anular este pago? Se mantendrá el registro pero no sumará a los ingresos.')) return;
        try {
            const { error } = await supabase.from('payments').update({ status: 'voided' }).eq('id', id);
            if (error) throw error;
            showToast('Pago anulado (Voided)', 'info');
            fetchPayments();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const exportToCSV = () => {
        if (payments.length === 0) return;

        const headers = ["ID", "Miembro", "Email", "Monto", "Fecha", "Metodo", "Estado"];
        const rows = payments.map(p => [
            p.id,
            `${p.member?.first_name} ${p.member?.last_name}`,
            p.member?.email,
            p.amount,
            p.paid_at,
            p.method,
            p.status
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `pagos_estudio_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Exportación CSV iniciada', 'success');
    };

    const filteredPayments = payments.filter(p =>
        `${p.member?.first_name} ${p.member?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-primary-900 tracking-tight">Pagos y Facturación</h1>
                    <p className="text-slate-500 font-medium mt-1">Gestiona los ingresos y suscripciones de tu centro.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Download size={18} />
                        Exportar
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-primary-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Registrar Pago
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-primary-600 text-white border-none shadow-xl shadow-primary-600/10 relative overflow-hidden group">
                    <DollarSign className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform" size={120} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Ingresos (Mes)</p>
                    <h3 className="text-3xl font-black">${stats.totalRevenue.toLocaleString()}</h3>
                </Card>
                <Card className="p-6 bg-white/70 backdrop-blur-sm border-none shadow-premium group">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pendientes</p>
                    <h3 className="text-2xl font-black text-primary-900">${stats.pendingAmount.toLocaleString()}</h3>
                    <Badge variant="warning" className="mt-4">Seguimiento Requerido</Badge>
                </Card>
                <Card className="p-6 bg-white/70 backdrop-blur-sm border-none shadow-premium group">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Operaciones</p>
                    <h3 className="text-2xl font-black text-primary-900">{stats.transactionCount}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase">Saldadas con éxito</p>
                </Card>
                <Card className="p-6 bg-white/70 backdrop-blur-sm border-none shadow-premium group">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Rentabilidad</p>
                    <h3 className="text-2xl font-black text-emerald-600">+15.2%</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase text-emerald-500">Crecimiento mensual</p>
                </Card>
            </div>

            {/* Table */}
            <Card className="border-none shadow-premium bg-white/70 backdrop-blur-xl overflow-hidden p-0">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-6">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar pago o miembro..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium placeholder:text-slate-300 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Miembro</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Método</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 italic">
                            {loading ? (
                                <tr className="animate-pulse">
                                    <td colSpan={5} className="p-20 text-center"><Loader /></td>
                                </tr>
                            ) : filteredPayments.map(p => (
                                <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => handleOpenEdit(p)}>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-black text-[10px]">
                                                {p.member?.first_name[0]}{p.member?.last_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-primary-900">{p.member?.first_name} {p.member?.last_name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">{p.member?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-xs font-bold text-slate-600">{format(parseISO(p.paid_at), "d MMMM, yyyy", { locale: es })}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <Badge variant="info" className="capitalize text-[10px]">{p.method}</Badge>
                                    </td>
                                    <td className="px-8 py-6">
                                        <Badge variant={p.status === 'paid' ? 'success' : p.status === 'voided' ? 'danger' : 'warning'}>
                                            {p.status === 'paid' ? 'Saldado' : p.status === 'voided' ? 'Anulado' : 'Pendiente'}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity mr-4">
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }} className="p-2 text-slate-300 hover:text-primary-600 hover:bg-white rounded-xl transition-all shadow-sm">
                                                    <Edit size={14} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleVoid(p.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all shadow-sm">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <span className="text-base font-black text-primary-900">${Number(p.amount).toLocaleString()}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPayment ? "Editar Registro de Pago" : "Registrar Nuevo Pago"}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Miembro Emisor</label>
                        <select
                            required
                            className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-primary-900 focus:ring-4 focus:ring-primary-500/5 transition-all appearance-none"
                            value={formData.member_id}
                            onChange={e => setFormData({ ...formData, member_id: e.target.value })}
                        >
                            <option value="">Seleccionar...</option>
                            {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Monto ($)</label>
                            <input
                                type="number"
                                required
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-primary-900 focus:ring-4 focus:ring-primary-500/5 outline-none"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Método</label>
                            <select
                                required
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-primary-900 focus:ring-4 focus:ring-primary-500/5 outline-none"
                                value={formData.method}
                                onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                            >
                                <option value="cash">Efectivo</option>
                                <option value="card">Tarjeta</option>
                                <option value="transfer">Transferencia</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado del Pago</label>
                        <select
                            required
                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-primary-900 focus:ring-4 focus:ring-primary-500/5 outline-none"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        >
                            <option value="paid">Saldado</option>
                            <option value="pending">Pendiente</option>
                            <option value="failed">Fallido</option>
                            <option value="voided">Anulado (Voided)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción / Concepto</label>
                        <textarea
                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-primary-900 focus:ring-4 focus:ring-primary-500/5 outline-none resize-none h-24"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={createLoading}
                            className="flex-1 bg-primary-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {createLoading ? 'Procesando...' : editingPayment ? 'Guardar Cambios' : 'Registrar Pago'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
