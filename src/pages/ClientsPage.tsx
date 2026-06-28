import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { Plus, Users, Phone, Mail, Calendar, DollarSign, Star, ChevronRight, X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, Badge, PageHeader, EmptyState, LoadingScreen, ConfirmDialog } from '../components/ui';
import { useToast } from '../context/ToastContext';
import type { Database } from '../lib/database.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Client = Database['public']['Tables']['clients']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  services: { name: string } | null;
  barbers: { full_name: string } | null;
};

const emptyForm = { full_name: '', phone: '', email: '', birthdate: '', notes: '', preferences: '' };
const ROW_HEIGHT = 57;
const VIRTUALIZATION_THRESHOLD = 50;

const ClientRow = memo(function ClientRow({ client, index, onClick }: { client: Client; index: number; onClick: () => void }) {
  return (
    <tr className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer ${index % 2 === 0 ? '' : 'bg-zinc-900/30'}`}
      onClick={onClick} style={{ height: ROW_HEIGHT }}>
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0" aria-hidden="true">
            {client.full_name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-white text-sm font-medium">{client.full_name}</div>
            {client.birthdate && <div className="text-zinc-500 text-xs">{format(new Date(client.birthdate + 'T12:00:00'), "d MMM yyyy", { locale: es })}</div>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <div className="space-y-0.5">
          {client.phone && <div className="flex items-center gap-1.5 text-zinc-400 text-xs"><Phone className="w-3 h-3" aria-hidden="true" />{client.phone}</div>}
          {client.email && <div className="flex items-center gap-1.5 text-zinc-500 text-xs"><Mail className="w-3 h-3" aria-hidden="true" />{client.email}</div>}
        </div>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="flex items-center gap-1.5 text-zinc-300 text-sm">
          <Calendar className="w-3.5 h-3.5 text-zinc-600" aria-hidden="true" />
          {client.total_visits}
        </div>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <span className="text-amber-400 text-sm font-semibold">
          ${client.total_spent.toLocaleString('es-AR')}
        </span>
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <div className="flex items-center gap-1 text-amber-400 text-sm">
          <Star className="w-3.5 h-3.5" aria-hidden="true" />
          {client.loyalty_points}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <ChevronRight className="w-4 h-4 text-zinc-600" aria-hidden="true" />
      </td>
    </tr>
  );
});

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<Appointment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('full_name');
    setClients(data ?? []);
    setLoading(false);
  }

  async function openDetail(c: Client) {
    setDetailClient(c);
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name), barbers(full_name)')
      .eq('client_id', c.id)
      .order('appointment_date', { ascending: false })
      .limit(20);
    setClientHistory((data ?? []) as Appointment[]);
  }

  function openNew() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(c: Client) {
    setForm({
      full_name: c.full_name, phone: c.phone ?? '', email: c.email ?? '',
      birthdate: c.birthdate ?? '', notes: c.notes ?? '', preferences: c.preferences ?? ''
    });
    setEditingId(c.id);
    setFormErrors({});
    setModalOpen(true);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.full_name.trim()) errors.full_name = 'El nombre es requerido';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Email inválido';
    }
    if (form.phone && !/^[\d\s\-+()]{7,}$/.test(form.phone)) {
      errors.phone = 'Teléfono inválido';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name, phone: form.phone || null, email: form.email || null,
      birthdate: form.birthdate || null, notes: form.notes || null, preferences: form.preferences || null
    };

    let error;
    if (editingId) {
      const result = await supabase.from('clients').update(payload).eq('id', editingId);
      error = result.error;
    } else {
      const result = await supabase.from('clients').insert(payload);
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast.error('Error al guardar el cliente');
    } else {
      toast.success(editingId ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente');
      setModalOpen(false);
      load();
    }
  }

  async function deleteClient(c: Client) {
    setDeleting(true);
    const { error } = await supabase.from('clients').update({ is_active: false }).eq('id', c.id);
    setDeleting(false);
    setDeleteConfirm(null);

    if (error) {
      toast.error('Error al eliminar el cliente');
    } else {
      toast.success('Cliente eliminado correctamente');
      load();
    }
  }

  const filtered = clients.filter(c =>
    c.is_active !== false &&
    (c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const shouldVirtualize = filtered.length > VIRTUALIZATION_THRESHOLD;
  const containerHeight = typeof window !== 'undefined' ? Math.min(600, window.innerHeight - 300) : 600;
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 5;
  const startIndex = shouldVirtualize ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT)) : 0;
  const endIndex = shouldVirtualize ? Math.min(filtered.length - 1, startIndex + visibleCount) : filtered.length - 1;
  const paddingTop = shouldVirtualize ? startIndex * ROW_HEIGHT : 0;
  const paddingBottom = shouldVirtualize ? Math.max(0, (filtered.length - endIndex - 1) * ROW_HEIGHT) : 0;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (shouldVirtualize) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  }, [shouldVirtualize]);

  const statusLabel: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple' }> = {
    pending: { label: 'Pendiente', variant: 'warning' },
    confirmed: { label: 'Confirmado', variant: 'info' },
    completed: { label: 'Completado', variant: 'success' },
    cancelled: { label: 'Cancelado', variant: 'danger' },
    no_show: { label: 'Ausente', variant: 'default' },
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Clientes"
        subtitle={`${filtered.length} clientes registrados`}
        action={<Button icon={<Plus className="w-4 h-4" />} onClick={openNew}>Nuevo cliente</Button>}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          aria-label="Buscar clientes"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title="Sin clientes" description="Agrega tu primer cliente." action={<Button onClick={openNew}>Agregar cliente</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div ref={scrollRef} className="overflow-auto" style={shouldVirtualize ? { height: containerHeight } : undefined} onScroll={handleScroll}>
            <table className="w-full" role="table">
              <thead className={shouldVirtualize ? 'sticky top-0 bg-zinc-900 z-10' : undefined}>
                <tr className="border-b border-zinc-800">
                  <th scope="col" className="text-left text-xs font-medium text-zinc-500 px-6 py-3">Cliente</th>
                  <th scope="col" className="text-left text-xs font-medium text-zinc-500 px-4 py-3 hidden sm:table-cell">Contacto</th>
                  <th scope="col" className="text-left text-xs font-medium text-zinc-500 px-4 py-3 hidden md:table-cell">Visitas</th>
                  <th scope="col" className="text-left text-xs font-medium text-zinc-500 px-4 py-3 hidden md:table-cell">Gasto total</th>
                  <th scope="col" className="text-left text-xs font-medium text-zinc-500 px-4 py-3 hidden lg:table-cell">Puntos</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {shouldVirtualize && paddingTop > 0 && (
                  <tr><td colSpan={6} style={{ height: paddingTop }} aria-hidden="true" /></tr>
                )}
                {filtered.slice(startIndex, endIndex + 1).map((c, i) => (
                  <ClientRow key={c.id} client={c} index={startIndex + i} onClick={() => openDetail(c)} />
                ))}
                {shouldVirtualize && paddingBottom > 0 && (
                  <tr><td colSpan={6} style={{ height: paddingBottom }} aria-hidden="true" /></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Client detail drawer */}
      {detailClient && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailClient(null)} />
          <div className="relative w-full max-w-lg bg-zinc-900 border-l border-zinc-800 flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 id="drawer-title" className="text-white font-semibold text-lg">Ficha del cliente</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { openEdit(detailClient); setDetailClient(null); }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-xs border border-zinc-700 transition-all">
                  Editar
                </button>
                <button onClick={() => { setDeleteConfirm(detailClient); setDetailClient(null); }}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs border border-red-500/20 transition-all"
                  aria-label="Eliminar cliente">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDetailClient(null)} className="text-zinc-400 hover:text-white transition-colors" aria-label="Cerrar">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-bold text-2xl" aria-hidden="true">
                  {detailClient.full_name[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">{detailClient.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="success">Cliente activo</Badge>
                    <span className="text-zinc-500 text-xs">Desde {format(new Date(detailClient.created_at), "MMM yyyy", { locale: es })}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Visitas', value: detailClient.total_visits, icon: <Calendar className="w-4 h-4" />, color: 'text-blue-400' },
                  { label: 'Gasto total', value: `$${detailClient.total_spent.toLocaleString('es-AR')}`, icon: <DollarSign className="w-4 h-4" />, color: 'text-amber-400' },
                  { label: 'Puntos', value: detailClient.loyalty_points, icon: <Star className="w-4 h-4" />, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-800/60 rounded-xl p-3 text-center">
                    <div className={`flex justify-center mb-1 ${s.color}`} aria-hidden="true">{s.icon}</div>
                    <div className={`font-bold text-lg ${s.color}`}>{s.value}</div>
                    <div className="text-zinc-500 text-xs">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Contact info */}
              <div className="space-y-2">
                <h4 className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Información de contacto</h4>
                <div className="bg-zinc-800/60 rounded-xl p-4 space-y-2">
                  {detailClient.phone && (
                    <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-zinc-500" aria-hidden="true" /><span className="text-zinc-300">{detailClient.phone}</span></div>
                  )}
                  {detailClient.email && (
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-zinc-500" aria-hidden="true" /><span className="text-zinc-300">{detailClient.email}</span></div>
                  )}
                  {detailClient.birthdate && (
                    <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-zinc-500" aria-hidden="true" /><span className="text-zinc-300">{format(new Date(detailClient.birthdate + 'T12:00:00'), "d 'de' MMMM", { locale: es })}</span></div>
                  )}
                </div>
              </div>

              {detailClient.preferences && (
                <div className="space-y-2">
                  <h4 className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Preferencias</h4>
                  <div className="bg-zinc-800/60 rounded-xl p-4 text-zinc-300 text-sm">{detailClient.preferences}</div>
                </div>
              )}

              {detailClient.notes && (
                <div className="space-y-2">
                  <h4 className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Notas</h4>
                  <div className="bg-zinc-800/60 rounded-xl p-4 text-zinc-300 text-sm">{detailClient.notes}</div>
                </div>
              )}

              {/* History */}
              <div className="space-y-2">
                <h4 className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Historial de turnos</h4>
                {clientHistory.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 text-sm">Sin historial</div>
                ) : (
                  <div className="space-y-2">
                    {clientHistory.map(a => (
                      <div key={a.id} className="bg-zinc-800/60 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <div className="text-white text-sm font-medium">{a.services?.name}</div>
                          <div className="text-zinc-500 text-xs">{format(new Date(a.appointment_date + 'T12:00:00'), "d MMM yyyy", { locale: es })} · {a.barbers?.full_name}</div>
                        </div>
                        <Badge variant={statusLabel[a.status]?.variant ?? 'default'}>{statusLabel[a.status]?.label ?? a.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar cliente' : 'Nuevo cliente'}>
        <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
          <Input label="Nombre completo *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nombre del cliente" error={formErrors.full_name} aria-required="true" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Teléfono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+54 11 ..." error={formErrors.phone} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@..." error={formErrors.email} />
          </div>
          <Input label="Fecha de nacimiento" type="date" value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} />
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-sm">Preferencias</label>
            <textarea value={form.preferences} onChange={e => setForm(f => ({ ...f, preferences: e.target.value }))} placeholder="Preferencias del cliente..." rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-sm">Notas internas</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas privadas..." rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Guardar cambios' : 'Crear cliente'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteClient(deleteConfirm!)}
        title="Eliminar cliente"
        message={`¿Estás seguro de que deseas eliminar a "${deleteConfirm?.full_name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
