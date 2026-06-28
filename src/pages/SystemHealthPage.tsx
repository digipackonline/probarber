import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, Database,
  CreditCard, Mail, HardDrive, Zap, Info, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ServiceStatus {
  name: string;
  icon: React.ReactNode;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  latency?: number;
  message?: string;
}

export default function SystemHealthPage() {
  const { profile } = useAuth();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    loadHealthStatus();
    loadVersion();
  }, []);

  // Only allow admin access
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Acceso denegado</h2>
          <p className="text-zinc-400">Solo administradores pueden ver esta página.</p>
        </div>
      </div>
    );
  }

  async function loadVersion() {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'app_version')
        .single();

      if (data) {
        setVersion(JSON.parse(data.value));
      }
    } catch (err) {
      console.error('Error loading version:', err);
    }
  }

  async function loadHealthStatus() {
    setLoading(true);

    const serviceStatuses: ServiceStatus[] = [];

    // Check Supabase
    try {
      const start = Date.now();
      const { error } = await supabase.from('tenants').select('id').limit(1);
      const latency = Date.now() - start;

      serviceStatuses.push({
        name: 'Supabase Database',
        icon: <Database className="w-5 h-5" />,
        status: error ? 'down' : 'operational',
        latency,
        message: error ? error.message : undefined
      });
    } catch (err) {
      serviceStatuses.push({
        name: 'Supabase Database',
        icon: <Database className="w-5 h-5" />,
        status: 'down',
        message: 'Connection failed'
      });
    }

    // Check Supabase Storage
    try {
      const start = Date.now();
      const { error } = await supabase.storage.from('images').list('', { limit: 1 });
      const latency = Date.now() - start;

      serviceStatuses.push({
        name: 'Supabase Storage',
        icon: <HardDrive className="w-5 h-5" />,
        status: error ? 'degraded' : 'operational',
        latency,
        message: error ? error.message : undefined
      });
    } catch (err) {
      serviceStatuses.push({
        name: 'Supabase Storage',
        icon: <HardDrive className="w-5 h-5" />,
        status: 'down',
        message: 'Storage unavailable'
      });
    }

    // Check Edge Functions
    try {
      const start = Date.now();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-checkout`, {
        method: 'OPTIONS'
      });
      const latency = Date.now() - start;

      serviceStatuses.push({
        name: 'Edge Functions',
        icon: <Zap className="w-5 h-5" />,
        status: response.ok ? 'operational' : 'degraded',
        latency
      });
    } catch (err) {
      serviceStatuses.push({
        name: 'Edge Functions',
        icon: <Zap className="w-5 h-5" />,
        status: 'unknown',
        message: 'Could not verify status'
      });
    }

    // Check MercadoPago (via env var presence)
    const mpConfigured = import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN;
    serviceStatuses.push({
      name: 'Mercado Pago',
      icon: <CreditCard className="w-5 h-5" />,
      status: mpConfigured ? 'operational' : 'down',
      message: mpConfigured ? undefined : 'Credenciales no configuradas'
    });

    // Check Resend (via edge function or env)
    const resendConfigured = import.meta.env.VITE_RESEND_API_KEY;
    serviceStatuses.push({
      name: 'Resend (Emails)',
      icon: <Mail className="w-5 h-5" />,
      status: resendConfigured ? 'operational' : 'down',
      message: resendConfigured ? undefined : 'API key no configurada'
    });

    setServices(serviceStatuses);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadHealthStatus();
    await loadVersion();
    setRefreshing(false);
  }

  const statusConfig = {
    operational: {
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      label: 'Operativo',
      icon: <CheckCircle2 className="w-5 h-5" />
    },
    degraded: {
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      label: 'Degradado',
      icon: <AlertTriangle className="w-5 h-5" />
    },
    down: {
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      label: 'Caído',
      icon: <XCircle className="w-5 h-5" />
    },
    unknown: {
      color: 'text-zinc-400',
      bg: 'bg-zinc-500/10',
      border: 'border-zinc-500/20',
      label: 'Desconocido',
      icon: <Info className="w-5 h-5" />
    }
  };

  const overallStatus = services.some(s => s.status === 'down')
    ? 'down'
    : services.some(s => s.status === 'degraded')
      ? 'degraded'
      : 'operational';

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Estado del Sistema</h1>
            <p className="text-zinc-400 mt-1">Monitoreo de servicios en tiempo real</p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Version Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg">
          <Info className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-400 text-sm">Versión</span>
          <span className="text-white font-mono font-medium">{version || '2.0.0'}</span>
        </div>

        {/* Overall Status */}
        <div className={`rounded-2xl border p-5 mb-6 ${statusConfig[overallStatus].bg} ${statusConfig[overallStatus].border}`}>
          <div className="flex items-center gap-3">
            <div className={statusConfig[overallStatus].color}>
              {statusConfig[overallStatus].icon}
            </div>
            <div>
              <p className={`font-semibold ${statusConfig[overallStatus].color}`}>
                {overallStatus === 'operational' ? 'Todos los sistemas operativos' :
                 overallStatus === 'degraded' ? 'Algunos sistemas presentan problemas' :
                 'Problemas detectados en el sistema'}
              </p>
              <p className="text-zinc-400 text-sm mt-0.5">
                Última verificación: {new Date().toLocaleTimeString('es-AR')}
              </p>
            </div>
          </div>
        </div>

        {/* Services List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
            {services.map((service, index) => {
              const config = statusConfig[service.status];

              return (
                <div key={index} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${config.bg} ${config.border} border flex items-center justify-center ${config.color}`}>
                      {service.icon}
                    </div>
                    <div>
                      <p className="text-white font-medium">{service.name}</p>
                      {service.message && (
                        <p className="text-zinc-500 text-sm">{service.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {service.latency && (
                      <span className="text-zinc-500 text-sm font-mono">
                        {service.latency}ms
                      </span>
                    )}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} ${config.border} border`}>
                      <span className={config.color}>{config.icon}</span>
                      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Environment Info */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Información del entorno</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-400 text-sm">Supabase URL</p>
                <p className="text-white font-mono text-sm truncate">
                  {import.meta.env.VITE_SUPABASE_URL || 'No configurado'}
                </p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm">Modo</p>
                <p className="text-white font-medium">
                  {import.meta.env.PROD ? 'Producción' : 'Desarrollo'}
                </p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm">Mercado Pago</p>
                <p className="text-white font-medium">
                  {import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN ? 'Configurado' : 'No configurado'}
                </p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm">Resend API</p>
                <p className="text-white font-medium">
                  {import.meta.env.VITE_RESEND_API_KEY ? 'Configurado' : 'No configurado'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
