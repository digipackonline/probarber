import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Replace template variables with actual values
function renderTemplate(template: string, vars: Record<string, string>) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
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

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'check_all';
    const appointmentId = body.appointment_id;
    const type = body.type; // 'confirmation', 'reminder_24h', 'reminder_2h', 'cancellation', 'reschedule'

    const results: any[] = [];

    // Single appointment trigger
    if (appointmentId && type) {
      const { data: appt } = await supabase
        .from('appointments')
        .select('*, clients(full_name, phone), barbers(full_name), services(name), branches(name)')
        .eq('id', appointmentId)
        .single();

      if (!appt || !appt.clients?.phone) {
        return new Response(JSON.stringify({ error: 'Appointment or client phone not found' }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get config and template
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('branch_id', appt.branch_id)
        .maybeSingle();

      const autoFlag = type === 'confirmation' ? config?.auto_confirmation :
                       type === 'reminder_24h' ? config?.auto_reminder_24h :
                       type === 'reminder_2h' ? config?.auto_reminder_2h :
                       type === 'cancellation' ? config?.auto_cancellation :
                       type === 'reschedule' ? config?.auto_reschedule : true;

      if (config && !autoFlag) {
        return new Response(JSON.stringify({ skipped: true, reason: 'Automation disabled' }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: template } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('branch_id', appt.branch_id)
        .eq('type', type)
        .eq('is_active', true)
        .maybeSingle();

      const message = template
        ? renderTemplate(template.body, {
            client_name: appt.clients?.full_name || 'Cliente',
            branch_name: appt.branches?.name || 'BarberPro',
            appointment_date: appt.appointment_date,
            appointment_time: appt.start_time?.slice(0, 5) || '',
            service_name: appt.services?.name || '',
            barber_name: appt.barbers?.full_name || '',
          })
        : `BarberPro: ${type} notification for ${appt.clients?.full_name}`;

      const sendRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          branch_id: appt.branch_id,
          appointment_id: appt.id,
          client_id: appt.client_id,
          phone_number: appt.clients.phone,
          message,
          template_id: template?.id,
          message_type: 'template',
        }),
      });

      const sendData = await sendRes.json();
      results.push({ appointment_id: appt.id, type, status: sendData.status, message_id: sendData.message_id });

      return new Response(JSON.stringify({ processed: 1, results }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Cron-style: check all pending reminders
    if (action === 'check_all') {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const in2h = new Date(now);
      in2h.setHours(in2h.getHours() + 2);
      const in2hStr = in2h.toISOString().split('T')[0];
      const in2hTime = in2h.toTimeString().slice(0, 5);

      // Reminder 24h: appointments for tomorrow that haven't been reminded
      const { data: appts24h } = await supabase
        .from('appointments')
        .select('*, clients(full_name, phone), barbers(full_name), services(name), branches(name)')
        .eq('appointment_date', tomorrowStr)
        .eq('status', 'confirmed')
        .neq('status', 'cancelled');

      for (const appt of (appts24h || [])) {
        // Check if already sent
        const { data: existing } = await supabase
          .from('whatsapp_messages')
          .select('id')
          .eq('appointment_id', appt.id)
          .eq('message_type', 'template')
          .eq('status', 'sent')
          .limit(1);
        if (existing && existing.length > 0) continue;

        const { data: config } = await supabase
          .from('whatsapp_config')
          .select('auto_reminder_24h')
          .eq('branch_id', appt.branch_id)
          .maybeSingle();
        if (config && !config.auto_reminder_24h) continue;

        const { data: template } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('branch_id', appt.branch_id)
          .eq('type', 'reminder_24h')
          .eq('is_active', true)
          .maybeSingle();

        if (!template || !appt.clients?.phone) continue;

        const message = renderTemplate(template.body, {
          client_name: appt.clients?.full_name || 'Cliente',
          branch_name: appt.branches?.name || 'BarberPro',
          appointment_date: appt.appointment_date,
          appointment_time: appt.start_time?.slice(0, 5) || '',
          service_name: appt.services?.name || '',
          barber_name: appt.barbers?.full_name || '',
        });

        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            branch_id: appt.branch_id,
            appointment_id: appt.id,
            client_id: appt.client_id,
            phone_number: appt.clients.phone,
            message,
            template_id: template.id,
            message_type: 'template',
          }),
        });

        results.push({ appointment_id: appt.id, type: 'reminder_24h', status: 'sent' });
      }

      // Reminder 2h: appointments in ~2 hours
      const { data: appts2h } = await supabase
        .from('appointments')
        .select('*, clients(full_name, phone), barbers(full_name), services(name), branches(name)')
        .eq('appointment_date', in2hStr)
        .eq('status', 'confirmed');

      for (const appt of (appts2h || [])) {
        const apptTime = appt.start_time?.slice(0, 5);
        if (!apptTime || Math.abs(parseInt(apptTime.split(':')[0]) - parseInt(in2hTime.split(':')[0])) > 1) continue;

        const { data: existing } = await supabase
          .from('whatsapp_messages')
          .select('id')
          .eq('appointment_id', appt.id)
          .eq('message_type', 'template')
          .eq('status', 'sent')
          .limit(1);
        if (existing && existing.length > 0) continue;

        const { data: config } = await supabase
          .from('whatsapp_config')
          .select('auto_reminder_2h')
          .eq('branch_id', appt.branch_id)
          .maybeSingle();
        if (config && !config.auto_reminder_2h) continue;

        const { data: template } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('branch_id', appt.branch_id)
          .eq('type', 'reminder_2h')
          .eq('is_active', true)
          .maybeSingle();

        if (!template || !appt.clients?.phone) continue;

        const message = renderTemplate(template.body, {
          client_name: appt.clients?.full_name || 'Cliente',
          branch_name: appt.branches?.name || 'BarberPro',
          appointment_date: appt.appointment_date,
          appointment_time: appt.start_time?.slice(0, 5) || '',
          service_name: appt.services?.name || '',
          barber_name: appt.barbers?.full_name || '',
        });

        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            branch_id: appt.branch_id,
            appointment_id: appt.id,
            client_id: appt.client_id,
            phone_number: appt.clients.phone,
            message,
            template_id: template.id,
            message_type: 'template',
          }),
        });

        results.push({ appointment_id: appt.id, type: 'reminder_2h', status: 'sent' });
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
