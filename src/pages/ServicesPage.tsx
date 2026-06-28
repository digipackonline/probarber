import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Briefcase, Clock, DollarSign, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, Select, Badge, PageHeader, EmptyState, LoadingScreen, ConfirmDialog } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { SERVICE_CATEGORY_CONFIG } from '../lib/constants';
import type { Database } from '../lib/database.types';

type Service = Database['public']['Tables']['services']['Row'];
type Branch = Database['public']['Tables']['branches']['Row'];

const emptyForm = {
  name: '', description: '', category: 'corte' as Service['category'],
  duration_minutes: 30, price: 0, is_active: true, branch_id: ''
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [sv, br] = await Promise.all([
      supabase.from('services').select('*').order('category').order('name'),
      supabase.from('branches').select('*').eq('is_active', true),
    ]);
    setServices(sv.data ?? []);
    setBranches(br.data ?? []);
    setLoading(false);
  }

  function openNew() {
    setForm({ ...emptyForm, branch_id: branches[0]?.id ?? '' });
    setEditingId(null);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(s: Service) {
    setForm({
      name: s.name, description: s.description ?? '', category: s.category,
      duration_minutes: s.duration_minutes, price: s.price, is_active: s.is_active,
      branch_id: s.branch_id ?? ''
    });
    setEditingId(s.id);
    setFormErrors({});
    setModalOpen(true);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido';
    if (form.duration_minutes < 5) errors.duration_minutes = 'La duración mínima es 5 minutos';
    if (form.price < 0) errors.price = 'El precio no puede ser negativo';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name, description: form.description || null, category: form.category,
      duration_minutes: Number(form.duration_minutes), price: Number(form.price),
      is_active: form.is_active, branch_id: form.branch_id || null
    };

    let error;
    if (editingId) {
      const result = await supabase.from('services').update(payload).eq('id', editingId);
      error = result.error;
    } else {
      const result = await supabase.from('services').insert(payload);
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast.error('Error al guardar el servicio');
    } else {
      toast.success(editingId ? 'Servicio actualizado correctamente' : 'Servicio creado correctamente');
      setModalOpen(false);
      load();
    }
  }

  async function toggleActive(s: Service) {
    const { error } = await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id);
    if (error) {
      toast.error('Error al actualizar el estado');
    } else {
      toast.success(s.is_active ? 'Servicio desactivado' : 'Servicio activado');
      load();
    }
  }

  async function deleteService(s: Service) {
    setDeleting(true);
    const { error } = await supabase.from('services').update({ is_active: false }).eq('id', s.id);
    setDeleting(false);
    setDeleteConfirm(null);

    if (error) {
      toast.error('Error al eliminar el servicio');
    } else {
      toast.success('Servicio eliminado correctamente');
      load();
    }
  }

  const filtered = services.filter(s =>
    (filterCategory === 'all' || s.category === filterCategory) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Servicios"
        subtitle={`${services.filter(s => s.is_active).length} servicios activos`}
        action={<Button icon={<Plus className="w-4 h-4" />} onClick={openNew}>Nuevo servicio</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar servicio..." aria-label="Buscar servicios"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtrar por categoría">
          {['all', 'corte', 'barba', 'combo', 'tratamiento', 'otro'].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} aria-pressed={filterCategory === cat}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterCategory === cat ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'}`}>
              {cat === 'all' ? 'Todos' : SERVICE_CATEGORY_CONFIG[cat]?.label ?? cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Briefcase className="w-8 h-8" />} title="Sin servicios" description="Agrega los servicios que ofrece tu barbería." action={<Button onClick={openNew}>Agregar servicio</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(s => {
            const cat = SERVICE_CATEGORY_CONFIG[s.category] ?? SERVICE_CATEGORY_CONFIG.otro;
            return (
              <Card key={s.id} className={`p-5 hover:border-zinc-700 transition-all duration-200 ${!s.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${cat.color}`}>{cat.label}</span>
                  <Badge variant={s.is_active ? 'success' : 'default'}>{s.is_active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                <h3 className="text-white font-semibold text-base mb-1">{s.name}</h3>
                {s.description && <p className="text-zinc-500 text-xs mb-3 line-clamp-2">{s.description}</p>}
                <div className="flex items-center gap-4 text-sm mb-4">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-zinc-600" aria-hidden="true" />
                    <span>{s.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>${s.price.toLocaleString('es-AR')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all" aria-label={`Editar ${s.name}`}>
                    <Edit2 className="w-3.5 h-3.5" aria-hidden="true" /> Editar
                  </button>
                  <button onClick={() => toggleActive(s)} className={`flex-1 py-1.5 rounded-lg text-xs transition-all border ${s.is_active ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`} aria-label={s.is_active ? 'Desactivar' : 'Activar'}>
                    {s.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar servicio' : 'Nuevo servicio'}>
        <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
          <Input label="Nombre del servicio *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Corte Clásico" error={formErrors.name} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Categoría" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Service['category'] }))}>
              <option value="corte">Corte</option>
              <option value="barba">Barba</option>
              <option value="combo">Combo</option>
              <option value="tratamiento">Tratamiento</option>
              <option value="otro">Otro</option>
            </Select>
            <Select label="Sucursal" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="">Global</option>
              {branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duración (minutos)" type="number" min="5" step="5" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} error={formErrors.duration_minutes} />
            <Input label="Precio ($)" type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} error={formErrors.price} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-sm">Descripción</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción del servicio..." rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-amber-500" />
            <span className="text-zinc-400 text-sm">Servicio activo</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Guardar cambios' : 'Crear servicio'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteService(deleteConfirm!)}
        title="Eliminar servicio"
        message={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
