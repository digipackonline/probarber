-- Fix: Qualify column references in create_tenant function to avoid ambiguity
-- The RETURNS TABLE(id, name, slug) creates output columns that conflict with table columns

CREATE OR REPLACE FUNCTION public.create_tenant(p_name text, p_slug text, p_email text, p_created_by uuid)
RETURNS TABLE(id uuid, name text, slug text) AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Insert tenant
  INSERT INTO tenants (name, slug, email, created_by, trial_ends_at)
  VALUES (p_name, p_slug, p_email, p_created_by, now() + interval '14 days')
  RETURNING id INTO v_tenant_id;

  -- Return the created tenant (using explicit table alias to avoid ambiguity)
  RETURN QUERY SELECT t.id, t.name, t.slug FROM tenants t WHERE t.id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;