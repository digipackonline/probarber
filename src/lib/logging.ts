import { supabase } from './supabase';

export type LogAction =
  | 'user.login'
  | 'user.logout'
  | 'user.signup'
  | 'user.profile_update'
  | 'tenant.create'
  | 'tenant.update'
  | 'tenant.delete'
  | 'subscription.create'
  | 'subscription.update'
  | 'subscription.cancel'
  | 'subscription.expire'
  | 'payment.create'
  | 'payment.success'
  | 'payment.failed'
  | 'payment.refund'
  | 'client.create'
  | 'client.update'
  | 'client.delete'
  | 'appointment.create'
  | 'appointment.update'
  | 'appointment.cancel'
  | 'appointment.complete'
  | 'appointment.no_show'
  | 'barber.create'
  | 'barber.update'
  | 'barber.delete'
  | 'service.create'
  | 'service.update'
  | 'service.delete'
  | 'branch.create'
  | 'branch.update'
  | 'branch.delete'
  | 'error.client'
  | 'error.server'
  | 'error.payment'
  | 'error.webhook'
  | 'feedback.submit'
  | 'onboarding.complete'
  | 'onboarding.step_complete'
  | 'tour.complete'
  | 'tour.skip';

interface LogParams {
  action: LogAction | string;
  tenantId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
}

/**
 * Log an activity to the database
 * Falls back to console.error if logging fails (never throw)
 */
export async function logActivity(params: LogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = params.userId || user?.id;

    if (!userId) {
      console.warn('[Logger] No user ID available for logging');
      return;
    }

    const { error } = await supabase.rpc('log_activity', {
      p_tenant_id: params.tenantId || null,
      p_user_id: userId,
      p_action: params.action,
      p_entity_type: params.entityType || null,
      p_entity_id: params.entityId || null,
      p_details: params.details || {}
    });

    if (error) {
      console.error('[Logger] Failed to log activity:', error);
    }
  } catch (err) {
    console.error('[Logger] Unexpected error:', err);
  }
}

/**
 * Log an error with context
 */
export async function logError(
  error: Error | string,
  context: {
    tenantId?: string;
    userId?: string;
    operation?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;

  await logActivity({
    action: 'error.client',
    tenantId: context.tenantId,
    userId: context.userId,
    entityType: context.operation,
    details: {
      error: errorMessage,
      stack: errorStack,
      ...context.metadata
    }
  });

  // Also log to console for debugging
  console.error('[Error]', errorMessage, context);
}

/**
 * Hook to get logging functions with tenant context
 */
export function useLogger() {
  const log = async (action: LogAction | string, details?: Record<string, any>) => {
    await logActivity({ action, details });
  };

  const logErrorWithContext = async (error: Error | string, operation: string, metadata?: Record<string, any>) => {
    await logError(error, { operation, metadata });
  };

  return { log, logError: logErrorWithContext };
}
