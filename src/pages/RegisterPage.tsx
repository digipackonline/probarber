import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Scissors, Mail, Lock, ArrowRight, Check, Building2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    barbershopName: '',
    barbershopSlug: '',
    plan: searchParams.get('plan') || 'free'
  });

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan && ['free', 'pro', 'premium'].includes(plan)) {
      setFormData(f => ({ ...f, plan }));
    }
  }, [searchParams]);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(f => {
      const updated = { ...f, [name]: value };
      if (name === 'barbershopName') {
        updated.barbershopSlug = generateSlug(value);
      }
      return updated;
    });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (formData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!formData.barbershopName.trim()) {
        setError('El nombre de la barbería es requerido');
        return;
      }
      setStep(3);
      return;
    }

    // Step 3: Create account
    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'admin'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Error al crear usuario');

      // 2. Create tenant
      const { data: tenant, error: tenantError } = await supabase.rpc('create_tenant', {
        p_name: formData.barbershopName,
        p_slug: formData.barbershopSlug,
        p_email: formData.email,
        p_created_by: authData.user.id
      });

      if (tenantError) {
        // If tenant creation fails, we still have the user - they can retry later
        console.error('Tenant creation error:', tenantError);
        // Try direct insert as fallback
        const directInsert = await supabase.from('tenants').insert({
          name: formData.barbershopName,
          slug: formData.barbershopSlug,
          email: formData.email,
          created_by: authData.user.id,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        }).select().single();

        if (directInsert.error) {
          throw new Error('Error al crear la barbería. Por favor contacta soporte.');
        }
      }

      // 3. Update profile with active tenant
      if (authData.user) {
        const tenantId = tenant?.[0]?.id || (await supabase.from('tenants').select('id').eq('created_by', authData.user.id).single()).data?.id;

        if (tenantId) {
          await supabase.from('profiles').update({ active_tenant_id: tenantId }).eq('id', authData.user.id);
        }
      }

      // Redirect to onboarding
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
      setLoading(false);
    }
  }

  const plans = [
    { slug: 'free', name: 'Gratis', price: 0 },
    { slug: 'pro', name: 'Pro', price: 4990 },
    { slug: 'premium', name: 'Premium', price: 9990 }
  ];

  const selectedPlan = plans.find(p => p.slug === formData.plan) || plans[0];

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-zinc-900" />
            </div>
            <span className="text-xl font-bold">BarberPro</span>
          </Link>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s < step ? 'bg-emerald-500 text-white' :
                  s === step ? 'bg-amber-500 text-zinc-900' :
                  'bg-zinc-800 text-zinc-500'
                }`}>
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
              </div>
            ))}
          </div>

          <h1 className="text-2xl font-bold mb-2">
            {step === 1 && 'Crear tu cuenta'}
            {step === 2 && 'Tu barbería'}
            {step === 3 && 'Confirmar plan'}
          </h1>
          <p className="text-zinc-400 mb-8">
            {step === 1 && 'Ingresa tus datos para crear tu cuenta'}
            {step === 2 && 'Dale un nombre a tu barbería'}
            {step === 3 && 'Revisa tu selección y comienza'}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nombre completo</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Confirmar contraseña</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nombre de tu barbería</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      name="barbershopName"
                      value={formData.barbershopName}
                      onChange={handleChange}
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      placeholder="La Classic Barber"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">URL de tu barbería</label>
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <span className="text-zinc-500 px-3 text-sm">barberpro.app/</span>
                    <input
                      type="text"
                      name="barbershopSlug"
                      value={formData.barbershopSlug}
                      onChange={handleChange}
                      className="flex-1 bg-transparent border-l border-zinc-800 px-3 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      placeholder="la-classic-barber"
                    />
                  </div>
                  <p className="text-zinc-500 text-xs mt-1.5">Esta será la URL para tus clientes</p>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Plan seleccionado</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{selectedPlan.name}</span>
                      <span className="text-amber-400">
                        {selectedPlan.price === 0 ? 'Gratis' : `$${selectedPlan.price.toLocaleString()}/mes`}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-zinc-800 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Período de prueba</span>
                      <span className="text-emerald-400">14 días gratis</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-1">No se te cobrará hasta finalizar la prueba</p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-amber-400 text-sm">
                    Al continuar, aceptas nuestros términos de servicio y política de privacidad.
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium py-3 rounded-xl transition-all"
                >
                  Atrás
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando cuenta...' : (
                  <>
                    {step < 3 ? 'Continuar' : 'Crear Cuenta'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-8">
            ¿Ya tienes cuenta?{' '}
            <Link to="/auth" className="text-amber-400 hover:text-amber-300 transition-colors">
              Iniciar Sesión
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Info */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-zinc-900 to-zinc-800 items-center justify-center p-12">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold mb-4">Comienza tu prueba gratis</h2>
          <p className="text-zinc-400 mb-8">
            14 días para explorar todas las funciones. Sin tarjeta de crédito, sin compromisos.
          </p>
          <ul className="space-y-4">
            {[
              'Agenda inteligente con recordatorios',
              'Gestión completa de clientes',
              'Portal de reservas online',
              'Reportes y métricas',
              'Soporte personalizado'
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-zinc-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
