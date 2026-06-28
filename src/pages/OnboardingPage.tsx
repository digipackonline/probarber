import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Scissors, Clock, Users, Building2, Check, ArrowRight, Plus, X } from 'lucide-react';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DEFAULT_SERVICES = [
  { name: 'Corte Clásico', duration: 30, price: 2500, category: 'corte' },
  { name: 'Fade', duration: 45, price: 3000, category: 'corte' },
  { name: 'Barba', duration: 20, price: 1500, category: 'barba' },
  { name: 'Corte + Barba', duration: 50, price: 3800, category: 'combo' },
];

const STEPS = [
  { id: 0, title: 'Bienvenido', icon: Scissors },
  { id: 1, title: 'Tu Barbería', icon: Building2 },
  { id: 2, title: 'Horarios', icon: Clock },
  { id: 3, title: 'Servicios', icon: Scissors },
  { id: 4, title: 'Barberos', icon: Users },
  { id: 5, title: 'Sucursal', icon: MapPin },
];

function MapPin({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tenant, setTenant] = useState<any>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    // Step 1: Barbershop info
    name: '',
    logo_url: '',
    primary_color: '#d4af37',
    // Step 2: Schedule
    schedule: DAYS.map((_, i) => ({
      day_of_week: i,
      open_time: i === 0 ? '10:00' : '09:00',
      close_time: i === 0 ? '14:00' : '20:00',
      is_open: i !== 0
    })),
    // Step 3: Services
    services: [...DEFAULT_SERVICES],
    // Step 4: Barbers
    barbers: [{ full_name: '', specialty: '' }],
    // Step 5: Branch
    branch_name: '',
    branch_address: '',
    branch_city: '',
    branch_phone: '',
  });

  useEffect(() => {
    loadTenant();
  }, [user]);

  async function loadTenant() {
    if (!user) return;

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id, tenants(*)')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single();

    if (tenantUser?.tenants) {
      setTenant(tenantUser.tenants);
      setFormData(f => ({
        ...f,
        name: tenantUser.tenants.name || '',
        primary_color: tenantUser.tenants.primary_color || '#d4af37'
      }));

      if (tenantUser.tenants.onboarding_completed) {
        navigate('/dashboard');
      }
      setCurrentStep(tenantUser.tenants.onboarding_step || 0);
    }
  }

  const updateSchedule = (index: number, field: string, value: any) => {
    setFormData(f => ({
      ...f,
      schedule: f.schedule.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const addService = () => {
    setFormData(f => ({
      ...f,
      services: [...f.services, { name: '', duration: 30, price: 0, category: 'corte' }]
    }));
  };

  const updateService = (index: number, field: string, value: any) => {
    setFormData(f => ({
      ...f,
      services: f.services.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const removeService = (index: number) => {
    if (formData.services.length > 1) {
      setFormData(f => ({
        ...f,
        services: f.services.filter((_, i) => i !== index)
      }));
    }
  };

  const addBarber = () => {
    setFormData(f => ({
      ...f,
      barbers: [...f.barbers, { full_name: '', specialty: '' }]
    }));
  };

  const updateBarber = (index: number, field: string, value: string) => {
    setFormData(f => ({
      ...f,
      barbers: f.barbers.map((b, i) => i === index ? { ...b, [field]: value } : b)
    }));
  };

  const removeBarber = (index: number) => {
    if (formData.barbers.length > 1) {
      setFormData(f => ({
        ...f,
        barbers: f.barbers.filter((_, i) => i !== index)
      }));
    }
  };

  async function saveStep(step: number) {
    setLoading(true);

    try {
      // Save step-specific data
      if (step === 1) {
        // Update tenant info
        await supabase
          .from('tenants')
          .update({
            name: formData.name,
            primary_color: formData.primary_color,
            onboarding_step: 2
          })
          .eq('id', tenant.id);
      } else if (step === 2 && tenant.id) {
        // Create branch schedule - first create branch if not exists
        const { data: existingBranch } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', tenant.id)
          .single();

        let branchId = existingBranch?.id;

        if (!branchId) {
          const branchName = formData.branch_name || formData.name;
          const { data: newBranch, error: branchError } = await supabase
            .from('branches')
            .insert({
              name: branchName,
              tenant_id: tenant.id,
              is_active: true
            })
            .select()
            .single();

          if (branchError) throw branchError;
          branchId = newBranch.id;
        }

        // Create schedules
        await supabase.from('branch_schedules').delete().eq('branch_id', branchId);
        await supabase.from('branch_schedules').insert(
          formData.schedule
            .filter(s => s.is_open)
            .map(s => ({
              branch_id: branchId,
              day_of_week: s.day_of_week,
              open_time: s.open_time,
              close_time: s.close_time,
              is_open: true
            }))
        );

        await supabase
          .from('tenants')
          .update({ onboarding_step: 3 })
          .eq('id', tenant.id);
      } else if (step === 3 && tenant.id) {
        // Create services
        const { data: branch } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', tenant.id)
          .single();

        if (branch) {
          await supabase.from('services').delete().eq('branch_id', branch.id);
          await supabase.from('services').insert(
            formData.services
              .filter(s => s.name.trim())
              .map(s => ({
                name: s.name,
                duration_minutes: s.duration,
                price: s.price,
                category: s.category,
                branch_id: branch.id,
                tenant_id: tenant.id,
                is_active: true
              }))
          );
        }

        await supabase
          .from('tenants')
          .update({ onboarding_step: 4 })
          .eq('id', tenant.id);
      } else if (step === 4 && tenant.id) {
        // Create barbers
        const { data: branch } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', tenant.id)
          .single();

        if (branch) {
          await supabase.from('barbers').delete().eq('branch_id', branch.id);
          await supabase.from('barbers').insert(
            formData.barbers
              .filter(b => b.full_name.trim())
              .map(b => ({
                full_name: b.full_name,
                specialty: b.specialty || null,
                branch_id: branch.id,
                tenant_id: tenant.id,
                is_active: true
              }))
          );
        }

        await supabase
          .from('tenants')
          .update({ onboarding_step: 5 })
          .eq('id', tenant.id);
      } else if (step === 5) {
        // Complete onboarding
        const { data: branch } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', tenant.id)
          .single();

        if (branch && formData.branch_name && formData.branch_address) {
          await supabase
            .from('branches')
            .update({
              name: formData.branch_name,
              address: formData.branch_address,
              city: formData.branch_city || null,
              phone: formData.branch_phone || null
            })
            .eq('id', branch.id);
        }

        await supabase
          .from('tenants')
          .update({
            onboarding_completed: true,
            onboarding_step: 6
          })
          .eq('id', tenant.id);

        toast.success('¡Barbería configurada correctamente!');
        await refreshProfile();
        navigate('/dashboard');
        return;
      }

      // Update onboarding step completion
      await supabase.from('onboarding_steps')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('tenant_id', tenant.id)
        .eq('step', step);

      setCompletedSteps([...completedSteps, step]);
      setCurrentStep(step + 1);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.name.trim().length > 0;
      case 2: return formData.schedule.some(s => s.is_open);
      case 3: return formData.services.some(s => s.name.trim());
      case 4: return formData.barbers.some(b => b.full_name.trim());
      case 5: return true;
      default: return true;
    }
  };

  if (!tenant && user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Scissors className="w-4 h-4 text-zinc-900" />
              </div>
              <span className="font-bold">BarberPro</span>
            </div>
            <span className="text-zinc-500 text-sm">Configuración inicial</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  completedSteps.includes(step.id) ? 'bg-emerald-500 text-white' :
                  currentStep === step.id ? 'bg-amber-500 text-zinc-900' :
                  'bg-zinc-800 text-zinc-500'
                }`}
              >
                {completedSteps.includes(step.id) ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 lg:w-20 h-0.5 mx-2 ${
                  completedSteps.includes(step.id) ? 'bg-emerald-500' : 'bg-zinc-800'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-6">
                <Scissors className="w-10 h-10 text-zinc-900" />
              </div>
              <h1 className="text-2xl font-bold mb-2">¡Bienvenido a BarberPro!</h1>
              <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                Vamos a configurar tu barbería en unos simples pasos. Esto tomará solo unos minutos.
              </p>
              <button
                onClick={() => saveStep(0)}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-8 py-3 rounded-xl transition-all inline-flex items-center gap-2"
              >
                Comenzar Configuración
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Barbershop Info */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold mb-2">Información de tu barbería</h2>
              <p className="text-zinc-400 mb-6">Dale identidad a tu negocio</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nombre de la barbería</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                    placeholder="La Classic Barber"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Color de marca</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={e => setFormData(f => ({ ...f, primary_color: e.target.value }))}
                      className="w-12 h-12 rounded-xl cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300">Este color se usará en tu portal de reservas</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => saveStep(1)}
                  disabled={loading || !canProceed()}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Continuar'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Schedule */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-2">Horarios de atención</h2>
              <p className="text-zinc-400 mb-6">Define tus horarios de trabajo</p>

              <div className="space-y-3">
                {formData.schedule.map((day, i) => (
                  <div key={day.day_of_week} className="flex items-center gap-4 p-4 bg-zinc-800 rounded-xl">
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <input
                        type="checkbox"
                        checked={day.is_open}
                        onChange={e => updateSchedule(i, 'is_open', e.target.checked)}
                        className="w-5 h-5 rounded accent-amber-500"
                      />
                      <span className={`font-medium ${day.is_open ? 'text-white' : 'text-zinc-500'}`}>
                        {DAYS[day.day_of_week]}
                      </span>
                    </div>
                    {day.is_open && (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={day.open_time}
                          onChange={e => updateSchedule(i, 'open_time', e.target.value)}
                          className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-zinc-500">a</span>
                        <input
                          type="time"
                          value={day.close_time}
                          onChange={e => updateSchedule(i, 'close_time', e.target.value)}
                          className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                    {!day.is_open && (
                      <span className="text-zinc-600 text-sm">Cerrado</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => saveStep(2)}
                  disabled={loading || !canProceed()}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Continuar'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Services */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold mb-2">Servicios que ofreces</h2>
              <p className="text-zinc-400 mb-6">Define los servicios y precios</p>

              <div className="space-y-3">
                {formData.services.map((service, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-zinc-800 rounded-xl">
                    <input
                      type="text"
                      value={service.name}
                      onChange={e => updateService(i, 'name', e.target.value)}
                      placeholder="Nombre del servicio"
                      className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none"
                    />
                    <select
                      value={service.category}
                      onChange={e => updateService(i, 'category', e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                    >
                      <option value="corte">Corte</option>
                      <option value="barba">Barba</option>
                      <option value="tratamiento">Tratamiento</option>
                      <option value="combo">Combo</option>
                    </select>
                    <input
                      type="number"
                      value={service.duration}
                      onChange={e => updateService(i, 'duration', parseInt(e.target.value) || 30)}
                      className="w-20 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                      placeholder="Min"
                    />
                    <span className="text-zinc-500 text-sm">min</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                      <input
                        type="number"
                        value={service.price}
                        onChange={e => updateService(i, 'price', parseFloat(e.target.value) || 0)}
                        className="w-28 bg-zinc-700 border border-zinc-600 rounded-lg pl-6 pr-3 py-2 text-white text-sm focus:outline-none"
                        placeholder="Precio"
                      />
                    </div>
                    <button
                      onClick={() => removeService(i)}
                      className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addService}
                className="mt-4 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar servicio
              </button>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => saveStep(3)}
                  disabled={loading || !canProceed()}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Continuar'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Barbers */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-bold mb-2">Tu equipo</h2>
              <p className="text-zinc-400 mb-6">Agrega los barberos que trabajan contigo</p>

              <div className="space-y-3">
                {formData.barbers.map((barber, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-zinc-800 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-amber-400 font-bold">
                      {barber.full_name ? barber.full_name[0].toUpperCase() : '?'}
                    </div>
                    <input
                      type="text"
                      value={barber.full_name}
                      onChange={e => updateBarber(i, 'full_name', e.target.value)}
                      placeholder="Nombre completo"
                      className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={barber.specialty}
                      onChange={e => updateBarber(i, 'specialty', e.target.value)}
                      placeholder="Especialidad"
                      className="w-40 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                    />
                    {formData.barbers.length > 1 && (
                      <button
                        onClick={() => removeBarber(i)}
                        className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addBarber}
                className="mt-4 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar barbero
              </button>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => saveStep(4)}
                  disabled={loading || !canProceed()}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Continuar'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Branch */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-bold mb-2">Datos de tu sucursal</h2>
              <p className="text-zinc-400 mb-6">Información de contacto y ubicación</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nombre de sucursal</label>
                  <input
                    type="text"
                    value={formData.branch_name}
                    onChange={e => setFormData(f => ({ ...f, branch_name: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                    placeholder="Sucursal Centro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.branch_phone}
                    onChange={e => setFormData(f => ({ ...f, branch_phone: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                    placeholder="+54 11 1234-5678"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Dirección</label>
                  <input
                    type="text"
                    value={formData.branch_address}
                    onChange={e => setFormData(f => ({ ...f, branch_address: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                    placeholder="Av. Principal 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Ciudad</label>
                  <input
                    type="text"
                    value={formData.branch_city}
                    onChange={e => setFormData(f => ({ ...f, branch_city: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                    placeholder="Buenos Aires"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => saveStep(5)}
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-8 py-3 rounded-xl transition-all flex items-center gap-2"
                >
                  {loading ? 'Completando...' : 'Finalizar Configuración'}
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Skip option */}
        {currentStep > 0 && currentStep < 5 && (
          <div className="text-center mt-4">
            <button
              onClick={() => saveStep(currentStep)}
              className="text-zinc-500 hover:text-zinc-400 text-sm transition-colors"
            >
              Omitir este paso
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
