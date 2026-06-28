import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '../components/ui';

const COLORS = ['#d4af37', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const RevenueChart = memo(function RevenueChart({ data, fmt }: { data: any[]; fmt: (n: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', color: '#fff' }} formatter={(v: number) => [fmt(v), 'Ingresos']} />
        <Bar dataKey="ingresos" fill="#d4af37" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});

const ServicesPieChart = memo(function ServicesPieChart({ data }: { data: any[] }) {
  if (data.length === 0) return <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">Sin datos este mes</div>;

  return (
    <>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', color: '#fff' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 mt-2">
        {data.map((s, i) => (
          <div key={s.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-zinc-400 truncate max-w-[120px]">{s.name}</span>
            </div>
            <span className="text-white font-medium">{s.count}</span>
          </div>
        ))}
      </div>
    </>
  );
});

export default memo(function DashboardCharts({ revenueChart, servicesChart, fmt }: {
  revenueChart: any[];
  servicesChart: any[];
  fmt: (n: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Revenue chart */}
      <Card className="lg:col-span-2 p-5">
        <h3 className="text-white font-semibold mb-4">Ingresos últimos 7 días</h3>
        <RevenueChart data={revenueChart} fmt={fmt} />
      </Card>

      {/* Services pie */}
      <Card className="p-5">
        <h3 className="text-white font-semibold mb-4">Servicios más vendidos</h3>
        <ServicesPieChart data={servicesChart} />
      </Card>
    </div>
  );
});
