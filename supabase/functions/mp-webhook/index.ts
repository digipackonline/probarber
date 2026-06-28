import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Email service (Resend or similar)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'pagos@barberpro.com';

interface WebhookNotification {
  type: string;
  data: { id: string };
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log('Email skipped - no Resend API key');
    return;
  }

  try {
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
  } catch (error) {
    console.error('Email send error:', error);
  }
}

async function getPaymentInfo(paymentId: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
    }
  });
  return response.json();
}

async function getPreferenceInfo(preferenceId: string) {
  const response = await fetch(`https://api.mercadopago.com/checkout/preferences/${preferenceId}`, {
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
    }
  });
  return response.json();
}

async function updateDatabase(status: string, payment: any, tenantId: string) {
  const amount = payment.transaction_amount;
  const paymentId = payment.id.toString();
  const statusDetail = payment.status_detail;
  const paymentMethodType = payment.payment_method?.type || payment.payment_type_id;

  if (status === 'approved') {
    // Call the approved payment function
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/handle_payment_approved`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_tenant_id: tenantId,
        p_amount: amount,
        p_mp_payment_id: paymentId,
        p_mp_status: status,
        p_mp_status_detail: statusDetail,
        p_payment_method_type: paymentMethodType,
        p_raw_response: payment
      })
    });
  } else if (status === 'rejected' || status === 'cancelled') {
    // Call the rejected payment function
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/handle_payment_rejected`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_tenant_id: tenantId,
        p_amount: amount,
        p_mp_payment_id: paymentId,
        p_mp_status: status,
        p_mp_status_detail: statusDetail,
        p_payment_method_type: paymentMethodType,
        p_raw_response: payment
      })
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Handle GET for verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const verification = url.searchParams.get('hub.challenge');
    if (verification) {
      return new Response(verification, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('OK', { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const notification: WebhookNotification = await req.json();
    console.log('Webhook received:', JSON.stringify(notification));

    const { type, data } = notification;

    // Only process payment notifications
    if (type !== 'payment') {
      console.log('Ignoring non-payment notification:', type);
      return new Response(JSON.stringify({ received: true, processed: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const paymentId = data.id;

    // Get payment details from Mercado Pago
    const payment = await getPaymentInfo(paymentId);
    console.log('Payment info:', JSON.stringify(payment));

    const { status, external_reference, preference_id } = payment;

    // Get tenant info from external_reference or preference metadata
    let tenantId = external_reference;

    if (!tenantId && preference_id) {
      const preference = await getPreferenceInfo(preference_id);
      tenantId = preference.metadata?.tenant_id || preference.external_reference;
    }

    if (!tenantId) {
      console.error('No tenant ID found in payment:', paymentId);
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log webhook event
    await fetch(`${SUPABASE_URL}/rest/v1/webhook_events`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'mercado_pago',
        event_type: type,
        resource_id: paymentId,
        resource_type: 'payment',
        payload: { payment, tenant_id: tenantId }
      })
    });

    // Get tenant email for notifications
    const tenantRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenantId}&select=email,name`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    const tenants = await tenantRes.json();
    const tenant = tenants[0];
    const tenantEmail = tenant?.email;

    // Process based on status
    if (status === 'approved') {
      await updateDatabase('approved', payment, tenantId);

      // Send success email
      if (tenantEmail) {
        await sendEmail(tenantEmail, 'Pago confirmado - BarberPro', `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #d4af37;">Pago Confirmado</h1>
            <p>Hola,</p>
            <p>Tu pago de <strong>$${payment.transaction_amount.toLocaleString('es-AR')}</strong> ha sido procesado correctamente.</p>
            <p>Gracias por confiar en BarberPro.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              ID de transacción: ${paymentId}<br>
              Fecha: ${new Date().toLocaleDateString('es-AR')}
            </p>
          </div>
        `);
      }
    } else if (status === 'rejected' || status === 'cancelled') {
      await updateDatabase(status, payment, tenantId);

      // Send failure email
      if (tenantEmail) {
        await sendEmail(tenantEmail, 'Pago rechazado - BarberPro', `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Pago Rechazado</h1>
            <p>Hola,</p>
            <p>Tu pago de <strong>$${payment.transaction_amount.toLocaleString('es-AR')}</strong> fue rechazado.</p>
            <p>Posibles causas:</p>
            <ul>
              <li>Fondos insuficientes</li>
              <li>Tarjeta vencida</li>
              <li>Datos incorrectos</li>
            </ul>
            <p>Por favor, intenta nuevamente con otro método de pago.</p>
            <a href="${SUPABASE_URL.replace('.supabase.co', '.vercel.app')}/subscription"
               style="display: inline-block; background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">
              Reintentar Pago
            </a>
          </div>
        `);
      }
    } else if (status === 'pending' || status === 'in_process') {
      // Just log it, no action needed
      console.log('Payment pending:', paymentId);
    }

    return new Response(JSON.stringify({ received: true, processed: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
