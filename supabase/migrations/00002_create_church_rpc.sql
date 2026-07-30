-- ============================================================
-- 00002: create_church RPC
-- Atomically creates a church and its founding church_admin membership.
-- Required because RLS policy memberships_insert_admin demands the caller
-- already hold church_admin in the target church, which is impossible for
-- a brand-new church with zero members.
-- ============================================================

CREATE OR REPLACE FUNCTION create_church(church_name text, church_slug text, church_timezone text)
RETURNS churches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_church public.churches;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.churches (name, slug, timezone)
  VALUES (church_name, church_slug, church_timezone)
  RETURNING * INTO new_church;

  INSERT INTO public.church_memberships (user_id, church_id, role)
  VALUES (auth.uid(), new_church.id, 'church_admin');

  RETURN new_church;
END;
$$;
