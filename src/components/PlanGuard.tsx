import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { Crown, AlertCircle, ArrowRight } from 'lucide-react';
import { LoadingScreen } from './ui';

interface PlanGuardProps {
  feature?: string;
  limit?: { type: 'branches' | 'barbers' | 'services' | 'clients'; current: number };
  requirePlan?: string[];
  children: React.ReactNode;
}

export function PlanGuard({ feature, limit, requirePlan, children }: PlanGuardProps) {
  const { tenant, plan, loading, hasAccess, checkLimit, isOnTrial, trialDaysLeft } = useTenant();

  if (loading) {
    return <LoadingScreen />;
  }

  // Check if onboarding is complete
  if (tenant && !tenant.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  // Check trial expiration
  if (isOnTrial && trialDaysLeft <= 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Período de prueba finalizado</h1>
          <p className="text-zinc-400 mb-6">
            Tu período de prueba de 14 días ha terminado. Actualiza tu plan para continuar usando BarberPro.
          </p>
          <a
            href="/subscription"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-6 py-3 rounded-xl transition-all"
          >
            Ver Planes
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // Check if subscription is active (not for trial users - they have full access)
  if (tenant && !isOnTrial && subscription?.status === 'expired') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Suscripción Expirada</h1>
          <p className="text-zinc-400 mb-6">
            Tu suscripción ha expirado. Actualiza tu plan para recuperar acceso a todas las funciones.
          </p>
          <a
            href="/subscription"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-6 py-3 rounded-xl transition-all"
          >
            Renovar Suscripción
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // Check plan requirement
  if (requirePlan && plan && !requirePlan.includes(plan.slug)) {
    return <UpgradePrompt message="Esta función requiere un plan superior." />;
  }

  // Check feature access
  if (feature && !hasAccess(feature)) {
    return <UpgradePrompt message={`El plan ${plan?.name || 'actual'} no incluye esta función.`} />;
  }

  // Check limit
  if (limit && !checkLimit(limit.type, limit.current)) {
    return <UpgradePrompt message={`Has alcanzado el límite de ${limit.type} de tu plan.`} />;
  }

  return <>{children}</>;
}

function UpgradePrompt({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <Crown className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Actualiza tu Plan</h1>
        <p className="text-zinc-400 mb-6">{message}</p>
        <a
          href="/subscription"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Ver Planes
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

// Hook to check if action is allowed
export function usePlanLimit(type: 'branches' | 'barbers' | 'services' | 'clients', current: number) {
  const { checkLimit, plan } = useTenant();

  if (!plan) return { allowed: false, limit: 0 };

  const limit = plan[`max_${type}` as keyof typeof plan] as number;
  const allowed = checkLimit(type, current);

  return { allowed, limit: limit === -1 ? Infinity : limit };
}
