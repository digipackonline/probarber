/*
# WhatsApp Business API Integration for BarberPro

## Overview
Complete WhatsApp integration schema enabling each branch to connect their own
WhatsApp Business API number, send automated messages, and manage templates.

## New Tables
1. `whatsapp_config` - Per-branch WhatsApp Business API configuration
2. `whatsapp_templates` - Customizable message templates per branch
3. `whatsapp_messages` - Full message history log
4. `whatsapp_webhooks` - Incoming webhook event log (prepared for chatbot/AI)

## Security
- RLS enabled on all tables
- Admin-only access for configuration
- Branch-scoped data access

## Notes
- Uses CallMeBot (free WhatsApp API) as default provider
- Prepared for future Meta/WhatsApp Business API migration
- Chatbot/AI hooks via webhook processing
*/

-- ============================================================
-- WHATSAPP CONFIG (per branch)
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'callmebot' CHECK (provider IN ('callmebot', 'meta_waba', 'twilio', 'custom')),
  phone_number text,
  api_key text,
  api_secret text,
  webhook_url text,
  is_active boolean NOT NULL DEFAULT false,
  auto_confirmation boolean NOT NULL DEFAULT true,
  auto_reminder_24h boolean NOT NULL DEFAULT true,
  auto_reminder_2h boolean NOT NULL DEFAULT true,
  auto_cancellation boolean NOT NULL DEFAULT true,
  auto_reschedule boolean NOT NULL DEFAULT true,
  chatbot_enabled boolean NOT NULL DEFAULT false,
  ai_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(branch_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_config_branch ON whatsapp_config(branch_id);

ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_config_select" ON whatsapp_config;
CREATE POLICY "whatsapp_config_select" ON whatsapp_config FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_config_insert" ON whatsapp_config;
CREATE POLICY "whatsapp_config_insert" ON whatsapp_config FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_config_update" ON whatsapp_config;
CREATE POLICY "whatsapp_config_update" ON whatsapp_config FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_config_delete" ON whatsapp_config;
CREATE POLICY "whatsapp_config_delete" ON whatsapp_config FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- WHATSAPP TEMPLATES (customizable per branch)
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('confirmation', 'reminder_24h', 'reminder_2h', 'cancellation', 'reschedule', 'welcome', 'follow_up', 'custom')),
  subject text,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_branch ON whatsapp_templates(branch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_type ON whatsapp_templates(type);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_templates_select" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_select" ON whatsapp_templates FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_templates_insert" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_insert" ON whatsapp_templates FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_templates_update" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_update" ON whatsapp_templates FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_templates_delete" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_delete" ON whatsapp_templates FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- WHATSAPP MESSAGES (history log)
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  template_id uuid REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  message_type text NOT NULL DEFAULT 'template' CHECK (message_type IN ('template', 'text', 'image', 'button', 'interactive')),
  phone_number text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  provider_response jsonb,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_branch ON whatsapp_messages(branch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_appointment ON whatsapp_messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_client ON whatsapp_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_messages_select" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_select" ON whatsapp_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_messages_insert" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_insert" ON whatsapp_messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_messages_update" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_update" ON whatsapp_messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_messages_delete" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_delete" ON whatsapp_messages FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- WHATSAPP WEBHOOKS (incoming events, prepared for chatbot/AI)
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'callmebot',
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  phone_number text,
  message_text text,
  processed boolean NOT NULL DEFAULT false,
  processed_by text,
  ai_response text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_branch ON whatsapp_webhooks(branch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_processed ON whatsapp_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_created ON whatsapp_webhooks(created_at);

ALTER TABLE whatsapp_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_webhooks_select" ON whatsapp_webhooks;
CREATE POLICY "whatsapp_webhooks_select" ON whatsapp_webhooks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_webhooks_insert" ON whatsapp_webhooks;
CREATE POLICY "whatsapp_webhooks_insert" ON whatsapp_webhooks FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_webhooks_update" ON whatsapp_webhooks;
CREATE POLICY "whatsapp_webhooks_update" ON whatsapp_webhooks FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "whatsapp_webhooks_delete" ON whatsapp_webhooks;
CREATE POLICY "whatsapp_webhooks_delete" ON whatsapp_webhooks FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- DEFAULT TEMPLATES (seed data)
-- ============================================================
INSERT INTO whatsapp_templates (branch_id, name, type, body, variables, is_default, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', 'Confirmación de turno', 'confirmation',
 'Hola {{client_name}}! Tu turno en {{branch_name}} ha sido confirmado.\n\n📅 Fecha: {{appointment_date}}\n⏰ Hora: {{appointment_time}}\n💈 Servicio: {{service_name}}\n👤 Barbero: {{barber_name}}\n\nTe esperamos!',
 '["client_name","branch_name","appointment_date","appointment_time","service_name","barber_name"]'::jsonb, true, true),

('a0000000-0000-0000-0000-000000000001', 'Recordatorio 24 horas', 'reminder_24h',
 'Hola {{client_name}}! Te recordamos que mañana tienes un turno en {{branch_name}}.\n\n📅 Fecha: {{appointment_date}}\n⏰ Hora: {{appointment_time}}\n💈 Servicio: {{service_name}}\n👤 Barbero: {{barber_name}}\n\nNos vemos!',
 '["client_name","branch_name","appointment_date","appointment_time","service_name","barber_name"]'::jsonb, true, true),

('a0000000-0000-0000-0000-000000000001', 'Recordatorio 2 horas', 'reminder_2h',
 'Hola {{client_name}}! Tu turno en {{branch_name}} es en 2 horas.\n\n⏰ Hora: {{appointment_time}}\n💈 Servicio: {{service_name}}\n👤 Barbero: {{barber_name}}\n\nTe esperamos!',
 '["client_name","branch_name","appointment_time","service_name","barber_name"]'::jsonb, true, true),

('a0000000-0000-0000-0000-000000000001', 'Cancelación de turno', 'cancellation',
 'Hola {{client_name}}. Tu turno en {{branch_name}} del {{appointment_date}} a las {{appointment_time}} ha sido cancelado.\n\nSi deseas reprogramar, responde a este mensaje o llámanos.',
 '["client_name","branch_name","appointment_date","appointment_time"]'::jsonb, true, true),

('a0000000-0000-0000-0000-000000000001', 'Reprogramación de turno', 'reschedule',
 'Hola {{client_name}}. Tu turno en {{branch_name}} ha sido reprogramado.\n\n📅 Nueva fecha: {{appointment_date}}\n⏰ Nueva hora: {{appointment_time}}\n💈 Servicio: {{service_name}}\n👤 Barbero: {{barber_name}}\n\nConfirmado?',
 '["client_name","branch_name","appointment_date","appointment_time","service_name","barber_name"]'::jsonb, true, true),

('a0000000-0000-0000-0000-000000000001', 'Bienvenida', 'welcome',
 'Bienvenido a {{branch_name}}! 🎉\n\nSomos tu barbería de confianza. Responde "turno" para agendar o "horarios" para conocer nuestros horarios.',
 '["branch_name"]'::jsonb, true, true)
ON CONFLICT DO NOTHING;
