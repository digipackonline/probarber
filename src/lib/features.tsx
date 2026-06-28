import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  defaultEnabled: boolean;
}

export interface TenantFeature {
  featureKey: string;
  enabled: boolean;
}

interface FeatureFlagsContextType {
  flags: Map<string, boolean>;
  isFeatureEnabled: (key: string) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null);

// Cache for default feature flags
let defaultFlags: Map<string, boolean> | null = null;

async function loadDefaultFlags(): Promise<Map<string, boolean>> {
  if (defaultFlags) return defaultFlags;

  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*');

    if (error) throw error;

    defaultFlags = new Map();
    for (const flag of data || []) {
      defaultFlags.set(flag.key, flag.default_enabled);
    }
    return defaultFlags;
  } catch {
    return new Map();
  }
}

async function loadTenantFeatures(tenantId: string): Promise<Map<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from('tenant_features')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    const features = new Map<string, boolean>();
    for (const tf of data || []) {
      features.set(tf.feature_key, tf.enabled);
    }
    return features;
  } catch {
    return new Map();
  }
}

async function loadPlanFeatures(planSlug: string): Promise<Set<string>> {
  // Hardcoded plan feature mapping based on plan slug
  const planFeatures: Record<string, string[]> = {
    'free': ['reports', 'notifications'],
    'pro': ['reports', 'notifications', 'whatsapp', 'marketing', 'loyalty'],
    'premium': ['reports', 'notifications', 'whatsapp', 'marketing', 'loyalty', 'ai_assistant', 'surveys']
  };

  return new Set(planFeatures[planSlug] || []);
}

export function FeatureFlagsProvider({
  children,
  tenantId,
  planSlug
}: {
  children: React.ReactNode;
  tenantId?: string;
  planSlug?: string;
}) {
  const [flags, setFlags] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      // Load defaults
      const defaults = await loadDefaultFlags();

      // Start with defaults
      const combined = new Map(defaults);

      // Override with plan features (based on subscription)
      // Plan features enable certain features regardless of defaults
      if (planSlug) {
        const planFeatures = await loadPlanFeatures(planSlug);
        for (const feature of planFeatures) {
          combined.set(feature, true);
        }
      }

      // Override with tenant-specific settings
      if (tenantId) {
        const tenantFeatures = await loadTenantFeatures(tenantId);
        for (const [key, enabled] of tenantFeatures) {
          combined.set(key, enabled);
        }
      }

      setFlags(combined);
    } catch (error) {
      console.error('Error loading feature flags:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, planSlug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFeatureEnabled = useCallback((key: string): boolean => {
    return flags.get(key) ?? false;
  }, [flags]);

  return (
    <FeatureFlagsContext.Provider value={{ flags, isFeatureEnabled, loading, refresh }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return ctx;
}

export function useFeatureEnabled(key: string): boolean {
  const { isFeatureEnabled } = useFeatureFlags();
  return isFeatureEnabled(key);
}

// Available feature flags
export const FEATURES = {
  AI_ASSISTANT: 'ai_assistant',
  WHATSAPP: 'whatsapp',
  MARKETING: 'marketing',
  LOYALTY: 'loyalty',
  REPORTS: 'reports',
  SURVEYS: 'surveys',
  NOTIFICATIONS: 'notifications'
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];
