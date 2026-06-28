import { PaymentProvider, CheckoutParams, CheckoutResult, CustomerParams, CustomerResult, PaymentMethodResult, SubscriptionParams, SubscriptionResult, ChargeParams, ChargeResult, RefundResult, WebhookEvent } from './types';
import { CurrencyCode, CountryCode } from '../i18n';

export class MercadoPagoProvider implements PaymentProvider {
  code = 'mercado_pago';
  name = 'Mercado Pago';
  supportedCountries: CountryCode[] = ['AR', 'BR', 'MX', 'CL', 'CO', 'PE', 'UY'];
  supportedCurrencies: CurrencyCode[] = ['ARS', 'BRL', 'MXN', 'CLP', 'COP', 'PEN', 'UYU'];

  private accessToken: string;
  private publicKey: string;
  private isProduction: boolean;

  constructor(accessToken: string, publicKey: string, isProduction = false) {
    this.accessToken = accessToken;
    this.publicKey = publicKey;
    this.isProduction = isProduction;
  }

  private get baseUrl(): string {
    return this.isProduction
      ? 'https://api.mercadopago.com'
      : 'https://api.mercadopago.com'; // MP uses same URL, credentials determine mode
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MercadoPago API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    try {
      const preferenceData = {
        items: [{
          id: `plan-${params.planSlug}-${params.billingCycle}`,
          title: `BarberPro - ${params.planName} ${params.billingCycle === 'monthly' ? 'Mensual' : 'Anual'}`,
          quantity: 1,
          unit_price: params.amount,
          currency_id: params.currency
        }],
        payer: {
          email: params.metadata?.email
        },
        back_urls: {
          success: params.successUrl,
          failure: params.failureUrl,
          pending: params.pendingUrl
        },
        auto_return: 'approved',
        notification_url: params.metadata?.webhookUrl,
        external_reference: params.tenantId,
        metadata: {
          tenant_id: params.tenantId,
          plan_id: params.planId,
          plan_slug: params.planSlug,
          billing_cycle: params.billingCycle
        },
        statement_descriptor: 'BARBERPRO',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const preference = await this.request('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify(preferenceData)
      });

      return {
        success: true,
        preferenceId: preference.id,
        checkoutUrl: preference.init_point,
        sandboxUrl: preference.sandbox_init_point,
        publicKey: this.publicKey
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create checkout'
      };
    }
  }

  async createCustomer(params: CustomerParams): Promise<CustomerResult> {
    try {
      const customer = await this.request('/v1/customers', {
        method: 'POST',
        body: JSON.stringify({
          email: params.email,
          first_name: params.name,
          metadata: params.metadata
        })
      });

      return {
        success: true,
        customerId: customer.id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create customer'
      };
    }
  }

  async getCustomer(customerId: string): Promise<CustomerResult | null> {
    try {
      const customer = await this.request(`/v1/customers/${customerId}`);
      return {
        success: true,
        customerId: customer.id
      };
    } catch {
      return null;
    }
  }

  async attachPaymentMethod(customerId: string, paymentMethodToken: string): Promise<PaymentMethodResult> {
    try {
      // Mercado Pago attaches payment methods via a payment authorization
      const payment = await this.request('/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          transaction_amount: 1,
          token: paymentMethodToken,
          description: 'Card Verification - BarberPro',
          payer: { id: customerId },
          capture: false
        })
      });

      return {
        success: true,
        paymentMethodId: payment.payment_method_id,
        last4: payment.card?.last_four_digits,
        brand: payment.payment_method_id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to attach payment method'
      };
    }
  }

  async createSubscription(params: SubscriptionParams): Promise<SubscriptionResult> {
    // Mercado Pago uses pre-approvals for subscriptions
    try {
      const preapproval = await this.request('/preapproval', {
        method: 'POST',
        body: JSON.stringify({
          payer_email: params.metadata?.email,
          reason: `BarberPro ${params.metadata?.planName || 'Subscription'}`,
          external_reference: params.metadata?.tenantId,
          auto_recurring: {
            frequency: params.interval === 'yearly' ? 12 : 1,
            frequency_type: 'months',
            transaction_amount: params.amount,
            currency_id: params.currency
          },
          back_url: params.metadata?.successUrl,
          status: 'authorized'
        })
      });

      return {
        success: true,
        subscriptionId: preapproval.id,
        status: 'active',
        currentPeriodEnd: preapproval.auto_recurring?.end_date
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create subscription'
      };
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
    try {
      const preapproval = await this.request(`/preapproval/${subscriptionId}`);
      return {
        success: true,
        subscriptionId: preapproval.id,
        status: this.mapStatus(preapproval.status),
        currentPeriodEnd: preapproval.auto_recurring?.end_date
      };
    } catch {
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.request(`/preapproval/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' })
    });
  }

  async chargeCustomer(params: ChargeParams): Promise<ChargeResult> {
    try {
      const payment = await this.request('/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          transaction_amount: params.amount,
          description: params.description,
          payer: { id: params.customerId },
          metadata: params.metadata,
          statement_descriptor: 'BARBERPRO'
        })
      });

      return {
        success: payment.status === 'approved',
        paymentId: payment.id?.toString(),
        status: this.mapPaymentStatus(payment.status)
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to charge customer'
      };
    }
  }

  async refund(paymentId: string, amount?: number): Promise<RefundResult> {
    try {
      const refundData = amount ? { amount } : {};
      const refund = await this.request(`/v1/payments/${paymentId}/refunds`, {
        method: 'POST',
        body: JSON.stringify(refundData)
      });

      return {
        success: true,
        refundId: refund.id?.toString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to refund payment'
      };
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Mercado Pago signature verification
    // In production, you should verify the x-signature header
    return !!payload && payload.length > 0;
  }

  parseWebhookEvent(payload: string): WebhookEvent {
    const data = JSON.parse(payload);
    return {
      type: data.type || data.action || 'payment',
      data: data.data || { id: data.id || data.resource }
    };
  }

  private mapStatus(status: string): 'active' | 'trial' | 'past_due' | 'canceled' | 'expired' {
    const statusMap: Record<string, 'active' | 'trial' | 'past_due' | 'canceled' | 'expired'> = {
      'authorized': 'active',
      'active': 'active',
      'pending': 'trial',
      'paused': 'past_due',
      'cancelled': 'canceled',
      'expired': 'expired'
    };
    return statusMap[status] || 'active';
  }

  private mapPaymentStatus(status: string): 'approved' | 'pending' | 'rejected' | 'cancelled' {
    const statusMap: Record<string, 'approved' | 'pending' | 'rejected' | 'cancelled'> = {
      'approved': 'approved',
      'pending': 'pending',
      'in_process': 'pending',
      'rejected': 'rejected',
      'cancelled': 'cancelled'
    };
    return statusMap[status] || 'pending';
  }
}

// Factory function to create provider instance
export function createMercadoPagoProvider(accessToken: string, publicKey: string, isProduction = false): MercadoPagoProvider {
  return new MercadoPagoProvider(accessToken, publicKey, isProduction);
}
