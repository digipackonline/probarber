-- Fix: Add SET search_path TO 'public' to create_user_onboarding function
-- This ensures the function can find the user_onboarding table when triggered from auth.users

CREATE OR REPLACE FUNCTION public.create_user_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_onboarding (user_id, tenant_id)
  VALUES (NEW.id, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';