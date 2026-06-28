-- ============================================================
-- BARBERPRO SAAS PLATFORM - Part 1: Create Tables
-- ============================================================

-- PLANS TABLE (subscription plans)
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly numeric(10,2) NOT NULL DEFAULT 0,
  max_branches int NOT NULL DEFAULT 1,
  max_barbers int NOT NULL DEFAULT 3,
  max_services int NOT NULL DEFAULT 10,
  max_clients int NOT NULL DEFAULT 100,
  features jsonb DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- TENANTS TABLE (barbershops)
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#d4af37',
  email text,
  phone text,
  address text,
  city text,
  country text DEFAULT 'Argentina',
  timezone text DEFAULT 'America/Argentina/Buenos_Aires',
  currency text DEFAULT 'ARS',
  is_active boolean NOT NULL DEFAULT true,
  onboarding_completed boolean NOT NULL DEFAULT false,
  onboarding_step int NOT NULL DEFAULT 0,
  trial_ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TENANT_USERS (membership)
CREATE TABLE IF NOT EXISTS tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'barber', 'staff')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  canceled_at timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_number text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ARS',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'void', 'uncollectible')),
  due_date date,
  paid_at timestamptz,
  stripe_invoice_id text,
  invoice_url text,
  invoice_pdf text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- ONBOARDING STEPS TRACKING
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  step int NOT NULL CHECK (step BETWEEN 0 AND 5),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  data jsonb DEFAULT '{}',
  UNIQUE(tenant_id, step)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- UPDATE PROFILES TABLE to link to tenant
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

-- UPDATE BRANCHES TABLE to link to tenant
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- UPDATE SERVICES TABLE to link to tenant
ALTER TABLE services ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- UPDATE BARBERS TABLE to link to tenant
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- UPDATE CLIENTS TABLE to link to tenant
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- UPDATE APPOINTMENTS TABLE to link to tenant
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- UPDATE PAYMENTS TABLE to link to tenant
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- SEED: Default Plans
INSERT INTO plans (name, slug, description, price_monthly, price_yearly, max_branches, max_barbers, max_services, max_clients, features, display_order) VALUES
('Gratis', 'free', 'Perfecto para comenzar. Completamente funcional pero con límites.', 0, 0, 1, 2, 5, 50, 
 '["Dashboard básico", "Agenda", "Hasta 2 barberos", "5 servicios", "50 clientes", "Soporte por email"]'::jsonb, 0),
('Pro', 'pro', 'Para barberías en crecimiento. Todo lo que necesitas para escalar.', 4990, 47840, 2, 5, 20, 500,
 '["Dashboards completos", "Agenda avanzada", "Hasta 5 barberos", "20 servicios", "500 clientes", "Múltiples sucursales", "Reportes detallados", "WhatsApp integrado", "Programa de fidelidad", "Soporte prioritario"]'::jsonb, 1),
('Premium', 'premium', 'Para cadenas de barberías. Sin límites, todo incluido.', 9990, 95840, 10, 20, -1, -1,
 '["Todo en Pro", "Hasta 10 sucursales", "20+ barberos", "Servicios ilimitados", "Clientes ilimitados", "API completa", "Integraciones avanzadas", "Asistente IA incluido", "Manager dedicado", "SLA 99.9%"]'::jsonb, 2)
ON CONFLICT (slug) DO NOTHING;