-- ============================================================
-- BARBERPRO SAAS - INTERNATIONALIZATION & MULTI-REGION SCHEMA
-- ============================================================

-- APP SETTINGS TABLE (Global configuration)
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select" ON app_settings;
CREATE POLICY "app_settings_select" ON app_settings FOR SELECT TO authenticated, anon USING (is_public = true);

DROP POLICY IF EXISTS "app_settings_admin" ON app_settings;
CREATE POLICY "app_settings_admin" ON app_settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- LANGUAGES TABLE
CREATE TABLE IF NOT EXISTS languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  native_name text NOT NULL,
  flag text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "languages_select" ON languages;
CREATE POLICY "languages_select" ON languages FOR SELECT TO authenticated, anon USING (is_active = true);

-- TRANSLATIONS TABLE
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
  namespace text NOT NULL DEFAULT 'common',
  key text NOT NULL,
  value text NOT NULL,
  UNIQUE(language_code, namespace, key)
);

CREATE INDEX IF NOT EXISTS idx_translations_lang_ns ON translations(language_code, namespace);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "translations_select" ON translations;
CREATE POLICY "translations_select" ON translations FOR SELECT TO authenticated, anon USING (true);

-- COUNTRIES TABLE
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  currency_code text NOT NULL,
  phone_prefix text,
  flag text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_countries_currency ON countries(currency_code);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "countries_select" ON countries;
CREATE POLICY "countries_select" ON countries FOR SELECT TO authenticated, anon USING (is_active = true);

-- CURRENCIES TABLE
CREATE TABLE IF NOT EXISTS currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  decimal_places int DEFAULT 2,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "currencies_select" ON currencies;
CREATE POLICY "currencies_select" ON currencies FOR SELECT TO authenticated, anon USING (is_active = true);

-- REGIONAL PRICING TABLE
CREATE TABLE IF NOT EXISTS regional_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  currency_code text NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
  price_monthly numeric(10,2) NOT NULL,
  price_yearly numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_regional_pricing_plan ON regional_pricing(plan_id);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_country ON regional_pricing(country_code);

ALTER TABLE regional_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "regional_pricing_select" ON regional_pricing;
CREATE POLICY "regional_pricing_select" ON regional_pricing FOR SELECT TO authenticated, anon USING (is_active = true);

-- FEATURE FLAGS TABLE
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  default_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feature_flags_select" ON feature_flags;
CREATE POLICY "feature_flags_select" ON feature_flags FOR SELECT TO authenticated, anon USING (true);

-- TENANT FEATURE FLAGS (override per tenant)
CREATE TABLE IF NOT EXISTS tenant_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, feature_key)
);

ALTER TABLE tenant_features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_features_select" ON tenant_features;
CREATE POLICY "tenant_features_select" ON tenant_features FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = tenant_features.tenant_id AND tenant_users.user_id = auth.uid())
);

-- PAYMENT PROVIDERS TABLE
CREATE TABLE IF NOT EXISTS payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  supported_countries text[] DEFAULT '{}',
  display_order int DEFAULT 0,
  config_schema jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_providers_select" ON payment_providers;
CREATE POLICY "payment_providers_select" ON payment_providers FOR SELECT TO authenticated, anon USING (is_active = true);

-- TENANT PAYMENT PROVIDERS CONFIG
CREATE TABLE IF NOT EXISTS tenant_payment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_code text NOT NULL REFERENCES payment_providers(code) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, provider_code, country_code)
);

ALTER TABLE tenant_payment_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_payment_config_select" ON tenant_payment_config;
CREATE POLICY "tenant_payment_config_select" ON tenant_payment_config FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = tenant_payment_config.tenant_id AND tenant_users.user_id = auth.uid())
);

-- UPDATE TENANTS TABLE for regional settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country_code text REFERENCES countries(code) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency_code text REFERENCES currencies(code) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS language_code text REFERENCES languages(code) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_logo_url text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_primary_color text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_facebook text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_instagram text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_tiktok text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_whatsapp text;

-- UPDATE PROFILES TABLE for user preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text REFERENCES languages(code) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_country text REFERENCES countries(code) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_currency text REFERENCES currencies(code) ON DELETE SET NULL;

-- SEED: Languages
INSERT INTO languages (code, name, native_name, flag, is_default) VALUES
('es', 'Spanish', 'Español', 'es', true),
('pt-BR', 'Portuguese (Brazil)', 'Português (Brasil)', 'br', false),
('en', 'English', 'English', 'us', false)
ON CONFLICT (code) DO NOTHING;

-- SEED: Currencies
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
('ARS', 'Argentine Peso', '$', 2),
('BRL', 'Brazilian Real', 'R$', 2),
('USD', 'US Dollar', '$', 2),
('MXN', 'Mexican Peso', '$', 2),
('CLP', 'Chilean Peso', '$', 0),
('COP', 'Colombian Peso', '$', 0),
('PEN', 'Peruvian Sol', 'S/', 2),
('UYU', 'Uruguayan Peso', '$', 2)
ON CONFLICT (code) DO NOTHING;

-- SEED: Countries
INSERT INTO countries (code, name, currency_code, phone_prefix) VALUES
('AR', 'Argentina', 'ARS', '+54'),
('BR', 'Brasil', 'BRL', '+55'),
('US', 'Estados Unidos', 'USD', '+1'),
('MX', 'México', 'MXN', '+52'),
('CL', 'Chile', 'CLP', '+56'),
('CO', 'Colombia', 'COP', '+57'),
('PE', 'Perú', 'PEN', '+51'),
('UY', 'Uruguay', 'UYU', '+598')
ON CONFLICT (code) DO NOTHING;

-- SEED: Payment Providers
INSERT INTO payment_providers (code, name, supported_countries, display_order) VALUES
('mercado_pago', 'Mercado Pago', ARRAY['AR', 'BR', 'MX', 'CL', 'CO', 'PE', 'UY'], 1),
('stripe', 'Stripe', ARRAY['US', 'MX'], 2),
('paypal', 'PayPal', ARRAY['AR', 'BR', 'US', 'MX', 'CL', 'CO', 'PE', 'UY'], 3),
('pix', 'PIX', ARRAY['BR'], 4)
ON CONFLICT (code) DO NOTHING;

-- SEED: Feature Flags
INSERT INTO feature_flags (key, name, description, default_enabled) VALUES
('ai_assistant', 'Asistente IA', 'Recomendaciones inteligentes y análisis automatizado', false),
('whatsapp', 'WhatsApp Integration', 'Envío de mensajes y notificaciones por WhatsApp', false),
('marketing', 'Marketing Automation', 'Campañas de email y marketing automatizado', false),
('loyalty', 'Programa de Fidelidad', 'Sistema de puntos y recompensas para clientes', false),
('reports', 'Reportes Avanzados', 'Métricas y análisis detallado del negocio', true),
('surveys', 'Encuestas', 'Sistema de encuestas de satisfacción', false),
('notifications', 'Notificaciones', 'Sistema de notificaciones push y email', true)
ON CONFLICT (key) DO NOTHING;

-- SEED: Regional Pricing for Plans
INSERT INTO regional_pricing (plan_id, country_code, currency_code, price_monthly, price_yearly)
SELECT pl.id, co.code, co.currency_code,
  CASE 
    WHEN co.currency_code = 'ARS' AND pl.slug = 'pro' THEN 4990
    WHEN co.currency_code = 'ARS' AND pl.slug = 'premium' THEN 9990
    WHEN co.currency_code = 'BRL' AND pl.slug = 'pro' THEN 49
    WHEN co.currency_code = 'BRL' AND pl.slug = 'premium' THEN 99
    WHEN co.currency_code = 'USD' AND pl.slug = 'pro' THEN 19
    WHEN co.currency_code = 'USD' AND pl.slug = 'premium' THEN 49
    WHEN co.currency_code = 'MXN' AND pl.slug = 'pro' THEN 199
    WHEN co.currency_code = 'MXN' AND pl.slug = 'premium' THEN 399
    WHEN co.currency_code = 'CLP' AND pl.slug = 'pro' THEN 9900
    WHEN co.currency_code = 'CLP' AND pl.slug = 'premium' THEN 19900
    WHEN co.currency_code = 'COP' AND pl.slug = 'pro' THEN 39900
    WHEN co.currency_code = 'COP' AND pl.slug = 'premium' THEN 79900
    WHEN co.currency_code = 'PEN' AND pl.slug = 'pro' THEN 59
    WHEN co.currency_code = 'PEN' AND pl.slug = 'premium' THEN 119
    WHEN co.currency_code = 'UYU' AND pl.slug = 'pro' THEN 499
    WHEN co.currency_code = 'UYU' AND pl.slug = 'premium' THEN 999
    ELSE 0
  END,
  CASE 
    WHEN co.currency_code = 'ARS' AND pl.slug = 'pro' THEN 47840
    WHEN co.currency_code = 'ARS' AND pl.slug = 'premium' THEN 95840
    WHEN co.currency_code = 'BRL' AND pl.slug = 'pro' THEN 470
    WHEN co.currency_code = 'BRL' AND pl.slug = 'premium' THEN 950
    WHEN co.currency_code = 'USD' AND pl.slug = 'pro' THEN 190
    WHEN co.currency_code = 'USD' AND pl.slug = 'premium' THEN 490
    WHEN co.currency_code = 'MXN' AND pl.slug = 'pro' THEN 1990
    WHEN co.currency_code = 'MXN' AND pl.slug = 'premium' THEN 3990
    WHEN co.currency_code = 'CLP' AND pl.slug = 'pro' THEN 95000
    WHEN co.currency_code = 'CLP' AND pl.slug = 'premium' THEN 190000
    WHEN co.currency_code = 'COP' AND pl.slug = 'pro' THEN 383000
    WHEN co.currency_code = 'COP' AND pl.slug = 'premium' THEN 767000
    WHEN co.currency_code = 'PEN' AND pl.slug = 'pro' THEN 570
    WHEN co.currency_code = 'PEN' AND pl.slug = 'premium' THEN 1140
    WHEN co.currency_code = 'UYU' AND pl.slug = 'pro' THEN 4790
    WHEN co.currency_code = 'UYU' AND pl.slug = 'premium' THEN 9590
    ELSE 0
  END
FROM plans pl
CROSS JOIN countries co
WHERE pl.slug IN ('pro', 'premium')
ON CONFLICT (plan_id, country_code) DO NOTHING;

-- SEED: Default App Settings
INSERT INTO app_settings (key, value, description, is_public) VALUES
('brand_name', '"BarberPro"', 'Nombre de la aplicación', true),
('brand_tagline', '"Gestión Premium de Barberías"', 'Slogan de la marca', true),
('brand_logo', '"https://barberpro.app/logo.svg"', 'URL del logo principal', true),
('brand_favicon', '"/favicon.svg"', 'URL del favicon', true),
('brand_primary_color', '"#d4af37"', 'Color primario de la marca', true),
('support_email', '"soporte@barberpro.app"', 'Email de soporte', true),
('support_whatsapp', '"+5491112345678"', 'WhatsApp de soporte', true),
('social_facebook', '"https://facebook.com/barberpro"', 'URL de Facebook', true),
('social_instagram', '"https://instagram.com/barberpro"', 'URL de Instagram', true),
('social_tiktok', '"https://tiktok.com/@barberpro"', 'URL de TikTok', true),
('default_currency', '"ARS"', 'Moneda por defecto', true),
('default_language', '"es"', 'Idioma por defecto', true),
('default_country', '"AR"', 'País por defecto', true),
('trial_days', '14', 'Días de prueba gratuita', true),
('max_retries', '3', 'Reintentos máximos de cobro', false),
('cron_enabled', 'true', 'Cron de automatizaciones activo', false)
ON CONFLICT (key) DO NOTHING;

-- UPDATE TRIGGER for regional_pricing
DROP TRIGGER IF EXISTS set_updated_at_regional_pricing ON regional_pricing;
CREATE TRIGGER set_updated_at_regional_pricing BEFORE UPDATE ON regional_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- UPDATE TRIGGER for app_settings
DROP TRIGGER IF EXISTS set_updated_at_app_settings ON app_settings;
CREATE TRIGGER set_updated_at_app_settings BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- UPDATE TRIGGER for feature_flags
DROP TRIGGER IF EXISTS set_updated_at_feature_flags ON feature_flags;
CREATE TRIGGER set_updated_at_feature_flags BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at();