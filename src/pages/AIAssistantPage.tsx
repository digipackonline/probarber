import React, { useEffect, useState, useRef } from 'react';
import { Bot, Send, Sparkles, TrendingUp, Users, Clock, AlertCircle, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, PageHeader } from '../components/ui';
import { format, subDays } from 'date-fns';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const QUICK_QUESTIONS = [
  '¿Cuáles son los horarios con más demanda?',
  '¿Qué clientes no han visitado en 30 días?',
  '¿Qué servicio genera más ingresos?',
  '¿Cómo puedo aumentar mis reservas?',
  'Analiza el rendimiento de esta semana',
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola! Soy tu asistente inteligente BarberPro. Puedo analizar tu negocio, detectar tendencias, identificar clientes inactivos y sugerir estrategias para aumentar tus ingresos. ¿En qué te puedo ayudar hoy?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [stats, setStats] = useState<any>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadInsights(); generateInsights(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadInsights() {
    const { data } = await supabase.from('ai_insights').select('*').order('created_at', { ascending: false }).limit(10);
    setInsights(data ?? []);
  }

  async function generateInsights() {
    const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

    const [apptRes, clientRes, payRes] = await Promise.all([
      supabase.from('appointments').select('*').gte('appointment_date', monthStart),
      supabase.from('clients').select('id, full_name, total_visits, updated_at'),
      supabase.from('payments').select('amount').gte('paid_at', `${monthStart}T00:00:00`).eq('status', 'completed'),
    ]);

    const appts = apptRes.data ?? [];
    const clients = clientRes.data ?? [];
    const pays = payRes.data ?? [];

    const totalRevenue = pays.reduce((s, p) => s + p.amount, 0);
    const completedAppts = appts.filter(a => a.status === 'completed').length;
    const cancelledAppts = appts.filter(a => a.status === 'cancelled').length;
    const cancelRate = appts.length > 0 ? (cancelledAppts / appts.length * 100).toFixed(1) : '0';

    const hourCount: Record<number, number> = {};
    appts.forEach(a => { const h = parseInt(a.start_time.split(':')[0]); hourCount[h] = (hourCount[h] ?? 0) + 1; });
    const peakHour = Object.entries(hourCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0];

    const inactiveClients = clients.filter(c => {
      const lastUpdate = new Date(c.updated_at);
      return (new Date().getTime() - lastUpdate.getTime()) > 30 * 24 * 60 * 60 * 1000;
    });

    setStats({ totalRevenue, completedAppts, cancelRate, peakHour: peakHour?.[0], inactiveClients: inactiveClients.length });

    // Auto-generate insights if none exist
    const newInsights = [];
    if (inactiveClients.length > 0) {
      newInsights.push({
        type: 'inactive_clients',
        title: `${inactiveClients.length} clientes inactivos detectados`,
        content: `Hay ${inactiveClients.length} clientes que no han visitado en más de 30 días. Considera enviarles una campaña de reactivación con un descuento especial.`,
        branch_id: null, is_read: false
      });
    }
    if (Number(cancelRate) > 15) {
      newInsights.push({
        type: 'general',
        title: `Tasa de cancelaciones alta: ${cancelRate}%`,
        content: `Tu tasa de cancelaciones este mes es del ${cancelRate}%. El promedio saludable es menor al 10%. Considera implementar confirmaciones automáticas 24hs antes.`,
        branch_id: null, is_read: false
      });
    }
    if (peakHour) {
      newInsights.push({
        type: 'occupancy',
        title: `Horario pico detectado: ${peakHour[0]}:00hs`,
        content: `Tu horario con más demanda es a las ${peakHour[0]}:00hs con ${peakHour[1]} turnos. Considera agregar más barberos en ese horario o ajustar los precios.`,
        branch_id: null, is_read: false
      });
    }

    if (newInsights.length > 0) {
      await supabase.from('ai_insights').insert(newInsights);
      loadInsights();
    }
  }

  async function analyzeWithAI(question: string) {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    const [apptRes, clientRes, payRes, barberRes, svcRes] = await Promise.all([
      supabase.from('appointments').select('*, services(name), barbers(full_name)').eq('appointment_date', today),
      supabase.from('clients').select('id, full_name, total_visits, loyalty_points'),
      supabase.from('payments').select('amount, method').gte('paid_at', `${today}T00:00:00`),
      supabase.from('barbers').select('id, full_name').eq('is_active', true),
      supabase.from('services').select('name, price').eq('is_active', true),
    ]);

    const appts = apptRes.data ?? [];
    const clients = clientRes.data ?? [];
    const pays = payRes.data ?? [];
    const barbers = barberRes.data ?? [];
    const services = svcRes.data ?? [];

    const q = question.toLowerCase();
    let response = '';

    if (q.includes('inactivo') || q.includes('no han visitado')) {
      const inactive = clients.filter(c => c.total_visits === 0);
      response = `📊 **Análisis de clientes inactivos:**\n\nEncontré ${inactive.length} clientes con 0 visitas registradas.\n\n💡 **Recomendación:** Crea una campaña de bienvenida en Marketing con un 15% de descuento para su primera visita. Los mejores canales son WhatsApp y Email con mensajes personalizados.`;
    } else if (q.includes('horario') || q.includes('demanda') || q.includes('pico')) {
      const hours: Record<number, number> = {};
      appts.forEach(a => { const h = parseInt(a.start_time.split(':')[0]); hours[h] = (hours[h] ?? 0) + 1; });
      const sorted = Object.entries(hours).sort((a, b) => Number(b[1]) - Number(a[1]));
      if (sorted.length > 0) {
        response = `⏰ **Análisis de demanda por horario (hoy):**\n\n${sorted.map(([h, c]) => `• ${h}:00hs — ${c} turno${c > 1 ? 's' : ''}`).join('\n')}\n\n💡 El horario pico de hoy es a las **${sorted[0][0]}:00hs**. Considera reforzar el equipo en ese horario y activar disponibilidad premium.`;
      } else {
        response = `No hay suficientes datos de hoy. Analiza la sección de Reportes para ver el historial completo de demanda horaria.`;
      }
    } else if (q.includes('servicio') || q.includes('ingreso') || q.includes('genera')) {
      const totalPay = pays.reduce((s, p) => s + p.amount, 0);
      response = `💰 **Análisis de ingresos de hoy:**\n\nTotal: $${totalPay.toLocaleString('es-AR')}\nTurnos activos: ${appts.length}\nTicket promedio: $${appts.length > 0 ? (totalPay / appts.length).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : 0}\n\n🔝 **Servicios disponibles:** ${services.map(s => `${s.name} ($${s.price})`).slice(0, 3).join(', ')}\n\n💡 Para ver servicios más vendidos visita la sección de **Reportes > Mes actual**.`;
    } else if (q.includes('reserva') || q.includes('aumentar')) {
      response = `📈 **Estrategias para aumentar reservas:**\n\n1. **Recordatorios automáticos** — Configura WhatsApp con recordatorio 24h antes\n2. **Programa de referidos** — Ofrece 50 puntos extra por cada cliente referido\n3. **Descuento por anticipado** — 10% si reservan con más de 3 días de anticipación\n4. **Redes sociales** — Comparte el enlace del portal de reservas online\n5. **Horarios estratégicos** — Agrega slots en horarios de baja demanda con precios reducidos\n\n💡 Visita **Marketing** para crear una campaña ahora mismo.`;
    } else if (q.includes('semana') || q.includes('rendimiento')) {
      const completed = appts.filter(a => a.status === 'completed').length;
      const pending = appts.filter(a => a.status === 'pending' || a.status === 'confirmed').length;
      const cancelled = appts.filter(a => a.status === 'cancelled').length;
      response = `📊 **Rendimiento de hoy:**\n\n✅ Completados: ${completed}\n⏳ Pendientes: ${pending}\n❌ Cancelados: ${cancelled}\n👥 Barberos activos: ${barbers.length}\n\n💡 Para análisis semanal/mensual completo visita la sección de **Reportes** con filtros de período.`;
    } else {
      response = `Hola! Analicé tu negocio y esto es lo que encontré:\n\n📊 **Resumen de hoy:**\n• Turnos programados: ${appts.length}\n• Barberos activos: ${barbers.length}\n• Ingresos del día: $${pays.reduce((s, p) => s + p.amount, 0).toLocaleString('es-AR')}\n\n💡 Puedes preguntarme sobre horarios pico, clientes inactivos, estrategias de marketing, análisis de servicios o cualquier aspecto de tu barbería. ¡Estoy aquí para ayudarte!`;
    }

    setTimeout(() => {
      setMessages(m => [...m, {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }]);
      setLoading(false);
    }, 1000);
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages(m => [...m, userMsg]);
    const q = input;
    setInput('');
    await analyzeWithAI(q);
  };

  const insightTypeConfig: Record<string, any> = {
    inactive_clients: { icon: <Users className="w-4 h-4" />, color: 'text-amber-400 bg-amber-500/15' },
    occupancy: { icon: <Clock className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/15' },
    promotion_suggestion: { icon: <Lightbulb className="w-4 h-4" />, color: 'text-emerald-400 bg-emerald-500/15' },
    general: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-400 bg-red-500/15' },
    demand_forecast: { icon: <TrendingUp className="w-4 h-4" />, color: 'text-violet-400 bg-violet-500/15' },
    revenue_trend: { icon: <TrendingUp className="w-4 h-4" />, color: 'text-emerald-400 bg-emerald-500/15' },
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Asistente IA" subtitle="Análisis inteligente impulsado por datos de tu barbería" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden" style={{ height: '600px' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-white font-semibold">BarberPro IA</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-zinc-500">En línea y analizando datos</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-amber-400" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === 'user'
                    ? 'bg-amber-500/15 border border-amber-500/20 text-amber-100 rounded-tr-sm'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-tl-sm'
                }`}>
                  <div className="whitespace-pre-line">{m.content}</div>
                  <div className="text-[10px] text-zinc-600 mt-1.5">{format(m.timestamp, 'HH:mm')}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mr-2 flex-shrink-0">
                  <Bot className="w-4 h-4 text-amber-400" />
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          <div className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => { setInput(q); }}
                className="flex-shrink-0 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white text-xs px-3 py-1.5 rounded-full transition-all">
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-5 pb-5 flex-shrink-0">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Pregunta algo sobre tu negocio..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm" />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 rounded-xl flex items-center justify-center text-zinc-900 transition-all flex-shrink-0 shadow-lg shadow-amber-500/20">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Insights panel */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Insights automáticos
            </h3>
            <p className="text-zinc-500 text-xs mb-4">Detectados analizando tus datos</p>
            {insights.length === 0 ? (
              <div className="text-center py-6 text-zinc-600 text-sm">Generando análisis...</div>
            ) : (
              <div className="space-y-3">
                {insights.slice(0, 5).map(insight => {
                  const cfg = insightTypeConfig[insight.type] ?? insightTypeConfig.general;
                  return (
                    <div key={insight.id} className={`p-3 rounded-xl border transition-all ${insight.is_read ? 'border-zinc-800 bg-zinc-800/30' : 'border-amber-500/20 bg-amber-500/5'}`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                          {cfg.icon}
                        </div>
                        <div>
                          <div className="text-white text-xs font-semibold">{insight.title}</div>
                          <div className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{insight.content}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">Métricas rápidas</h3>
            <div className="space-y-3">
              {[
                { label: 'Turnos completados', value: stats.completedAppts ?? 0, icon: '✅' },
                { label: 'Tasa cancelación', value: `${stats.cancelRate ?? 0}%`, icon: '❌' },
                { label: 'Clientes inactivos', value: stats.inactiveClients ?? 0, icon: '😴' },
                { label: 'Hora pico', value: stats.peakHour ? `${stats.peakHour}:00hs` : '—', icon: '⏰' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{m.icon}</span>
                    {m.label}
                  </div>
                  <span className="text-white text-sm font-semibold">{m.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
