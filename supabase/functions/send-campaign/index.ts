import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Obtener campaña
    const { data: campaign, error: campErr } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaña no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determinar segmento de clientes
    let clientQuery = supabase.from("clients").select("id, full_name, email, phone").eq("is_active", true);

    if (campaign.target_segment === "new") {
      clientQuery = clientQuery.eq("total_visits", 0);
    } else if (campaign.target_segment === "recurring") {
      clientQuery = clientQuery.gte("total_visits", 3);
    } else if (campaign.target_segment === "inactive") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      clientQuery = clientQuery.lt("updated_at", thirtyDaysAgo.toISOString());
    } else if (campaign.target_segment === "birthday") {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      clientQuery = clientQuery.like("birthdate", `____-${month}-${day}`);
    }

    const { data: clients, error: clientErr } = await clientQuery;

    if (clientErr) {
      return new Response(JSON.stringify({ error: clientErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = (clients ?? []).filter(c => c.email || c.phone);
    const sentNotifications = [];

    // Enviar por email (simulado - en producción usaría Resend/SendGrid)
    for (const client of recipients) {
      const personalizedMessage = campaign.message
        .replace(/{{nombre}}/g, client.full_name)
        .replace(/{{name}}/g, client.full_name);

      // Registrar en notifications_log
      const { data: notif } = await supabase.from("notifications_log").insert({
        client_id: client.id,
        type: "campaign",
        channel: campaign.channel,
        recipient: client.email || client.phone,
        subject: campaign.name,
        body: personalizedMessage,
        status: "sent",
        sent_at: new Date().toISOString(),
      }).select().single();

      if (notif) sentNotifications.push(notif);
    }

    // Actualizar campaña
    await supabase.from("marketing_campaigns").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      recipients_count: sentNotifications.length,
    }).eq("id", campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentNotifications.length,
        total_recipients: recipients.length,
        campaign: campaign.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Simple Supabase client for edge function
function createClient(url: string, key: string) {
  return {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (col: string, val: any) => ({
          single: async () => {
            const res = await fetch(`${url}/rest/v1/${table}?select=${columns}&${col}=eq.${val}`, {
              headers: { apikey: key, Authorization: `Bearer ${key}` },
            });
            const data = await res.json();
            return { data: Array.isArray(data) ? data[0] : data, error: null };
          },
          gte: (c2: string, v2: any) => ({
            lt: async (c3: string, v3: any) => {
              const res = await fetch(`${url}/rest/v1/${table}?select=${columns}&${col}=eq.${val}&${c2}=gte.${v2}&${c3}=lt.${v3}`, {
                headers: { apikey: key, Authorization: `Bearer ${key}` },
              });
              const data = await res.json();
              return { data: Array.isArray(data) ? data : [data], error: null };
            },
            single: async () => {
              const res = await fetch(`${url}/rest/v1/${table}?select=${columns}&${col}=eq.${val}&${c2}=gte.${v2}`, {
                headers: { apikey: key, Authorization: `Bearer ${key}` },
              });
              const data = await res.json();
              return { data: Array.isArray(data) ? data[0] : data, error: null };
            },
          }),
          like: async (c2: string, v2: string) => {
            const res = await fetch(`${url}/rest/v1/${table}?select=${columns}&${col}=eq.${val}&${c2}=like.${encodeURIComponent(v2)}`, {
              headers: { apikey: key, Authorization: `Bearer ${key}` },
            });
            const data = await res.json();
            return { data: Array.isArray(data) ? data : [data], error: null };
          },
        }),
        single: async () => {
          const res = await fetch(`${url}/rest/v1/${table}?select=${columns}`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
          });
          const data = await res.json();
          return { data: Array.isArray(data) ? data[0] : data, error: null };
        },
      }),
      insert: (payload: any) => ({
        select: () => ({
          single: async () => {
            const res = await fetch(`${url}/rest/v1/${table}`, {
              method: "POST",
              headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            return { data: Array.isArray(data) ? data[0] : data, error: null };
          },
        }),
      }),
      update: (payload: any) => ({
        eq: async (col: string, val: any) => {
          const res = await fetch(`${url}/rest/v1/${table}?${col}=eq.${val}`, {
            method: "PATCH",
            headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify(payload),
          });
          return { data: null, error: res.ok ? null : { message: res.statusText } };
        },
      }),
    }),
  };
}
