import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'pagos@barberpro.com';

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html
    })
  });
}

Deno.serve(async (req: Request) => {
  // Verify this is called by cron (simple security check)
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const now = new Date().toISOString();

    // Find subscriptions that need retry
    const failedRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?status=eq.past_due&next_retry_at=lte.${now}&retry_count=lt.3&select=*,plans(*),tenants(id,name,email)`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    const failedSubscriptions = await failedRes.json();
    console.log(`Found ${failedSubscriptions.length} subscriptions to retry`);

    const results = [];

    for (const sub of failedSubscriptions) {
      const tenant = sub.tenants;
      const plan = sub.plans;
      const price = sub.billing_cycle === 'monthly' ? plan.price_monthly : plan.price_yearly;

      // Only retry if there's a customer ID
      if (!sub.mercado_pago_customer_id) {
        console.log(`Skipping subscription ${sub.id} - no customer ID`);
        continue;
      }

      // Try to charge
      try {
        const paymentData = {
          transaction_amount: price,
          description: `BarberPro - Plan ${plan.name} (${sub.billing_cycle === 'monthly' ? 'mensual' : 'anual'}) - Reintento ${sub.retry_count + 1}`,
          payer: {
            id: sub.mercado_pago_customer_id
          },
          metadata: {
            tenant_id: tenant.id,
            subscription_id: sub.id,
            billing_cycle: sub.billing_cycle,
            retry: true,
            retry_attempt: sub.retry_count + 1
          },
          statement_descriptor: 'BARBERPRO',
          notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`
        };

        const paymentRes = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
          },
          body: JSON.stringify(paymentData)
        });

        const payment = await paymentRes.json();

        results.push({
          subscription_id: sub.id,
          tenant_id: tenant.id,
          payment_id: payment.id,
          status: payment.status
        });

        // Send retry notification email
        if (tenant.email) {
          if (payment.status === 'approved') {
            await sendEmail(tenant.email, 'Pago procesado - BarberPro', `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #10b981;">Pago Procesado</h1>
                <p>Hola,</p>
                <p>Tu pago pendiente de <strong>$${price.toLocaleString('es-AR')}</strong> ha sido procesado correctamente.</p>
                <p>Tu suscripción está nuevamente activa.</p>
              </div>
            `);
          } else if (payment.status === 'rejected') {
            await sendEmail(tenant.email, 'Intento de cobro rechazado - BarberPro', `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #ef4444;">Cobro Rechazado</h1>
                <p>Hola,</p>
                <p>El intento de cobro de tu suscripción fue rechazado.</p>
                <p>Intentos restantes: ${2 - sub.retry_count}</p>
                <p>Por favor, actualiza tu método de pago.</p>
                <a href="${SUPABASE_URL.replace('.supabase.co', '.vercel.app')}/subscription"
                   style="display: inline-block; background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">
                  Actualizar Método de Pago
                </a>
              </div>
            `);
          }
        }
      } catch (err) {
        console.error(`Retry failed for subscription ${sub.id}:`, err);
        results.push({
          subscription_id: sub.id,
          tenant_id: tenant.id,
          error: err.message
        });
      }
    }

    // Check for expired trials
    const trialRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?status=eq.trial&trial_ends_at=lte.${now}&select=*,tenants(id,name,email)`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    const expiredTrials = await trialRes.json();
    console.log(`Found ${expiredTrials.length} expired trials`);

    for (const sub of expiredTrials) {
      // Downgrade to free plan
      const freePlanRes = await fetch(`${SUPABASE_URL}/rest/v1/plans?slug=eq.free&select=id`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      const freePlans = await freePlanRes.json();
      const freePlanId = freePlans[0]?.id;

      if (freePlanId) {
        await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?id=eq.${sub.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'active',
            plan_id: freePlanId
          })
        });
      }

      // Send trial expired email
      if (sub.tenants?.email) {
        await sendEmail(sub.tenants.email, 'Período de prueba finalizado - BarberPro', `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #d4af37;">Período de Prueba Finalizado</h1>
            <p>Hola,</p>
            <p>Tu período de prueba de 14 días ha finalizado.</p>
            <p>Tu cuenta ha pasado al plan Gratuito.</p>
            <p>Para acceder a todas las funciones, actualiza tu plan:</p>
            <a href="${SUPABASE_URL.replace('.supabase.co', '.vercel.app')}/subscription"
               style="display: inline-block; background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">
              Ver Planes
            </a>
          </div>
        `);
      }

      results.push({
        subscription_id: sub.id,
        tenant_id: sub.tenants?.id,
        action: 'trial_expired'
      });
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Cron error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
