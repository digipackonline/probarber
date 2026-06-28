import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  max_branches: number;
  max_barbers: number;
  max_services: number;
  max_clients: number;
  features: string[];
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  email: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
  onboarding_step: number;
  trial_ends_at: string | null;
}

interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';
  billing_cycle: 'monthly' | 'yearly';
  trial_ends_at: string | null;
  current_period_end: string | null;
  plans: Plan | null;
}

interface TenantContextType {
  tenant: Tenant | null;
  subscription: Subscription | null;
  plan: Plan | null;
  loading: boolean;
  isOnTrial: boolean;
  trialDaysLeft: number;
  hasAccess: (feature: string) => boolean;
  checkLimit: (type: 'branches' | 'barbers' | 'services' | 'clients', current: number) => boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTenant = useCallback(async () => {
    if (!user) {
      setTenant(null);
      setSubscription(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get tenant user membership
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id, tenants(*)')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .single();

      if (tenantUser?.tenants) {
        const t = tenantUser.tenants as Tenant;
        setTenant(t);

        // Get subscription with plan
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*, plans(*)')
          .eq('tenant_id', t.id)
          .single();

        if (sub) {
          setSubscription(sub as Subscription);
          setPlan(sub.plans as Plan);
        }
      }
    } catch (err) {
      console.error('Error loading tenant:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  const isOnTrial = subscription?.status === 'trial' && !!subscription?.trial_ends_at;
  const trialDaysLeft = isOnTrial
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const hasAccess = useCallback((feature: string): boolean => {
    if (!plan) return false;

    // Premium has all features
    if (plan.slug === 'premium') return true;

    // Feature mapping
    const proFeatures = ['whatsapp', 'reports_advanced', 'loyalty', 'marketing', 'priority_support'];
    const freeFeatures = ['dashboard', 'agenda', 'clients', 'booking', 'email_support'];

    if (plan.slug === 'pro') {
      return proFeatures.includes(feature) || freeFeatures.includes(feature);
    }

    return freeFeatures.includes(feature);
  }, [plan]);

  const checkLimit = useCallback((type: 'branches' | 'barbers' | 'services' | 'clients', current: number): boolean => {
    if (!plan) return false;

    const limitKey = `max_${type}` as keyof Plan;
    const limit = plan[limitKey] as number;

    // -1 means unlimited
    if (limit === -1) return true;

    return current < limit;
  }, [plan]);

  const value: TenantContextType = {
    tenant,
    subscription,
    plan,
    loading,
    isOnTrial,
    trialDaysLeft,
    hasAccess,
    checkLimit,
    refreshTenant: loadTenant
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return ctx;
}
