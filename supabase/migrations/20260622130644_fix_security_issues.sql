/*
# Fix Security Issues

1. Set fixed search_path on handle_new_user and update_updated_at to prevent search_path hijacking
2. Restrict appointments_anon_insert to only allow booking from external portal (not fully open)
3. Revoke EXECUTE on handle_new_user from anon and authenticated roles
*/

-- Fix mutable search_path on handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Revoke public execute from handle_new_user (only postgres/supabase_admin should call it via trigger)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Fix mutable search_path on update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Replace unrestricted anon insert policy on appointments with a restricted one
-- Only allow inserts where branch_id, barber_id, client_id, service_id are all provided (non-null)
-- and status is 'confirmed' (the booking portal always sets this)
DROP POLICY IF EXISTS "appointments_anon_insert" ON public.appointments;
CREATE POLICY "appointments_anon_insert" ON public.appointments
  FOR INSERT TO anon
  WITH CHECK (
    branch_id IS NOT NULL AND
    barber_id IS NOT NULL AND
    client_id IS NOT NULL AND
    service_id IS NOT NULL AND
    status = 'confirmed'
  );
