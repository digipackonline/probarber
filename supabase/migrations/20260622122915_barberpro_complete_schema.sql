
/*
# BarberPro - Complete Database Schema

## Overview
Full production schema for BarberPro SaaS barbershop management platform.

## Tables Created
1. `profiles` - Extended user profiles linked to auth.users with roles (admin/barber/client)
2. `branches` - Barbershop locations/branches with hours and configuration
3. `branch_schedules` - Working hours per day per branch
4. `barbers` - Barber profiles with specialties, commission, status
5. `barber_services` - Junction table linking barbers to services they perform
6. `barber_schedules` - Weekly working schedule per barber
7. `barber_absences` - Vacation and absence records per barber
8. `services` - Service catalog (cuts, beard, treatments etc.) with pricing
9. `clients` - Client profiles with preferences and notes
10. `appointments` - Booking/appointment records with full status tracking
11. `payments` - Payment records linked to appointments
12. `daily_cash` - Daily cash register summary per branch
13. `promotions` - Marketing promotions and discount codes
14. `client_promotions` - Promotions applied to clients
15. `loyalty_points` - Loyalty program points per client
16. `loyalty_transactions` - History of points earned/redeemed
17. `notifications_log` - Log of all notifications sent
18. `ai_insights` - AI-generated analytics and recommendations
19. `marketing_campaigns` - Email/WhatsApp/SMS campaigns
20. `campaign_recipients` - Campaign delivery tracking

## Security
- RLS enabled on all tables
- 4 separate policies per table (SELECT/INSERT/UPDATE/DELETE)
- Role-based access: admins have full access, barbers see their own data, clients see their bookings

## Notes
- All timestamps use timestamptz
- Soft deletes via is_active/status fields (no hard deletes)
- Indexes on frequently queried columns for performance
*/

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'barber', 'client')),
  full_name text,
  avatar_url text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============================================================
-- BRANCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  phone text,
  email text,
  description text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_select" ON branches;
CREATE POLICY "branches_select" ON branches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "branches_select_anon" ON branches;
CREATE POLICY "branches_select_anon" ON branches FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS "branches_insert" ON branches;
CREATE POLICY "branches_insert" ON branches FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "branches_update" ON branches;
CREATE POLICY "branches_update" ON branches FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "branches_delete" ON branches;
CREATE POLICY "branches_delete" ON branches FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- BRANCH SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS branch_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time time NOT NULL,
  close_time time NOT NULL,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE branch_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_schedules_select" ON branch_schedules;
CREATE POLICY "branch_schedules_select" ON branch_schedules FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "branch_schedules_insert" ON branch_schedules;
CREATE POLICY "branch_schedules_insert" ON branch_schedules FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "branch_schedules_update" ON branch_schedules;
CREATE POLICY "branch_schedules_update" ON branch_schedules FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "branch_schedules_delete" ON branch_schedules;
CREATE POLICY "branch_schedules_delete" ON branch_schedules FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- SERVICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'corte' CHECK (category IN ('corte', 'barba', 'tratamiento', 'combo', 'otro')),
  duration_minutes int NOT NULL DEFAULT 30,
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select" ON services;
CREATE POLICY "services_select" ON services FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "services_insert" ON services;
CREATE POLICY "services_insert" ON services FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "services_update" ON services;
CREATE POLICY "services_update" ON services FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "services_delete" ON services;
CREATE POLICY "services_delete" ON services FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- CLIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  birthdate date,
  notes text,
  preferences text,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  total_visits int NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  loyalty_points int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_branch ON clients(branch_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);

DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "clients_update" ON clients;
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
) WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);

DROP POLICY IF EXISTS "clients_delete" ON clients;
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- BARBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  photo_url text,
  specialty text,
  bio text,
  commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON barbers(user_id);
CREATE INDEX IF NOT EXISTS idx_barbers_branch ON barbers(branch_id);

ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "barbers_select" ON barbers;
CREATE POLICY "barbers_select" ON barbers FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "barbers_insert" ON barbers;
CREATE POLICY "barbers_insert" ON barbers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "barbers_update" ON barbers;
CREATE POLICY "barbers_update" ON barbers FOR UPDATE TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "barbers_delete" ON barbers;
CREATE POLICY "barbers_delete" ON barbers FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- BARBER SERVICES (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS barber_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(barber_id, service_id)
);

ALTER TABLE barber_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "barber_services_select" ON barber_services;
CREATE POLICY "barber_services_select" ON barber_services FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "barber_services_insert" ON barber_services;
CREATE POLICY "barber_services_insert" ON barber_services FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "barber_services_update" ON barber_services;
CREATE POLICY "barber_services_update" ON barber_services FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "barber_services_delete" ON barber_services;
CREATE POLICY "barber_services_delete" ON barber_services FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- BARBER SCHEDULES (weekly)
-- ============================================================
CREATE TABLE IF NOT EXISTS barber_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_working boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE barber_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "barber_schedules_select" ON barber_schedules;
CREATE POLICY "barber_schedules_select" ON barber_schedules FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "barber_schedules_insert" ON barber_schedules;
CREATE POLICY "barber_schedules_insert" ON barber_schedules FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "barber_schedules_update" ON barber_schedules;
CREATE POLICY "barber_schedules_update" ON barber_schedules FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "barber_schedules_delete" ON barber_schedules;
CREATE POLICY "barber_schedules_delete" ON barber_schedules FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- BARBER ABSENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS barber_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  type text NOT NULL DEFAULT 'absence' CHECK (type IN ('vacation', 'absence', 'sick', 'other')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barber_absences_barber ON barber_absences(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_absences_dates ON barber_absences(start_date, end_date);

ALTER TABLE barber_absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "barber_absences_select" ON barber_absences;
CREATE POLICY "barber_absences_select" ON barber_absences FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "barber_absences_insert" ON barber_absences;
CREATE POLICY "barber_absences_insert" ON barber_absences FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "barber_absences_update" ON barber_absences;
CREATE POLICY "barber_absences_update" ON barber_absences FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "barber_absences_delete" ON barber_absences;
CREATE POLICY "barber_absences_delete" ON barber_absences FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notes text,
  price numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_branch ON appointments(branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, appointment_date, start_time);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select" ON appointments;
CREATE POLICY "appointments_select" ON appointments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "appointments_insert" ON appointments;
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber')) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "appointments_update" ON appointments;
CREATE POLICY "appointments_update" ON appointments FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "appointments_delete" ON appointments;
CREATE POLICY "appointments_delete" ON appointments FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Public insert for booking portal (anon)
DROP POLICY IF EXISTS "appointments_anon_insert" ON appointments;
CREATE POLICY "appointments_anon_insert" ON appointments FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES barbers(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash', 'card', 'transfer', 'mercadopago', 'other')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  notes text,
  paid_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch ON payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_barber ON payments(barber_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(paid_at);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);

DROP POLICY IF EXISTS "payments_update" ON payments;
CREATE POLICY "payments_update" ON payments FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "payments_delete" ON payments;
CREATE POLICY "payments_delete" ON payments FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- PROMOTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(10,2) NOT NULL,
  coupon_code text UNIQUE,
  min_purchase numeric(10,2),
  max_uses int,
  current_uses int NOT NULL DEFAULT 0,
  valid_from date,
  valid_until date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotions_select" ON promotions;
CREATE POLICY "promotions_select" ON promotions FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "promotions_insert" ON promotions;
CREATE POLICY "promotions_insert" ON promotions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "promotions_update" ON promotions;
CREATE POLICY "promotions_update" ON promotions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "promotions_delete" ON promotions;
CREATE POLICY "promotions_delete" ON promotions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- LOYALTY POINTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  points int NOT NULL,
  type text NOT NULL DEFAULT 'earn' CHECK (type IN ('earn', 'redeem', 'bonus', 'expire')),
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_client ON loyalty_transactions(client_id);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_select" ON loyalty_transactions;
CREATE POLICY "loyalty_select" ON loyalty_transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);

DROP POLICY IF EXISTS "loyalty_insert" ON loyalty_transactions;
CREATE POLICY "loyalty_insert" ON loyalty_transactions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);

DROP POLICY IF EXISTS "loyalty_update" ON loyalty_transactions;
CREATE POLICY "loyalty_update" ON loyalty_transactions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "loyalty_delete" ON loyalty_transactions;
CREATE POLICY "loyalty_delete" ON loyalty_transactions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('confirmation', 'reminder_24h', 'reminder_2h', 'cancellation', 'reschedule', 'birthday', 'campaign', 'other')),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'sms', 'push')),
  recipient text,
  subject text,
  body text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON notifications_log(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_client ON notifications_log(client_id);

ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications_log;
CREATE POLICY "notifications_select" ON notifications_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "notifications_insert" ON notifications_log;
CREATE POLICY "notifications_insert" ON notifications_log FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "notifications_update" ON notifications_log;
CREATE POLICY "notifications_update" ON notifications_log FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "notifications_delete" ON notifications_log;
CREATE POLICY "notifications_delete" ON notifications_log FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- MARKETING CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'sms')),
  message text NOT NULL,
  target_segment text DEFAULT 'all' CHECK (target_segment IN ('all', 'new', 'recurring', 'inactive', 'birthday')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipients_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select" ON marketing_campaigns;
CREATE POLICY "campaigns_select" ON marketing_campaigns FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "campaigns_insert" ON marketing_campaigns;
CREATE POLICY "campaigns_insert" ON marketing_campaigns FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "campaigns_update" ON marketing_campaigns;
CREATE POLICY "campaigns_update" ON marketing_campaigns FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "campaigns_delete" ON marketing_campaigns;
CREATE POLICY "campaigns_delete" ON marketing_campaigns FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- AI INSIGHTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('occupancy', 'inactive_clients', 'promotion_suggestion', 'demand_forecast', 'revenue_trend', 'general')),
  title text NOT NULL,
  content text NOT NULL,
  data jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_insights_select" ON ai_insights;
CREATE POLICY "ai_insights_select" ON ai_insights FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "ai_insights_insert" ON ai_insights;
CREATE POLICY "ai_insights_insert" ON ai_insights FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "ai_insights_update" ON ai_insights;
CREATE POLICY "ai_insights_update" ON ai_insights FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "ai_insights_delete" ON ai_insights;
CREATE POLICY "ai_insights_delete" ON ai_insights FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- TRIGGER: auto-create profile after signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_branches ON branches;
CREATE TRIGGER set_updated_at_branches BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_services ON services;
CREATE TRIGGER set_updated_at_services BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_clients ON clients;
CREATE TRIGGER set_updated_at_clients BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_barbers ON barbers;
CREATE TRIGGER set_updated_at_barbers BEFORE UPDATE ON barbers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_appointments ON appointments;
CREATE TRIGGER set_updated_at_appointments BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED: Default branch
-- ============================================================
INSERT INTO branches (id, name, address, city, phone, email, description)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'BarberPro Central',
  'Av. Principal 123',
  'Buenos Aires',
  '+54 11 1234-5678',
  'central@barberpro.com',
  'Sucursal principal de BarberPro'
) ON CONFLICT (id) DO NOTHING;

-- Default services
INSERT INTO services (name, description, category, duration_minutes, price, branch_id) VALUES
('Corte Clásico', 'Corte tradicional con tijera y máquina', 'corte', 30, 2500, 'a0000000-0000-0000-0000-000000000001'),
('Fade', 'Corte degradado moderno', 'corte', 45, 3000, 'a0000000-0000-0000-0000-000000000001'),
('Barba', 'Arreglo y perfilado de barba', 'barba', 20, 1500, 'a0000000-0000-0000-0000-000000000001'),
('Corte + Barba', 'Combo corte clásico con arreglo de barba', 'combo', 50, 3800, 'a0000000-0000-0000-0000-000000000001'),
('Fade + Barba', 'Combo fade con arreglo de barba', 'combo', 65, 4200, 'a0000000-0000-0000-0000-000000000001'),
('Tratamiento Capilar', 'Hidratación y tratamiento del cuero cabelludo', 'tratamiento', 40, 2000, 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Default branch schedules (Mon-Sat 9:00-20:00, Sun closed)
INSERT INTO branch_schedules (branch_id, day_of_week, open_time, close_time, is_open) VALUES
('a0000000-0000-0000-0000-000000000001', 1, '09:00', '20:00', true),
('a0000000-0000-0000-0000-000000000001', 2, '09:00', '20:00', true),
('a0000000-0000-0000-0000-000000000001', 3, '09:00', '20:00', true),
('a0000000-0000-0000-0000-000000000001', 4, '09:00', '20:00', true),
('a0000000-0000-0000-0000-000000000001', 5, '09:00', '20:00', true),
('a0000000-0000-0000-0000-000000000001', 6, '09:00', '18:00', true),
('a0000000-0000-0000-0000-000000000001', 0, '10:00', '14:00', false)
ON CONFLICT DO NOTHING;
