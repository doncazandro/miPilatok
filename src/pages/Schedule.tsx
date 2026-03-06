import { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    User,
    Users,
    Check,
    X,
    Trash2,
    Settings,
    Edit3
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    parseISO,
    addDays
} from 'date-fns';
import { es } from 'date-fns/locale';

interface ClassSlot {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    capacity: number;
    description?: string;
    instructor_id: string;
    class_id: string;
    instructor: {
        first_name: string;
        last_name: string;
    } | null;
    class: {
        name: string;
        color_hex: string;
    } | null;
    reservations: {
        count: number;
    }[];
}

interface Staff {
    id: string;
    first_name: string;
    last_name: string;
}

interface ClassType {
    id: string;
    name: string;
    color_hex: string;
}

interface Member {
    id: string;
    first_name: string;
    last_name: string;
}

export const Schedule = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [slots, setSlots] = useState<ClassSlot[]>([]);
    const [userReservations, setUserReservations] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<ClassSlot | null>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [bookingLoading, setBookingLoading] = useState(false);

    // Admin Slot Management State
    const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
    const [isManageParticipantsOpen, setIsManageParticipantsOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<ClassSlot | null>(null);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [classes, setClasses] = useState<ClassType[]>([]);
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [slotFormData, setSlotFormData] = useState({
        class_id: '',
        instructor_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '08:00',
        end_time: '09:00',
        capacity: 10
    });

    const isAdmin = user && (user.role === 'super_admin' || user.role === 'center_admin');

    useEffect(() => {
        fetchSlots();
        if (isAdmin) {
            fetchAdminData();
        }
    }, [currentMonth, user]);

    useEffect(() => {
        if (selectedSlot) {
            fetchParticipants(selectedSlot.id);
        } else {
            setParticipants([]);
        }
    }, [selectedSlot]);

    const fetchAdminData = async () => {
        const [staffRes, classesRes, membersRes] = await Promise.all([
            supabase.from('staff').select('id, first_name, last_name'),
            supabase.from('classes').select('id, name, color_hex'),
            supabase.from('members').select('id, first_name, last_name').eq('status', 'active')
        ]);

        if (staffRes.data) setStaff(staffRes.data);
        if (classesRes.data) setClasses(classesRes.data);
        if (membersRes.data) setAllMembers(membersRes.data);
    };

    const fetchParticipants = async (slotId: string) => {
        const { data, error } = await supabase
            .from('reservations')
            .select(`
                id,
                status,
                member:members(id, first_name, last_name, avatar_url)
            `)
            .eq('class_slot_id', slotId);

        if (!error && data) {
            setParticipants(data);
        }
    };

    const fetchSlots = async () => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });

        const { data: slotsData, error: slotsError } = await supabase
            .from('class_slots')
            .select(`
                id,
                date,
                start_time,
                end_time,
                capacity,
                class_id,
                instructor_id,
                instructor:staff(first_name, last_name),
                class:classes(name, color_hex),
                reservations(count)
            `)
            .gte('date', format(start, 'yyyy-MM-dd'))
            .lte('date', format(end, 'yyyy-MM-dd'));

        if (slotsError) {
            showToast('Error al cargar clases', 'error');
        } else {
            setSlots(slotsData as any || []);
        }

        if (user) {
            const { data: resData } = await supabase
                .from('reservations')
                .select('class_slot_id')
                .eq('member_id', user.id)
                .eq('status', 'booked');

            if (resData) {
                setUserReservations(resData.map(r => r.class_slot_id));
            }
        }
    };

    const handleCreateOrUpdateSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        setBookingLoading(true);

        try {
            if (editingSlot) {
                const { error } = await supabase
                    .from('class_slots')
                    .update(slotFormData)
                    .eq('id', editingSlot.id);
                if (error) throw error;
                showToast('Clase actualizada', 'success');
            } else {
                const { error } = await supabase
                    .from('class_slots')
                    .insert([slotFormData]);
                if (error) throw error;
                showToast('Clase creada correctamente', 'success');
            }
            setIsSlotModalOpen(false);
            fetchSlots();
        } catch (error: any) {
            showToast(error.message || 'Error al guardar clase', 'error');
        } finally {
            setBookingLoading(false);
        }
    };

    const handleDeleteSlot = async (id: string) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta clase por completo?')) return;
        try {
            const { error } = await supabase.from('class_slots').delete().eq('id', id);
            if (error) throw error;
            showToast('Clase eliminada', 'success');
            setSelectedSlot(null);
            fetchSlots();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleAdminEnroll = async (memberId: string) => {
        if (!selectedSlot) return;
        try {
            const { error } = await supabase.from('reservations').insert([{
                class_slot_id: selectedSlot.id,
                member_id: memberId,
                status: 'booked'
            }]);
            if (error) throw error;
            showToast('Miembro inscrito', 'success');
            fetchParticipants(selectedSlot.id);
            fetchSlots();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleAdminUnenroll = async (resId: string) => {
        try {
            const { error } = await supabase.from('reservations').delete().eq('id', resId);
            if (error) throw error;
            showToast('Reserva eliminada por Admin', 'info');
            fetchParticipants(selectedSlot!.id);
            fetchSlots();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleUserAction = async () => {
        if (!selectedSlot || !user) return;
        setBookingLoading(true);
        setBookingMessage(null);

        try {
            if (userReservations.includes(selectedSlot.id)) {
                const { error } = await supabase
                    .from('reservations')
                    .delete()
                    .eq('class_slot_id', selectedSlot.id)
                    .eq('member_id', user.id);
                if (error) throw error;
                showToast('Reserva cancelada correctamente', 'success');
            } else {
                const { error } = await supabase
                    .from('reservations')
                    .insert([{ class_slot_id: selectedSlot.id, member_id: user.id, status: 'booked' }]);
                if (error) throw error;
                showToast('¡Reserva confirmada!', 'success');
            }
            fetchSlots();
            setSelectedSlot(null);
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setBookingLoading(false);
        }
    };

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
    });

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-primary-900 tracking-tight">Calendario</h1>
                    <p className="text-slate-500 font-medium mt-1">Planifica y gestiona las sesiones de tu Studio.</p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <button
                            onClick={() => {
                                setEditingSlot(null);
                                setSlotFormData({
                                    class_id: classes[0]?.id || '',
                                    instructor_id: staff[0]?.id || '',
                                    date: format(new Date(), 'yyyy-MM-dd'),
                                    start_time: '08:00',
                                    end_time: '09:00',
                                    capacity: 10
                                });
                                setIsSlotModalOpen(true);
                            }}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-primary-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Nueva Clase
                        </button>
                    )}
                </div>
            </div>

            {/* Calendar Control */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-primary-900 capitalize italic">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </h2>
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all border border-slate-100 bg-white shadow-sm">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all border border-slate-100 bg-white shadow-sm">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <Card className="p-0 border-none shadow-premium bg-white/50 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="grid grid-cols-7 border-b border-slate-100 bg-white/30 font-bold text-[10px] text-slate-400 uppercase tracking-widest py-4 text-center">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7">
                    {days.map(day => {
                        const daySlots = slots.filter(s => isSameDay(parseISO(s.date), day));
                        const isCurrent = isSameMonth(day, currentMonth);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div key={day.toString()} className={`min-h-[140px] p-2 border-b border-r border-slate-50 transition-all ${!isCurrent ? 'bg-slate-50/20 opacity-40' : 'bg-transparent hover:bg-white/40'}`}>
                                <div className="flex justify-end mb-2">
                                    <span className={`text-xs font-black ${isToday ? 'w-6 h-6 flex items-center justify-center bg-primary-600 text-white rounded-lg' : 'text-slate-400'}`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {daySlots.map(slot => (
                                        <div
                                            key={slot.id}
                                            onClick={() => setSelectedSlot(slot)}
                                            className="bg-white/80 p-2 rounded-xl text-[10px] font-bold border border-slate-100 shadow-sm cursor-pointer hover:scale-105 transition-transform group"
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: slot.class?.color_hex }} />
                                                <span className="truncate text-primary-900 group-hover:text-primary-600">{slot.class?.name}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-400">
                                                <span>{slot.start_time.slice(0, 5)}</span>
                                                <span>{slot.reservations?.[0]?.count || 0}/{slot.capacity}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Admin Slot Creation Modal */}
            <Modal
                isOpen={isSlotModalOpen}
                onClose={() => setIsSlotModalOpen(false)}
                title={editingSlot ? "Editar Sesión" : "Crear Nueva Sesión"}
            >
                <form onSubmit={handleCreateOrUpdateSlot} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Clase</label>
                            <select
                                required
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-primary-900 focus:ring-4 focus:ring-primary-500/5 text-sm"
                                value={slotFormData.class_id}
                                onChange={e => setSlotFormData({ ...slotFormData, class_id: e.target.value })}
                            >
                                <option value="">Seleccionar...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instructor</label>
                            <select
                                required
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-primary-900 focus:ring-4 focus:ring-primary-500/5 text-sm"
                                value={slotFormData.instructor_id}
                                onChange={e => setSlotFormData({ ...slotFormData, instructor_id: e.target.value })}
                            >
                                <option value="">Seleccionar...</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</label>
                        <input
                            type="date"
                            required
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-primary-900 focus:ring-4 focus:ring-primary-500/5 text-sm"
                            value={slotFormData.date}
                            onChange={e => setSlotFormData({ ...slotFormData, date: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5 ">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inicio</label>
                            <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={slotFormData.start_time} onChange={e => setSlotFormData({ ...slotFormData, start_time: e.target.value })} />
                        </div>
                        <div className="space-y-1.5 ">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fin</label>
                            <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={slotFormData.end_time} onChange={e => setSlotFormData({ ...slotFormData, end_time: e.target.value })} />
                        </div>
                        <div className="space-y-1.5 ">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cupos</label>
                            <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={slotFormData.capacity} onChange={e => setSlotFormData({ ...slotFormData, capacity: parseInt(e.target.value) })} />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        {editingSlot && (
                            <button
                                type="button"
                                onClick={() => handleDeleteSlot(editingSlot.id)}
                                className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
                            >
                                <Trash2 size={24} />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={bookingLoading}
                            className="flex-1 bg-primary-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95"
                        >
                            {bookingLoading ? 'Guardando...' : editingSlot ? 'Guardar Cambios' : 'Crear Sesión'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Selection & Participant Management Modal */}
            {selectedSlot && (
                <Modal
                    isOpen={!!selectedSlot}
                    onClose={() => setSelectedSlot(null)}
                    title={selectedSlot.class?.name || 'Detalles de Sesión'}
                >
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="flex flex-col items-center justify-center p-6 bg-slate-50/50 border-none">
                                <Clock className="text-primary-600 mb-2" size={20} />
                                <p className="text-sm font-black text-primary-900">{selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Horario</p>
                            </Card>
                            <Card className="flex flex-col items-center justify-center p-6 bg-slate-50/50 border-none">
                                <Users className="text-primary-600 mb-2" size={20} />
                                <p className="text-sm font-black text-primary-900">{participants.length} / {selectedSlot.capacity}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ocupación</p>
                            </Card>
                        </div>

                        {isAdmin ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Lista de Asistencia</h4>
                                    <button
                                        onClick={() => setIsManageParticipantsOpen(!isManageParticipantsOpen)}
                                        className="text-[10px] font-black text-primary-600 uppercase tracking-widest bg-primary-50 px-3 py-1.5 rounded-lg"
                                    >
                                        {isManageParticipantsOpen ? 'Cerrar Panel' : 'Inscribir Miembro'}
                                    </button>
                                </div>

                                {isManageParticipantsOpen && (
                                    <div className="p-4 bg-primary-50/30 rounded-2xl border border-primary-100 flex gap-2 animate-in slide-in-from-top-4 duration-300">
                                        <select
                                            className="flex-1 p-3 rounded-xl border-none outline-none font-bold text-xs bg-white shadow-sm"
                                            onChange={(e) => {
                                                if (e.target.value) handleAdminEnroll(e.target.value);
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="">Seleccionar miembro...</option>
                                            {allMembers.filter(m => !participants.some(p => p.member?.id === m.id)).map(m => (
                                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {participants.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-black text-[10px]">
                                                    {p.member?.first_name[0]}{p.member?.last_name[0]}
                                                </div>
                                                <p className="text-xs font-bold text-primary-900">{p.member?.first_name} {p.member?.last_name}</p>
                                            </div>
                                            <button
                                                onClick={() => handleAdminUnenroll(p.id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {participants.length === 0 && <p className="text-center py-6 text-xs font-bold text-slate-300 italic">No hay reservas para esta clase</p>}
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-50">
                                    <button
                                        onClick={() => {
                                            setEditingSlot(selectedSlot);
                                            setSlotFormData({
                                                class_id: selectedSlot.class_id,
                                                instructor_id: selectedSlot.instructor_id,
                                                date: selectedSlot.date,
                                                start_time: selectedSlot.start_time.slice(0, 5),
                                                end_time: selectedSlot.end_time.slice(0, 5),
                                                capacity: selectedSlot.capacity
                                            });
                                            setIsSlotModalOpen(true);
                                            setSelectedSlot(null);
                                        }}
                                        className="flex-1 p-4 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Settings size={18} /> Editar Sesión
                                    </button>
                                    <button
                                        onClick={() => setSelectedSlot(null)}
                                        className="flex-1 p-4 bg-primary-600 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-primary-900/10"
                                    >
                                        Regresar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="p-6 bg-slate-50 rounded-[2rem] text-center italic text-slate-400 text-xs py-8">
                                    {selectedSlot.description || "Prepárate para una sesión enfocada en tu bienestar y fuerza interior de la mano de nuestros expertos."}
                                </div>
                                <button
                                    onClick={handleUserAction}
                                    disabled={bookingLoading || (!userReservations.includes(selectedSlot.id) && participants.length >= selectedSlot.capacity)}
                                    className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 ${userReservations.includes(selectedSlot.id)
                                        ? 'bg-white text-slate-400 border-2 border-slate-100'
                                        : 'bg-primary-600 text-white shadow-primary-600/20 hover:bg-primary-700'
                                        }`}
                                >
                                    {bookingLoading ? <Loader size="sm" /> : userReservations.includes(selectedSlot.id) ? (
                                        <> <X size={20} /> Cancelar Reserva </>
                                    ) : (
                                        <> <Check size={20} /> Reservar Ahora </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};
