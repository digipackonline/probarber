-- ============================================================
-- BARBERPRO SAAS PLATFORM - Part 2: RLS Policies & Triggers
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

-- PLANS policies
DROP POLICY IF EXISTS "plans_select" ON plans;
CREATE POLICY "plans_select" ON plans FOR SELECT TO authenticated, anon USING (is_active = true);

-- TENANTS policies
DROP POLICY IF EXISTS "tenants_select" ON tenants;
CREATE POLICY "tenants_select" ON tenants FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = tenants.id AND tenant_users.user_id = auth.uid())
);

DROP POLICY IF EXISTS "tenants_insert" ON tenants;
CREATE POLICY "tenants_insert" ON tenants FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "tenants_update" ON tenants;
CREATE POLICY "tenants_update" ON tenants FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = tenants.id AND tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner')
) WITH CHECK (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = tenants.id AND tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner')
);

-- TENANT_USERS policies
DROP POLICY IF EXISTS "tenant_users_select" ON tenant_users;
CREATE POLICY "tenant_users_select" ON tenant_users FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM tenant_users tu2 WHERE tu2.tenant_id = tenant_users.tenant_id AND tu2.user_id = auth.uid() AND tu2.role IN ('owner', 'admin'))
);

DROP POLICY IF EXISTS "tenant_users_insert" ON tenant_users;
CREATE POLICY "tenant_users_insert" ON tenant_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tenant_users_update" ON tenant_users;
CREATE POLICY "tenant_users_update" ON tenant_users FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users tu2 WHERE tu2.tenant_id = tenant_users.tenant_id AND tu2.user_id = auth.uid() AND tu2.role = 'owner')
) WITH CHECK (
  EXISTS (SELECT 1 FROM tenant_users tu2 WHERE tu2.tenant_id = tenant_users.tenant_id AND tu2.user_id = auth.uid() AND tu2.role = 'owner')
);

-- SUBSCRIPTIONS policies
DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = subscriptions.tenant_id AND tenant_users.user_id = auth.uid())
);

DROP POLICY IF EXISTS " subscriptions_insert" ON subscriptions;
CREATE POLICY "subscriptions_insert" ON subscriptions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = subscriptions.tenant_id AND tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner')
);

DROP POLICY IF EXISTS "subscriptions_update" ON subscriptions;
CREATE POLICY "subscriptions_update" ON subscriptions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = subscriptions.tenant_id AND tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner')
) WITH CHECK (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = subscriptions.tenant_id AND tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner')
);

-- INVOICES policies
DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = invoices.tenant_id AND tenant_users.user_id = auth.uid())
);

-- ONBOARDING_STEPS policies
DROP POLICY IF EXISTS "onboarding_steps_select" ON onboarding_steps;
CREATE POLICY "onboarding_steps_select" ON onboarding_steps FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = onboarding_steps.tenant_id AND tenant_users.user_id = auth.uid())
);

DROP POLICY IF EXISTS "onboarding_steps_insert" ON onboarding_steps;
CREATE POLICY "onboarding_steps_insert" ON onboarding_steps FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = onboarding_steps.tenant_id AND tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner')
);

DROP POLICY IF EXISTS "onboarding_steps_update" ON onboarding_steps;
CREATE POLICY "onboarding_steps_update" ON onboarding_steps FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = onboarding_steps.tenant_id AND tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner')
) WITH CHECK (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = onboarding_steps.tenant_id AND tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner')
);

-- TRIGGER: update tenant updated_at
DROP TRIGGER IF EXISTS set_updated_at_tenants ON tenants;
CREATE TRIGGER set_updated_at_tenants BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_subscriptions ON subscriptions;
CREATE TRIGGER set_updated_at_subscriptions BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- FUNCTION: Generate unique tenant slug
CREATE OR REPLACE FUNCTION generate_tenant_slug(p_name text)
RETURNS text AS $$
DECLARE
  v_slug text;
  v_base_slug text;
  v_counter int := 0;
BEGIN
  v_base_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := regexp_replace(v_base_slug, '^-|-$', '', 'g');
  v_slug := v_base_slug;
  
  WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter;
  END LOOP;
  
  RETURN v_slug;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Create trial subscription for new tenant
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS trigger AS $$
DECLARE
  v_free_plan_id uuid;
BEGIN
  -- Get free plan
  SELECT id INTO v_free_plan_id FROM plans WHERE slug = 'free' LIMIT 1;
  
  -- Create trial subscription
  INSERT INTO subscriptions (tenant_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
  VALUES (
    NEW.id,
    v_free_plan_id,
    'trial',
    now() + interval '14 days',
    now(),
    now() + interval '14 days'
  );
  
  -- Add owner to tenant_users
  INSERT INTO tenant_users (tenant_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.created_by, 'owner', now());
  
  -- Create onboarding steps
  INSERT INTO onboarding_steps (tenant_id, step) VALUES
    (NEW.id, 0), (NEW.id, 1), (NEW.id, 2), (NEW.id, 3), (NEW.id, 4), (NEW.id, 5);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tenant_created ON tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION create_trial_subscription();