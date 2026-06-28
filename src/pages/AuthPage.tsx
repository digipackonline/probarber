import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Scissors, Eye, EyeOff, Mail, Lock, User, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type View = 'login' | 'register' | 'forgot';

export default function AuthPage() {
  const { user, signIn, signUp, signInWithGoogle, resetPassword, loading } = useAuth();
  const [view, setView] = useState<View>('login');
  const [showPass, setShowPass] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'client' });

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setSuccess('');

    if (view === 'login') {
      const { error } = await signIn(form.email, form.password);
      if (error) setError(error.message);
    } else if (view === 'register') {
      if (!form.name.trim()) { setError('El nombre es requerido'); setFormLoading(false); return; }
      const { error } = await signUp(form.email, form.password, form.name, form.role);
      if (error) setError(error.message);
      else setSuccess('Cuenta creada exitosamente. Ya puedes iniciar sesión.');
    } else {
      const { error } = await resetPassword(form.email);
      if (error) setError(error.message);
      else setSuccess('Revisa tu correo para restablecer tu contraseña.');
    }
    setFormLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12"
        style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 50%, #1a1208 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #d4af37 0%, transparent 50%), radial-gradient(circle at 75% 75%, #b8960c 0%, transparent 50%)' }} />
        <div className="relative z-10 text-center max-w-lg">
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl">
              <Scissors className="w-10 h-10 text-zinc-900" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">BarberPro</h1>
          <p className="text-amber-400 text-xl font-medium mb-6">Gestión Integral de Barberías</p>
          <p className="text-zinc-400 text-base leading-relaxed mb-8">
            La plataforma SaaS más completa para administrar tu barbería. Turnos, clientes, pagos y estadísticas en un solo lugar.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '📅', title: 'Agenda Inteligente', desc: 'Gestión de turnos en tiempo real' },
              { icon: '👥', title: 'Gestión de Clientes', desc: 'Historial y preferencias completo' },
              { icon: '💰', title: 'Control de Pagos', desc: 'Caja diaria y reportes' },
              { icon: '🤖', title: 'IA Integrada', desc: 'Análisis y predicciones' },
            ].map(item => (
              <div key={item.title} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-white text-sm font-semibold">{item.title}</div>
                <div className="text-zinc-500 text-xs mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8 gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Scissors className="w-6 h-6 text-zinc-900" />
            </div>
            <span className="text-2xl font-bold text-white">BarberPro</span>
          </div>

          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">
                {view === 'login' && 'Bienvenido de vuelta'}
                {view === 'register' && 'Crear cuenta'}
                {view === 'forgot' && 'Recuperar contraseña'}
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                {view === 'login' && 'Ingresa a tu panel de BarberPro'}
                {view === 'register' && 'Únete a BarberPro hoy'}
                {view === 'forgot' && 'Te enviamos las instrucciones por email'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{success}</div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {view === 'register' && (
                <div>
                  <label className="block text-zinc-400 text-sm mb-1.5">Nombre completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input name="name" value={form.name} onChange={handle} required
                      placeholder="Tu nombre"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all text-sm" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-zinc-400 text-sm mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input name="email" type="email" value={form.email} onChange={handle} required
                    placeholder="tu@email.com"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all text-sm" />
                </div>
              </div>

              {view !== 'forgot' && (
                <div>
                  <label className="block text-zinc-400 text-sm mb-1.5">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handle} required
                      placeholder="••••••••"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-10 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all text-sm" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {view === 'register' && (
                <div>
                  <label className="block text-zinc-400 text-sm mb-1.5">Tipo de cuenta</label>
                  <select name="role" value={form.role} onChange={handle}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all text-sm">
                    <option value="client">Cliente</option>
                    <option value="barber">Barbero</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              )}

              {view === 'login' && (
                <div className="text-right">
                  <button type="button" onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}
                    className="text-amber-500 hover:text-amber-400 text-sm transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              <button type="submit" disabled={formLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-zinc-900 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-amber-500/20">
                {formLoading ? (
                  <div className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <>
                    {view === 'login' && 'Iniciar sesión'}
                    {view === 'register' && 'Crear cuenta'}
                    {view === 'forgot' && 'Enviar instrucciones'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {view !== 'forgot' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-zinc-900 px-3 text-zinc-500">o continúa con</span>
                  </div>
                </div>
                <button onClick={async () => { setFormLoading(true); await signInWithGoogle(); setFormLoading(false); }}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-3 transition-all duration-200">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuar con Google
                </button>
              </>
            )}

            <div className="mt-6 text-center text-sm text-zinc-500">
              {view === 'login' && (
                <>¿No tienes cuenta? <button onClick={() => { setView('register'); setError(''); setSuccess(''); }} className="text-amber-500 hover:text-amber-400 transition-colors font-medium">Regístrate</button></>
              )}
              {view === 'register' && (
                <>¿Ya tienes cuenta? <button onClick={() => { setView('login'); setError(''); setSuccess(''); }} className="text-amber-500 hover:text-amber-400 transition-colors font-medium">Inicia sesión</button></>
              )}
              {view === 'forgot' && (
                <button onClick={() => { setView('login'); setError(''); setSuccess(''); }} className="text-amber-500 hover:text-amber-400 transition-colors font-medium">Volver al login</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
