import React, { useEffect, useState } from 'react';
import { Settings, User, Bell, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, Button, Input, PageHeader, Spinner } from '../components/ui';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name ?? '', phone: profile.phone ?? '', email: profile.email ?? '' });
    }
  }, [profile]);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.full_name.trim()) errors.full_name = 'El nombre es requerido';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Email inválido';
    }
    if (form.phone && !/^[\d\s\-\+\(\)]{7,}$/.test(form.phone)) {
      errors.phone = 'Teléfono inválido';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function save() {
    if (!user || !validate()) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: form.full_name, phone: form.phone, email: form.email }).eq('id', user.id);
    setSaving(false);

    if (error) {
      toast.error('Error al actualizar el perfil');
    } else {
      toast.success('Perfil actualizado correctamente');
      refreshProfile();
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Mi Perfil" subtitle="Gestiona tu información personal" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar card */}
        <Card className="p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-3xl mx-auto mb-4" aria-hidden="true">
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <h3 className="text-white font-bold text-lg">{profile?.full_name ?? 'Usuario'}</h3>
          <p className="text-zinc-400 text-sm">{user?.email}</p>
          <div className="mt-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              profile?.role === 'admin' ? 'bg-amber-500/20 text-amber-400' :
              profile?.role === 'barber' ? 'bg-blue-500/20 text-blue-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'barber' ? 'Barbero' : 'Cliente'}
            </span>
          </div>
        </Card>

        {/* Edit form */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2"><User className="w-4 h-4 text-amber-400" aria-hidden="true" /> Información personal</h3>
            <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
              <Input label="Nombre completo" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Tu nombre" error={formErrors.full_name} />
              <Input label="Teléfono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+54 11 ..." error={formErrors.phone} />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@..." error={formErrors.email} />
              <Button type="submit" loading={saving}>Guardar cambios</Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400" aria-hidden="true" /> Seguridad</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-zinc-800/60 rounded-xl">
                <div>
                  <div className="text-white text-sm font-medium">Contraseña</div>
                  <div className="text-zinc-500 text-xs">Última actualización desconocida</div>
                </div>
                <Button variant="secondary" size="sm">Cambiar</Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-800/60 rounded-xl">
                <div>
                  <div className="text-white text-sm font-medium">Email de cuenta</div>
                  <div className="text-zinc-500 text-xs">{user?.email}</div>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-1 rounded-lg">Verificado</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
