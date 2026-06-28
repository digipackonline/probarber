import { PaymentProvider, ProviderStatus } from './types';
import { MercadoPagoProvider, createMercadoPagoProvider } from './mercadopago';
import { CurrencyCode, CountryCode } from '../i18n';

// Payment provider registry
const providers = new Map<string, PaymentProvider>();

// Country to recommended provider mapping
const COUNTRY_PROVIDER_MAP: Record<CountryCode, string[]> = {
  'AR': ['mercado_pago', 'paypal'],
  'BR': ['mercado_pago', 'pix', 'paypal'],
  'US': ['stripe', 'paypal'],
  'MX': ['mercado_pago', 'stripe', 'paypal'],
  'CL': ['mercado_pago', 'paypal'],
  'CO': ['mercado_pago', 'paypal'],
  'PE': ['mercado_pago', 'paypal'],
  'UY': ['mercado_pago', 'paypal']
};

/**
 * Initialize payment providers with their configurations
 */
export function initializePaymentProviders(config: {
  mercadoPago?: {
    accessToken: string;
    publicKey: string;
    isProduction?: boolean;
  };
  // Future providers:
  // stripe?: { secretKey: string; publishableKey: string };
  // paypal?: { clientId: string; clientSecret: string };
}): void {
  // Initialize Mercado Pago
  if (config.mercadoPago) {
    const mpProvider = createMercadoPagoProvider(
      config.mercadoPago.accessToken,
      config.mercadoPago.publicKey,
      config.mercadoPago.isProduction
    );
    providers.set('mercado_pago', mpProvider);
  }

  // Future: Initialize Stripe
  // if (config.stripe) {
  //   const stripeProvider = createStripeProvider(config.stripe.secretKey, config.stripe.publishableKey);
  //   providers.set('stripe', stripeProvider);
  // }

  // Future: Initialize PayPal
  // if (config.paypal) {
  //   const paypalProvider = createPayPalProvider(config.paypal.clientId, config.paypal.clientSecret);
  //   providers.set('paypal', paypalProvider);
  // }
}

/**
 * Get a provider by code
 */
export function getProvider(code: string): PaymentProvider | undefined {
  return providers.get(code);
}

/**
 * Get recommended providers for a country
 */
export function getRecommendedProviders(country: CountryCode): string[] {
  return COUNTRY_PROVIDER_MAP[country] || ['mercado_pago'];
}

/**
 * Get the best available provider for a country
 */
export function getBestProvider(country: CountryCode): PaymentProvider | undefined {
  const recommended = getRecommendedProviders(country);

  for (const providerCode of recommended) {
    const provider = providers.get(providerCode);
    if (provider && provider.supportedCountries.includes(country)) {
      return provider;
    }
  }

  return undefined;
}

/**
 * Check if a provider supports a currency
 */
export function providerSupportsCurrency(providerCode: string, currency: CurrencyCode): boolean {
  const provider = providers.get(providerCode);
  return provider?.supportedCurrencies.includes(currency) ?? false;
}

/**
 * Get all available provider statuses
 */
export function getProviderStatuses(): ProviderStatus[] {
  const statuses: ProviderStatus[] = [];

  // Check each known provider
  const knownProviders = [
    { code: 'mercado_pago', name: 'Mercado Pago', countries: ['AR', 'BR', 'MX', 'CL', 'CO', 'PE', 'UY'] as CountryCode[] },
    { code: 'stripe', name: 'Stripe', countries: ['US', 'MX'] as CountryCode[] },
    { code: 'paypal', name: 'PayPal', countries: ['AR', 'BR', 'US', 'MX', 'CL', 'CO', 'PE', 'UY'] as CountryCode[] },
    { code: 'pix', name: 'PIX', countries: ['BR'] as CountryCode[] }
  ];

  for (const provider of knownProviders) {
    const instance = providers.get(provider.code);
    statuses.push({
      code: provider.code,
      name: provider.name,
      isAvailable: !!instance,
      isConfigured: !!instance,
      supportedCountries: instance?.supportedCountries || provider.countries
    });
  }

  return statuses;
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): PaymentProvider[] {
  return Array.from(providers.values());
}

// Re-export types and specific providers
export * from './types';
export { MercadoPagoProvider, createMercadoPagoProvider } from './mercadopago';
