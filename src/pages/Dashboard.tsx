import React, { useEffect, useState, memo, useMemo, lazy, Suspense } from 'react';
import { Calendar, DollarSign, TrendingUp, Clock, UserPlus, Repeat, Scissors } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StatCard, Card, Badge, LoadingScreen, Spinner } from '../components/ui';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

// Lazy load recharts - reduces initial bundle by ~200KB
const ChartContainer = lazy(() => import('./DashboardCharts'));

const STATUS_LABEL: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple' }> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  confirmed: { label: 'Confirmado', variant: 'info' },
  completed: { label: 'Completado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  no_show: { label: 'Ausente', variant: 'default' },
  in_progress: { label: 'En progreso', variant: 'purple' },
};

const AppointmentItem = memo(function AppointmentItem({ appointment }: { appointment: any }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors">
      <div className="text-amber-400 font-mono text-sm w-12 flex-shrink-0">{appointment.start_time?.slice(0, 5)}</div>
      <div className="min-w-0 flex-1">
        <div className="text-white text-sm font-medium truncate">{appointment.clients?.full_name ?? 'Cliente'}</div>
        <div className="text-zinc-500 text-xs truncate">{appointment.services?.name} · {appointment.barbers?.full_name}</div>
      </div>
      <Badge variant={STATUS_LABEL[appointment.status]?.variant ?? 'default'}>{STATUS_LABEL[appointment.status]?.label ?? appointment.status}</Badge>
    </div>
  );
});

const BarberRanking = memo(function BarberRanking({ barbers, fmt }: { barbers: any[]; fmt: (n: number) => string }) {
  const maxBarberRevenue = barbers[0]?.facturacion || 1;

  if (barbers.length === 0) return <div className="text-center py-8 text-zinc-600 text-sm">Sin datos de barberos</div>;

  return (
    <div className="space-y-3">
      {barbers.slice(0, 5).map((b, i) => {
        const pct = (b.facturacion / maxBarberRevenue) * 100;
        return (
          <div key={b.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-mono w-5">#{i + 1}</span>
                <span className="text-white font-medium">{b.name}</span>
              </div>
              <span className="text-amber-400 font-semibold">{fmt(b.facturacion)}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayAppointments: 0, weekAppointments: 0, todayRevenue: 0, monthRevenue: 0, newClients: 0, recurringClients: 0,
  });
  const [todayAppts, setTodayAppts] = useState<any[]>([]);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [servicesChart, setServicesChart] = useState<any[]>([]);
  const [barberStats, setBarberStats] = useState<any[]>([]);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    // Single optimized batch of parallel queries
    const [
      todayApptRes, weekApptRes, todayPayRes, monthPayRes, clientsRes, todayApptsFull,
      { data: monthPayments }, { data: monthApptServices }
    ] = await Promise.all([
      supabase.from('appointments').select('id', { head: true, count: 'exact' }).eq('appointment_date', today).neq('status', 'cancelled'),
      supabase.from('appointments').select('id', { head: true, count: 'exact' }).gte('appointment_date', weekStart).lte('appointment_date', weekEnd).neq('status', 'cancelled'),
      supabase.from('payments').select('amount').gte('paid_at', `${today}T00:00:00`).lte('paid_at', `${today}T23:59:59`).eq('status', 'completed'),
      supabase.from('payments').select('amount').gte('paid_at', `${monthStart}T00:00:00`).lte('paid_at', `${monthEnd}T23:59:59`).eq('status', 'completed'),
      supabase.from('clients').select('created_at'),
      supabase.from('appointments').select('id, status, start_time, clients(full_name), barbers(full_name), services(name)').eq('appointment_date', today).order('start_time'),
      supabase.from('payments').select('amount, paid_at').gte('paid_at', subDays(new Date(), 7).toISOString()).eq('status', 'completed'),
      supabase.from('appointments').select('service_id, services(name)').eq('status', 'completed').gte('appointment_date', monthStart).lte('appointment_date', monthEnd),
    ]);

    const thisMonthClients = (clientsRes.data ?? []).filter(c => c.created_at >= `${monthStart}T00:00:00`).length;
    const totalClients = clientsRes.data?.length ?? 0;
    const todayRev = (todayPayRes.data ?? []).reduce((s: number, p: any) => s + p.amount, 0);
    const monthRev = (monthPayRes.data ?? []).reduce((s: number, p: any) => s + p.amount, 0);

    setStats({
      todayAppointments: todayApptRes.count ?? 0, weekAppointments: weekApptRes.count ?? 0,
      todayRevenue: todayRev, monthRevenue: monthRev,
      newClients: thisMonthClients, recurringClients: Math.max(0, totalClients - thisMonthClients),
    });
    setTodayAppts(todayApptsFull.data ?? []);

    // Revenue chart - aggregate in memory from single query
    const revenueByDay: Record<string, number> = {};
    (monthPayments ?? []).forEach((p: any) => {
      const dayStr = p.paid_at.split('T')[0];
      revenueByDay[dayStr] = (revenueByDay[dayStr] ?? 0) + p.amount;
    });
    const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    setRevenueChart(days.map(d => ({ day: format(d, 'EEE', { locale: es }), ingresos: revenueByDay[format(d, 'yyyy-MM-dd')] ?? 0 })));

    // Services chart - aggregate in memory
    const svcCount: Record<string, number> = {};
    (monthApptServices ?? []).forEach((a: any) => {
      const name = a.services?.name ?? 'Otro';
      svcCount[name] = (svcCount[name] ?? 0) + 1;
    });
    setServicesChart(Object.entries(svcCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5));

    // Barber stats - single query with aggregation
    const { data: barbersData } = await supabase.from('barbers').select('id, full_name').eq('is_active', true);
    if (barbersData && barbersData.length > 0 && monthPayRes.data) {
      // Get barber payments more efficiently
      const { data: barberPayments } = await supabase.from('payments')
        .select('barber_id, amount')
        .not('barber_id', 'is', null)
        .gte('paid_at', `${monthStart}T00:00:00`)
        .eq('status', 'completed');
      const barberRevenue: Record<string, number> = {};
      (barberPayments ?? []).forEach((p: any) => { barberRevenue[p.barber_id] = (barberRevenue[p.barber_id] ?? 0) + p.amount; });
      setBarberStats(barbersData.map(b => ({ name: b.full_name, facturacion: barberRevenue[b.id] ?? 0 })).sort((a, b) => b.facturacion - a.facturacion));
    }

    setLoading(false);
  }

  const fmt = useMemo(() => (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }), []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
        </div>
        <button onClick={loadDashboard} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Turnos hoy" value={stats.todayAppointments} icon={<Calendar className="w-5 h-5" />} color="amber" />
        <StatCard title="Turnos semana" value={stats.weekAppointments} icon={<Clock className="w-5 h-5" />} color="blue" />
        <StatCard title="Ingresos hoy" value={fmt(stats.todayRevenue)} icon={<DollarSign className="w-5 h-5" />} color="green" />
        <StatCard title="Ingresos mes" value={fmt(stats.monthRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="amber" />
        <StatCard title="Clientes nuevos" value={stats.newClients} subtitle="Este mes" icon={<UserPlus className="w-5 h-5" />} color="purple" />
        <StatCard title="Recurrentes" value={stats.recurringClients} subtitle="Total" icon={<Repeat className="w-5 h-5" />} color="blue" />
      </div>

      {/* Charts Row - Lazy loaded */}
      <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner size="lg" /></div>}>
        <ChartContainer revenueChart={revenueChart} servicesChart={servicesChart} fmt={fmt} />
      </Suspense>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-400" />Turnos de hoy</h3>
          {todayAppts.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm">No hay turnos para hoy</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">{todayAppts.map(a => <AppointmentItem key={a.id} appointment={a} />)}</div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Scissors className="w-4 h-4 text-amber-400" />Barberos por facturación (mes)</h3>
          <BarberRanking barbers={barberStats} fmt={fmt} />
        </Card>
      </div>
    </div>
  );
}
