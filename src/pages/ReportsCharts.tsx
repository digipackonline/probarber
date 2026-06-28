import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card } from '../components/ui';
import { Clock } from 'lucide-react';

const MonthlyChart = memo(function MonthlyChart({ data, fmt }: { data: any[]; fmt: (n: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', color: '#fff' }} formatter={(v: number) => [fmt(v), 'Ingresos']} />
        <Area type="monotone" dataKey="ingresos" stroke="#d4af37" fill="url(#incomeGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
});

const DailyChart = memo(function DailyChart({ data, fmt }: { data: any[]; fmt: (n: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={8}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', color: '#fff' }} formatter={(v: number) => [fmt(v), 'Ingresos']} />
        <Bar dataKey="ingresos" fill="#d4af37" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});

const ServicesChart = memo(function ServicesChart({ data }: { data: any[] }) {
  if (data.length === 0) return <div className="text-center py-8 text-zinc-600 text-sm">Sin datos</div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data.slice(0, 6)} layout="vertical" barSize={16}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
        <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', color: '#fff' }} />
        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});

const HourlyChart = memo(function HourlyChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="hora" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', color: '#fff' }} />
        <Bar dataKey="turnos" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});

export default memo(function ReportsCharts({ monthlyRevenue, dailyRevenue, servicesData, hourlyData, fmt }: {
  monthlyRevenue: any[];
  dailyRevenue: any[];
  servicesData: any[];
  hourlyData: any[];
  fmt: (n: number) => string;
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-white font-semibold mb-4">Ingresos por mes</h3>
          <MonthlyChart data={monthlyRevenue} fmt={fmt} />
        </Card>
        <Card className="p-5">
          <h3 className="text-white font-semibold mb-4">Ingresos diarios (mes actual)</h3>
          <DailyChart data={dailyRevenue} fmt={fmt} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-white font-semibold mb-4">Servicios más vendidos</h3>
          <ServicesChart data={servicesData} />
        </Card>
        <Card className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" />Demanda por horario</h3>
          <HourlyChart data={hourlyData} />
        </Card>
      </div>
    </>
  );
});
