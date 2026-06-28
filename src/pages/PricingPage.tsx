import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, X, Zap, HelpCircle, ChevronDown } from 'lucide-react';

const plans = [
  {
    name: 'Gratis',
    slug: 'free',
    price: 0,
    priceYearly: 0,
    description: 'Perfecto para barberías independientes que están comenzando.',
    features: {
      branches: 1,
      barbers: 2,
      services: 5,
      clients: 50,
      features: [
        { name: 'Dashboard básico', included: true },
        { name: 'Agenda de turnos', included: true },
        { name: 'Gestión de clientes', included: true },
        { name: 'Portal de reservas online', included: true },
        { name: 'Múltiples sucursales', included: false },
        { name: 'Reportes avanzados', included: false },
        { name: 'WhatsApp integrado', included: false },
        { name: 'Programa de fidelidad', included: false },
        { name: 'Marketing automatizado', included: false },
        { name: 'Asistente IA', included: false },
        { name: 'Soporte prioritario', included: false },
        { name: 'API access', included: false },
      ]
    },
    cta: 'Comenzar Gratis',
    ctaStyle: 'secondary'
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: 4990,
    priceYearly: 47840,
    description: 'Para barberías en crecimiento que necesitan más potencia.',
    popular: true,
    features: {
      branches: 2,
      barbers: 5,
      services: 20,
      clients: 500,
      features: [
        { name: 'Dashboard completo', included: true },
        { name: 'Agenda avanzada', included: true },
        { name: 'Gestión completa de clientes', included: true },
        { name: 'Portal de reservas online', included: true },
        { name: 'Múltiples sucursales', included: true },
        { name: 'Reportes detallados', included: true },
        { name: 'WhatsApp integrado', included: true },
        { name: 'Programa de fidelidad', included: true },
        { name: 'Marketing automatizado', included: true },
        { name: 'Asistente IA', included: false },
        { name: 'Soporte prioritario', included: true },
        { name: 'API access', included: false },
      ]
    },
    cta: 'Comenzar Prueba',
    ctaStyle: 'primary'
  },
  {
    name: 'Premium',
    slug: 'premium',
    price: 9990,
    priceYearly: 95840,
    description: 'Para cadenas de barberías sin límites.',
    features: {
      branches: 10,
      barbers: 20,
      services: -1,
      clients: -1,
      features: [
        { name: 'Todo en Pro', included: true },
        { name: 'Hasta 10 sucursales', included: true },
        { name: 'Barberos ilimitados', included: true },
        { name: 'Servicios ilimitados', included: true },
        { name: 'Clientes ilimitados', included: true },
        { name: 'API completa', included: true },
        { name: 'Integraciones avanzadas', included: true },
        { name: 'Asistente IA incluido', included: true },
        { name: 'Manager dedicado', included: true },
        { name: 'SLA 99.9%', included: true },
        { name: 'Personalización de marca', included: true },
        { name: 'Onboarding personalizado', included: true },
      ]
    },
    cta: 'Contactar Ventas',
    ctaStyle: 'secondary'
  }
];

const faqs = [
  {
    question: '¿Puedo cambiar de plan en cualquier momento?',
    answer: 'Sí, puedes actualizar o cancelar tu plan en cualquier momento desde el panel de suscripción. Los cambios se aplican inmediatamente.'
  },
  {
    question: '¿Qué pasa después de los 14 días de prueba?',
    answer: 'Al finalizar la prueba, tu cuenta pasa al plan Gratis automáticamente. No se te cobrará nada sin tu autorización.'
  },
  {
    question: '¿Necesito tarjeta de crédito para la prueba?',
    answer: 'No. La prueba de 14 días es completamente gratis y no requiere tarjeta de crédito ni compromiso.'
  },
  {
    question: '¿Puedo exportar mis datos si cancelo?',
    answer: 'Sí, puedes exportar todos tus datos (clientes, turnos, historial) en formato CSV o Excel antes de cancelar.'
  },
  {
    question: '¿El plan Gratis tiene límite de tiempo?',
    answer: 'No, el plan Gratis es para siempre. Puedes usarlo sin límite de tiempo con sus restricciones de funcionalidad.'
  },
  {
    question: '¿Ofrecen descuentos por pago anual?',
    answer: 'Sí, todos los planes tienen un 20% de descuento al pagar anualmente. El plan Pro anual equivale a $3.987/mes.'
  }
];

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Scissors className="w-4 h-4 text-zinc-900" />
              </div>
              <span className="font-bold">BarberPro</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="text-zinc-400 hover:text-white text-sm transition-colors">Iniciar Sesión</Link>
              <Link to="/register" className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                Prueba Gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Planes y Precios</h1>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-8">
              Elige el plan que mejor se adapte a tu barbería. Sin sorpresas, sin costos ocultos.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
              >
                Anual
                <span className="ml-2 text-xs text-emerald-400 font-semibold">-20%</span>
              </button>
            </div>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {plans.map((plan) => (
              <div
                key={plan.slug}
                className={`rounded-2xl p-6 ${plan.popular ? 'bg-zinc-900 border-2 border-amber-500 relative' : 'bg-zinc-900 border border-zinc-800'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-900 text-xs font-bold px-3 py-1 rounded-full">
                    Más Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-zinc-500 text-sm">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {fmt(billingCycle === 'monthly' ? plan.price : plan.priceYearly / 12)}
                    </span>
                    <span className="text-zinc-500 text-sm">/mes</span>
                  </div>
                  {billingCycle === 'yearly' && plan.price > 0 && (
                    <div className="text-emerald-400 text-sm mt-1">
                      Ahorrás {fmt(plan.price * 12 - plan.priceYearly)}/año
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-6 text-sm">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Sucursales</span>
                    <span className="text-white">{plan.features.branches === -1 ? 'Ilimitadas' : plan.features.branches}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Barberos</span>
                    <span className="text-white">{plan.features.barbers === -1 ? 'Ilimitados' : plan.features.barbers}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Servicios</span>
                    <span className="text-white">{plan.features.services === -1 ? 'Ilimitados' : plan.features.services}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Clientes</span>
                    <span className="text-white">{plan.features.clients === -1 ? 'Ilimitados' : plan.features.clients}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.features.map((f) => (
                    <li key={f.name} className="flex items-center gap-2 text-sm">
                      {f.included ? (
                        <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                      )}
                      <span className={f.included ? 'text-zinc-300' : 'text-zinc-600'}>{f.name}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={`/register${plan.slug !== 'free' ? `?plan=${plan.slug}` : ''}`}
                  className={`block w-full text-center font-semibold py-3 rounded-xl transition-all ${
                    plan.ctaStyle === 'primary'
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-900'
                      : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Preguntas Frecuentes</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="font-medium pr-4">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-zinc-500 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 text-zinc-400 text-sm leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Scissors({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6" cy="6" r="3"/>
      <circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/>
      <line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  );
}
