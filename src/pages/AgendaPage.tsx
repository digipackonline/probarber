import React, { useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, User, Clock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Badge, Button, Modal, Select, LoadingScreen } from '../components/ui';
import type { Database } from '../lib/database.types';
import { format, addDays, startOfWeek, parseISO, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  clients: { full_name: string } | null;
  barbers: { full_name: string } | null;
  services: { name: string; duration_minutes: number; price: number } | null;
};
type Client = Database['public']['Tables']['clients']['Row'];
type Barber = Database['public']['Tables']['barbers']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type Branch = Database['public']['Tables']['branches']['Row'];

const STATUS_CONFIG = {
  pending:    { label: 'Pendiente', variant: 'warning' as const, bg: 'bg-amber-500/20 border-amber-500/30 hover:bg-amber-500/30' },
  confirmed:  { label: 'Confirmado', variant: 'info' as const, bg: 'bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30' },
  in_progress:{ label: 'En progreso', variant: 'purple' as const, bg: 'bg-violet-500/20 border-violet-500/30 hover:bg-violet-500/30' },
  completed:  { label: 'Completado', variant: 'success' as const, bg: 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30' },
  cancelled:  { label: 'Cancelado', variant: 'danger' as const, bg: 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30' },
  no_show:    { label: 'Ausente', variant: 'default' as const, bg: 'bg-zinc-700/40 border-zinc-600/30 hover:bg-zinc-700/60' },
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 to 20

export default function AgendaPage() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBarber, setFilterBarber] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    branch_id: '', barber_id: '', client_id: '', service_id: '',
    appointment_date: format(new Date(), 'yyyy-MM-dd'), start_time: '09:00', notes: ''
  });

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { loadAppointments(); }, [currentDate, view, filterBarber]);

  async function loadBase() {
    const [b, sv, cl, br] = await Promise.all([
      supabase.from('barbers').select('*').eq('is_active', true).order('full_name'),
      supabase.from('services').select('*').eq('is_active', true).order('name'),
      supabase.from('clients').select('*').order('full_name'),
      supabase.from('branches').select('*').eq('is_active', true),
    ]);
    setBarbers(b.data ?? []);
    setServices(sv.data ?? []);
    setClients(cl.data ?? []);
    setBranches(br.data ?? []);
    setLoading(false);
  }

  async function loadAppointments() {
    let start: string, end: string;
    if (view === 'day') {
      start = end = format(currentDate, 'yyyy-MM-dd');
    } else if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      start = format(ws, 'yyyy-MM-dd');
      end = format(addDays(ws, 6), 'yyyy-MM-dd');
    } else {
      start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
    }
    let q = supabase.from('appointments').select('*, clients(full_name), barbers(full_name), services(name, duration_minutes, price)')
      .gte('appointment_date', start).lte('appointment_date', end).order('appointment_date').order('start_time');
    if (filterBarber !== 'all') q = q.eq('barber_id', filterBarber);
    const { data } = await q;
    setAppointments((data ?? []) as Appointment[]);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('appointments').update({ status }).eq('id', id);
    if (detailAppt?.id === id) setDetailAppt(a => a ? { ...a, status: status as any } : null);

    // Trigger WhatsApp notifications for cancellation/reschedule
    if (status === 'cancelled' || status === 'confirmed') {
      const type = status === 'cancelled' ? 'cancellation' : 'confirmation';
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ action: 'trigger', appointment_id: id, type }),
        });
      } catch { /* silent fail */ }
    }

    loadAppointments();
  }

  const getSelectedService = () => services.find(s => s.id === form.service_id);

  async function saveAppointment() {
    if (!form.branch_id || !form.barber_id || !form.client_id || !form.service_id) return;
    setSaving(true);
    const svc = getSelectedService();
    const [h, m] = form.start_time.split(':').map(Number);
    const endMin = h * 60 + m + (svc?.duration_minutes ?? 30);
    const end_time = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    // Conflict check
    const { data: conflicts } = await supabase.from('appointments')
      .select('id').eq('barber_id', form.barber_id).eq('appointment_date', form.appointment_date)
      .neq('status', 'cancelled').lt('start_time', end_time).gt('end_time', form.start_time);

    if (conflicts && conflicts.length > 0) {
      alert('El barbero ya tiene un turno en ese horario. Por favor elige otro horario.');
      setSaving(false);
      return;
    }

    await supabase.from('appointments').insert({
      branch_id: form.branch_id, barber_id: form.barber_id, client_id: form.client_id,
      service_id: form.service_id, appointment_date: form.appointment_date,
      start_time: form.start_time, end_time, notes: form.notes || null,
      status: 'confirmed', price: svc?.price ?? null
    });
    setSaving(false);
    setModalOpen(false);
    loadAppointments();
  }

  function navigate(dir: number) {
    if (view === 'day') setCurrentDate(d => addDays(d, dir));
    else if (view === 'week') setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i));
  const monthDays = currentDate ? eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }) : [];

  const filteredClients = clients.filter(c => c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch));

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all border border-zinc-700">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all">
            Hoy
          </button>
          <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all border border-zinc-700">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-white font-semibold capitalize ml-1 text-sm">
            {view === 'day' && format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
            {view === 'week' && `${format(weekDays[0], 'd MMM', { locale: es })} – ${format(weekDays[6], 'd MMM yyyy', { locale: es })}`}
            {view === 'month' && format(currentDate, "MMMM yyyy", { locale: es })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-300 text-sm focus:outline-none focus:border-amber-500">
            <option value="all">Todos los barberos</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
          </select>
          <div className="flex bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
            {(['day', 'week', 'month'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-2 text-xs font-medium transition-all ${view === v ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white'}`}>
                {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => { setForm(f => ({ ...f, appointment_date: format(currentDate, 'yyyy-MM-dd'), branch_id: branches[0]?.id ?? '' })); setModalOpen(true); }}>
            Nuevo turno
          </Button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-auto">
        {view === 'day' && <DayView date={currentDate} appointments={appointments.filter(a => a.appointment_date === format(currentDate, 'yyyy-MM-dd'))} onSelect={setDetailAppt} />}
        {view === 'week' && <WeekView days={weekDays} appointments={appointments} onSelect={setDetailAppt} />}
        {view === 'month' && <MonthView days={monthDays} currentDate={currentDate} appointments={appointments} onSelect={setDetailAppt} />}
      </div>

      {/* Appointment Detail */}
      {detailAppt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailAppt(null)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold text-lg">{detailAppt.services?.name}</h3>
                <p className="text-zinc-400 text-sm mt-0.5">{format(parseISO(detailAppt.appointment_date), "EEEE d 'de' MMMM", { locale: es })}</p>
              </div>
              <button onClick={() => setDetailAppt(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 mb-5">
              <InfoRow icon={<User className="w-4 h-4" />} label={detailAppt.clients?.full_name ?? 'Cliente'} />
              <InfoRow icon={<User className="w-4 h-4" />} label={detailAppt.barbers?.full_name ?? 'Barbero'} sub="Barbero" />
              <InfoRow icon={<Clock className="w-4 h-4" />} label={`${detailAppt.start_time?.slice(0, 5)} – ${detailAppt.end_time?.slice(0, 5)}`} />
              {detailAppt.price && <InfoRow icon={<span>$</span>} label={`$${detailAppt.price.toLocaleString('es-AR')}`} />}
            </div>
            <div className="mb-4">
              <Badge variant={STATUS_CONFIG[detailAppt.status]?.variant ?? 'default'}>{STATUS_CONFIG[detailAppt.status]?.label ?? detailAppt.status}</Badge>
              {detailAppt.notes && <p className="text-zinc-500 text-sm mt-2">{detailAppt.notes}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {detailAppt.status !== 'completed' && (
                <button onClick={() => updateStatus(detailAppt.id, 'completed')} className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 py-2 rounded-xl text-xs font-medium transition-all">Completado</button>
              )}
              {detailAppt.status !== 'cancelled' && detailAppt.status !== 'completed' && (
                <button onClick={() => updateStatus(detailAppt.id, 'cancelled')} className="flex-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 py-2 rounded-xl text-xs font-medium transition-all">Cancelar</button>
              )}
              {detailAppt.status !== 'no_show' && detailAppt.status !== 'completed' && (
                <button onClick={() => updateStatus(detailAppt.id, 'no_show')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 py-2 rounded-xl text-xs font-medium transition-all">Ausente</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo turno" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Sucursal *" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select label="Servicio *" value={form.service_id} onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}min)</option>)}
            </Select>
          </div>
          <Select label="Barbero *" value={form.barber_id} onChange={e => setForm(f => ({ ...f, barber_id: e.target.value }))}>
            <option value="">Seleccionar...</option>
            {barbers.filter(b => !form.branch_id || b.branch_id === form.branch_id || !b.branch_id).map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
          </Select>
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-sm">Cliente *</label>
            <input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Buscar cliente..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm" />
            {clientSearch && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {filteredClients.slice(0, 8).map(c => (
                  <button key={c.id} onClick={() => { setForm(f => ({ ...f, client_id: c.id })); setClientSearch(c.full_name); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-700 transition-colors ${form.client_id === c.id ? 'bg-amber-500/10 text-amber-400' : 'text-zinc-300'}`}>
                    {c.full_name} {c.phone ? `· ${c.phone}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-zinc-400 text-sm">Fecha *</label>
              <input type="date" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-zinc-400 text-sm">Hora *</label>
              <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm" />
            </div>
          </div>
          {getSelectedService() && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-300">
              Duración: {getSelectedService()?.duration_minutes} min · Precio: ${getSelectedService()?.price.toLocaleString('es-AR')}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-sm">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Notas opcionales..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveAppointment}>Confirmar turno</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-4 h-4 text-zinc-500 flex-shrink-0">{icon}</span>
      <span className="text-zinc-300">{label}</span>
      {sub && <span className="text-zinc-600 text-xs">({sub})</span>}
    </div>
  );
}

function DayView({ appointments, onSelect }: { date: Date; appointments: Appointment[]; onSelect: (a: Appointment) => void }) {
  return (
    <div className="p-4 min-w-[300px]">
      <div className="relative">
        {HOURS.map(h => (
          <div key={h} className="flex gap-3 mb-0">
            <div className="w-12 text-right text-zinc-600 text-xs pt-1 flex-shrink-0">{h}:00</div>
            <div className="flex-1 border-t border-zinc-800/60 min-h-[60px] relative">
              {appointments.filter(a => {
                const [ah] = a.start_time.split(':').map(Number);
                return ah === h;
              }).map(a => (
                <div key={a.id} onClick={() => onSelect(a)}
                  className={`absolute left-0 right-0 mx-1 rounded-lg p-2 cursor-pointer border text-xs transition-all ${STATUS_CONFIG[a.status]?.bg ?? 'bg-zinc-700/40 border-zinc-600/30'}`}
                  style={{ top: `${(parseInt(a.start_time.split(':')[1]) / 60) * 60}px` }}>
                  <div className="text-white font-medium truncate">{a.clients?.full_name}</div>
                  <div className="text-zinc-400 truncate">{a.services?.name} · {a.barbers?.full_name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({ days, appointments, onSelect }: { days: Date[]; appointments: Appointment[]; onSelect: (a: Appointment) => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
          <div />
          {days.map(d => (
            <div key={d.toISOString()} className={`text-center py-3 text-xs font-medium border-l border-zinc-800 ${format(d, 'yyyy-MM-dd') === today ? 'text-amber-400' : 'text-zinc-400'}`}>
              <div className="uppercase">{format(d, 'EEE', { locale: es })}</div>
              <div className={`text-lg font-bold mt-0.5 ${format(d, 'yyyy-MM-dd') === today ? 'text-amber-400' : 'text-white'}`}>{format(d, 'd')}</div>
            </div>
          ))}
        </div>
        {/* Time rows */}
        {HOURS.map(h => (
          <div key={h} className="grid border-b border-zinc-800/40" style={{ gridTemplateColumns: '48px repeat(7, 1fr)', minHeight: '64px' }}>
            <div className="text-right text-zinc-600 text-xs pr-2 pt-1">{h}:00</div>
            {days.map(d => {
              const dayStr = format(d, 'yyyy-MM-dd');
              const dayAppts = appointments.filter(a => {
                const [ah] = a.start_time.split(':').map(Number);
                return a.appointment_date === dayStr && ah === h;
              });
              return (
                <div key={d.toISOString()} className="border-l border-zinc-800/40 p-0.5 relative">
                  {dayAppts.map(a => (
                    <div key={a.id} onClick={() => onSelect(a)}
                      className={`rounded-lg p-1.5 cursor-pointer border text-xs mb-0.5 transition-all ${STATUS_CONFIG[a.status]?.bg ?? 'bg-zinc-700/40 border-zinc-600/30'}`}>
                      <div className="text-white font-medium truncate text-[10px]">{a.clients?.full_name}</div>
                      <div className="text-zinc-400 truncate text-[10px]">{a.start_time?.slice(0, 5)} {a.services?.name}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthView({ days, appointments, onSelect }: { days: Date[]; currentDate: Date; appointments: Appointment[]; onSelect: (a: Appointment) => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const firstDayOfWeek = (days[0].getDay() + 6) % 7; // Monday start
  const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="text-center text-xs text-zinc-500 font-medium py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map(i => <div key={`pad-${i}`} />)}
        {days.map(d => {
          const dayStr = format(d, 'yyyy-MM-dd');
          const dayAppts = appointments.filter(a => a.appointment_date === dayStr);
          const isToday = dayStr === today;
          return (
            <div key={dayStr} className={`min-h-[90px] rounded-xl border p-1.5 transition-all ${isToday ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'}`}>
              <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-amber-500 text-zinc-900' : 'text-zinc-400'}`}>
                {format(d, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map(a => (
                  <div key={a.id} onClick={() => onSelect(a)}
                    className={`rounded px-1.5 py-0.5 text-[10px] cursor-pointer truncate border transition-all ${STATUS_CONFIG[a.status]?.bg ?? 'bg-zinc-700/40 border-zinc-600/30'}`}>
                    <span className="text-white">{a.start_time?.slice(0, 5)} </span>
                    <span className="text-zinc-400">{a.clients?.full_name}</span>
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <div className="text-[10px] text-zinc-500 pl-1">+{dayAppts.length - 3} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
