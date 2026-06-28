import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'barberpro_beta_dismissed';

export default function BetaBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkBetaMode();
  }, []);

  async function checkBetaMode() {
    try {
      // Check localStorage first
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const dismissedDate = new Date(dismissedAt);
        const now = new Date();
        // Show again after 24 hours
        if (now.getTime() - dismissedDate.getTime() < 24 * 60 * 60 * 1000) {
          setDismissed(true);
          return;
        }
      }

      // Check if beta mode is enabled
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'beta_mode')
        .single();

      if (data) {
        const isBeta = data.value === 'true' || data.value === true;
        setShow(isBeta && !dismissed);
      }
    } catch (err) {
      console.error('Error checking beta mode:', err);
    }
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setDismissed(true);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[150] bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-zinc-900 text-sm font-medium relative">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>
          Estás utilizando <strong>BarberPro Beta</strong>. Algunas funciones pueden cambiar.
        </span>
        <a
          href="mailto:feedback@barberpro.app"
          className="inline-flex items-center gap-1 underline hover:no-underline"
        >
          Tu feedback nos ayuda a mejorar
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={handleDismiss}
          className="absolute right-0 p-1 text-zinc-900/70 hover:text-zinc-900 transition-colors"
          aria-label="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
