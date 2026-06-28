import React, { useEffect, useState } from 'react';
import { Star, Gift, Trophy, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, PageHeader, StatCard, Badge, LoadingScreen } from '../components/ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function LoyaltyPage() {
  const [topClients, setTopClients] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPoints: 0, activeMembers: 0, totalRedeemed: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [clientsRes, txRes] = await Promise.all([
      supabase.from('clients').select('id, full_name, loyalty_points, total_visits').order('loyalty_points', { ascending: false }).limit(10),
      supabase.from('loyalty_transactions').select('*, clients(full_name)').order('created_at', { ascending: false }).limit(20),
    ]);

    const clients = clientsRes.data ?? [];
    const tx = txRes.data ?? [];

    setTopClients(clients);
    setRecentTx(tx);

    const totalPoints = clients.reduce((s, c) => s + c.loyalty_points, 0);
    const activeMembers = clients.filter(c => c.loyalty_points > 0).length;
    const totalRedeemed = tx.filter(t => t.type === 'redeem').reduce((s, t) => s + Math.abs(t.points), 0);

    setStats({ totalPoints, activeMembers, totalRedeemed });
    setLoading(false);
  }

  const getLevelInfo = (points: number) => {
    if (points >= 500) return { label: 'Platino', color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/20', icon: '💎' };
    if (points >= 200) return { label: 'Oro', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/20', icon: '🥇' };
    if (points >= 100) return { label: 'Plata', color: 'text-zinc-300', bg: 'bg-zinc-500/15 border-zinc-500/20', icon: '🥈' };
    return { label: 'Bronce', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/20', icon: '🥉' };
  };

  const txTypeConfig: Record<string, any> = {
    earn: { label: 'Ganados', variant: 'success' },
    redeem: { label: 'Canjeados', variant: 'warning' },
    bonus: { label: 'Bono', variant: 'info' },
    expire: { label: 'Expirados', variant: 'danger' },
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Programa de Fidelización" subtitle="Sistema de puntos y recompensas para clientes" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Puntos en circulación" value={stats.totalPoints.toLocaleString()} icon={<Star className="w-5 h-5" />} color="amber" />
        <StatCard title="Miembros activos" value={stats.activeMembers} icon={<Trophy className="w-5 h-5" />} color="blue" />
        <StatCard title="Puntos canjeados" value={stats.totalRedeemed.toLocaleString()} icon={<Gift className="w-5 h-5" />} color="green" />
      </div>

      {/* Levels explanation */}
      <Card className="p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Niveles del programa</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: '🥉', label: 'Bronce', range: '0–99 pts', benefit: '5% descuento en próxima visita', color: 'border-orange-500/20 bg-orange-500/5' },
            { icon: '🥈', label: 'Plata', range: '100–199 pts', benefit: '10% descuento + sorteo mensual', color: 'border-zinc-500/20 bg-zinc-500/5' },
            { icon: '🥇', label: 'Oro', range: '200–499 pts', benefit: '15% descuento + servicio gratis c/500pts', color: 'border-amber-500/20 bg-amber-500/5' },
            { icon: '💎', label: 'Platino', range: '500+ pts', benefit: '20% descuento + atención prioritaria', color: 'border-sky-500/20 bg-sky-500/5' },
          ].map(l => (
            <div key={l.label} className={`p-4 rounded-xl border ${l.color}`}>
              <div className="text-2xl mb-2">{l.icon}</div>
              <div className="text-white font-semibold text-sm">{l.label}</div>
              <div className="text-zinc-500 text-xs mt-0.5 mb-2">{l.range}</div>
              <div className="text-zinc-400 text-xs">{l.benefit}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-white font-semibold mb-4">Top clientes por puntos</h3>
          {topClients.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm">Sin datos</div>
          ) : (
            <div className="space-y-2">
              {topClients.map((c, i) => {
                const level = getLevelInfo(c.loyalty_points);
                const max = topClients[0].loyalty_points || 1;
                const pct = (c.loyalty_points / max) * 100;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-zinc-500 text-xs w-5 text-right font-mono">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium truncate">{c.full_name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-xs font-medium ${level.color}`}>{level.icon} {level.label}</span>
                          <span className="text-amber-400 font-semibold text-sm">{c.loyalty_points}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-white font-semibold mb-4">Transacciones recientes</h3>
          {recentTx.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm">Sin transacciones</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentTx.map(t => {
                const cfg = txTypeConfig[t.type] ?? { label: t.type, variant: 'default' };
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                    <div>
                      <div className="text-white text-sm font-medium">{t.clients?.full_name}</div>
                      <div className="text-zinc-500 text-xs">{t.description ?? cfg.label} · {format(new Date(t.created_at), "d MMM", { locale: es })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${t.points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.points > 0 ? '+' : ''}{t.points}
                      </span>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
