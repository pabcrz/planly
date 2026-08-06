-- Supabase's existing schema-wide grants can supersede a PUBLIC revoke.
-- Remove the explicit anon grants while preserving the authenticated grants
-- established by the additive platform-admin migration.

REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.activate_current_user() FROM anon;
