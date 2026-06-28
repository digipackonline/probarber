import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
const MP_PUBLIC_KEY = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CheckoutRequest {
  tenant_id: string;
  plan_slug: string;
  billing_cycle: 'monthly' | 'yearly';
  success_url?: string;
  failure_url?: string;
  pending_url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body: CheckoutRequest = await req.json();
    const { tenant_id, plan_slug, billing_cycle, success_url, failure_url, pending_url } = body;

    if (!tenant_id || !plan_slug || !billing_cycle) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch tenant and plan from Supabase
    const [tenantRes, planRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenant_id}&select=*`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/plans?slug=eq.${plan_slug}&select=*`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      })
    ]);

    const tenants = await tenantRes.json();
    const plans = await planRes.json();

    const tenant = tenants[0];
    const plan = plans[0];

    if (!tenant || !plan) {
      return new Response(JSON.stringify({ error: 'Tenant or plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const price = billing_cycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
    const periodLabel = billing_cycle === 'monthly' ? 'mensual' : 'anual';

    // Create preference in Mercado Pago
    const preferenceData = {
      items: [
        {
          id: `plan-${plan.slug}-${billing_cycle}`,
          title: `BarberPro - Plan ${plan.name} ${periodLabel}`,
          description: plan.description || `Suscripción ${periodLabel} a BarberPro`,
          quantity: 1,
          unit_price: price,
          currency_id: 'ARS'
        }
      ],
      payer: {
        email: tenant.email || undefined,
        name: tenant.name
      },
      back_urls: {
        success: success_url || `${SUPABASE_URL.replace('/supabase.co', '.supabase.co')}/subscription?status=success`,
        failure: failure_url || `${SUPABASE_URL.replace('/supabase.co', '.supabase.co')}/subscription?status=failure`,
        pending: pending_url || `${SUPABASE_URL.replace('/supabase.co', '.supabase.co')}/subscription?status=pending`
      },
      auto_return: 'approved',
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      external_reference: tenant_id,
      metadata: {
        tenant_id,
        plan_id: plan.id,
        plan_slug: plan.slug,
        billing_cycle
      },
      statement_descriptor: 'BARBERPRO',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpResponse.ok) {
      const error = await mpResponse.text();
      console.error('Mercado Pago error:', error);
      return new Response(JSON.stringify({ error: 'Failed to create preference' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const preference = await mpResponse.json();

    // Store preference ID in webhook_events for tracking
    await fetch(`${SUPABASE_URL}/rest/v1/webhook_events`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'mercado_pago',
        event_type: 'checkout_created',
        resource_id: preference.id,
        resource_type: 'preference',
        payload: {
          tenant_id,
          plan_id: plan.id,
          billing_cycle,
          preference_id: preference.id
        }
      })
    });

    return new Response(JSON.stringify({
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      public_key: MP_PUBLIC_KEY
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
