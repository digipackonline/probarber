import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Scissors, MapPin, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, PageHeader, LoadingScreen } from '../components/ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<string, any> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  confirmed: { label: 'Confirmado', variant: 'info' },
  completed: { label: 'Completado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  no_show: { label: 'Ausente', variant: 'default' },
};

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: client } = await supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle();
    if (!client) { setLoading(false); return; }
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name, duration_minutes, price), barbers(full_name), branches(name, address)')
      .eq('client_id', client.id)
      .order('appointment_date', { ascending: false })
      .limit(50);
    setAppointments(data ?? []);
    setLoading(false);
  }

  if (loading) return <LoadingScreen />;

  const upcoming = appointments.filter(a => a.appointment_date >= format(new Date(), 'yyyy-MM-dd') && !['cancelled', 'completed'].includes(a.status));
  const past = appointments.filter(a => !upcoming.includes(a));

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Mis Turnos" subtitle="Historial y próximos turnos" />

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> Próximos turnos</h3>
          {upcoming.map(a => (
            <Card key={a.id} className="p-4 border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-white font-semibold">{a.services?.name}</div>
                  <div className="flex items-center gap-1.5 text-zinc-400 text-sm"><Calendar className="w-3.5 h-3.5 text-zinc-600" />{format(new Date(a.appointment_date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}</div>
                  <div className="flex items-center gap-1.5 text-zinc-400 text-sm"><Clock className="w-3.5 h-3.5 text-zinc-600" />{a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)}</div>
                  <div className="flex items-center gap-1.5 text-zinc-400 text-sm"><User className="w-3.5 h-3.5 text-zinc-600" />{a.barbers?.full_name}</div>
                  <div className="flex items-center gap-1.5 text-zinc-400 text-sm"><MapPin className="w-3.5 h-3.5 text-zinc-600" />{a.branches?.name}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={statusConfig[a.status]?.variant}>{statusConfig[a.status]?.label}</Badge>
                  {a.price && <span className="text-amber-400 font-semibold">${a.price.toLocaleString('es-AR')}</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-zinc-400 font-medium text-sm uppercase tracking-wide">Historial</h3>
          {past.map(a => (
            <Card key={a.id} className="p-4 opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-white text-sm font-medium">{a.services?.name}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">{format(new Date(a.appointment_date + 'T12:00:00'), "d MMM yyyy", { locale: es })} · {a.start_time?.slice(0, 5)} · {a.barbers?.full_name}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.price && <span className="text-zinc-400 text-sm">${a.price.toLocaleString('es-AR')}</span>}
                  <Badge variant={statusConfig[a.status]?.variant}>{statusConfig[a.status]?.label}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {appointments.length === 0 && (
        <Card className="p-12 text-center">
          <Scissors className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No tienes turnos registrados.</p>
          <p className="text-zinc-600 text-sm mt-1">¡Reserva tu primer turno en el portal de reservas!</p>
        </Card>
      )}
    </div>
  );
}
