import React, { useEffect, useState } from 'react';
import { FileText, Plus, Edit2, Trash2, Save, X, Check, MessageSquare, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, LoadingScreen, Badge, ConfirmDialog } from '../components/ui';
import { useToast } from '../context/ToastContext';

interface Template {
  id: string;
  branch_id: string;
  name: string;
  type: string;
  body: string;
  variables: string[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  confirmation: 'Confirmación',
  reminder_24h: 'Recordatorio 24h',
  reminder_2h: 'Recordatorio 2h',
  cancellation: 'Cancelación',
  reschedule: 'Reprogramación',
  welcome: 'Bienvenida',
  follow_up: 'Seguimiento',
  custom: 'Personalizado',
};

const TYPE_COLORS: Record<string, string> = {
  confirmation: 'bg-emerald-500/20 text-emerald-400',
  reminder_24h: 'bg-blue-500/20 text-blue-400',
  reminder_2h: 'bg-amber-500/20 text-amber-400',
  cancellation: 'bg-red-500/20 text-red-400',
  reschedule: 'bg-purple-500/20 text-purple-400',
  welcome: 'bg-cyan-500/20 text-cyan-400',
  follow_up: 'bg-pink-500/20 text-pink-400',
  custom: 'bg-zinc-500/20 text-zinc-400',
};

const AVAILABLE_VARS = [
  { key: 'client_name', label: 'Nombre del cliente', example: 'Juan Pérez' },
  { key: 'branch_name', label: 'Nombre de la sucursal', example: 'BarberPro Central' },
  { key: 'appointment_date', label: 'Fecha del turno', example: '2024-06-25' },
  { key: 'appointment_time', label: 'Hora del turno', example: '15:30' },
  { key: 'service_name', label: 'Nombre del servicio', example: 'Corte Clásico' },
  { key: 'barber_name', label: 'Nombre del barbero', example: 'Carlos' },
];

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    type: 'custom',
    body: '',
  });

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    setLoading(true);
    const { data } = await supabase.from('whatsapp_templates').select('*').order('type', { ascending: true });
    setTemplates((data ?? []).map((t: any) => ({
      ...t,
      variables: Array.isArray(t.variables) ? t.variables : JSON.parse(t.variables || '[]'),
    })));
    setLoading(false);
  }

  function startEdit(t: Template) {
    setEditing(t.id);
    setForm({ name: t.name, type: t.type, body: t.body });
    setCreating(false);
    setFormErrors({});
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm({ name: '', type: 'custom', body: '' });
    setFormErrors({});
  }

  function cancelEdit() {
    setEditing(null);
    setCreating(false);
    setForm({ name: '', type: 'custom', body: '' });
    setFormErrors({});
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido';
    if (!form.body.trim()) errors.body = 'El mensaje es requerido';
    if (form.body.length > 1000) errors.body = 'El mensaje es demasiado largo (máx 1000 caracteres)';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveTemplate() {
    if (!validate()) return;
    setSaving(true);

    const varMatches = form.body.match(/\{\{(\w+)\}\}/g) || [];
    const vars = varMatches.map(v => v.replace(/[{}]/g, ''));

    const payload = {
      name: form.name.trim(),
      type: form.type,
      body: form.body.trim(),
      variables: vars,
      branch_id: 'a0000000-0000-0000-0000-000000000001',
      is_active: true,
    };

    let error;
    if (editing) {
      const result = await supabase.from('whatsapp_templates').update(payload).eq('id', editing);
      error = result.error;
    } else {
      const result = await supabase.from('whatsapp_templates').insert(payload);
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast.error('Error al guardar la plantilla');
    } else {
      toast.success(editing ? 'Plantilla actualizada' : 'Plantilla creada');
      cancelEdit();
      loadTemplates();
    }
  }

  async function deleteTemplate(t: Template) {
    setDeleting(true);
    const { error } = await supabase.from('whatsapp_templates').delete().eq('id', t.id);
    setDeleting(false);
    setDeleteConfirm(null);

    if (error) {
      toast.error('Error al eliminar la plantilla');
    } else {
      toast.success('Plantilla eliminada');
      loadTemplates();
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from('whatsapp_templates').update({ is_active: !current }).eq('id', id);
    if (error) {
      toast.error('Error al actualizar el estado');
    } else {
      toast.success(current ? 'Plantilla desactivada' : 'Plantilla activada');
      loadTemplates();
    }
  }

  function insertVariable(varKey: string) {
    setForm(f => ({ ...f, body: f.body + `{{${varKey}}}` }));
  }

  function renderPreview(body: string) {
    let preview = body;
    AVAILABLE_VARS.forEach(v => {
      preview = preview.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.example);
    });
    return preview;
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-green-400" aria-hidden="true" />
            Plantillas de Mensajes
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Personaliza los mensajes automáticos de WhatsApp</p>
        </div>
        <button onClick={startCreate} className="bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all text-sm">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nueva plantilla
        </button>
      </div>

      {/* Editor */}
      {(editing || creating) && (
        <Card className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">{editing ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
            <button onClick={cancelEdit} className="text-zinc-500 hover:text-white transition-colors" aria-label="Cerrar editor">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-sm">Nombre *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Confirmación de turno" className={`w-full bg-zinc-800 border ${formErrors.name ? 'border-red-500/50' : 'border-zinc-700'} rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-green-500`} />
                {formErrors.name && <p className="text-red-400 text-xs">{formErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 text-sm">Tipo</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500">
                  {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 text-sm">Variables disponibles</label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Variables disponibles">
                  {AVAILABLE_VARS.map(v => (
                    <button key={v.key} onClick={() => insertVariable(v.key)} type="button" title={`${v.label} - Ej: ${v.example}`}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors flex items-center gap-1">
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      {'{{'}{v.key}{'}}'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 text-sm">Mensaje *</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={8}
                  placeholder="Escribe tu mensaje usando {{variables}}..."
                  className={`w-full bg-zinc-800 border ${formErrors.body ? 'border-red-500/50' : 'border-zinc-700'} rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-green-500 font-mono`} />
                {formErrors.body && <p className="text-red-400 text-xs">{formErrors.body}</p>}
                <p className="text-zinc-600 text-xs">{form.body.length}/1000 caracteres</p>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <label className="text-zinc-400 text-sm">Vista previa</label>
              <div className="bg-[#0b141a] rounded-2xl p-4 min-h-[300px]">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center" aria-hidden="true">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">BarberPro</div>
                    <div className="text-green-400 text-xs">en línea</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-[#005c4b] rounded-lg rounded-tl-sm px-3 py-2 max-w-[90%] ml-auto">
                    <p className="text-white text-sm whitespace-pre-wrap">{renderPreview(form.body) || 'Vista previa del mensaje...'}</p>
                    <span className="text-[#8696a0] text-[10px] mt-1 block text-right">12:30</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={cancelEdit} type="button" className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-sm">
              Cancelar
            </button>
            <button onClick={saveTemplate} disabled={saving || !form.name.trim() || !form.body.trim()}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all text-sm">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              Guardar
            </button>
          </div>
        </Card>
      )}

      {/* Templates list */}
      <div className="grid grid-cols-1 gap-3">
        {templates.map(t => (
          <Card key={t.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_COLORS[t.type] || TYPE_COLORS.custom}`}>
                    {TYPE_LABELS[t.type] || t.type}
                  </span>
                  {t.is_default && <Badge variant="info">Default</Badge>}
                  {!t.is_active && <Badge variant="default">Inactiva</Badge>}
                </div>
                <h4 className="text-white font-medium text-sm">{t.name}</h4>
                <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{t.body}</p>
                <div className="flex flex-wrap gap-1 mt-2" role="list" aria-label="Variables usadas">
                  {(t.variables || []).map((v: string) => (
                    <span key={v} className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 text-[10px] font-mono" role="listitem">
                      {'{{'}{v}{'}}'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(t.id, t.is_active)} className={`p-2 rounded-lg transition-colors ${t.is_active ? 'text-green-400 hover:bg-green-500/10' : 'text-zinc-600 hover:bg-zinc-800'}`}
                  title={t.is_active ? 'Desactivar' : 'Activar'} aria-label={t.is_active ? 'Desactivar plantilla' : 'Activar plantilla'}>
                  {t.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
                <button onClick={() => startEdit(t)} className="p-2 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                  title="Editar" aria-label="Editar plantilla">
                  <Edit2 className="w-4 h-4" />
                </button>
                {!t.is_default && (
                  <button onClick={() => setDeleteConfirm(t)} className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Eliminar" aria-label="Eliminar plantilla">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {templates.length === 0 && !creating && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" aria-hidden="true" />
          <p className="text-zinc-500 text-sm">No hay plantillas configuradas</p>
          <button onClick={startCreate} className="text-green-400 hover:text-green-300 text-sm mt-2 underline">
            Crear primera plantilla
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteTemplate(deleteConfirm!)}
        title="Eliminar plantilla"
        message={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
