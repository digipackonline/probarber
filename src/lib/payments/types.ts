import { CurrencyCode, CountryCode } from '../i18n';

// Payment Provider Interface
export interface PaymentProvider {
  code: string;
  name: string;
  supportedCountries: CountryCode[];
  supportedCurrencies: CurrencyCode[];

  // Checkout
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;

  // Customer management
  createCustomer(params: CustomerParams): Promise<CustomerResult>;
  getCustomer(customerId: string): Promise<CustomerResult | null>;

  // Payment methods
  attachPaymentMethod(customerId: string, paymentMethodToken: string): Promise<PaymentMethodResult>;

  // Subscriptions
  createSubscription(params: SubscriptionParams): Promise<SubscriptionResult>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResult | null>;
  cancelSubscription(subscriptionId: string): Promise<void>;

  // Charges
  chargeCustomer(params: ChargeParams): Promise<ChargeResult>;

  // Refunds
  refund(paymentId: string, amount?: number): Promise<RefundResult>;

  // Webhooks
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: string): WebhookEvent;
}

export interface CheckoutParams {
  tenantId: string;
  planId: string;
  planSlug: string;
  planName: string;
  amount: number;
  currency: CurrencyCode;
  billingCycle: 'monthly' | 'yearly';
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  success: boolean;
  preferenceId?: string;
  checkoutUrl?: string;
  sandboxUrl?: string;
  publicKey?: string;
  error?: string;
}

export interface CustomerParams {
  email: string;
  name: string;
  country: CountryCode;
  metadata?: Record<string, string>;
}

export interface CustomerResult {
  success: boolean;
  customerId?: string;
  error?: string;
}

export interface PaymentMethodResult {
  success: boolean;
  paymentMethodId?: string;
  last4?: string;
  brand?: string;
  error?: string;
}

export interface SubscriptionParams {
  customerId: string;
  amount: number;
  currency: CurrencyCode;
  interval: 'monthly' | 'yearly';
  planId: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  status?: 'active' | 'trial' | 'past_due' | 'canceled' | 'expired';
  currentPeriodEnd?: string;
  error?: string;
}

export interface ChargeParams {
  customerId: string;
  amount: number;
  currency: CurrencyCode;
  description: string;
  metadata?: Record<string, string>;
}

export interface ChargeResult {
  success: boolean;
  paymentId?: string;
  status?: 'approved' | 'pending' | 'rejected' | 'cancelled';
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface WebhookEvent {
  type: string;
  data: {
    id: string;
    [key: string]: any;
  };
}

// Provider status for display
export interface ProviderStatus {
  code: string;
  name: string;
  isAvailable: boolean;
  isConfigured: boolean;
  supportedCountries: CountryCode[];
}
