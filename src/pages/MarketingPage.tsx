import React, { useEffect, useState } from 'react';
import { Plus, Megaphone, Send, Users, Tag, Gift, Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, Select, Badge, PageHeader, EmptyState, LoadingScreen } from '../components/ui';
import type { Database } from '../lib/database.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Campaign = Database['public']['Tables']['marketing_campaigns']['Row'];
type Promotion = Database['public']['Tables']['promotions']['Row'];

export default function MarketingPage() {
  const [tab, setTab] = useState<'campaigns' | 'promotions'>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [promoModal, setPromoModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<{ success: boolean; message: string } | null>(null);
  const [branches, setBranches] = useState<any[]>([]);

  const [campForm, setCampForm] = useState({ name: '', description: '', channel: 'email', message: '', target_segment: 'all', branch_id: '' });
  const [promoForm, setPromoForm] = useState({ name: '', description: '', discount_type: 'percent', discount_value: '', coupon_code: '', max_uses: '', valid_from: '', valid_until: '', branch_id: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('promotions').select('*').order('created_at', { ascending: false }),
    ]);
    setCampaigns(c.data ?? []);
    setPromotions(p.data ?? []);
    setLoading(false);
  }

  async function saveCampaign() {
    if (!campForm.name || !campForm.message) return;
    setSaving(true);
    await supabase.from('marketing_campaigns').insert({
      name: campForm.name, description: campForm.description || null, channel: campForm.channel as any,
      message: campForm.message, target_segment: campForm.target_segment as any,
      branch_id: campForm.branch_id || null, status: 'draft'
    });
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function executeCampaign(campaignId: string) {
    setExecutingId(campaignId);
    setExecResult(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign`;
      const headers = {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      };
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setExecResult({ success: false, message: result.error || 'Error al ejecutar la campaña' });
      } else {
        setExecResult({ success: true, message: `Campaña enviada a ${result.sent} de ${result.total_recipients} clientes.` });
        load();
      }
    } catch (err: any) {
      setExecResult({ success: false, message: err.message || 'Error de red' });
    }
    setExecutingId(null);
  }

  async function savePromotion() {
    if (!promoForm.name || !promoForm.discount_value) return;
    setSaving(true);
    await supabase.from('promotions').insert({
      name: promoForm.name, description: promoForm.description || null,
      discount_type: promoForm.discount_type as any, discount_value: Number(promoForm.discount_value),
      coupon_code: promoForm.coupon_code || null, max_uses: promoForm.max_uses ? Number(promoForm.max_uses) : null,
      valid_from: promoForm.valid_from || null, valid_until: promoForm.valid_until || null,
      branch_id: promoForm.branch_id || null, is_active: true
    });
    setSaving(false);
    setPromoModal(false);
    load();
  }

  const statusConfig: Record<string, any> = {
    draft: { label: 'Borrador', variant: 'default' },
    scheduled: { label: 'Programado', variant: 'warning' },
    sent: { label: 'Enviado', variant: 'success' },
    cancelled: { label: 'Cancelado', variant: 'danger' },
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Marketing" subtitle="Campañas y promociones para tus clientes"
        action={
          <div className="flex gap-2">
            {tab === 'campaigns' && <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>Nueva campaña</Button>}
            {tab === 'promotions' && <Button icon={<Plus className="w-4 h-4" />} onClick={() => setPromoModal(true)}>Nueva promoción</Button>}
          </div>
        }
      />

      {execResult && (
        <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${execResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {execResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {execResult.message}
        </div>
      )}

      <div className="flex gap-2 border-b border-zinc-800 pb-0">
        {[
          { key: 'campaigns', label: 'Campañas', icon: <Megaphone className="w-4 h-4" /> },
          { key: 'promotions', label: 'Promociones', icon: <Tag className="w-4 h-4" /> },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key as any); setExecResult(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${tab === t.key ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-500 hover:text-white'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' && (
        campaigns.length === 0 ? (
          <EmptyState icon={<Megaphone className="w-8 h-8" />} title="Sin campañas" description="Crea tu primera campaña de marketing." action={<Button onClick={() => setModalOpen(true)}>Crear campaña</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map(c => (
              <Card key={c.id} className="p-5 hover:border-zinc-700 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                    <Send className="w-5 h-5 text-amber-400" />
                  </div>
                  <Badge variant={statusConfig[c.status]?.variant ?? 'default'}>{statusConfig[c.status]?.label ?? c.status}</Badge>
                </div>
                <h3 className="text-white font-semibold mb-1">{c.name}</h3>
                {c.description && <p className="text-zinc-500 text-xs mb-3 line-clamp-2">{c.description}</p>}
                <div className="space-y-1.5 text-xs text-zinc-500 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-600">Canal:</span>
                    <span className="text-zinc-400 capitalize">{c.channel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    <span>{c.target_segment === 'all' ? 'Todos los clientes' : c.target_segment === 'new' ? 'Clientes nuevos' : c.target_segment === 'inactive' ? 'Clientes inactivos' : c.target_segment}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-600">Enviados:</span>
                    <span className="text-zinc-400">{c.recipients_count ?? 0}</span>
                  </div>
                  <div>{format(new Date(c.created_at), "d MMM yyyy", { locale: es })}</div>
                </div>
                {c.status === 'draft' && (
                  <button
                    onClick={() => executeCampaign(c.id)}
                    disabled={executingId === c.id}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50">
                    {executingId === c.id ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                    ) : (
                      <><Play className="w-3.5 h-3.5" /> Ejecutar campaña</>
                    )}
                  </button>
                )}
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'promotions' && (
        promotions.length === 0 ? (
          <EmptyState icon={<Tag className="w-8 h-8" />} title="Sin promociones" description="Crea cupones y descuentos para tus clientes." action={<Button onClick={() => setPromoModal(true)}>Crear promoción</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map(p => (
              <Card key={p.id} className={`p-5 hover:border-zinc-700 transition-all ${!p.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-emerald-400" />
                  </div>
                  <Badge variant={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Activa' : 'Inactiva'}</Badge>
                </div>
                <h3 className="text-white font-semibold mb-1">{p.name}</h3>
                {p.description && <p className="text-zinc-500 text-xs mb-3">{p.description}</p>}
                <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/20 rounded-lg px-3 py-1.5 mb-3">
                  <span className="text-amber-400 font-bold text-lg">{p.discount_type === 'percent' ? `${p.discount_value}%` : `$${p.discount_value}`}</span>
                  <span className="text-amber-500/70 text-xs">de descuento</span>
                </div>
                {p.coupon_code && (
                  <div className="font-mono text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 mb-2">{p.coupon_code}</div>
                )}
                <div className="text-xs text-zinc-500">Usos: {p.current_uses}{p.max_uses ? ` / ${p.max_uses}` : ''}</div>
              </Card>
            ))}
          </div>
        )
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva campaña" size="lg">
        <div className="space-y-4">
          <Input label="Nombre de la campaña *" value={campForm.name} onChange={e => setCampForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Oferta de verano" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Canal" value={campForm.channel} onChange={e => setCampForm(f => ({ ...f, channel: e.target.value }))}>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </Select>
            <Select label="Segmento" value={campForm.target_segment} onChange={e => setCampForm(f => ({ ...f, target_segment: e.target.value }))}>
              <option value="all">Todos los clientes</option>
              <option value="new">Clientes nuevos</option>
              <option value="recurring">Clientes recurrentes</option>
              <option value="inactive">Clientes inactivos</option>
              <option value="birthday">Cumpleaños del mes</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-sm">Mensaje *</label>
            <textarea value={campForm.message} onChange={e => setCampForm(f => ({ ...f, message: e.target.value }))} rows={4} placeholder="Mensaje de la campaña..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveCampaign}>Crear campaña</Button>
          </div>
        </div>
      </Modal>

      <Modal open={promoModal} onClose={() => setPromoModal(false)} title="Nueva promoción">
        <div className="space-y-4">
          <Input label="Nombre *" value={promoForm.name} onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Descuento de verano" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo de descuento" value={promoForm.discount_type} onChange={e => setPromoForm(f => ({ ...f, discount_type: e.target.value }))}>
              <option value="percent">Porcentaje (%)</option>
              <option value="fixed">Monto fijo ($)</option>
            </Select>
            <Input label="Valor *" type="number" min="0" value={promoForm.discount_value} onChange={e => setPromoForm(f => ({ ...f, discount_value: e.target.value }))} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Código de cupón" value={promoForm.coupon_code} onChange={e => setPromoForm(f => ({ ...f, coupon_code: e.target.value }))} placeholder="VERANO20" />
            <Input label="Usos máximos" type="number" min="0" value={promoForm.max_uses} onChange={e => setPromoForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Ilimitado" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-zinc-400 text-sm">Válida desde</label>
              <input type="date" value={promoForm.valid_from} onChange={e => setPromoForm(f => ({ ...f, valid_from: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-zinc-400 text-sm">Válida hasta</label>
              <input type="date" value={promoForm.valid_until} onChange={e => setPromoForm(f => ({ ...f, valid_until: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPromoModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={savePromotion}>Crear promoción</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
