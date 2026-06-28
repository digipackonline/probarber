import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Circle, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  link?: string;
  checkAction: () => Promise<boolean>;
}

interface OnboardingProgressProps {
  tenantId: string;
  onComplete?: () => void;
}

export function useOnboardingProgress(tenantId: string | null) {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      checkSteps(tenantId);
    }
  }, [tenantId]);

  async function checkSteps(tid: string) {
    setLoading(true);

    const definedSteps: OnboardingStep[] = [
      {
        id: 'profile',
        label: 'Completar datos',
        description: 'Agrega el nombre y logo de tu barbería',
        link: '/onboarding',
        checkAction: async () => {
          const { data } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', tid)
            .single();
          return !!data?.name && data.name !== 'Mi Barbería';
        }
      },
      {
        id: 'service',
        label: 'Crear primer servicio',
        description: 'Agrega los servicios que ofreces',
        link: '/services',
        checkAction: async () => {
          const { count } = await supabase
            .from('services')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tid);
          return (count || 0) > 0;
        }
      },
      {
        id: 'barber',
        label: 'Crear primer barbero',
        description: 'Incorpora profesionales a tu equipo',
        link: '/barbers',
        checkAction: async () => {
          const { count } = await supabase
            .from('barbers')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tid);
          return (count || 0) > 0;
        }
      },
      {
        id: 'branch',
        label: 'Crear primera sucursal',
        description: 'Configura la ubicación de tu negocio',
        link: '/branches',
        checkAction: async () => {
          const { count } = await supabase
            .from('branches')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tid);
          return (count || 0) > 0;
        }
      },
      {
        id: 'client',
        label: 'Registrar primer cliente',
        description: 'Agrega un cliente a tu base',
        link: '/clients',
        checkAction: async () => {
          const { count } = await supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tid);
          return (count || 0) > 0;
        }
      },
      {
        id: 'appointment',
        label: 'Crear primer turno',
        description: 'Agenda una cita de prueba',
        link: '/agenda',
        checkAction: async () => {
          const { count } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tid);
          return (count || 0) > 0;
        }
      },
      {
        id: 'settings',
        label: 'Completar perfil',
        description: 'Configura horarios y preferencias',
        link: '/profile',
        checkAction: async () => {
          const { data } = await supabase
            .from('tenants')
            .select('settings')
            .eq('id', tid)
            .single();
          const settings = data?.settings as any;
          return !!settings?.opening_time && !!settings?.closing_time;
        }
      }
    ];

    const results = await Promise.all(
      definedSteps.map(async (step) => {
        const completed = await step.checkAction();
        return { step, completed };
      })
    );

    setSteps(definedSteps);
    setCompletedSteps(new Set(results.filter(r => r.completed).map(r => r.step.id)));
    setLoading(false);

    // Save to user_onboarding
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const completedIds = results.filter(r => r.completed).map(r => r.step.id);
      await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          tenant_id: tid,
          steps_completed: completedIds,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    }
  }

  const progress = steps.length > 0
    ? Math.round((completedSteps.size / steps.length) * 100)
    : 0;

  const isComplete = completedSteps.size === steps.length;

  return {
    steps,
    completedSteps,
    loading,
    progress,
    isComplete,
    refresh: () => tenantId && checkSteps(tenantId)
  };
}

export default function OnboardingProgressWidget({ tenantId, onComplete }: OnboardingProgressProps) {
  const { steps, completedSteps, loading, progress, isComplete } = useOnboardingProgress(tenantId);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">¡Configuración completada!</h3>
            <p className="text-green-400/70 text-sm">Tu barbería está lista para recibir clientes.</p>
          </div>
        </div>
        {onComplete && (
          <button
            onClick={onComplete}
            className="mt-4 w-full py-2 bg-green-500 text-zinc-900 font-medium rounded-lg hover:bg-green-400 transition-colors"
          >
            Empezar a usar BarberPro
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Configuración inicial</h3>
          <span className="text-amber-400 text-sm font-medium">{progress}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="p-3">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = !isCompleted && steps.slice(0, index).every(s => completedSteps.has(s.id));

          return (
            <button
              key={step.id}
              onClick={() => step.link && navigate(step.link)}
              disabled={isCompleted}
              className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all ${
                isCompleted
                  ? 'opacity-60 cursor-default'
                  : isCurrent
                    ? 'bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/15'
                    : 'hover:bg-zinc-800/50 cursor-pointer'
              }`}
            >
              <div className="mt-0.5">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-600" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={`text-sm font-medium ${isCompleted ? 'text-zinc-400 line-through' : 'text-white'}`}>
                  {step.label}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">{step.description}</p>
              </div>
              {!isCompleted && step.link && (
                <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
