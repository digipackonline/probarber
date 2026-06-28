import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, Wrench, Zap, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface VersionUpdate {
  id: string;
  version: string;
  release_date: string;
  title: string;
  description: string;
  features: string[];
  bug_fixes: string[];
  improvements: string[];
  is_major: boolean;
}

export default function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [update, setUpdate] = useState<VersionUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkNewVersion();
  }, []);

  async function checkNewVersion() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current version from app_settings
      const { data: settingData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'app_version')
        .single();

      const currentVersion = settingData ? JSON.parse(settingData.value) : '2.0.0';

      // Check if user has seen this version
      const { data: seenData } = await supabase
        .from('user_seen_updates')
        .select('id')
        .eq('user_id', user.id)
        .eq('version', currentVersion)
        .single();

      if (!seenData) {
        // User hasn't seen this version - fetch the update details
        const { data: updateData } = await supabase
          .from('version_updates')
          .select('*')
          .eq('version', currentVersion)
          .single();

        if (updateData) {
          setUpdate(updateData);
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.error('Error checking version:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClose() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && update) {
      // Mark as seen
      await supabase
        .from('user_seen_updates')
        .insert({
          user_id: user.id,
          version: update.version
        }, { onConflict: 'user_id,version' });
    }

    setIsOpen(false);
  }

  if (!isOpen || !update) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-[201]">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden h-full md:h-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-6 pb-4">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">
                  {update.is_major ? 'Actualización Mayor' : 'Novedades'}
                </p>
                <h2 className="text-xl font-bold text-white">{update.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span className="px-2 py-0.5 bg-zinc-800 rounded font-mono">v{update.version}</span>
              <span>{formatDate(update.release_date)}</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 pt-2 space-y-5">
            <p className="text-zinc-300">{update.description}</p>

            {/* Features */}
            {update.features.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-green-400" />
                  <h3 className="font-semibold text-white">Nuevas funcionalidades</h3>
                </div>
                <ul className="space-y-1.5">
                  {update.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-zinc-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {update.improvements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Mejoras</h3>
                </div>
                <ul className="space-y-1.5">
                  {update.improvements.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-zinc-300 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bug Fixes */}
            {update.bug_fixes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-white">Correcciones</h3>
                </div>
                <ul className="space-y-1.5">
                  {update.bug_fixes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-zinc-300 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="pt-3 border-t border-zinc-800">
              <button
                onClick={() => {
                  handleClose();
                  navigate('/help');
                }}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition-colors text-left"
              >
                <span className="text-zinc-300 text-sm">Ver más detalles en el Centro de Ayuda</span>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
