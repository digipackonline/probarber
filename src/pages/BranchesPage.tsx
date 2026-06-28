import React, { useEffect, useState } from 'react';
import { Plus, Building2, Edit2, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, Badge, PageHeader, EmptyState, LoadingScreen, ConfirmDialog } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { DAYS_OF_WEEK } from '../lib/constants';
import type { Database } from '../lib/database.types';

type Branch = Database['public']['Tables']['branches']['Row'];

const defaultSchedule = [0, 1, 2, 3, 4, 5, 6].map(d => ({
  day_of_week: d, open_time: '09:00', close_time: '20:00', is_open: d !== 0
}));

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleModal, setScheduleModal] = useState<Branch | null>(null);
  const [schedules, setSchedules] = useState(defaultSchedule);
  const [form, setForm] = useState({ name: '', address: '', city: '', phone: '', email: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('branches').select('*').order('name');
    setBranches(data ?? []);
    setLoading(false);
  }

  function openNew() {
    setForm({ name: '', address: '', city: '', phone: '', email: '', description: '' });
    setEditingId(null);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(b: Branch) {
    setForm({ name: b.name, address: b.address ?? '', city: b.city ?? '', phone: b.phone ?? '', email: b.email ?? '', description: b.description ?? '' });
    setEditingId(b.id);
    setFormErrors({});
    setModalOpen(true);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido';
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
    const payload = { name: form.name, address: form.address || null, city: form.city || null, phone: form.phone || null, email: form.email || null, description: form.description || null };

    let error;
    if (editingId) {
      const result = await supabase.from('branches').update(payload).eq('id', editingId);
      error = result.error;
    } else {
      const { data, error: e } = await supabase.from('branches').insert(payload).select().single();
      error = e;
      if (data) {
        await supabase.from('branch_schedules').insert(defaultSchedule.map(s => ({ ...s, branch_id: data.id })));
      }
    }

    setSaving(false);

    if (error) {
      toast.error('Error al guardar la sucursal');
    } else {
      toast.success(editingId ? 'Sucursal actualizada correctamente' : 'Sucursal creada correctamente');
      setModalOpen(false);
      load();
    }
  }

  async function openSchedules(b: Branch) {
    const { data } = await supabase.from('branch_schedules').select('*').eq('branch_id', b.id).order('day_of_week');
    if (data && data.length > 0) {
      setSchedules(data.map(s => ({ day_of_week: s.day_of_week, open_time: s.open_time, close_time: s.close_time, is_open: s.is_open })));
    } else {
      setSchedules(defaultSchedule);
    }
    setScheduleModal(b);
  }

  async function saveSchedules() {
    if (!scheduleModal) return;
    setSaving(true);
    await supabase.from('branch_schedules').delete().eq('branch_id', scheduleModal.id);
    const { error } = await supabase.from('branch_schedules').insert(schedules.map(s => ({ ...s, branch_id: scheduleModal.id })));
    setSaving(false);

    if (error) {
      toast.error('Error al guardar los horarios');
    } else {
      toast.success('Horarios actualizados correctamente');
      setScheduleModal(null);
    }
  }

  async function deleteBranch(b: Branch) {
    setDeleting(true);
    const { error } = await supabase.from('branches').update({ is_active: false }).eq('id', b.id);
    setDeleting(false);
    setDeleteConfirm(null);

    if (error) {
      toast.error('Error al eliminar la sucursal');
    } else {
      toast.success('Sucursal eliminada correctamente');
      load();
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Sucursales"
        subtitle={`${branches.filter(b => b.is_active).length} sucursales activas`}
        action={<Button icon={<Plus className="w-4 h-4" />} onClick={openNew}>Nueva sucursal</Button>}
      />

      {branches.length === 0 ? (
        <EmptyState icon={<Building2 className="w-8 h-8" />} title="Sin sucursales" description="Crea tu primera sucursal." action={<Button onClick={openNew}>Crear sucursal</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(b => (
            <Card key={b.id} className={`p-5 hover:border-zinc-700 transition-all ${!b.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center" aria-hidden="true">
                  <Building2 className="w-5 h-5 text-amber-400" />
                </div>
                <Badge variant={b.is_active ? 'success' : 'default'}>{b.is_active ? 'Activa' : 'Inactiva'}</Badge>
              </div>
              <h3 className="text-white font-semibold text-base mb-3">{b.name}</h3>
              <div className="space-y-1.5 text-xs text-zinc-500 mb-4">
                {b.address && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" aria-hidden="true" />{b.address}{b.city ? `, ${b.city}` : ''}</div>}
                {b.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" aria-hidden="true" />{b.phone}</div>}
                {b.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" aria-hidden="true" />{b.email}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(b)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all" aria-label={`Editar ${b.name}`}>
                  <Edit2 className="w-3.5 h-3.5" aria-hidden="true" /> Editar
                </button>
                <button onClick={() => openSchedules(b)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all" aria-label={`Horarios de ${b.name}`}>
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Horarios
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar sucursal' : 'Nueva sucursal'}>
        <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
          <Input label="Nombre *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre de la sucursal" error={formErrors.name} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Dirección" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Av. Principal 123" />
            <Input label="Ciudad" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Buenos Aires" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Teléfono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+54 11 ..." error={formErrors.phone} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@..." error={formErrors.email} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-sm">Descripción</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Descripción opcional..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Guardar' : 'Crear sucursal'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!scheduleModal} onClose={() => setScheduleModal(null)} title={`Horarios – ${scheduleModal?.name}`} size="lg">
        <div className="space-y-2">
          {schedules.map((s, i) => (
            <div key={s.day_of_week} className="flex items-center gap-3 p-3 bg-zinc-800/60 rounded-xl">
              <div className="w-8 text-center text-xs font-semibold text-zinc-400">{DAYS_OF_WEEK[s.day_of_week]}</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={s.is_open} onChange={e => setSchedules(sch => sch.map((x, j) => j === i ? { ...x, is_open: e.target.checked } : x))} className="accent-amber-500" />
                <span className="text-zinc-400 text-xs">Abierto</span>
              </label>
              <input type="time" value={s.open_time} disabled={!s.is_open}
                onChange={e => setSchedules(sch => sch.map((x, j) => j === i ? { ...x, open_time: e.target.value } : x))}
                className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-white text-xs disabled:opacity-40 focus:outline-none" aria-label="Hora apertura" />
              <span className="text-zinc-600 text-xs">–</span>
              <input type="time" value={s.close_time} disabled={!s.is_open}
                onChange={e => setSchedules(sch => sch.map((x, j) => j === i ? { ...x, close_time: e.target.value } : x))}
                className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-white text-xs disabled:opacity-40 focus:outline-none" aria-label="Hora cierre" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-4 mt-4 border-t border-zinc-800">
          <Button variant="secondary" className="flex-1" onClick={() => setScheduleModal(null)}>Cancelar</Button>
          <Button className="flex-1" loading={saving} onClick={saveSchedules}>Guardar horarios</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteBranch(deleteConfirm!)}
        title="Eliminar sucursal"
        message={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
