-- ============================================================
-- SECURITY FIX: RLS INSERT Policies
-- Many tables had overly permissive INSERT policies
-- ============================================================

-- Fix appointments INSERT - only allow barbers/admins or clients for their own appointments
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
  OR EXISTS (SELECT 1 FROM clients WHERE clients.user_id = auth.uid())
);

-- Fix barbers INSERT - only admins
DROP POLICY IF EXISTS "barbers_insert" ON barbers;
CREATE POLICY "barbers_insert" ON barbers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix barber_services INSERT - only admins
DROP POLICY IF EXISTS "barber_services_insert" ON barber_services;
CREATE POLICY "barber_services_insert" ON barber_services FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix barber_schedules INSERT - only admins
DROP POLICY IF EXISTS "barber_schedules_insert" ON barber_schedules;
CREATE POLICY "barber_schedules_insert" ON barber_schedules FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix barber_absences INSERT - only admins
DROP POLICY IF EXISTS "barber_absences_insert" ON barber_absences;
CREATE POLICY "barber_absences_insert" ON barber_absences FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix branches INSERT - only admins
DROP POLICY IF EXISTS "branches_insert" ON branches;
CREATE POLICY "branches_insert" ON branches FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix branch_schedules INSERT - only admins
DROP POLICY IF EXISTS "branch_schedules_insert" ON branch_schedules;
CREATE POLICY "branch_schedules_insert" ON branch_schedules FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix clients INSERT - admins, barbers, or self-registration
DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
  OR user_id = auth.uid()
);

-- Fix services INSERT - only admins
DROP POLICY IF EXISTS "services_insert" ON services;
CREATE POLICY "services_insert" ON services FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix payments INSERT - only admins and barbers
DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);

-- Fix promotions INSERT - only admins
DROP POLICY IF EXISTS "promotions_insert" ON promotions;
CREATE POLICY "promotions_insert" ON promotions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix loyalty_transactions INSERT - only admins and barbers
DROP POLICY IF EXISTS "loyalty_insert" ON loyalty_transactions;
CREATE POLICY "loyalty_insert" ON loyalty_transactions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);

-- Fix notifications_log INSERT - only admins (for system operations)
DROP POLICY IF EXISTS "notifications_insert" ON notifications_log;
CREATE POLICY "notifications_insert" ON notifications_log FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix marketing_campaigns INSERT - only admins
DROP POLICY IF EXISTS "campaigns_insert" ON marketing_campaigns;
CREATE POLICY "campaigns_insert" ON marketing_campaigns FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix ai_insights INSERT - only admins
DROP POLICY IF EXISTS "ai_insights_insert" ON ai_insights;
CREATE POLICY "ai_insights_insert" ON ai_insights FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix tenant_users INSERT - only for self-registration or by owner
DROP POLICY IF EXISTS "tenant_users_insert" ON tenant_users;
CREATE POLICY "tenant_users_insert" ON tenant_users FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM tenant_users tu 
    WHERE tu.tenant_id = tenant_users.tenant_id 
    AND tu.user_id = auth.uid() 
    AND tu.role = 'owner'
  )
);

-- Fix onboarding_steps INSERT - only owners
DROP POLICY IF EXISTS "onboarding_steps_insert" ON onboarding_steps;
CREATE POLICY "onboarding_steps_insert" ON onboarding_steps FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE tenant_users.tenant_id = onboarding_steps.tenant_id 
    AND tenant_users.user_id = auth.uid() 
    AND tenant_users.role = 'owner'
  )
);

-- Fix subscriptions INSERT - only owners
DROP POLICY IF EXISTS "subscriptions_insert" ON subscriptions;
CREATE POLICY "subscriptions_insert" ON subscriptions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE tenant_users.tenant_id = subscriptions.tenant_id 
    AND tenant_users.user_id = auth.uid() 
    AND tenant_users.role = 'owner'
  )
);

-- Fix whatsapp_config INSERT - only admins
DROP POLICY IF EXISTS "whatsapp_config_insert" ON whatsapp_config;
CREATE POLICY "whatsapp_config_insert" ON whatsapp_config FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix whatsapp_messages INSERT - only admins
DROP POLICY IF EXISTS "whatsapp_messages_insert" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_insert" ON whatsapp_messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix whatsapp_templates INSERT - only admins
DROP POLICY IF EXISTS "whatsapp_templates_insert" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_insert" ON whatsapp_templates FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix whatsapp_webhooks INSERT - only admins
DROP POLICY IF EXISTS "whatsapp_webhooks_insert" ON whatsapp_webhooks;
CREATE POLICY "whatsapp_webhooks_insert" ON whatsapp_webhooks FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix profiles INSERT - only self
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = id
);