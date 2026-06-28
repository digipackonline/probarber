import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendMessagePayload {
  branch_id: string;
  appointment_id?: string;
  client_id?: string;
  phone_number: string;
  message: string;
  template_id?: string;
  message_type?: 'template' | 'text' | 'image';
}

async function sendViaCallMeBot(phone: string, message: string, apiKey?: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(message)}&apikey=${apiKey || ''}`;
  const res = await fetch(url, { method: 'GET' });
  const text = await res.text();
  return { success: res.ok, response: text, status: res.status };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: SendMessagePayload = await req.json();
    const { branch_id, appointment_id, client_id, phone_number, message, template_id, message_type = 'text' } = body;

    if (!phone_number || !message) {
      return new Response(JSON.stringify({ error: 'phone_number and message are required' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get branch WhatsApp config
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('branch_id', branch_id)
      .maybeSingle();

    // Send message via provider
    let sendResult: any = { success: false, response: 'No provider configured' };
    const provider = config?.provider || 'callmebot';

    if (provider === 'callmebot') {
      sendResult = await sendViaCallMeBot(phone_number, message, config?.api_key);
    }
    // Future: meta_waba, twilio, custom providers

    // Determine status
    const status = sendResult.success ? 'sent' : 'failed';

    // Log message
    const { data: msgRecord, error: logError } = await supabase
      .from('whatsapp_messages')
      .insert({
        branch_id,
        appointment_id: appointment_id || null,
        client_id: client_id || null,
        template_id: template_id || null,
        direction: 'outbound',
        message_type,
        phone_number,
        content: message,
        status,
        provider_response: sendResult.response ? { response: sendResult.response, status: sendResult.status } : null,
        error_message: sendResult.success ? null : sendResult.response,
        sent_at: sendResult.success ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to log message:', logError);
    }

    // Also log to notifications_log for backward compatibility
    await supabase.from('notifications_log').insert({
      appointment_id: appointment_id || null,
      client_id: client_id || null,
      type: template_id ? 'confirmation' : 'other',
      channel: 'whatsapp',
      recipient: phone_number,
      body: message,
      status: status as any,
      sent_at: sendResult.success ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({
      success: sendResult.success,
      message_id: msgRecord?.id,
      status,
      provider,
      response: sendResult.response,
    }), {
      status: sendResult.success ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
