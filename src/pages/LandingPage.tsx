import React from 'react';
import { Link } from 'react-router-dom';
import {
  Scissors, Calendar, Users, BarChart3, Bell, Smartphone,
  Check, Zap, Star, ArrowRight, Menu, X
} from 'lucide-react';

const features = [
  {
    icon: <Calendar className="w-6 h-6" />,
    title: 'Agenda Inteligente',
    description: 'Gestión de turnos con recordatorios automáticos por WhatsApp y email. Reduce las ausencias hasta un 80%.'
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Gestión de Clientes',
    description: 'Ficha completa de cada cliente con historial, preferencias y programa de fidelidad integrado.'
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Reportes en Tiempo Real',
    description: 'Métricas de rendimiento, facturación y tendencias para tomar decisiones basadas en datos.'
  },
  {
    icon: <Bell className="w-6 h-6" />,
    title: 'Marketing Automatizado',
    description: 'Campañas segmentadas, recordatorios de cumpleaños y mensajes personalizados masivos.'
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: 'Portal de Reservas',
    description: 'Tus clientes pueden reservar online 24/7 desde cualquier dispositivo sin intervención.'
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'IA Asistente',
    description: 'Recomendaciones inteligentes para optimizar horarios, servicios y aumentar tus ingresos.'
  }
];

const stats = [
  { value: '500+', label: 'Barberías activas' },
  { value: '50K+', label: 'Turnos mensuales' },
  { value: '98%', label: 'Satisfacción' },
  { value: '24/7', label: 'Soporte' }
];

const testimonials = [
  {
    quote: 'Desde que uso BarberPro, reduje las ausencias un 75% y mis ingresos aumentaron un 40%. Es una herramienta indispensable.',
    author: 'Carlos Martínez',
    role: 'Dueño de La Classic Barber',
    avatar: 'CM'
  },
  {
    quote: 'El sistema de reservas online transformó mi negocio. Mis clientes reservan cuando quieren y yo me enfoco en cortar.',
    author: 'Miguel Ángel Torres',
    role: 'Barbero profesional',
    avatar: 'MT'
  },
  {
    quote: 'Los reportes me mostraron que los viernes a las 6pm eran mi hora más solicitada. Ahora cobro más en ese horario.',
    author: 'Andrea Ramírez',
    role: 'Dueña de Styles Barbershop',
    avatar: 'AR'
  }
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-zinc-900" />
              </div>
              <span className="text-xl font-bold">BarberPro</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-zinc-400 hover:text-white transition-colors text-sm">Características</a>
              <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors text-sm">Planes</a>
              <a href="#testimonials" className="text-zinc-400 hover:text-white transition-colors text-sm">Testimonios</a>
              <Link to="/auth" className="text-zinc-400 hover:text-white transition-colors text-sm">Iniciar Sesión</Link>
              <Link to="/register" className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                Prueba Gratis
              </Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-zinc-400">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-zinc-900 border-b border-zinc-800">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-zinc-400 hover:text-white transition-colors text-sm py-2">Características</a>
              <a href="#pricing" className="block text-zinc-400 hover:text-white transition-colors text-sm py-2">Planes</a>
              <a href="#testimonials" className="block text-zinc-400 hover:text-white transition-colors text-sm py-2">Testimonios</a>
              <Link to="/auth" className="block text-zinc-400 hover:text-white transition-colors text-sm py-2">Iniciar Sesión</Link>
              <Link to="/register" className="block bg-amber-500 text-zinc-900 font-semibold px-4 py-2 rounded-xl text-sm text-center">
                Prueba Gratis
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">14 días de prueba gratis</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Gestiona tu barbería
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              como un profesional
            </span>
          </h1>

          <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
            El sistema todo-en-uno para barberías. Agenda, clientes, facturación, reportes y marketing
            en una sola plataforma. Sin complicaciones.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-8 py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2 group">
              Comenzar Gratis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features" className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium px-8 py-4 rounded-xl text-lg transition-all">
              Ver Características
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-16 pt-16 border-t border-zinc-800">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl sm:text-4xl font-bold text-amber-400">{stat.value}</div>
                <div className="text-zinc-500 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Todo lo que necesitas</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Herramientas profesionales diseñadas específicamente para el negocio de barberías.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/30 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4 group-hover:bg-amber-500/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Planes para cada etapa</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Desde barberías independientes hasta cadenas con múltiples sucursales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-2">Gratis</h3>
              <p className="text-zinc-500 text-sm mb-4">Para empezar</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-zinc-500 text-sm">/mes</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['1 sucursal', '2 barberos', '5 servicios', '50 clientes', 'Soporte por email'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-center font-medium py-3 rounded-xl transition-all">
                Comenzar Gratis
              </Link>
            </div>

            {/* Pro - Featured */}
            <div className="bg-zinc-900 border-2 border-amber-500 rounded-2xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-900 text-xs font-bold px-3 py-1 rounded-full">
                Más Popular
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-zinc-500 text-sm mb-4">Para crecer</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$4.990</span>
                <span className="text-zinc-500 text-sm">/mes</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['2 sucursales', '5 barberos', '20 servicios', '500 clientes', 'WhatsApp integrado', 'Reportes avanzados', 'Soporte prioritario'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register?plan=pro" className="block w-full bg-amber-500 hover:bg-amber-400 text-zinc-900 text-center font-semibold py-3 rounded-xl transition-all">
                Comenzar Prueba
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-2">Premium</h3>
              <p className="text-zinc-500 text-sm mb-4">Para cadenas</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$9.990</span>
                <span className="text-zinc-500 text-sm">/mes</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['10 sucursales', '20+ barberos', 'Servicios ilimitados', 'Clientes ilimitados', 'API completa', 'Asistente IA', 'Manager dedicado'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register?plan=premium" className="block w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-center font-medium py-3 rounded-xl transition-all">
                Contactar Ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Lo que dicen nuestros clientes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.author} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{t.author}</div>
                    <div className="text-zinc-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-3xl p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Comienza tu prueba gratuita hoy</h2>
            <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
              Sin tarjeta de crédito. Sin compromisos. 14 días para explorar todas las funciones.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-8 py-4 rounded-xl text-lg transition-all group">
              Crear Cuenta Gratis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Scissors className="w-4 h-4 text-zinc-900" />
              </div>
              <span className="font-bold">BarberPro</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <span>© 2026 BarberPro</span>
              <span>·</span>
              <span>Hecho con pasión para barberías</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
