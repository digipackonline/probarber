-- Function to create tenant with all related data
CREATE OR REPLACE FUNCTION create_tenant(p_name text, p_slug text, p_email text, p_created_by uuid)
RETURNS TABLE(id uuid, name text, slug text) AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Insert tenant
  INSERT INTO tenants (name, slug, email, created_by, trial_ends_at)
  VALUES (p_name, p_slug, p_email, p_created_by, now() + interval '14 days')
  RETURNING id INTO v_tenant_id;

  -- Return the created tenant
  RETURN QUERY SELECT id, name, slug FROM tenants WHERE id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;