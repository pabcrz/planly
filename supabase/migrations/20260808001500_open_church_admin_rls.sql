-- Enable church mutations for active authenticated users and auto-populate platform_admins
DROP POLICY IF EXISTS churches_update_admin ON public.churches;
CREATE POLICY churches_update_admin ON public.churches FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS churches_delete_admin ON public.churches;
CREATE POLICY churches_delete_admin ON public.churches FOR DELETE TO authenticated
  USING (true);

DROP POLICY IF EXISTS churches_insert_platform_admin ON public.churches;
CREATE POLICY churches_insert_platform_admin ON public.churches FOR INSERT TO authenticated
  WITH CHECK (true);

-- Ensure all users are in user_access_state and platform_admins
INSERT INTO public.user_access_state (user_id, status)
SELECT id, 'active' FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET status = 'active';

INSERT INTO public.platform_admins (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
