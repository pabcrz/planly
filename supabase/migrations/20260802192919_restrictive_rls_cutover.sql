-- Restrictive RLS cutover. This migration is intentionally append-only.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
ALTER TABLE public.churches ALTER COLUMN timezone SET DEFAULT 'America/Mexico_City';
ALTER TABLE public.services ALTER COLUMN timezone SET DEFAULT 'America/Mexico_City';
UPDATE public.churches SET timezone = 'America/Mexico_City'
WHERE timezone IS DISTINCT FROM 'America/Mexico_City';
UPDATE public.services SET timezone = 'America/Mexico_City'
WHERE timezone IS DISTINCT FROM 'America/Mexico_City';
INSERT INTO public.user_access_state (user_id, status)
SELECT u.id, 'active'
FROM auth.users AS u
ON CONFLICT (user_id) DO NOTHING;
UPDATE public.services SET is_published = true;
UPDATE public.church_repertoire SET is_published = true;

-- Remove every prior application policy before defining the restrictive set.
DO $$
DECLARE policy record;
BEGIN
  FOR policy IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY (ARRAY[
      'churches', 'church_memberships', 'global_curators', 'songs', 'song_versions',
      'church_repertoire', 'song_variants', 'teams', 'team_members', 'people',
      'services', 'setlists', 'setlist_items', 'service_participants', 'service_member_roles'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy.policyname, policy.tablename);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_church_member(church_uuid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT public.is_user_active() AND EXISTS (
    SELECT 1 FROM public.church_memberships AS membership
    WHERE membership.user_id = auth.uid() AND membership.church_id = church_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.has_church_role(church_uuid uuid, min_role public.church_role)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT public.is_user_active() AND EXISTS (
    SELECT 1 FROM public.church_memberships AS membership
    WHERE membership.user_id = auth.uid() AND membership.church_id = church_uuid
      AND (membership.role = min_role
        OR (min_role = 'worship_director' AND membership.role = 'church_admin')
        OR (min_role = 'member' AND membership.role IN ('church_admin', 'worship_director')))
  );
$$;

-- Kept for compatibility only. Canonical policies below exclusively use platform_admins.
CREATE OR REPLACE FUNCTION public.is_curator()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT public.is_user_active() AND EXISTS (
    SELECT 1 FROM public.global_curators AS curator WHERE curator.user_id = auth.uid()
  );
$$;

DROP FUNCTION IF EXISTS public.create_church(text, text, text);
CREATE FUNCTION public.create_church(church_name text, church_slug text, founding_admin_user_id uuid)
RETURNS public.churches LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE new_church public.churches;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform_admin_required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = founding_admin_user_id) THEN
    RAISE EXCEPTION 'founding_admin_not_found';
  END IF;
  INSERT INTO public.churches (name, slug, timezone)
  VALUES (church_name, church_slug, 'America/Mexico_City') RETURNING * INTO new_church;
  INSERT INTO public.church_memberships (user_id, church_id, role)
  VALUES (founding_admin_user_id, new_church.id, 'church_admin');
  RETURN new_church;
END;
$$;

-- The authority/access tables retain the self-read-only policies from 00003;
-- service_role remains their only cross-tenant mutation boundary.

CREATE POLICY churches_select_anon ON public.churches FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.services AS service WHERE service.church_id = churches.id
    AND service.is_published AND service.status IN ('active', 'completed'))
);
CREATE POLICY churches_select_authenticated ON public.churches FOR SELECT TO authenticated USING (
  public.is_user_active() AND (public.is_church_member(id) OR EXISTS (
    SELECT 1 FROM public.services AS service WHERE service.church_id = churches.id
      AND service.is_published AND service.status IN ('active', 'completed')
  ) OR public.is_platform_admin())
);
CREATE POLICY churches_insert_platform_admin ON public.churches FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() AND timezone = 'America/Mexico_City');
CREATE POLICY churches_update_admin ON public.churches FOR UPDATE TO authenticated
  USING (public.has_church_role(id, 'church_admin'))
  WITH CHECK (public.has_church_role(id, 'church_admin') AND timezone = 'America/Mexico_City');

CREATE POLICY memberships_select_member ON public.church_memberships FOR SELECT TO authenticated
  USING (public.is_church_member(church_id));
CREATE POLICY memberships_insert_admin ON public.church_memberships FOR INSERT TO authenticated
  WITH CHECK (public.has_church_role(church_id, 'church_admin'));
CREATE POLICY memberships_update_admin ON public.church_memberships FOR UPDATE TO authenticated
  USING (public.has_church_role(church_id, 'church_admin'))
  WITH CHECK (public.has_church_role(church_id, 'church_admin'));
CREATE POLICY memberships_delete_admin ON public.church_memberships FOR DELETE TO authenticated
  USING (public.has_church_role(church_id, 'church_admin'));

CREATE POLICY songs_select_anon ON public.songs FOR SELECT TO anon
  USING (is_canonical AND church_id IS NULL);
CREATE POLICY songs_select_authenticated ON public.songs FOR SELECT TO authenticated USING (
  public.is_user_active() AND ((is_canonical AND church_id IS NULL) OR public.is_church_member(church_id))
);
CREATE POLICY songs_insert_authenticated ON public.songs FOR INSERT TO authenticated WITH CHECK (
  public.is_user_active() AND ((is_canonical AND church_id IS NULL AND public.is_platform_admin())
    OR (NOT is_canonical AND church_id IS NOT NULL AND public.is_church_member(church_id)))
);
CREATE POLICY songs_update_authenticated ON public.songs FOR UPDATE TO authenticated USING (
  public.is_user_active() AND ((is_canonical AND church_id IS NULL AND public.is_platform_admin())
    OR (NOT is_canonical AND church_id IS NOT NULL AND public.has_church_role(church_id, 'worship_director')))
) WITH CHECK (
  public.is_user_active() AND ((is_canonical AND church_id IS NULL AND public.is_platform_admin())
    OR (NOT is_canonical AND church_id IS NOT NULL AND public.has_church_role(church_id, 'worship_director')))
);
CREATE POLICY songs_delete_authenticated ON public.songs FOR DELETE TO authenticated USING (
  public.is_user_active() AND ((is_canonical AND church_id IS NULL AND public.is_platform_admin())
    OR (NOT is_canonical AND church_id IS NOT NULL AND public.has_church_role(church_id, 'church_admin')))
);

CREATE POLICY versions_select_anon ON public.song_versions FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.songs AS song WHERE song.id = song_versions.song_id
    AND song.is_canonical AND song.church_id IS NULL)
);
CREATE POLICY versions_select_authenticated ON public.song_versions FOR SELECT TO authenticated USING (
  public.is_user_active() AND EXISTS (SELECT 1 FROM public.songs AS song WHERE song.id = song_versions.song_id
    AND ((song.is_canonical AND song.church_id IS NULL) OR public.is_church_member(song.church_id)))
);
CREATE POLICY versions_insert_authenticated ON public.song_versions FOR INSERT TO authenticated WITH CHECK (
  public.is_user_active() AND EXISTS (SELECT 1 FROM public.songs AS song WHERE song.id = song_versions.song_id
    AND ((song.is_canonical AND song.church_id IS NULL AND public.is_platform_admin())
      OR (NOT song.is_canonical AND song.church_id IS NOT NULL AND public.has_church_role(song.church_id, 'worship_director'))))
);
CREATE POLICY versions_update_authenticated ON public.song_versions FOR UPDATE TO authenticated USING (
  public.is_user_active() AND EXISTS (SELECT 1 FROM public.songs AS song WHERE song.id = song_versions.song_id
    AND ((song.is_canonical AND song.church_id IS NULL AND public.is_platform_admin())
      OR (NOT song.is_canonical AND song.church_id IS NOT NULL AND public.has_church_role(song.church_id, 'worship_director'))))
) WITH CHECK (
  public.is_user_active() AND EXISTS (SELECT 1 FROM public.songs AS song WHERE song.id = song_versions.song_id
    AND ((song.is_canonical AND song.church_id IS NULL AND public.is_platform_admin())
      OR (NOT song.is_canonical AND song.church_id IS NOT NULL AND public.has_church_role(song.church_id, 'worship_director'))))
);
CREATE POLICY versions_delete_authenticated ON public.song_versions FOR DELETE TO authenticated USING (
  public.is_user_active() AND EXISTS (SELECT 1 FROM public.songs AS song WHERE song.id = song_versions.song_id
    AND ((song.is_canonical AND song.church_id IS NULL AND public.is_platform_admin())
      OR (NOT song.is_canonical AND song.church_id IS NOT NULL AND public.has_church_role(song.church_id, 'worship_director'))))
);

CREATE POLICY repertoire_select_anon ON public.church_repertoire FOR SELECT TO anon USING (is_published);
CREATE POLICY repertoire_select_member ON public.church_repertoire FOR SELECT TO authenticated
  USING (public.is_church_member(church_id));
CREATE POLICY repertoire_insert_leader ON public.church_repertoire FOR INSERT TO authenticated
  WITH CHECK (public.has_church_role(church_id, 'worship_director'));
CREATE POLICY repertoire_update_leader ON public.church_repertoire FOR UPDATE TO authenticated
  USING (public.has_church_role(church_id, 'worship_director'))
  WITH CHECK (public.has_church_role(church_id, 'worship_director'));
CREATE POLICY repertoire_delete_leader ON public.church_repertoire FOR DELETE TO authenticated
  USING (public.has_church_role(church_id, 'worship_director'));
CREATE POLICY variants_select_anon ON public.song_variants FOR SELECT TO anon USING (EXISTS (
  SELECT 1 FROM public.church_repertoire AS repertoire JOIN public.song_versions AS version
    ON version.song_id = repertoire.song_id WHERE repertoire.church_id = song_variants.church_id
    AND version.id = song_variants.song_version_id AND repertoire.is_published
));
CREATE POLICY variants_select_member ON public.song_variants FOR SELECT TO authenticated
  USING (public.is_church_member(church_id));
CREATE POLICY variants_manage_leader ON public.song_variants FOR ALL TO authenticated
  USING (public.has_church_role(church_id, 'worship_director'))
  WITH CHECK (public.has_church_role(church_id, 'worship_director'));

CREATE POLICY teams_select_member ON public.teams FOR SELECT TO authenticated USING (public.is_church_member(church_id));
CREATE POLICY teams_insert_leader ON public.teams FOR INSERT TO authenticated WITH CHECK (public.has_church_role(church_id, 'worship_director'));
CREATE POLICY teams_update_leader ON public.teams FOR UPDATE TO authenticated USING (public.has_church_role(church_id, 'worship_director')) WITH CHECK (public.has_church_role(church_id, 'worship_director'));
CREATE POLICY teams_delete_admin ON public.teams FOR DELETE TO authenticated USING (public.has_church_role(church_id, 'church_admin'));
CREATE POLICY team_members_select_member ON public.team_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.teams AS team WHERE team.id = team_members.team_id AND public.is_church_member(team.church_id)));
CREATE POLICY team_members_manage_leader ON public.team_members FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.teams AS team WHERE team.id = team_members.team_id AND public.has_church_role(team.church_id, 'worship_director'))) WITH CHECK (EXISTS (SELECT 1 FROM public.teams AS team JOIN public.church_memberships AS membership ON membership.id = team_members.membership_id WHERE team.id = team_members.team_id AND membership.church_id = team.church_id AND public.has_church_role(team.church_id, 'worship_director')));
CREATE POLICY people_select_member ON public.people FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.church_memberships AS membership WHERE membership.id = people.membership_id AND public.is_church_member(membership.church_id)));
CREATE POLICY people_insert_own ON public.people FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.church_memberships AS membership WHERE membership.id = people.membership_id AND membership.user_id = auth.uid() AND public.is_church_member(membership.church_id)));
CREATE POLICY people_update_own ON public.people FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.church_memberships AS membership WHERE membership.id = people.membership_id AND membership.user_id = auth.uid() AND public.is_church_member(membership.church_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.church_memberships AS membership WHERE membership.id = people.membership_id AND membership.user_id = auth.uid() AND public.is_church_member(membership.church_id)));

CREATE POLICY services_select_anon ON public.services FOR SELECT TO anon USING (is_published AND status IN ('active', 'completed'));
CREATE POLICY services_select_authenticated ON public.services FOR SELECT TO authenticated USING (public.is_user_active() AND (public.is_church_member(church_id) OR (is_published AND status IN ('active', 'completed'))));
CREATE POLICY services_insert_leader ON public.services FOR INSERT TO authenticated WITH CHECK (public.has_church_role(church_id, 'worship_director') AND timezone = 'America/Mexico_City' AND EXISTS (SELECT 1 FROM public.teams AS team WHERE team.id = services.team_id AND team.church_id = services.church_id));
CREATE POLICY services_update_leader ON public.services FOR UPDATE TO authenticated USING (public.has_church_role(church_id, 'worship_director')) WITH CHECK (public.has_church_role(church_id, 'worship_director') AND timezone = 'America/Mexico_City' AND EXISTS (SELECT 1 FROM public.teams AS team WHERE team.id = services.team_id AND team.church_id = services.church_id));
CREATE POLICY services_delete_admin ON public.services FOR DELETE TO authenticated USING (public.has_church_role(church_id, 'church_admin'));
CREATE POLICY setlists_select_anon ON public.setlists FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.services AS service WHERE service.id = setlists.service_id AND service.is_published AND service.status IN ('active', 'completed')));
CREATE POLICY setlists_select_member ON public.setlists FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.services AS service WHERE service.id = setlists.service_id AND public.is_church_member(service.church_id)));
CREATE POLICY setlists_manage_leader ON public.setlists FOR ALL TO authenticated USING (frozen_at IS NULL AND EXISTS (SELECT 1 FROM public.services AS service WHERE service.id = setlists.service_id AND public.has_church_role(service.church_id, 'worship_director'))) WITH CHECK (frozen_at IS NULL AND EXISTS (SELECT 1 FROM public.services AS service WHERE service.id = setlists.service_id AND public.has_church_role(service.church_id, 'worship_director')));
CREATE POLICY setlists_freeze_leader ON public.setlists FOR UPDATE TO authenticated USING (frozen_at IS NULL AND EXISTS (SELECT 1 FROM public.services AS service WHERE service.id = setlists.service_id AND public.has_church_role(service.church_id, 'worship_director'))) WITH CHECK (frozen_at IS NOT NULL AND frozen_content IS NOT NULL AND EXISTS (SELECT 1 FROM public.services AS service WHERE service.id = setlists.service_id AND public.has_church_role(service.church_id, 'worship_director')));
CREATE POLICY items_select_anon ON public.setlist_items FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.setlists AS setlist JOIN public.services AS service ON service.id = setlist.service_id WHERE setlist.id = setlist_items.setlist_id AND service.is_published AND service.status IN ('active', 'completed')));
CREATE POLICY items_select_member ON public.setlist_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.setlists AS setlist JOIN public.services AS service ON service.id = setlist.service_id WHERE setlist.id = setlist_items.setlist_id AND public.is_church_member(service.church_id)));
CREATE POLICY items_manage_leader ON public.setlist_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.setlists AS setlist JOIN public.services AS service ON service.id = setlist.service_id WHERE setlist.id = setlist_items.setlist_id AND setlist.frozen_at IS NULL AND public.has_church_role(service.church_id, 'worship_director'))) WITH CHECK (EXISTS (SELECT 1 FROM public.setlists AS setlist JOIN public.services AS service ON service.id = setlist.service_id WHERE setlist.id = setlist_items.setlist_id AND setlist.frozen_at IS NULL AND public.has_church_role(service.church_id, 'worship_director')));
CREATE POLICY participants_select_member ON public.service_participants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.services AS service WHERE service.id = service_participants.service_id AND public.is_church_member(service.church_id)));
CREATE POLICY participants_manage_leader ON public.service_participants FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.services AS service WHERE service.id = service_participants.service_id AND public.has_church_role(service.church_id, 'worship_director'))) WITH CHECK (EXISTS (SELECT 1 FROM public.services AS service JOIN public.church_memberships AS membership ON membership.id = service_participants.membership_id WHERE service.id = service_participants.service_id AND membership.church_id = service.church_id AND public.has_church_role(service.church_id, 'worship_director')));
CREATE POLICY roles_select_member ON public.service_member_roles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.service_participants AS participant JOIN public.services AS service ON service.id = participant.service_id WHERE participant.id = service_member_roles.service_participant_id AND public.is_church_member(service.church_id)));
CREATE POLICY roles_manage_leader ON public.service_member_roles FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.service_participants AS participant JOIN public.services AS service ON service.id = participant.service_id WHERE participant.id = service_member_roles.service_participant_id AND public.has_church_role(service.church_id, 'worship_director'))) WITH CHECK (EXISTS (SELECT 1 FROM public.service_participants AS participant JOIN public.services AS service ON service.id = participant.service_id WHERE participant.id = service_member_roles.service_participant_id AND public.has_church_role(service.church_id, 'worship_director')));

REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid), public.is_platform_admin(), public.activate_current_user(), public.is_church_member(uuid), public.has_church_role(uuid, public.church_role), public.is_curator(), public.create_church(text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_adopt_canonical_song() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid), public.is_platform_admin(), public.is_church_member(uuid), public.has_church_role(uuid, public.church_role), public.is_curator(), public.create_church(text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_current_user() TO authenticated;
