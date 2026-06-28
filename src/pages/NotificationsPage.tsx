import React, { useEffect, useState } from 'react';
import { Bell, Check, Clock, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, PageHeader, Badge, LoadingScreen } from '../components/ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('notifications_log')
      .select('*, clients(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    setNotifications(data ?? []);
    setLoading(false);
  }

  const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    confirmation: { label: 'Confirmación', icon: <Check className="w-3.5 h-3.5" />, color: 'text-emerald-400 bg-emerald-500/15' },
    reminder_24h: { label: 'Recordatorio 24h', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-blue-400 bg-blue-500/15' },
    reminder_2h: { label: 'Recordatorio 2h', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-400 bg-amber-500/15' },
    cancellation: { label: 'Cancelación', icon: <X className="w-3.5 h-3.5" />, color: 'text-red-400 bg-red-500/15' },
    reschedule: { label: 'Reprogramación', icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-violet-400 bg-violet-500/15' },
    birthday: { label: 'Cumpleaños', icon: <span>🎂</span>, color: 'text-pink-400 bg-pink-500/15' },
    campaign: { label: 'Campaña', icon: <Bell className="w-3.5 h-3.5" />, color: 'text-zinc-400 bg-zinc-700/40' },
    other: { label: 'Otro', icon: <Bell className="w-3.5 h-3.5" />, color: 'text-zinc-400 bg-zinc-700/40' },
  };

  const channelLabel: Record<string, string> = { email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS', push: 'Push' };

  const filtered = notifications.filter(n => filter === 'all' || n.status === filter);

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Notificaciones" subtitle="Historial de comunicaciones enviadas a clientes" />

      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Todas' },
          { key: 'sent', label: 'Enviadas' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'failed', label: 'Fallidas' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filter === f.key ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">Sin notificaciones</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 px-6 py-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 hidden sm:table-cell">Canal</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 hidden md:table-cell">Destinatario</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 hidden lg:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => {
                  const cfg = typeConfig[n.type] ?? typeConfig.other;
                  return (
                    <tr key={n.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-300 text-sm">{n.clients?.full_name ?? '—'}</td>
                      <td className="px-4 py-3.5 text-zinc-500 text-sm hidden sm:table-cell">{channelLabel[n.channel] ?? n.channel}</td>
                      <td className="px-4 py-3.5 text-zinc-500 text-sm hidden md:table-cell truncate max-w-[200px]">{n.recipient ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={n.status === 'sent' ? 'success' : n.status === 'failed' ? 'danger' : 'warning'}>
                          {n.status === 'sent' ? 'Enviado' : n.status === 'failed' ? 'Fallido' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500 text-xs hidden lg:table-cell">{format(new Date(n.created_at), "d MMM HH:mm", { locale: es })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
