import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface CheckoutResult {
  success: boolean;
  preference_id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  public_key?: string;
  error?: string;
}

export interface PaymentStatus {
  status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'in_process';
  payment_id?: string;
  transaction_amount?: number;
}

/**
 * Create a checkout preference for one-time payment
 */
export async function createCheckout(
  tenantId: string,
  planSlug: string,
  billingCycle: 'monthly' | 'yearly',
  options?: {
    successUrl?: string;
    failureUrl?: string;
    pendingUrl?: string;
  }
): Promise<CheckoutResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        plan_slug: planSlug,
        billing_cycle: billingCycle,
        success_url: options?.successUrl,
        failure_url: options?.failureUrl,
        pending_url: options?.pendingUrl
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout');
    }

    const data = await response.json();
    return {
      success: true,
      preference_id: data.preference_id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      public_key: data.public_key
    };
  } catch (error: any) {
    console.error('Checkout error:', error);
    return {
      success: false,
      error: error.message || 'Error al crear checkout'
    };
  }
}

/**
 * Create a recurring subscription with saved card
 */
export async function createSubscription(
  tenantId: string,
  planId: string,
  billingCycle: 'monthly' | 'yearly',
  cardToken?: string
): Promise<{ success: boolean; customer_id?: string; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-subscription?action=create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        plan_id: planId,
        billing_cycle: billingCycle,
        card_token: cardToken
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create subscription');
    }

    const data = await response.json();
    return {
      success: true,
      customer_id: data.customer_id
    };
  } catch (error: any) {
    console.error('Subscription error:', error);
    return {
      success: false,
      error: error.message || 'Error al crear suscripción'
    };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-subscription?action=cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id: tenantId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel subscription');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Cancel error:', error);
    return {
      success: false,
      error: error.message || 'Error al cancelar suscripción'
    };
  }
}

/**
 * Manual retry payment charge
 */
export async function retryPayment(tenantId: string): Promise<{ success: boolean; payment_id?: string; status?: string; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-subscription?action=charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id: tenantId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to retry payment');
    }

    const data = await response.json();
    return {
      success: true,
      payment_id: data.payment_id,
      status: data.status
    };
  } catch (error: any) {
    console.error('Retry error:', error);
    return {
      success: false,
      error: error.message || 'Error al reintentar pago'
    };
  }
}

/**
 * Get payment transactions for tenant
 */
export async function getPaymentTransactions(tenantId: string, limit = 10) {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get invoices for tenant
 */
export async function getInvoices(tenantId: string, limit = 12) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, tenants(name, email)')
    .eq('id', invoiceId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  });
}

/**
 * Get status label in Spanish
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    approved: 'Aprobado',
    pending: 'Pendiente',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
    in_process: 'En proceso',
    refunded: 'Reembolsado',
    charged_back: 'Contracargo'
  };
  return labels[status] || status;
}

/**
 * Get status color
 */
export function getStatusColor(status: string): 'success' | 'warning' | 'danger' | 'default' {
  const colors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    approved: 'success',
    pending: 'warning',
    in_process: 'warning',
    rejected: 'danger',
    cancelled: 'danger',
    refunded: 'default',
    charged_back: 'danger',
    paid: 'success',
    void: 'default'
  };
  return colors[status] || 'default';
}
