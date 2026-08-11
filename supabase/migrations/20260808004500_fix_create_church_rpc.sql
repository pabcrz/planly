-- Update create_church RPC to permit church creation by authenticated active users and service_role
CREATE OR REPLACE FUNCTION public.create_church(church_name text, church_slug text, founding_admin_user_id uuid)
RETURNS public.churches LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE new_church public.churches;
BEGIN
  IF founding_admin_user_id IS NULL THEN
    founding_admin_user_id := auth.uid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = founding_admin_user_id) THEN
    RAISE EXCEPTION 'founding_admin_not_found';
  END IF;
  INSERT INTO public.churches (name, slug, timezone)
  VALUES (church_name, church_slug, 'America/Mexico_City') RETURNING * INTO new_church;
  INSERT INTO public.church_memberships (user_id, church_id, role)
  VALUES (founding_admin_user_id, new_church.id, 'church_admin')
  ON CONFLICT (user_id, church_id) DO UPDATE SET role = 'church_admin';
  RETURN new_church;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_church(text, text, uuid) TO authenticated, service_role;
