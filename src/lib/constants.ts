// Shared status configurations across the app

export const APPOINTMENT_STATUS_CONFIG = {
  pending: { label: 'Pendiente', variant: 'warning' as const, bg: 'bg-amber-500/20 border-amber-500/30 hover:bg-amber-500/30' },
  confirmed: { label: 'Confirmado', variant: 'info' as const, bg: 'bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30' },
  in_progress: { label: 'En progreso', variant: 'purple' as const, bg: 'bg-violet-500/20 border-violet-500/30 hover:bg-violet-500/30' },
  completed: { label: 'Completado', variant: 'success' as const, bg: 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30' },
  cancelled: { label: 'Cancelado', variant: 'danger' as const, bg: 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30' },
  no_show: { label: 'Ausente', variant: 'default' as const, bg: 'bg-zinc-700/40 border-zinc-600/30 hover:bg-zinc-700/60' },
};

export const PAYMENT_METHOD_CONFIG = {
  cash: { label: 'Efectivo', color: 'bg-emerald-500/15 text-emerald-400' },
  card: { label: 'Tarjeta', color: 'bg-blue-500/15 text-blue-400' },
  transfer: { label: 'Transferencia', color: 'bg-violet-500/15 text-violet-400' },
  mercadopago: { label: 'Mercado Pago', color: 'bg-sky-500/15 text-sky-400' },
  other: { label: 'Otro', color: 'bg-zinc-600/40 text-zinc-400' },
};

export const SERVICE_CATEGORY_CONFIG = {
  corte: { label: 'Corte', color: 'bg-amber-500/15 text-amber-400' },
  barba: { label: 'Barba', color: 'bg-blue-500/15 text-blue-400' },
  combo: { label: 'Combo', color: 'bg-emerald-500/15 text-emerald-400' },
  tratamiento: { label: 'Tratamiento', color: 'bg-violet-500/15 text-violet-400' },
  otro: { label: 'Otro', color: 'bg-zinc-600/40 text-zinc-400' },
};

export const LOYALTY_LEVELS = [
  { minPoints: 0, label: 'Bronce', icon: '🥉', color: 'text-orange-400', bg: 'border-orange-500/20 bg-orange-500/5' },
  { minPoints: 100, label: 'Plata', icon: '🥈', color: 'text-zinc-300', bg: 'border-zinc-500/20 bg-zinc-500/5' },
  { minPoints: 200, label: 'Oro', icon: '🥇', color: 'text-amber-400', bg: 'border-amber-500/20 bg-amber-500/5' },
  { minPoints: 500, label: 'Platino', icon: '💎', color: 'text-sky-400', bg: 'border-sky-500/20 bg-sky-500/5' },
];

export function getLoyaltyLevel(points: number) {
  for (let i = LOYALTY_LEVELS.length - 1; i >= 0; i--) {
    if (points >= LOYALTY_LEVELS[i].minPoints) return LOYALTY_LEVELS[i];
  }
  return LOYALTY_LEVELS[0];
}

export const NOTIFICATION_TYPE_CONFIG = {
  confirmation: { label: 'Confirmación', icon: '✅', color: 'text-emerald-400 bg-emerald-500/15' },
  reminder_24h: { label: 'Recordatorio 24h', icon: '⏰', color: 'text-blue-400 bg-blue-500/15' },
  reminder_2h: { label: 'Recordatorio 2h', icon: '⏰', color: 'text-amber-400 bg-amber-500/15' },
  cancellation: { label: 'Cancelación', icon: '❌', color: 'text-red-400 bg-red-500/15' },
  reschedule: { label: 'Reprogramación', icon: '🔄', color: 'text-violet-400 bg-violet-500/15' },
  birthday: { label: 'Cumpleaños', icon: '🎂', color: 'text-pink-400 bg-pink-500/15' },
  campaign: { label: 'Campaña', icon: '📢', color: 'text-zinc-400 bg-zinc-700/40' },
  other: { label: 'Otro', icon: '🔔', color: 'text-zinc-400 bg-zinc-700/40' },
};

export const CAMPAIGN_STATUS_CONFIG = {
  draft: { label: 'Borrador', variant: 'default' as const },
  scheduled: { label: 'Programado', variant: 'warning' as const },
  sent: { label: 'Enviado', variant: 'success' as const },
  cancelled: { label: 'Cancelado', variant: 'danger' as const },
};

export const TARGET_SEGMENT_CONFIG = {
  all: 'Todos los clientes',
  new: 'Clientes nuevos',
  recurring: 'Clientes recurrentes',
  inactive: 'Clientes inactivos',
  birthday: 'Cumpleaños del mes',
};

export const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 to 20

export const CLIENT_SEGMENT_LABELS: Record<string, string> = {
  all: 'Todos',
  new: 'Nuevos',
  recurring: 'Recurrentes',
  inactive: 'Inactivos',
  birthday: 'Cumpleañeros',
};
