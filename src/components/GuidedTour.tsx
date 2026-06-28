import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { X, ChevronLeft, ChevronRight, SkipForward, Target } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface TourStep {
  id: string;
  title: string;
  content: string;
  path: string;
  spotlight?: string; // CSS selector for spotlight element
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'dashboard',
    title: 'Bienvenido al Dashboard',
    content: 'Aquí verás un resumen de la actividad de tu barbería: turnos del día, ingresos recientes y métricas importantes.',
    path: '/dashboard',
    spotlight: '[href="/dashboard"]',
    position: 'right'
  },
  {
    id: 'agenda',
    title: 'Agenda de turnos',
    content: 'Gestiona todas las citas de tus clientes. Puedes crear, modificar y cancelar turnos. También ver la disponibilidad de cada barbero.',
    path: '/agenda',
    spotlight: '[href="/agenda"]',
    position: 'right'
  },
  {
    id: 'clients',
    title: 'Base de clientes',
    content: 'Lleva un registro de todos tus clientes, su historial de citas, preferencias y datos de contacto.',
    path: '/clients',
    spotlight: '[href="/clients"]',
    position: 'right'
  },
  {
    id: 'services',
    title: 'Servicios',
    content: 'Define los servicios que ofreces: cortes, barbas, tratamientos. Cada servicio tiene precio, duración y categoría.',
    path: '/services',
    spotlight: '[href="/services"]',
    position: 'right'
  },
  {
    id: 'payments',
    title: 'Control de pagos',
    content: 'Registra los pagos de tus clientes, lleva el control de caja y genera reportes financieros.',
    path: '/payments',
    spotlight: '[href="/payments"]',
    position: 'right'
  },
  {
    id: 'profile',
    title: 'Tu configuración',
    content: 'Personaliza tu cuenta, horarios, notificaciones y más. También puedes encontrar ayuda aquí.',
    path: '/profile',
    spotlight: '[href="/profile"]',
    position: 'right'
  }
];

interface GuidedTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function GuidedTour({ onComplete, onSkip }: GuidedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const currentStep = TOUR_STEPS[currentStepIndex];
  const canGoBack = currentStepIndex > 0;
  const canGoNext = currentStepIndex < TOUR_STEPS.length - 1;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Update spotlight position
  useEffect(() => {
    if (!currentStep.spotlight) {
      setSpotlightRect(null);
      return;
    }

    const updateSpotlight = () => {
      const element = document.querySelector(currentStep.spotlight!);
      if (element) {
        setSpotlightRect(element.getBoundingClientRect());
      } else {
        setSpotlightRect(null);
      }
    };

    // Initial update
    updateSpotlight();

    // Update on resize
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [currentStep.spotlight, location.pathname]);

  // Navigate to step path
  useEffect(() => {
    if (currentStep.path && location.pathname !== currentStep.path) {
      navigate(currentStep.path, { replace: true });
    }
  }, [currentStep.path, location.pathname, navigate]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [isLastStep]);

  const handleBack = useCallback(() => {
    if (canGoBack) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [canGoBack]);

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          tour_completed: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      await supabase.rpc('log_activity', {
        p_tenant_id: null,
        p_user_id: user.id,
        p_action: 'tour.complete',
        p_details: { steps: TOUR_STEPS.map(s => s.id) }
      });
    }

    setIsVisible(false);
    onComplete();
  };

  const handleSkip = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          tour_skipped: true,
          tour_completed: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      await supabase.rpc('log_activity', {
        p_tenant_id: null,
        p_user_id: user.id,
        p_action: 'tour.skip',
        p_details: { current_step: currentStep.id }
      });
    }

    setIsVisible(false);
    onSkip();
  };

  if (!isVisible) return null;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!spotlightRect) {
      // Center of screen if no spotlight
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const padding = 16;
    const tooltipWidth = 320;

    switch (currentStep.position) {
      case 'right':
        return {
          position: 'fixed',
          top: spotlightRect.top,
          left: spotlightRect.right + padding,
          maxWidth: tooltipWidth
        };
      case 'left':
        return {
          position: 'fixed',
          top: spotlightRect.top,
          right: (window.innerWidth - spotlightRect.left) + padding,
          maxWidth: tooltipWidth
        };
      case 'bottom':
        return {
          position: 'fixed',
          top: spotlightRect.bottom + padding,
          left: Math.max(padding, spotlightRect.left),
          maxWidth: tooltipWidth
        };
      case 'top':
      default:
        return {
          position: 'fixed',
          bottom: (window.innerHeight - spotlightRect.top) + padding,
          left: Math.max(padding, spotlightRect.left),
          maxWidth: tooltipWidth
        };
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />

      {/* Spotlight cutout */}
      {spotlightRect && (
        <div
          className="fixed z-[101] pointer-events-none"
          style={{
            top: spotlightRect.top - 4,
            left: spotlightRect.left - 4,
            width: spotlightRect.width + 8,
            height: spotlightRect.height + 8,
            borderRadius: 12,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            border: '2px solid rgba(251, 191, 36, 0.5)'
          }}
        />
      )}

      {/* Highlight element if exists */}
      {currentStep.spotlight && (
        <style>{`
          ${currentStep.spotlight} {
            position: relative;
            z-index: 102 !important;
          }
        `}</style>
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[103] animate-in fade-in duration-200"
        style={getTooltipStyle()}
      >
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Paso {currentStepIndex + 1} de {TOUR_STEPS.length}</p>
                <h3 className="text-white font-semibold">{currentStep.title}</h3>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Cerrar tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-3">
            <p className="text-zinc-300 text-sm">{currentStep.content}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={handleSkip}
              className="flex items-center gap-1 text-zinc-400 hover:text-white text-sm transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Omitir todo
            </button>

            <div className="flex items-center gap-2">
              {canGoBack && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 px-3 py-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 bg-amber-500 text-zinc-900 font-medium rounded-lg hover:bg-amber-400 transition-colors text-sm"
              >
                {isLastStep ? 'Finalizar' : 'Siguiente'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook to check if user needs tour
export function useTourStatus() {
  const [needsTour, setNeedsTour] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTourStatus();
  }, []);

  async function checkTourStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNeedsTour(false);
        return;
      }

      const { data } = await supabase
        .from('user_onboarding')
        .select('tour_completed, tour_skipped')
        .eq('user_id', user.id)
        .single();

      if (!data) {
        setNeedsTour(true);
      } else {
        setNeedsTour(!data.tour_completed && !data.tour_skipped);
      }
    } catch (err) {
      console.error('Error checking tour status:', err);
      setNeedsTour(false);
    } finally {
      setLoading(false);
    }
  }

  return { needsTour, loading, setNeedsTour };
}
