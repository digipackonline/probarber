import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Scissors, Calendar, UserCheck, CreditCard,
  BarChart3, Megaphone, Plus, FolderOpen
} from 'lucide-react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, actionLink, onAction }: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-5">
        <div className="text-zinc-500 [&>svg]:w-8 [&>svg]:h-8">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 max-w-sm mb-6">{description}</p>
      {actionLabel && (actionLink || onAction) && (
        actionLink ? (
          <Link
            to={actionLink}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-zinc-900 font-medium rounded-xl hover:bg-amber-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-zinc-900 font-medium rounded-xl hover:bg-amber-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {actionLabel}
          </button>
        )
      )}
    </div>
  );

  return content;
}

export function EmptyClients({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Users />}
      title="No tienes clientes todavía"
      description="Agrega tu primer cliente para empezar a llevar un registro de tus visitantes."
      actionLabel="Crear primer cliente"
      actionLink={onAdd ? undefined : '/clients'}
      onAction={onAdd}
    />
  );
}

export function EmptyServices({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Scissors />}
      title="No hay servicios creados"
      description="Crea tu primer servicio para que tus clientes puedan agendar citas."
      actionLabel="Crear primer servicio"
      actionLink={onAdd ? undefined : '/services'}
      onAction={onAdd}
    />
  );
}

export function EmptyAppointments({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Calendar />}
      title="No hay turnos agendados"
      description="Tu agenda está vacía. Crea un turno o espera a que tus clientes agenden online."
      actionLabel="Crear primer turno"
      actionLink={onAdd ? undefined : '/agenda'}
      onAction={onAdd}
    />
  );
}

export function EmptyBarbers({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<UserCheck />}
      title="No hay barberos registrados"
      description="Agrega profesionales a tu equipo para poder asignar turnos."
      actionLabel="Crear primer barbero"
      actionLink={onAdd ? undefined : '/barbers'}
      onAction={onAdd}
    />
  );
}

export function EmptyPayments() {
  return (
    <EmptyState
      icon={<CreditCard />}
      title="No hay pagos registrados"
      description="Los pagos que registres aparecerán aquí para control de caja."
    />
  );
}

export function EmptyReports() {
  return (
    <EmptyState
      icon={<BarChart3 />}
      title="No hay datos para mostrar"
      description="Genera actividad en tu barbería para ver estadísticas y reportes."
    />
  );
}

export function EmptyMarketing() {
  return (
    <EmptyState
      icon={<Megaphone />}
      title="No hay campañas activas"
      description="Crea campañas de marketing para promocionar tu barbería y atraer más clientes."
      actionLabel="Crear campaña"
      actionLink="/marketing"
    />
  );
}

export function EmptyGeneral({ entityName, onAdd }: { entityName: string; onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<FolderOpen />}
      title={`No hay ${entityName}`}
      description={`Los ${entityName} que crees aparecerán aquí.`}
      actionLabel={onAdd ? `Agregar ${entityName.slice(0, -1)}` : undefined}
      onAction={onAdd}
    />
  );
}
