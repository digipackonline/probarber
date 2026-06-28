import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lightbulb, Bug, HelpCircle, MessageSquare, Send,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

type FeedbackType = 'suggestion' | 'bug' | 'question' | 'other';

const typeConfig: Record<FeedbackType, { label: string; icon: React.ReactNode; color: string }> = {
  suggestion: {
    label: 'Sugerencia',
    icon: <Lightbulb className="w-5 h-5" />,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  },
  bug: {
    label: 'Reportar problema',
    icon: <Bug className="w-5 h-5" />,
    color: 'text-red-400 bg-red-500/10 border-red-500/20'
  },
  question: {
    label: 'Pregunta',
    icon: <HelpCircle className="w-5 h-5" />,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
  },
  other: {
    label: 'Otro',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
  }
};

export default function FeedbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [type, setType] = useState<FeedbackType>((searchParams.get('type') as FeedbackType) || 'suggestion');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          tenant_id: tenant?.id,
          user_id: user.id,
          type,
          subject,
          message,
          url: window.location.href,
          user_agent: navigator.userAgent,
          metadata: {
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language,
            timestamp: new Date().toISOString()
          }
        });

      if (insertError) throw insertError;

      // Log activity
      await supabase.rpc('log_activity', {
        p_tenant_id: tenant?.id || null,
        p_user_id: user.id,
        p_action: 'feedback.submit',
        p_entity_type: 'feedback',
        p_details: { type, subject }
      });

      setSuccess(true);
      setSubject('');
      setMessage('');

      // Redirect after delay
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Hubo un error al enviar tu feedback. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">¡Gracias por tu feedback!</h2>
          <p className="text-zinc-400 mb-4">Tu comentario nos ayuda a mejorar BarberPro.</p>
          <p className="text-zinc-500 text-sm">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Enviar feedback</h1>
          <p className="text-zinc-400">
            Tu opinión es importante. Ayudanos a mejorar BarberPro.
          </p>
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Type selector */}
          <div className="p-5 border-b border-zinc-800">
            <label className="block text-sm font-medium text-zinc-400 mb-3">Tipo de feedback</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(Object.entries(typeConfig) as [FeedbackType, typeof typeConfig.suggestion][]).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                    type === key
                      ? config.color
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {config.icon}
                  <span className="text-sm font-medium">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="p-5 border-b border-zinc-800">
            <label htmlFor="subject" className="block text-sm font-medium text-zinc-400 mb-2">
              Asunto
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder={type === 'bug' ? 'Describe brevemente el problema...' : 'Título de tu feedback...'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Message */}
          <div className="p-5 border-b border-zinc-800">
            <label htmlFor="message" className="block text-sm font-medium text-zinc-400 mb-2">
              Mensaje
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              placeholder={
                type === 'bug'
                  ? 'Describe lo que paso:\n\n1. Qué estabas intentando hacer\n2. Qué pasos seguiste\n3. Qué resultado obtuviste\n4. Capturas de pantalla (si aplica)'
                  : type === 'suggestion'
                    ? 'Describe tu idea y cómo podría mejorar la experiencia...'
                    : 'Escribe tu pregunta o comentario...'
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="p-5 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-zinc-400 hover:text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !subject.trim() || !message.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-500 text-zinc-900 font-medium rounded-xl hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help link */}
        <p className="text-center text-zinc-500 text-sm mt-6">
          ¿Necesitas ayuda inmediata?{' '}
          <button
            onClick={() => navigate('/help')}
            className="text-amber-400 hover:text-amber-300 font-medium"
          >
            Visita el Centro de Ayuda
          </button>
        </p>
      </div>
    </div>
  );
}
