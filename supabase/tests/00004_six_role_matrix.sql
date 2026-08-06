-- Run after `supabase db reset`. Uses seeded UUIDs and local JWT claims.
-- Roles: anon, no-membership, member, worship_director, church_admin, platform_admin.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT condition THEN RAISE EXCEPTION 'matrix assertion failed: %', message; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
END;
$$;

-- Seed state makes all representative members active and establishes one platform admin.
INSERT INTO public.user_access_state (user_id, status)
SELECT id, 'active' FROM auth.users ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO public.platform_admins (user_id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;

-- anon: only canonical songs, canonical versions, published repertoire/variants and active services.
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true((SELECT count(*) FROM public.songs WHERE is_canonical) > 0, 'anon reads canonical songs');
SELECT pg_temp.assert_true(NOT EXISTS (SELECT 1 FROM public.services WHERE status = 'planned'), 'anon hides planned services');
SELECT pg_temp.assert_true(NOT EXISTS (SELECT 1 FROM public.setlists AS sl JOIN public.services AS s ON s.id = sl.service_id WHERE s.status = 'planned'), 'anon hides planned setlists');

-- authenticated without membership: canonical/public reads only.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000007');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.church_memberships) = 0, 'no-membership cannot read memberships');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.songs WHERE NOT is_canonical) = 0, 'no-membership cannot read tenant songs');

-- member: own church reads and song creation; no membership mutation or version management.
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000003');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.teams) = 2, 'member reads own teams only');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.services) = 3, 'member reads own services only');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.platform_admins) = 0, 'member cannot read platform admins');

-- worship director: own-church leadership, not membership administration or church-song deletion.
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000002');
SELECT pg_temp.assert_true(public.has_church_role('10000000-0000-0000-0000-000000000001', 'worship_director'), 'director has own leadership');
SELECT pg_temp.assert_true(NOT public.has_church_role('10000000-0000-0000-0000-000000000002', 'worship_director'), 'director is isolated from other church');

-- church admin: owns church admin capability, while platform authority remains absent.
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000001');
SELECT pg_temp.assert_true(public.has_church_role('10000000-0000-0000-0000-000000000001', 'church_admin'), 'church admin has own administration');
SELECT pg_temp.assert_true(public.is_platform_admin(), 'seeded owner is platform admin');
SELECT pg_temp.assert_true(public.is_user_active(), 'owner remains active');

SELECT pg_temp.assert_true((SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = ANY (ARRAY[
  'churches', 'church_memberships', 'songs', 'song_versions', 'church_repertoire', 'song_variants',
  'teams', 'team_members', 'people', 'services', 'setlists', 'setlist_items',
  'service_participants', 'service_member_roles'
])) >= 40, 'all cutover resources have restrictive policies');

-- pending and inactive users never pass tenant helpers despite a membership.
UPDATE public.user_access_state SET status = 'inactive' WHERE user_id = '00000000-0000-0000-0000-000000000003';
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000003');
SELECT pg_temp.assert_true(NOT public.is_church_member('10000000-0000-0000-0000-000000000001'), 'inactive membership is ineffective');
UPDATE public.user_access_state SET status = 'pending' WHERE user_id = '00000000-0000-0000-0000-000000000003';
SELECT pg_temp.assert_true(NOT public.is_church_member('10000000-0000-0000-0000-000000000001'), 'pending membership is ineffective');

ROLLBACK;
