-- Fix auto_adopt_canonical_song search_path relation bug and execution permissions for authenticated users
CREATE OR REPLACE FUNCTION public.auto_adopt_canonical_song()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_canonical = true AND NEW.church_id IS NULL THEN
    -- Canonical songs are adopted by churches on first use, not on creation
    NULL;
  ELSIF NEW.church_id IS NOT NULL THEN
    -- Church-owned songs are auto-adopted by that church
    INSERT INTO public.church_repertoire (church_id, song_id, adopted_by, is_published)
    VALUES (NEW.church_id, NEW.id, NEW.created_by, true)
    ON CONFLICT (church_id, song_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_adopt_canonical_song() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_adopt_canonical_song() TO authenticated, service_role;
