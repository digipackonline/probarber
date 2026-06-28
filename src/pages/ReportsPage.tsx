import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { TrendingUp, TrendingDown, Users, Calendar, Scissors, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, StatCard, LoadingScreen, Spinner } from '../components/ui';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

// Lazy load recharts components
const ReportsCharts = lazy(() => import('./ReportsCharts'));

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalAppointments: 0, cancellations: 0, noShows: 0, avgTicket: 0 });

  useEffect(() => { load(); }, [period]);

  async function load() {
    setLoading(true);
    const months = period === 'month' ? 1 : period === 'quarter' ? 3 : 12;
    const startDate = format(subMonths(startOfMonth(new Date()), months - 1), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [apptRes, payRes] = await Promise.all([
      supabase.from('appointments').select('status, start_time').gte('appointment_date', startDate).lte('appointment_date', endDate),
      supabase.from('payments').select('amount, paid_at').gte('paid_at', `${startDate}T00:00:00`).lte('paid_at', `${endDate}T23:59:59`).eq('status', 'completed'),
    ]);

    const appts = apptRes.data ?? [];
    const pays = payRes.data ?? [];
    const totalRevenue = pays.reduce((s: number, p: any) => s + p.amount, 0);
    const completed = appts.filter(a => a.status === 'completed').length;
    const cancelled = appts.filter(a => a.status === 'cancelled').length;
    const noShows = appts.filter(a => a.status === 'no_show').length;

    setStats({ totalRevenue, totalAppointments: completed, cancellations: cancelled, noShows, avgTicket: completed > 0 ? totalRevenue / completed : 0 });

    // Monthly revenue - aggregate in memory
    const monthLabels = Array.from({ length: months }, (_, i) => {
      const d = subMonths(new Date(), months - 1 - i);
      return { label: format(d, 'MMM yy', { locale: es }), month: format(d, 'yyyy-MM') };
    });
    const revenueByMonth: Record<string, number> = {};
    pays.forEach((p: any) => { const m = p.paid_at.substring(0, 7); revenueByMonth[m] = (revenueByMonth[m] ?? 0) + p.amount; });
    setMonthlyRevenue(monthLabels.map(m => ({ month: m.label, ingresos: revenueByMonth[m.month] ?? 0 })));

    // Daily revenue - aggregate in memory
    const days = eachDayOfInterval({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
    const revenueByDay: Record<string, number> = {};
    pays.forEach((p: any) => { const d = p.paid_at.split('T')[0]; revenueByDay[d] = (revenueByDay[d] ?? 0) + p.amount; });
    setDailyRevenue(days.map(d => ({ day: format(d, 'd'), ingresos: revenueByDay[format(d, 'yyyy-MM-dd')] ?? 0 })));

    // Services - single query
    const { data: svcData } = await supabase.from('appointments').select('services(name)').eq('status', 'completed').gte('appointment_date', startDate).lte('appointment_date', endDate);
    const svcCount: Record<string, number> = {};
    (svcData ?? []).forEach((a: any) => { const n = a.services?.name ?? 'Otro'; svcCount[n] = (svcCount[n] ?? 0) + 1; });
    setServicesData(Object.entries(svcCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));

    // Hourly demand
    const hourCount: Record<number, number> = {};
    appts.forEach((a: any) => { if (a.start_time) { const h = parseInt(a.start_time.split(':')[0]); hourCount[h] = (hourCount[h] ?? 0) + 1; } });
    setHourlyData(Array.from({ length: 13 }, (_, i) => ({ hora: `${i + 8}:00`, turnos: hourCount[i + 8] ?? 0 })));

    setLoading(false);
  }

  const fmt = useMemo(() => (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }), []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes y Estadísticas</h1>
          <p className="text-zinc-400 text-sm">Análisis completo del rendimiento</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(['month', 'quarter', 'year'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${period === p ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'}`}>
            {p === 'month' ? 'Este mes' : p === 'quarter' ? 'Trimestre' : 'Año'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Ingresos totales" value={fmt(stats.totalRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="amber" />
        <StatCard title="Turnos realizados" value={stats.totalAppointments} icon={<Calendar className="w-5 h-5" />} color="blue" />
        <StatCard title="Ticket promedio" value={fmt(stats.avgTicket)} icon={<Scissors className="w-5 h-5" />} color="green" />
        <StatCard title="Cancelaciones" value={stats.cancellations} icon={<TrendingDown className="w-5 h-5" />} color="red" />
        <StatCard title="Ausencias" value={stats.noShows} icon={<Users className="w-5 h-5" />} color="purple" />
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner size="lg" /></div>}>
        <ReportsCharts monthlyRevenue={monthlyRevenue} dailyRevenue={dailyRevenue} servicesData={servicesData} hourlyData={hourlyData} fmt={fmt} />
      </Suspense>
    </div>
  );
}
