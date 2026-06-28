import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface AppConfig {
  brandName: string;
  brandTagline: string;
  brandLogo: string;
  brandFavicon: string;
  brandPrimaryColor: string;
  supportEmail: string;
  supportWhatsapp: string;
  socialFacebook: string | null;
  socialInstagram: string | null;
  socialTiktok: string | null;
  defaultCurrency: string;
  defaultLanguage: string;
  defaultCountry: string;
  trialDays: number;
  maxRetries: number;
  cronEnabled: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  brandName: 'BarberPro',
  brandTagline: 'Gestión Premium de Barberías',
  brandLogo: '/logo.svg',
  brandFavicon: '/favicon.svg',
  brandPrimaryColor: '#d4af37',
  supportEmail: 'soporte@barberpro.app',
  supportWhatsapp: '+5491112345678',
  socialFacebook: 'https://facebook.com/barberpro',
  socialInstagram: 'https://instagram.com/barberpro',
  socialTiktok: 'https://tiktok.com/@barberpro',
  defaultCurrency: 'ARS',
  defaultLanguage: 'es',
  defaultCountry: 'AR',
  trialDays: 14,
  maxRetries: 3,
  cronEnabled: true
};

// Cache
let configCache: AppConfig | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load app configuration from database with caching
 */
export async function loadAppConfig(): Promise<AppConfig> {
  const now = Date.now();

  if (configCache && now < cacheExpiry) {
    return configCache;
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value');

    if (error) throw error;

    const config = { ...DEFAULT_CONFIG };

    for (const row of data || []) {
      const key = row.key as keyof AppConfig;
      const value = row.value;

      if (key in config) {
        // Parse JSON values
        if (typeof value === 'object' && value !== null) {
          (config as any)[key] = value;
        } else if (typeof value === 'string') {
          // Handle string values (may be JSON strings)
          try {
            const parsed = JSON.parse(value);
            (config as any)[key] = parsed;
          } catch {
            (config as any)[key] = value;
          }
        } else {
          (config as any)[key] = value;
        }
      }
    }

    configCache = config;
    cacheExpiry = now + CACHE_TTL;

    return config;
  } catch (error) {
    console.error('Error loading app config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Get a single config value
 */
export async function getConfigValue<K extends keyof AppConfig>(key: K): Promise<AppConfig[K]> {
  const config = await loadAppConfig();
  return config[key];
}

/**
 * Update a config value (admin only)
 */
export async function setConfigValue<K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    // Invalidate cache
    configCache = null;
    cacheExpiry = 0;

    return true;
  } catch (error) {
    console.error('Error setting config value:', error);
    return false;
  }
}

/**
 * Invalidate the config cache
 */
export function invalidateConfigCache(): void {
  configCache = null;
  cacheExpiry = 0;
}

/**
 * React hook for app config
 */
export function useAppConfig(): {
  config: AppConfig;
  loading: boolean;
  refresh: () => void;
} {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    loadAppConfig()
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { config, loading, refresh };
}

/**
 * Get branding config for white-labeling
 */
export function useBranding() {
  const { config } = useAppConfig();
  return {
    name: config.brandName,
    tagline: config.brandTagline,
    logo: config.brandLogo,
    favicon: config.brandFavicon,
    primaryColor: config.brandPrimaryColor,
    social: {
      facebook: config.socialFacebook,
      instagram: config.socialInstagram,
      tiktok: config.socialTiktok
    },
    contact: {
      email: config.supportEmail,
      whatsapp: config.supportWhatsapp
    }
  };
}

/**
 * Apply branding to document
 */
export function applyBranding(config: AppConfig): void {
  // Update document title
  document.title = `${config.brandName} - ${config.brandTagline}`;

  // Update meta theme color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', config.brandPrimaryColor);
  }

  // Update favicon
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon && config.brandFavicon) {
    favicon.setAttribute('href', config.brandFavicon);
  }

  // Update CSS variables
  document.documentElement.style.setProperty('--color-primary', config.brandPrimaryColor);
}

/**
 * React hook that applies branding on mount
 */
export function useApplyBranding(): void {
  const { config, loading } = useAppConfig();

  useEffect(() => {
    if (!loading) {
      applyBranding(config);
    }
  }, [config, loading]);
}
