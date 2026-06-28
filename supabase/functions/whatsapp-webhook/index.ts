import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // GET = webhook verification (Meta WABA style)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe") {
        // Store verification token check against config
        return new Response(challenge || "OK", { status: 200, headers: corsHeaders });
      }
      return new Response("Webhook active", { status: 200, headers: corsHeaders });
    }

    // POST = incoming webhook events
    const payload = await req.json();

    // Extract message data (Meta WABA format)
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    const phoneNumber = message?.from || payload?.phone || null;
    const messageText = message?.text?.body || payload?.message || null;
    const eventType = message ? 'message_received' : (payload.event_type || 'unknown');

    // Find branch by phone number
    let branchId: string | null = null;
    if (phoneNumber) {
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('branch_id')
        .eq('phone_number', phoneNumber)
        .maybeSingle();
      branchId = config?.branch_id || null;
    }

    // Log webhook event
    const { data: webhook } = await supabase
      .from('whatsapp_webhooks')
      .insert({
        branch_id: branchId,
        provider: value?.messaging_product ? 'meta_waba' : (payload.provider || 'callmebot'),
        event_type: eventType,
        payload,
        phone_number: phoneNumber,
        message_text: messageText,
        processed: false,
      })
      .select()
      .single();

    // If chatbot enabled, process with simple rules (prepared for AI integration)
    if (branchId && messageText) {
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('chatbot_enabled, ai_enabled')
        .eq('branch_id', branchId)
        .maybeSingle();

      if (config?.chatbot_enabled) {
        const lowerMsg = messageText.toLowerCase().trim();
        let reply = '';

        // Simple keyword responses (prepared for AI upgrade)
        if (lowerMsg.includes('turno') || lowerMsg.includes('agendar') || lowerMsg.includes('reservar')) {
          reply = 'Puedes agendar tu turno en nuestro portal: ' + (req.headers.get('origin') || '') + '/book';
        } else if (lowerMsg.includes('horario') || lowerMsg.includes('hora')) {
          reply = 'Nuestros horarios son:\nLun-Vie: 9:00 - 20:00\nSáb: 9:00 - 18:00';
        } else if (lowerMsg.includes('precio') || lowerMsg.includes('costo')) {
          reply = 'Consulta nuestros precios y servicios en el portal de reservas.';
        } else if (lowerMsg.includes('hola') || lowerMsg.includes('buen')) {
          reply = 'Hola! Soy el asistente virtual de BarberPro. Puedo ayudarte con:\n• Agendar turnos\n• Consultar horarios\n• Información de servicios\n\nEscribe "turno" para comenzar.';
        } else {
          reply = 'No entendí tu mensaje. Escribe:\n• "turno" para agendar\n• "horarios" para ver horarios\n• "precios" para servicios';
        }

        // Send reply
        if (reply && phoneNumber) {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              branch_id: branchId,
              phone_number: phoneNumber,
              message: reply,
              message_type: 'text',
            }),
          });

          // Mark as processed
          await supabase
            .from('whatsapp_webhooks')
            .update({ processed: true, processed_by: 'chatbot', ai_response: reply })
            .eq('id', webhook?.id);
        }
      }
    }

    return new Response(JSON.stringify({ received: true, webhook_id: webhook?.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
