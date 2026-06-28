import React, { useEffect, useState } from 'react';
import { MessageCircle, Phone, Key, Webhook, Bot, Brain, Check, AlertCircle, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, LoadingScreen, Badge } from '../components/ui';

interface WhatsAppConfig {
  id: string;
  branch_id: string;
  provider: string;
  phone_number: string | null;
  api_key: string | null;
  is_active: boolean;
  auto_confirmation: boolean;
  auto_reminder_24h: boolean;
  auto_reminder_2h: boolean;
  auto_cancellation: boolean;
  auto_reschedule: boolean;
  chatbot_enabled: boolean;
  ai_enabled: boolean;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function WhatsAppConfigPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [configs, setConfigs] = useState<Record<string, WhatsAppConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeBranch, setActiveBranch] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: branchesData }, { data: configsData }] = await Promise.all([
      supabase.from('branches').select('id, name').eq('is_active', true),
      supabase.from('whatsapp_config').select('*'),
    ]);

    setBranches(branchesData ?? []);
    const configMap: Record<string, WhatsAppConfig> = {};
    (configsData ?? []).forEach((c: WhatsAppConfig) => {
      configMap[c.branch_id] = c;
    });
    setConfigs(configMap);
    if (branchesData && branchesData.length > 0) setActiveBranch(branchesData[0].id);
    setLoading(false);
  }

  const currentConfig = configs[activeBranch];

  const [form, setForm] = useState({
    provider: 'callmebot',
    phone_number: '',
    api_key: '',
    is_active: false,
    auto_confirmation: true,
    auto_reminder_24h: true,
    auto_reminder_2h: true,
    auto_cancellation: true,
    auto_reschedule: true,
    chatbot_enabled: false,
    ai_enabled: false,
  });

  useEffect(() => {
    if (currentConfig) {
      setForm({
        provider: currentConfig.provider || 'callmebot',
        phone_number: currentConfig.phone_number || '',
        api_key: currentConfig.api_key || '',
        is_active: currentConfig.is_active,
        auto_confirmation: currentConfig.auto_confirmation,
        auto_reminder_24h: currentConfig.auto_reminder_24h,
        auto_reminder_2h: currentConfig.auto_reminder_2h,
        auto_cancellation: currentConfig.auto_cancellation,
        auto_reschedule: currentConfig.auto_reschedule,
        chatbot_enabled: currentConfig.chatbot_enabled,
        ai_enabled: currentConfig.ai_enabled,
      });
    } else {
      setForm({
        provider: 'callmebot',
        phone_number: '',
        api_key: '',
        is_active: false,
        auto_confirmation: true,
        auto_reminder_24h: true,
        auto_reminder_2h: true,
        auto_cancellation: true,
        auto_reschedule: true,
        chatbot_enabled: false,
        ai_enabled: false,
      });
    }
  }, [currentConfig]);

  async function saveConfig() {
    setSaving(true);
    setMessage(null);

    const payload = {
      branch_id: activeBranch,
      ...form,
    };

    let error;
    if (currentConfig) {
      const { error: e } = await supabase
        .from('whatsapp_config')
        .update(payload)
        .eq('id', currentConfig.id);
      error = e;
    } else {
      const { error: e } = await supabase.from('whatsapp_config').insert(payload);
      error = e;
    }

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
      await loadData();
    }
    setSaving(false);
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MessageCircle className="w-7 h-7 text-green-400" />
            WhatsApp Business
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Configura la integración de WhatsApp para cada sucursal</p>
        </div>
        {currentConfig?.is_active && (
          <Badge variant="success">Activo</Badge>
        )}
      </div>

      {/* Branch selector */}
      <Card className="p-4">
        <label className="text-zinc-400 text-sm mb-2 block">Sucursal</label>
        <div className="flex flex-wrap gap-2">
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveBranch(b.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeBranch === b.id
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </Card>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Settings */}
        <Card className="p-5 space-y-5">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-400" />
            Conexión
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-sm">Proveedor</label>
              <select
                value={form.provider}
                onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
              >
                <option value="callmebot">CallMeBot (Gratis)</option>
                <option value="meta_waba">Meta WhatsApp Business API</option>
                <option value="twilio">Twilio</option>
                <option value="custom">Custom / Propio</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-sm flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                Número de WhatsApp
              </label>
              <input
                value={form.phone_number}
                onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                placeholder="+54 11 1234-5678"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-sm flex items-center gap-2">
                <Key className="w-3.5 h-3.5" />
                API Key
              </label>
              <input
                type="password"
                value={form.api_key}
                onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                placeholder="Tu API key del proveedor"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-green-500"
              />
              <p className="text-zinc-600 text-xs">
                Para CallMeBot, obtén tu key en https://www.callmebot.com/blog/free-api-whatsapp-messages/
              </p>
            </div>

            <ToggleRow
              label="Activar WhatsApp"
              description="Habilita el envío de mensajes"
              value={form.is_active}
              onChange={v => setForm(f => ({ ...f, is_active: v }))}
              icon={<MessageCircle className="w-4 h-4" />}
            />
          </div>
        </Card>

        {/* Automations */}
        <Card className="p-5 space-y-5">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Webhook className="w-5 h-5 text-blue-400" />
            Automatizaciones
          </h3>

          <div className="space-y-3">
            <ToggleRow
              label="Confirmación automática"
              description="Envía confirmación al crear un turno"
              value={form.auto_confirmation}
              onChange={v => setForm(f => ({ ...f, auto_confirmation: v }))}
            />
            <ToggleRow
              label="Recordatorio 24 horas"
              description="Avisa al cliente un día antes"
              value={form.auto_reminder_24h}
              onChange={v => setForm(f => ({ ...f, auto_reminder_24h: v }))}
            />
            <ToggleRow
              label="Recordatorio 2 horas"
              description="Avisa al cliente 2 horas antes"
              value={form.auto_reminder_2h}
              onChange={v => setForm(f => ({ ...f, auto_reminder_2h: v }))}
            />
            <ToggleRow
              label="Aviso de cancelación"
              description="Notifica cuando se cancela un turno"
              value={form.auto_cancellation}
              onChange={v => setForm(f => ({ ...f, auto_cancellation: v }))}
            />
            <ToggleRow
              label="Aviso de reprogramación"
              description="Notifica cuando se cambia un turno"
              value={form.auto_reschedule}
              onChange={v => setForm(f => ({ ...f, auto_reschedule: v }))}
            />
          </div>
        </Card>

        {/* AI & Chatbot */}
        <Card className="p-5 space-y-5 lg:col-span-2">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Chatbot e Inteligencia Artificial
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ToggleRow
              label="Chatbot automático"
              description="Responde mensajes entrantes automáticamente"
              value={form.chatbot_enabled}
              onChange={v => setForm(f => ({ ...f, chatbot_enabled: v }))}
              icon={<Bot className="w-4 h-4" />}
            />
            <ToggleRow
              label="IA Avanzada"
              description="Usa IA para respuestas más naturales (próximamente)"
              value={form.ai_enabled}
              onChange={v => setForm(f => ({ ...f, ai_enabled: v }))}
              icon={<Brain className="w-4 h-4" />}
            />
          </div>

          {form.chatbot_enabled && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
              <p className="text-purple-300 text-sm">
                El chatbot está activo. Responderá automáticamente a mensajes entrantes con respuestas predefinidas.
                Para personalizar las respuestas, ve a la sección de Plantillas.
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Guardar configuración
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, value, onChange, icon }: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors">
      <div className="flex items-center gap-3">
        {icon && <span className="text-zinc-500">{icon}</span>}
        <div>
          <div className="text-white text-sm font-medium">{label}</div>
          <div className="text-zinc-500 text-xs">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`transition-colors ${value ? 'text-green-400' : 'text-zinc-600'}`}
      >
        {value ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
      </button>
    </div>
  );
}
