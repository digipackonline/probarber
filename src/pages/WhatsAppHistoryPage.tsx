import React, { useEffect, useState } from 'react';
import { History, MessageCircle, ArrowUpRight, ArrowDownLeft, Check, Clock, AlertCircle, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, LoadingScreen, Badge } from '../components/ui';

interface WhatsAppMessage {
  id: string;
  branch_id: string;
  appointment_id: string | null;
  client_id: string | null;
  direction: 'outbound' | 'inbound';
  message_type: string;
  phone_number: string;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: any; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', variant: 'warning', icon: <Clock className="w-3.5 h-3.5" /> },
  sent: { label: 'Enviado', variant: 'info', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  delivered: { label: 'Entregado', variant: 'success', icon: <Check className="w-3.5 h-3.5" /> },
  read: { label: 'Leído', variant: 'success', icon: <Check className="w-3.5 h-3.5" /> },
  failed: { label: 'Fallido', variant: 'danger', icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

export default function WhatsAppHistoryPage() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'outbound' | 'inbound' | 'failed'>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  useEffect(() => {
    loadMessages(true);
  }, [filter]);

  async function loadMessages(reset = false) {
    if (reset) {
      setPage(0);
      setHasMore(true);
    }
    const currentPage = reset ? 0 : page;
    setLoading(true);

    let query = supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (filter === 'outbound') query = query.eq('direction', 'outbound');
    if (filter === 'inbound') query = query.eq('direction', 'inbound');
    if (filter === 'failed') query = query.eq('status', 'failed');

    const { data, error } = await query;

    if (error) {
      console.error(error);
    } else {
      const newMessages = (data ?? []) as WhatsAppMessage[];
      if (reset) {
        setMessages(newMessages);
      } else {
        setMessages(prev => [...prev, ...newMessages]);
      }
      setHasMore(newMessages.length === PAGE_SIZE);
      if (!reset) setPage(currentPage + 1);
    }
    setLoading(false);
  }

  const filtered = messages.filter(m =>
    m.phone_number.includes(search) ||
    m.content.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: messages.length,
    sent: messages.filter(m => m.direction === 'outbound' && m.status === 'sent').length,
    delivered: messages.filter(m => m.status === 'delivered' || m.status === 'read').length,
    failed: messages.filter(m => m.status === 'failed').length,
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <History className="w-7 h-7 text-green-400" />
            Historial de Mensajes
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Registro completo de mensajes de WhatsApp enviados y recibidos</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} color="zinc" />
        <StatCard label="Enviados" value={stats.sent} color="blue" />
        <StatCard label="Entregados" value={stats.delivered} color="green" />
        <StatCard label="Fallidos" value={stats.failed} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por teléfono o contenido..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-green-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'outbound', 'inbound', 'failed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'outbound' ? 'Salientes' : f === 'inbound' ? 'Entrantes' : 'Fallidos'}
            </button>
          ))}
        </div>
      </div>

      {/* Messages list */}
      <div className="space-y-2">
        {filtered.map(m => {
          const status = STATUS_CONFIG[m.status] || STATUS_CONFIG.pending;
          const isOutbound = m.direction === 'outbound';
          return (
            <Card key={m.id} className="p-3 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isOutbound ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-blue-400'
                }`}>
                  {isOutbound ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium">{m.phone_number}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="text-zinc-600 text-xs">
                      {new Date(m.created_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm line-clamp-2">{m.content}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">No hay mensajes en el historial</p>
        </div>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center">
          <button
            onClick={() => loadMessages(false)}
            className="text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-all"
          >
            Cargar más
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    zinc: 'bg-zinc-800 text-zinc-400',
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
  };
  return (
    <Card className={`p-4 ${colorMap[color] || colorMap.zinc}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
    </Card>
  );
}
