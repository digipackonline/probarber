-- ============================================================
-- MERCADO PAGO INTEGRATION SCHEMA
-- ============================================================

-- Add Mercado Pago fields to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS mercado_pago_subscription_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS mercado_pago_customer_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS mercado_pago_plan_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS mercado_pago_card_token text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_status text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS retry_count int DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS dunning_started_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true;

-- Create indexes for MP lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_subscription ON subscriptions(mercado_pago_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_customer ON subscriptions(mercado_pago_customer_id);

-- Payment transactions log
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Mercado Pago data
  mercado_pago_payment_id text,
  mercado_pago_preference_id text,
  mercado_pago_status text,
  mercado_pago_status_detail text,
  
  -- Payment details
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'ARS',
  payment_type text CHECK (payment_type IN ('subscription', 'one_time', 'refund')),
  payment_method_type text,
  payment_method_id text,
  
  -- Response data
  raw_response jsonb,
  
  -- Email notifications
  success_email_sent boolean DEFAULT false,
  failure_email_sent boolean DEFAULT false,
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'authorized', 'in_process', 'rejected', 'cancelled', 'refunded', 'charged_back')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_mp_payment ON payment_transactions(mercado_pago_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_transactions_select" ON payment_transactions;
CREATE POLICY "payment_transactions_select" ON payment_transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = payment_transactions.tenant_id AND tenant_users.user_id = auth.uid())
);

-- Webhook events log
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'mercado_pago',
  event_type text NOT NULL,
  resource_id text,
  resource_type text,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error text,
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_resource ON webhook_events(resource_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_events_insert" ON webhook_events;
CREATE POLICY "webhook_events_insert" ON webhook_events FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Update trigger for payment_transactions
DROP TRIGGER IF EXISTS set_updated_at_payment_transactions ON payment_transactions;
CREATE TRIGGER set_updated_at_payment_transactions BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Plan prices sync with Mercado Pago plan IDs
ALTER TABLE plans ADD COLUMN IF NOT EXISTS mercado_pago_plan_id_monthly text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS mercado_pago_plan_id_yearly text;

-- Function to handle approved payment
CREATE OR REPLACE FUNCTION handle_payment_approved(
  p_tenant_id uuid,
  p_amount numeric,
  p_mp_payment_id text,
  p_mp_status text,
  p_mp_status_detail text,
  p_payment_method_type text DEFAULT NULL,
  p_raw_response jsonb DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_subscription_id uuid;
  v_invoice_id uuid;
  v_plan_id uuid;
BEGIN
  -- Get active subscription for tenant
  SELECT id, plan_id INTO v_subscription_id, v_plan_id
  FROM subscriptions
    WHERE tenant_id = p_tenant_id
    AND status IN ('trial', 'active', 'past_due')
    ORDER BY created_at DESC
    LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for tenant %', p_tenant_id;
  END IF;

  -- Create invoice if needed
  INSERT INTO invoices (
    tenant_id,
    subscription_id,
    invoice_number,
    amount,
    currency,
    status,
    description,
    paid_at
  ) VALUES (
    p_tenant_id,
    v_subscription_id,
    'INV-' || to_char(now(), 'YYYYMM') || '-' || LPAD(nextval('invoice_seq')::text, 6, '0'),
    p_amount,
    'ARS',
    'paid',
    'Suscripción BarberPro',
    now()
  ) RETURNING id INTO v_invoice_id;

  -- Record transaction
  INSERT INTO payment_transactions (
    tenant_id,
    subscription_id,
    invoice_id,
    mercado_pago_payment_id,
    mercado_pago_status,
    mercado_pago_status_detail,
    amount,
    payment_type,
    payment_method_type,
    raw_response,
    status,
    success_email_sent
  ) VALUES (
    p_tenant_id,
    v_subscription_id,
    v_invoice_id,
    p_mp_payment_id,
    p_mp_status,
    p_mp_status_detail,
    p_amount,
    'subscription',
    p_payment_method_type,
    p_raw_response,
    'approved',
    false
  );

  -- Update subscription
  UPDATE subscriptions SET
    status = 'active',
    last_payment_at = now(),
    last_payment_status = 'approved',
    retry_count = 0,
    next_retry_at = NULL,
    dunning_started_at = NULL,
    current_period_start = now(),
    current_period_end = now() + interval '1 month'
  WHERE id = v_subscription_id;

  -- Update tenant to active
  UPDATE tenants SET is_active = true WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

-- Function to handle rejected payment
CREATE OR REPLACE FUNCTION handle_payment_rejected(
  p_tenant_id uuid,
  p_amount numeric,
  p_mp_payment_id text,
  p_mp_status text,
  p_mp_status_detail text,
  p_payment_method_type text DEFAULT NULL,
  p_raw_response jsonb DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_subscription RECORD;
  v_max_retries int := 3;
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription
    FROM subscriptions WHERE tenant_id = p_tenant_id LIMIT 1;

  IF v_subscription IS NULL THEN
    RAISE EXCEPTION 'No subscription found';
  END IF;

  -- Record transaction
  INSERT INTO payment_transactions (
    tenant_id,
    subscription_id,
    mercado_pago_payment_id,
    mercado_pago_status,
    mercado_pago_status_detail,
    amount,
    payment_type,
    payment_method_type,
    raw_response,
    status,
    failure_email_sent
  ) VALUES (
    p_tenant_id,
    v_subscription.id,
    p_mp_payment_id,
    p_mp_status,
    p_mp_status_detail,
    p_amount,
    'subscription',
    p_payment_method_type,
    p_raw_response,
    'rejected',
    false
  );

  -- Update subscription with retry logic
  UPDATE subscriptions SET
    last_payment_status = 'rejected',
    retry_count = retry_count + 1,
    next_retry_at = CASE
      WHEN retry_count < v_max_retries THEN now() + (interval '1 day' * (retry_count + 1))
      ELSE NULL
    END,
    dunning_started_at = CASE
      WHEN dunning_started_at IS NULL THEN now()
      ELSE dunning_started_at
    END,
    status = CASE
      WHEN retry_count >= v_max_retries THEN 'past_due'
      ELSE status
    END
  WHERE id = v_subscription.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;