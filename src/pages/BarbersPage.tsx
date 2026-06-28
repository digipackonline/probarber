import React, { useEffect, useState } from 'react';
import { Plus, Edit2, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, Select, Badge, PageHeader, EmptyState, LoadingScreen, ConfirmDialog } from '../components/ui';
import { useToast } from '../context/ToastContext';
import type { Database } from '../lib/database.types';

type Barber = Database['public']['Tables']['barbers']['Row'];
type Branch = Database['public']['Tables']['branches']['Row'];
type Service = Database['public']['Tables']['services']['Row'];

const emptyForm = {
  full_name: '', specialty: '', bio: '', commission_percent: 0,
  branch_id: '', is_active: true, photo_url: ''
};

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Barber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [b, br, sv] = await Promise.all([
      supabase.from('barbers').select('*').order('full_name'),
      supabase.from('branches').select('*').eq('is_active', true),
      supabase.from('services').select('*').eq('is_active', true),
    ]);
    setBarbers(b.data ?? []);
    setBranches(br.data ?? []);
    setServices(sv.data ?? []);
    setLoading(false);
  }

  function openNew() {
    setForm({ ...emptyForm, branch_id: branches[0]?.id ?? '' });
    setSelectedServices([]);
    setEditingId(null);
    setFormErrors({});
    setModalOpen(true);
  }

  async function openEdit(b: Barber) {
    setForm({
      full_name: b.full_name, specialty: b.specialty ?? '', bio: b.bio ?? '',
      commission_percent: b.commission_percent, branch_id: b.branch_id ?? '',
      is_active: b.is_active, photo_url: b.photo_url ?? ''
    });
    const { data: bs } = await supabase.from('barber_services').select('service_id').eq('barber_id', b.id);
    setSelectedServices((bs ?? []).map(x => x.service_id));
    setEditingId(b.id);
    setFormErrors({});
    setModalOpen(true);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.full_name.trim()) errors.full_name = 'El nombre es requerido';
    if (form.commission_percent < 0 || form.commission_percent > 100) {
      errors.commission_percent = 'La comisión debe estar entre 0 y 100';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name,
      specialty: form.specialty || null,
      bio: form.bio || null,
      commission_percent: Number(form.commission_percent),
      branch_id: form.branch_id || null,
      is_active: form.is_active,
      photo_url: form.photo_url || null,
    };

    let error;
    if (editingId) {
      const result = await supabase.from('barbers').update(payload).eq('id', editingId);
      error = result.error;
      if (!error) {
        await supabase.from('barber_services').delete().eq('barber_id', editingId);
        if (selectedServices.length > 0) {
          await supabase.from('barber_services').insert(selectedServices.map(sid => ({ barber_id: editingId, service_id: sid })));
        }
      }
    } else {
      const { data, error: e } = await supabase.from('barbers').insert(payload).select().single();
      error = e;
      if (data && selectedServices.length > 0) {
        await supabase.from('barber_services').insert(selectedServices.map(sid => ({ barber_id: data.id, service_id: sid })));
      }
    }

    setSaving(false);

    if (error) {
      toast.error('Error al guardar el barbero');
    } else {
      toast.success(editingId ? 'Barbero actualizado correctamente' : 'Barbero creado correctamente');
      setModalOpen(false);
      load();
    }
  }

  async function toggleActive(b: Barber) {
    const { error } = await supabase.from('barbers').update({ is_active: !b.is_active }).eq('id', b.id);
    if (error) {
      toast.error('Error al actualizar el estado');
    } else {
      toast.success(b.is_active ? 'Barbero desactivado' : 'Barbero activado');
      load();
    }
  }

  async function deleteBarber(b: Barber) {
    setDeleting(true);
    const { error } = await supabase.from('barbers').update({ is_active: false }).eq('id', b.id);
    setDeleting(false);
    setDeleteConfirm(null);

    if (error) {
      toast.error('Error al eliminar el barbero');
    } else {
      toast.success('Barbero eliminado correctamente');
      load();
    }
  }

  const filtered = barbers.filter(b => b.full_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Barberos"
        subtitle={`${barbers.filter(b => b.is_active).length} barberos activos`}
        action={<Button icon={<Plus className="w-4 h-4" />} onClick={openNew}>Nuevo barbero</Button>}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar barbero..." aria-label="Buscar barberos"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<UserCheck className="w-8 h-8" />} title="Sin barberos" description="Agrega tu primer barbero para empezar." action={<Button onClick={openNew}>Agregar barbero</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(b => {
            const branch = branches.find(br => br.id === b.branch_id);
            return (
              <Card key={b.id} className={`p-5 hover:border-zinc-700 transition-all duration-200 ${!b.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-bold text-lg overflow-hidden flex-shrink-0">
                      {b.photo_url ? (
                        <img src={b.photo_url} alt={`Foto de ${b.full_name}`} className="w-full h-full object-cover" />
                      ) : b.full_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{b.full_name}</div>
                      {b.specialty && <div className="text-zinc-500 text-xs mt-0.5">{b.specialty}</div>}
                    </div>
                  </div>
                  <Badge variant={b.is_active ? 'success' : 'default'}>{b.is_active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                <div className="space-y-1.5 mb-4 text-xs text-zinc-500">
                  {branch && <div className="flex items-center gap-1.5"><span className="text-zinc-600">Sucursal:</span> <span className="text-zinc-400">{branch.name}</span></div>}
                  <div className="flex items-center gap-1.5"><span className="text-zinc-600">Comisión:</span> <span className="text-amber-400 font-medium">{b.commission_percent}%</span></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(b)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all" aria-label={`Editar ${b.full_name}`}>
                    <Edit2 className="w-3.5 h-3.5" aria-hidden="true" /> Editar
                  </button>
                  <button onClick={() => toggleActive(b)} className={`flex-1 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all border ${b.is_active ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`} aria-label={b.is_active ? 'Desactivar' : 'Activar'}>
                    {b.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar barbero' : 'Nuevo barbero'} size="lg">
        <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre completo *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nombre del barbero" error={formErrors.full_name} />
            <Input label="Especialidad" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Ej: Fade, Barbas..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Sucursal" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="">Sin sucursal</option>
              {branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
            </Select>
            <Input label="Comisión (%)" type="number" min="0" max="100" value={form.commission_percent} onChange={e => setForm(f => ({ ...f, commission_percent: Number(e.target.value) }))} error={formErrors.commission_percent} />
          </div>
          <Input label="URL de foto" value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="https://..." />
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-sm">Biografía</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Descripción breve del barbero..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm resize-none" />
          </div>
          <div className="space-y-2">
            <label className="block text-zinc-400 text-sm">Servicios que realiza</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {services.map(sv => (
                <label key={sv.id} className="flex items-center gap-2 p-2 bg-zinc-800/60 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                  <input type="checkbox" checked={selectedServices.includes(sv.id)}
                    onChange={e => setSelectedServices(prev => e.target.checked ? [...prev, sv.id] : prev.filter(id => id !== sv.id))}
                    className="accent-amber-500" />
                  <span className="text-zinc-300 text-sm">{sv.name}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-amber-500" />
            <span className="text-zinc-400 text-sm">Barbero activo</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {editingId ? 'Guardar cambios' : 'Crear barbero'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteBarber(deleteConfirm!)}
        title="Eliminar barbero"
        message={`¿Estás seguro de que deseas eliminar a "${deleteConfirm?.full_name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
