import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useToast } from '../context/ToastContext';
import {
  Crown, CreditCard, Check, AlertTriangle, Zap, ExternalLink, RefreshCw, Download,
  Calendar, DollarSign, FileText, Clock, XCircle, CheckCircle
} from 'lucide-react';
import { Card, Button, Badge, LoadingScreen, Modal } from '../components/ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  createCheckout, cancelSubscription, retryPayment, getPaymentTransactions,
  getInvoices, formatCurrency, getStatusLabel, getStatusColor
} from '../lib/paymentService';

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['1 sucursal', '2 barberos', '5 servicios', '50 clientes', 'Soporte por email'],
  pro: ['2 sucursales', '5 barberos', '20 servicios', '500 clientes', 'WhatsApp integrado', 'Reportes avanzados', 'Programa de fidelidad', 'Soporte prioritario'],
  premium: ['10 sucursales', '20+ barberos', 'Servicios ilimitados', 'Clientes ilimitados', 'API completa', 'Asistente IA', 'Manager dedicado', 'SLA 99.9%']
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { tenant, subscription, plan, loading, isOnTrial, trialDaysLeft, refreshTenant } = useTenant();
  const toast = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [changing, setChanging] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'invoices'>('overview');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;

    const plansRes = await supabase.from('plans').select('*').eq('is_active', true).order('display_order');
    setPlans(plansRes.data || []);

    if (tenant) {
      const [txRes, invRes] = await Promise.all([
        getPaymentTransactions(tenant.id, 20),
        getInvoices(tenant.id, 12)
      ]);
      setTransactions(txRes || []);
      setInvoices(invRes || []);
    }
  }

  const handleUpgrade = useCallback(async (planSlug: string) => {
    if (!tenant || !subscription) return;

    const targetPlan = plans.find(p => p.slug === planSlug);
    if (!targetPlan) return;

    if (planSlug === 'free') {
      // Downgrade to free
      setChanging(true);
      try {
        await cancelSubscription(tenant.id);
        toast.success('Plan cambiado a Gratis');
        await refreshTenant();
        load();
      } catch (err: any) {
        toast.error(err.message || 'Error al cambiar plan');
      } finally {
        setChanging(false);
      }
      return;
    }

    // Create checkout for paid plan
    setChanging(true);
    try {
      const result = await createCheckout(tenant.id, planSlug, billingCycle, {
        successUrl: `${window.location.origin}/subscription?status=success`,
        failureUrl: `${window.location.origin}/subscription?status=failure`,
        pendingUrl: `${window.location.origin}/subscription?status=pending`
      });

      if (result.success && result.init_point) {
        // Redirect to Mercado Pago checkout
        window.location.href = result.init_point;
      } else {
        toast.error(result.error || 'Error al crear checkout');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar');
    } finally {
      setChanging(false);
    }
  }, [tenant, subscription, plans, billingCycle, toast, refreshTenant]);

  const handleRetryPayment = useCallback(async () => {
    if (!tenant) return;

    setChanging(true);
    try {
      const result = await retryPayment(tenant.id);
      if (result.success) {
        toast.success('Cobro reintentado. Verificando estado...');
        await new Promise(r => setTimeout(r, 3000));
        await refreshTenant();
        load();
      } else {
        toast.error(result.error || 'Error al reintentar');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al reintentar pago');
    } finally {
      setChanging(false);
    }
  }, [tenant, toast, refreshTenant]);

  const handleCancelSubscription = useCallback(async () => {
    if (!tenant) return;

    setChanging(true);
    try {
      const result = await cancelSubscription(tenant.id);
      if (result.success) {
        toast.success('Suscripción cancelada');
        setCancelModalOpen(false);
        await refreshTenant();
        load();
      } else {
        toast.error(result.error || 'Error al cancelar');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al cancelar');
    } finally {
      setChanging(false);
    }
  }, [tenant, toast, refreshTenant]);

  const fmtDate = (d: string) => format(new Date(d), "d MMM yyyy", { locale: es });

  // Check for redirect status from Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success') {
      toast.success('Pago procesado correctamente');
      window.history.replaceState({}, '', window.location.pathname);
      load();
    } else if (status === 'failure') {
      toast.error('El pago fue rechazado');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'pending') {
      toast.info('Pago pendiente de confirmación');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  if (loading && !tenant) return <LoadingScreen />;

  const currentPlan = plan;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Suscripción y Facturación</h1>
          <p className="text-zinc-400 text-sm">Gestiona tu plan, pagos y facturas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refreshTenant(); load(); }}
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        {(['overview', 'history', 'invoices'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab === 'overview' ? 'Plan Actual' : tab === 'history' ? 'Historial de Pagos' : 'Facturas'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Plan Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Plan {currentPlan?.name || 'Gratis'}
                  </h2>
                </div>
                <p className="text-zinc-400 text-sm">
                  {isOnTrial && trialDaysLeft > 0 && (
                    <span className="text-amber-400">Período de prueba: {trialDaysLeft} días restantes</span>
                  )}
                  {subscription?.status === 'active' && subscription.current_period_end && (
                    <span>Próxima facturación: {fmtDate(subscription.current_period_end)}</span>
                  )}
                  {subscription?.status === 'past_due' && (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Pago pendiente - Acceso limitado
                    </span>
                  )}
                  {subscription?.status === 'canceled' && (
                    <span className="text-red-400">Suscripción cancelada</span>
                  )}
                </p>
              </div>
              <Badge variant={
                subscription?.status === 'trial' ? 'warning' :
                subscription?.status === 'active' ? 'success' :
                subscription?.status === 'past_due' ? 'danger' :
                subscription?.status === 'canceled' ? 'danger' : 'default'
              }>
                {subscription?.status === 'trial' ? 'Prueba' :
                 subscription?.status === 'active' ? 'Activo' :
                 subscription?.status === 'past_due' ? 'Vencido' :
                 subscription?.status === 'canceled' ? 'Cancelado' : subscription?.status}
              </Badge>
            </div>

            {/* Plan features */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
              {(PLAN_FEATURES[currentPlan?.slug || 'free'] || []).map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-zinc-400">
                  <Check className="w-4 h-4 text-emerald-400" />
                  {feature}
                </div>
              ))}
            </div>

            {/* Trial warning */}
            {isOnTrial && trialDaysLeft <= 3 && trialDaysLeft > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-amber-400 font-medium">
                      Tu período de prueba finaliza en {trialDaysLeft} {trialDaysLeft === 1 ? 'día' : 'días'}
                    </p>
                    <p className="text-amber-400/70 text-sm">
                      Actualiza tu plan para continuar usando BarberPro sin interrupciones.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Past due action */}
            {subscription?.status === 'past_due' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-red-400 font-medium">Pago rechazado</p>
                      <p className="text-red-400/70 text-sm">
                        Intentos: {subscription.retry_count || 0}/3
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleRetryPayment} loading={changing}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reintentar Pago
                  </Button>
                </div>
              </div>
            )}

            {/* Cancel option */}
            {currentPlan?.slug !== 'free' && subscription?.status === 'active' && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="text-zinc-500 hover:text-red-400 text-sm transition-colors"
              >
                Cancelar suscripción
              </button>
            )}
          </Card>

          {/* Plan Selection */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Cambiar Plan</h2>
              <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    billingCycle === 'monthly' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                  }`}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    billingCycle === 'yearly' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                  }`}
                >
                  Anual
                  <span className="ml-1 text-xs text-emerald-400">-20%</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((planItem) => {
                const price = billingCycle === 'monthly' ? planItem.price_monthly : planItem.price_yearly / 12;
                const isCurrent = currentPlan?.slug === planItem.slug;

                return (
                  <div
                    key={planItem.id}
                    className={`rounded-xl p-4 border ${
                      isCurrent ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{planItem.name}</h3>
                      {isCurrent && <Badge variant="success">Actual</Badge>}
                    </div>
                    <div className="mb-4">
                      <span className="text-2xl font-bold">{price === 0 ? 'Gratis' : formatCurrency(price)}</span>
                      {price > 0 && <span className="text-zinc-500 text-sm">/mes</span>}
                    </div>
                    <Button
                      onClick={() => handleUpgrade(planItem.slug)}
                      disabled={changing || isCurrent}
                      variant={planItem.slug === 'pro' ? 'primary' : 'secondary'}
                      className="w-full"
                    >
                      {changing ? 'Procesando...' : isCurrent ? 'Plan actual' : price === 0 ? 'Cambiar a Gratis' : 'Seleccionar'}
                    </Button>
                  </div>
                );
              })}
            </div>

            <p className="text-zinc-500 text-xs mt-4 text-center">
              Los pagos se procesan de forma segura a través de Mercado Pago.
            </p>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Historial de Transacciones</h2>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay transacciones registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {tx.status === 'approved' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : tx.status === 'rejected' ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-zinc-400" />
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">
                        {tx.payment_type === 'subscription' ? 'Suscripción' : 'Pago'}
                      </p>
                      <p className="text-zinc-500 text-xs">{fmtDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatCurrency(tx.amount)}</span>
                    <Badge variant={getStatusColor(tx.status)}>
                      {getStatusLabel(tx.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Facturas</h2>

          {invoices.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay facturas disponibles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-zinc-500" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        {invoice.description || invoice.invoice_number}
                      </p>
                      <p className="text-zinc-500 text-xs">{fmtDate(invoice.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatCurrency(invoice.amount)}</span>
                    <Badge variant={getStatusColor(invoice.status)}>
                      {getStatusLabel(invoice.status)}
                    </Badge>
                    {invoice.status === 'paid' && (
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        title="Ver factura"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancelar Suscripción"
      >
        <div className="space-y-4">
          <p className="text-zinc-400">
            ¿Estás seguro de que deseas cancelar tu suscripción?
          </p>
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-sm text-zinc-300">
              Al cancelar:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li>- Perderás acceso a las funciones de pago al final del período</li>
              <li>- Tu cuenta pasará al plan Gratuito</li>
              <li>- Los datos se conservarán por 30 días</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setCancelModalOpen(false)}
            >
              Mantener Plan
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleCancelSubscription}
              loading={changing}
            >
              Cancelar Suscripción
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title="Factura"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-400">Número</span>
                <span className="text-white font-mono">{selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Fecha</span>
                <span className="text-white">{fmtDate(selectedInvoice.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Estado</span>
                <Badge variant={getStatusColor(selectedInvoice.status)}>
                  {getStatusLabel(selectedInvoice.status)}
                </Badge>
              </div>
              <div className="border-t border-zinc-700 pt-3 flex justify-between">
                <span className="text-zinc-400">Total</span>
                <span className="text-2xl font-bold text-amber-400">
                  {formatCurrency(selectedInvoice.amount)}
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setSelectedInvoice(null)}
            >
              Cerrar
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
