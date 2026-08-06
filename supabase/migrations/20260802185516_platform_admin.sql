-- Additive platform-admin authority and access-state foundation.
-- Restrictive application-policy changes belong to the later cutover migration.

CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_access_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'inactive')),
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id),
  reason text
);

CREATE INDEX user_access_state_status_idx ON public.user_access_state (status);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_admins_select_self
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_access_state_select_self
  ON public.user_access_state
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.platform_admins, public.user_access_state FROM anon, authenticated;
GRANT SELECT ON TABLE public.platform_admins, public.user_access_state TO authenticated;
GRANT ALL ON TABLE public.platform_admins, public.user_access_state TO service_role;

CREATE OR REPLACE FUNCTION public.is_user_active(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_access_state AS uas
    WHERE uas.user_id = target_user_id
      AND uas.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins AS pa
    JOIN public.user_access_state AS uas ON uas.user_id = pa.user_id
    WHERE pa.user_id = auth.uid()
      AND uas.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.activate_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'activation_not_allowed';
  END IF;

  UPDATE public.user_access_state
  SET status = 'active',
      changed_at = now(),
      changed_by = auth.uid(),
      reason = NULL
  WHERE user_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'activation_state_invalid';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activate_current_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_user_active(uuid), public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_current_user() TO authenticated;
