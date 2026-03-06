import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader } from '../components/ui/Loader';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { UsersIcon } from '../components/ui/Icons';
import { Search, Plus, Edit, Trash2, Mail, Phone, ChevronRight, AlertTriangle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Member {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    document_id: string | null;
    status: 'active' | 'inactive' | 'suspended';
    created_at: string;
}

export const Members = () => {
    const { showToast } = useToast();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<{ id: string, name: string } | null>(null);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        document_id: '',
        status: 'active' as Member['status']
    });

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMembers(data || []);
        } catch (error: any) {
            showToast(error.message || 'Error al cargar miembros', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(member =>
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.document_id && member.document_id.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const resetForm = () => {
        setFormData({ first_name: '', last_name: '', email: '', phone: '', document_id: '', status: 'active' });
        setEditingMember(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEdit = (member: Member) => {
        setEditingMember(member);
        setFormData({
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email,
            phone: member.phone || '',
            document_id: member.document_id || '',
            status: member.status
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);

        try {
            if (editingMember) {
                const { error } = await supabase
                    .from('members')
                    .update({
                        ...formData
                    })
                    .eq('id', editingMember.id);
                if (error) throw error;
                showToast('Miembro actualizado con éxito', 'success');
            } else {
                const { error } = await supabase
                    .from('members')
                    .insert([{ ...formData }]);
                if (error) throw error;
                showToast('Miembro creado con éxito', 'success');
            }

            await fetchMembers();
            setIsModalOpen(false);
            resetForm();
        } catch (error: any) {
            showToast(error.message || 'Error al procesar la solicitud', 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const confirmDelete = (id: string, name: string) => {
        setMemberToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!memberToDelete) return;
        setFormLoading(true);
        try {
            const { error } = await supabase
                .from('members')
                .delete()
                .eq('id', memberToDelete.id);

            if (error) throw error;
            showToast(`Miembro ${memberToDelete.name} eliminado`, 'success');
            await fetchMembers();
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            showToast(error.message || 'Error al eliminar', 'error');
        } finally {
            setFormLoading(false);
            setMemberToDelete(null);
        }
    };

    const toggleStatus = async (member: Member) => {
        const newStatus: Member['status'] = member.status === 'active' ? 'inactive' : 'active';
        try {
            const { error } = await supabase
                .from('members')
                .update({ status: newStatus })
                .eq('id', member.id);
            if (error) throw error;

            // Optimistic update
            setMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: newStatus } : m));
            showToast(`Estado de ${member.first_name} cambiado a ${newStatus}`, 'info');
        } catch (error: any) {
            showToast(error.message || 'Error al cambiar estado', 'error');
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-primary-900 tracking-tight">Miembros</h1>
                    <p className="text-slate-500 font-medium mt-1">Gestiona la comunidad de tu Studio.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-primary-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
                >
                    <Plus size={20} />
                    Nuevo Miembro
                </button>
            </div>

            {/* Stats bar */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="flex items-center gap-4 py-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                            <span className="font-bold text-lg">{members.filter(m => m.status === 'active').length}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Activos</p>
                            <p className="text-sm font-bold text-primary-900">En comunidad</p>
                        </div>
                    </Card>
                    <Card className="flex items-center gap-4 py-4">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center shadow-sm">
                            <span className="font-bold text-lg">{members.filter(m => m.status === 'inactive').length}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Inactivos</p>
                            <p className="text-sm font-bold text-primary-900">Sin actividad</p>
                        </div>
                    </Card>
                    <Card className="flex items-center gap-4 py-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-sm">
                            <span className="font-bold text-lg">{members.filter(m => m.status === 'suspended').length}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Suspendidos</p>
                            <p className="text-sm font-bold text-primary-900">Acceso restingido</p>
                        </div>
                    </Card>
                </div>
            )}

            <Card className="p-0 border-none shadow-premium bg-white/50 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="p-6 border-b border-slate-100 bg-white/30 flex justify-between items-center">
                    <div className="relative max-w-md w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 sm:text-sm transition-all placeholder:text-slate-400 placeholder:font-medium"
                            placeholder="Buscar por nombre, email o ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20">
                        <Loader />
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-slate-50 mb-6">
                            <UsersIcon className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-primary-900 mb-2">Sin resultados</h3>
                        <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
                            {searchQuery ? 'No hemos encontrado miembros que coincidan con tu búsqueda.' : 'Tu Studio aún no tiene miembros registrados.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/30">
                                    <th scope="col" className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                        Nombre / Comunidad
                                    </th>
                                    <th scope="col" className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                        Identificación
                                    </th>
                                    <th scope="col" className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                        Contacto
                                    </th>
                                    <th scope="col" className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                        Estado
                                    </th>
                                    <th scope="col" className="relative px-8 py-4">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white/30">
                                {filteredMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-primary-50/30 transition-colors group">
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-12 w-12">
                                                    <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center text-sm font-black uppercase shadow-sm group-hover:scale-105 transition-transform">
                                                        {member.first_name[0]}{member.last_name ? member.last_name[0] : ''}
                                                    </div>
                                                </div>
                                                <div className="ml-5">
                                                    <div className="text-sm font-bold text-primary-900">
                                                        {member.first_name} {member.last_name}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                                        Desde {new Date(member.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className="text-xs font-bold text-primary-900/80 bg-slate-100/50 px-3 py-1.5 rounded-xl w-fit">
                                                {member.document_id || '-'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                    <Mail size={12} className="text-slate-400" />
                                                    {member.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                    <Phone size={12} className="text-slate-400" />
                                                    {member.phone || '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <button
                                                onClick={() => toggleStatus(member)}
                                                className="block hover:scale-105 transition-transform"
                                            >
                                                <Badge variant={member.status === 'active' ? 'success' : member.status === 'suspended' ? 'danger' : 'info'}>
                                                    {member.status === 'active' ? 'Activo' : member.status === 'suspended' ? 'Suspendido' : 'Inactivo'}
                                                </Badge>
                                            </button>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenEdit(member)}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(member.id, member.first_name)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button className="p-2 text-slate-300">
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => !formLoading && setIsModalOpen(false)}
                title={editingMember ? "Editar Miembro" : "Añadir Nuevo Miembro"}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-primary-900/50 uppercase tracking-widest ml-1">Nombre</label>
                            <input
                                required
                                type="text"
                                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 text-primary-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 sm:text-sm"
                                placeholder="Ej: María"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-primary-900/50 uppercase tracking-widest ml-1">Apellidos</label>
                            <input
                                required
                                type="text"
                                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 text-primary-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 sm:text-sm"
                                placeholder="Ej: González"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-primary-900/50 uppercase tracking-widest ml-1">Cédula / ID</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 text-primary-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 sm:text-sm"
                                placeholder="V-12.345.678"
                                value={formData.document_id}
                                onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-primary-900/50 uppercase tracking-widest ml-1">Estado</label>
                            <select
                                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 text-primary-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 sm:text-sm"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as Member['status'] })}
                            >
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                                <option value="suspended">Suspendido</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-primary-900/50 uppercase tracking-widest ml-1">Correo Electrónico</label>
                        <input
                            required
                            type="email"
                            className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 text-primary-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 sm:text-sm"
                            placeholder="maria@ejemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-primary-900/50 uppercase tracking-widest ml-1">Teléfono</label>
                        <input
                            type="tel"
                            className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 text-primary-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 sm:text-sm"
                            placeholder="0414-1234567"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div className="pt-6 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            disabled={formLoading}
                            className="px-6 py-3 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-2xl font-bold transition-all active:scale-[0.98]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={formLoading}
                            className="px-8 py-3 text-white bg-primary-600 hover:bg-primary-700 rounded-2xl font-bold shadow-xl shadow-primary-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {formLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Guardando...
                                </span>
                            ) : (editingMember ? 'Actualizar' : 'Crear Miembro')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Deletion Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => !formLoading && setIsDeleteModalOpen(false)}
                title="Confirmar Eliminación"
            >
                <div className="space-y-6 py-4">
                    <div className="flex items-center justify-center w-20 h-20 rounded-[2rem] bg-red-50 text-red-600 mx-auto mb-6">
                        <AlertTriangle size={40} />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-primary-900">¿Estás completamente seguro?</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Esta acción eliminará permanentemente a <span className="font-bold text-primary-900">{memberToDelete?.name}</span> y todos sus datos asociados. Esta acción no se puede deshacer.
                        </p>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={formLoading}
                            className="flex-1 px-6 py-4 text-slate-500 font-bold bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={formLoading}
                            className="flex-1 px-6 py-4 text-white font-bold bg-red-600 rounded-2xl hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {formLoading ? 'Eliminando...' : 'Sí, eliminar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
