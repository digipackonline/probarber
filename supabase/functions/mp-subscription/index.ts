import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    // CREATE RECURRING SUBSCRIPTION
    if (req.method === "POST" && action === 'create') {
      const body = await req.json();
      const { tenant_id, plan_id, billing_cycle, card_token } = body;

      // Get plan details
      const planRes = await fetch(`${SUPABASE_URL}/rest/v1/plans?id=eq.${plan_id}&select=*`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      const plans = await planRes.json();
      const plan = plans[0];

      if (!plan) {
        return new Response(JSON.stringify({ error: 'Plan not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get tenant and create customer
      const tenantRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenant_id}&select=*`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      const tenants = await tenantRes.json();
      const tenant = tenants[0];

      // Create customer in Mercado Pago
      const customerData = {
        email: tenant.email,
        first_name: tenant.name,
        metadata: {
          tenant_id
        }
      };

      const customerRes = await fetch('https://api.mercadopago.com/v1/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        },
        body: JSON.stringify(customerData)
      });

      const customer = await customerRes.json();
      const customerId = customer.id;

      // Create card if token provided
      let cardId = null;
      if (card_token && customerId) {
        // Attach card to customer using a payment
        const cardPaymentData = {
          transaction_amount: 1,
          token: card_token,
          description: 'Verificación de tarjeta - BarberPro',
          payment_method_id: 'credit_card',
          payer: {
            id: customerId
          },
          capture: false // Authorization only
        };

        await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
          },
          body: JSON.stringify(cardPaymentData)
        });
      }

      // Update subscription in database
      const price = billing_cycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
      const periodDays = billing_cycle === 'monthly' ? 30 : 365;

      await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?tenant_id=eq.${tenant_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          plan_id,
          billing_cycle,
          status: 'active',
          mercado_pago_customer_id: customerId,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString(),
          auto_renew: true
        })
      });

      return new Response(JSON.stringify({
        success: true,
        customer_id: customerId
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // CHARGE SUBSCRIPTION (manual retry or scheduled)
    if (req.method === "POST" && action === 'charge') {
      const body = await req.json();
      const { tenant_id } = body;

      // Get subscription with plan
      const subRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?tenant_id=eq.${tenant_id}&select=*,plans(*)`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      const subs = await subRes.json();
      const subscription = subs[0];

      if (!subscription || !subscription.mercado_pago_customer_id) {
        return new Response(JSON.stringify({ error: 'No subscription or customer' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const plan = subscription.plans;
      const price = subscription.billing_cycle === 'monthly' ? plan.price_monthly : plan.price_yearly;

      // Create payment
      const paymentData = {
        transaction_amount: price,
        description: `BarberPro - Plan ${plan.name} ${subscription.billing_cycle === 'monthly' ? 'mensual' : 'anual'}`,
        payer: {
          id: subscription.mercado_pago_customer_id
        },
        metadata: {
          tenant_id,
          subscription_id: subscription.id,
          billing_cycle: subscription.billing_cycle
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

      return new Response(JSON.stringify({
        payment_id: payment.id,
        status: payment.status
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // CANCEL SUBSCRIPTION
    if (req.method === "POST" && action === 'cancel') {
      const body = await req.json();
      const { tenant_id } = body;

      // Update subscription
      await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?tenant_id=eq.${tenant_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          auto_renew: false
        })
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET SUBSCRIPTION STATUS
    if (req.method === "GET") {
      const tenant_id = url.searchParams.get('tenant_id');

      if (!tenant_id) {
        return new Response(JSON.stringify({ error: 'Missing tenant_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const subRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?tenant_id=eq.${tenant_id}&select=*,plans(*)`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      const subs = await subRes.json();
      const subscription = subs[0];

      return new Response(JSON.stringify(subscription || null), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
