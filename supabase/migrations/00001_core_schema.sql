-- ============================================================
-- SelahPlan Core Schema
-- Single atomic migration: enums, functions, tables, indexes, RLS
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE church_type AS ENUM ('managed', 'lightweight');
CREATE TYPE church_role AS ENUM ('church_admin', 'worship_director', 'member');
CREATE TYPE service_status AS ENUM ('planned', 'active', 'completed');

-- ============================================================
-- 2. HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================

-- Returns true if auth.uid() is a member of the given church
CREATE OR REPLACE FUNCTION is_church_member(church_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM church_memberships
    WHERE user_id = auth.uid()
      AND church_id = church_uuid
  );
$$;

-- Returns true if auth.uid() has at least the given role in the church
CREATE OR REPLACE FUNCTION has_church_role(church_uuid uuid, min_role church_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM church_memberships
    WHERE user_id = auth.uid()
      AND church_id = church_uuid
      AND (
        role = min_role
        OR (min_role = 'worship_director' AND role = 'church_admin')
        OR (min_role = 'member' AND role IN ('church_admin', 'worship_director'))
      )
  );
$$;

-- Returns true if auth.uid() is a global curator
CREATE OR REPLACE FUNCTION is_curator()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM global_curators
    WHERE user_id = auth.uid()
  );
$$;

-- ============================================================
-- 3. TABLES
-- ============================================================

-- 3.1 churches — root of all tenancy
CREATE TABLE churches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  type        church_type NOT NULL DEFAULT 'managed',
  timezone    text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3.2 church_memberships — links auth.users to churches
CREATE TABLE church_memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id  uuid NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  role       church_role NOT NULL DEFAULT 'member',
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, church_id)
);

-- 3.3 global_curators — canonical catalog governance
CREATE TABLE global_curators (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by  uuid NOT NULL REFERENCES auth.users(id),
  granted_at  timestamptz NOT NULL DEFAULT now()
);

-- 3.4 songs — canonical and church-owned songs
CREATE TABLE songs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  author          text,
  tempo           integer,
  tags            text[] NOT NULL DEFAULT '{}',
  reference_urls  jsonb NOT NULL DEFAULT '{}'::jsonb,
  church_id       uuid REFERENCES churches(id) ON DELETE SET NULL,
  is_canonical    boolean NOT NULL DEFAULT false,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3.5 song_versions — multiple versions per song
CREATE TABLE song_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id       uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  version_name  text NOT NULL,
  key           text NOT NULL,
  chordpro_content text NOT NULL,
  notes         text,
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3.6 church_repertoire — songs adopted by a church
CREATE TABLE church_repertoire (
  church_id     uuid NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  song_id       uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  adopted_at    timestamptz NOT NULL DEFAULT now(),
  adopted_by    uuid NOT NULL REFERENCES auth.users(id),
  is_published  boolean NOT NULL DEFAULT false,
  archived_at   timestamptz,
  PRIMARY KEY (church_id, song_id)
);

-- 3.7 song_variants — church-local overrides for a version
CREATE TABLE song_variants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id        uuid NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  song_version_id  uuid NOT NULL REFERENCES song_versions(id) ON DELETE CASCADE,
  local_key        text NOT NULL,
  local_content    text,
  local_notes      text,
  created_by       uuid NOT NULL REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 3.8 teams — musical groups within a church
CREATE TABLE teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   uuid NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3.9 team_members — membership in a team
CREATE TABLE team_members (
  team_id       uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES church_memberships(id) ON DELETE CASCADE,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, membership_id)
);

-- 3.10 people — per-church musical profile
CREATE TABLE people (
  membership_id  uuid PRIMARY KEY REFERENCES church_memberships(id) ON DELETE CASCADE,
  display_name   text NOT NULL,
  instruments    text[] NOT NULL DEFAULT '{}',
  musical_roles  text[] NOT NULL DEFAULT '{}'
);

-- 3.11 services — a church service/meeting
CREATE TABLE services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     uuid NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  team_id       uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  service_date  date NOT NULL,
  start_time    time NOT NULL,
  timezone      text NOT NULL,
  status        service_status NOT NULL DEFAULT 'planned',
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3.12 setlists — one per service, optional frozen snapshot
CREATE TABLE setlists (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      uuid NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  frozen_at       timestamptz,
  frozen_content  jsonb
);

-- 3.13 setlist_items — ordered songs in a setlist
CREATE TABLE setlist_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id       uuid NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  song_id          uuid NOT NULL REFERENCES songs(id) ON DELETE RESTRICT,
  song_version_id  uuid NOT NULL REFERENCES song_versions(id) ON DELETE RESTRICT,
  key              text NOT NULL,
  notes            text,
  sort_order       integer NOT NULL,
  UNIQUE (setlist_id, sort_order)
);

-- 3.14 service_participants — roster for a service
CREATE TABLE service_participants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id     uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  membership_id  uuid NOT NULL REFERENCES church_memberships(id) ON DELETE CASCADE,
  UNIQUE (service_id, membership_id)
);

-- 3.15 service_member_roles — multi-role per participant
CREATE TABLE service_member_roles (
  service_participant_id  uuid NOT NULL REFERENCES service_participants(id) ON DELETE CASCADE,
  role                    text NOT NULL,
  PRIMARY KEY (service_participant_id, role)
);

-- ============================================================
-- 4. INDEXES
-- ============================================================

-- churches
CREATE INDEX idx_churches_slug ON churches (slug);

-- church_memberships
CREATE INDEX idx_memberships_user ON church_memberships (user_id);
CREATE INDEX idx_memberships_church ON church_memberships (church_id);

-- songs
CREATE INDEX idx_songs_church ON songs (church_id);
CREATE INDEX idx_songs_created_by ON songs (created_by);
CREATE INDEX idx_songs_tags ON songs USING gin (tags);

-- song_versions
CREATE INDEX idx_versions_song ON song_versions (song_id);

-- church_repertoire
CREATE INDEX idx_repertoire_church ON church_repertoire (church_id);
CREATE INDEX idx_repertoire_song ON church_repertoire (song_id);

-- song_variants
CREATE INDEX idx_variants_church ON song_variants (church_id);
CREATE INDEX idx_variants_version ON song_variants (song_version_id);

-- teams
CREATE INDEX idx_teams_church ON teams (church_id);

-- team_members
CREATE INDEX idx_team_members_membership ON team_members (membership_id);

-- services
CREATE INDEX idx_services_church ON services (church_id);
CREATE INDEX idx_services_team ON services (team_id);

-- setlist_items
CREATE INDEX idx_setlist_items_setlist ON setlist_items (setlist_id);

-- service_participants
CREATE INDEX idx_participants_service ON service_participants (service_id);
CREATE INDEX idx_participants_membership ON service_participants (membership_id);

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

-- 5.1 churches
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "churches_select_anon" ON churches
  FOR SELECT TO anon USING (true);
CREATE POLICY "churches_select_auth" ON churches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "churches_insert_auth" ON churches
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "churches_update_admin" ON churches
  FOR UPDATE TO authenticated
  USING (has_church_role(id, 'church_admin'));
CREATE POLICY "churches_delete_admin" ON churches
  FOR DELETE TO authenticated
  USING (has_church_role(id, 'church_admin'));

-- 5.2 church_memberships
ALTER TABLE church_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships_select_member" ON church_memberships
  FOR SELECT TO authenticated
  USING (is_church_member(church_id));
CREATE POLICY "memberships_insert_admin" ON church_memberships
  FOR INSERT TO authenticated
  WITH CHECK (has_church_role(church_id, 'church_admin'));
CREATE POLICY "memberships_update_admin" ON church_memberships
  FOR UPDATE TO authenticated
  USING (has_church_role(church_id, 'church_admin'));
CREATE POLICY "memberships_delete_admin" ON church_memberships
  FOR DELETE TO authenticated
  USING (has_church_role(church_id, 'church_admin'));

-- 5.3 global_curators
ALTER TABLE global_curators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "curators_select_auth" ON global_curators
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "curators_insert_curator" ON global_curators
  FOR INSERT TO authenticated
  WITH CHECK (is_curator());
CREATE POLICY "curators_delete_curator" ON global_curators
  FOR DELETE TO authenticated
  USING (is_curator());

-- 5.4 songs — canonical or church-owned
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "songs_select_auth" ON songs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "songs_select_anon" ON songs
  FOR SELECT TO anon USING (is_canonical = true);
CREATE POLICY "songs_insert_authenticated" ON songs
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_canonical = true AND is_curator())
    OR (is_canonical = false AND is_church_member(church_id))
  );
CREATE POLICY "songs_update_canonical" ON songs
  FOR UPDATE TO authenticated
  USING (
    (is_canonical = true AND is_curator())
    OR (is_canonical = false AND has_church_role(church_id, 'church_admin'))
  );
CREATE POLICY "songs_delete_canonical" ON songs
  FOR DELETE TO authenticated
  USING (
    (is_canonical = true AND is_curator())
    OR (is_canonical = false AND has_church_role(church_id, 'church_admin'))
  );

-- 5.5 song_versions
ALTER TABLE song_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions_select_auth" ON song_versions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "versions_select_anon" ON song_versions
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM songs WHERE songs.id = song_versions.song_id AND songs.is_canonical = true
  ));
CREATE POLICY "versions_insert_curator" ON song_versions
  FOR INSERT TO authenticated
  WITH CHECK (is_curator());
CREATE POLICY "versions_update_curator" ON song_versions
  FOR UPDATE TO authenticated
  USING (is_curator());
CREATE POLICY "versions_delete_curator" ON song_versions
  FOR DELETE TO authenticated
  USING (is_curator());

-- 5.6 church_repertoire
ALTER TABLE church_repertoire ENABLE ROW LEVEL SECURITY;
CREATE POLICY "repertoire_select_member" ON church_repertoire
  FOR SELECT TO authenticated
  USING (is_church_member(church_id));
CREATE POLICY "repertoire_select_anon" ON church_repertoire
  FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY "repertoire_insert_member" ON church_repertoire
  FOR INSERT TO authenticated
  WITH CHECK (is_church_member(church_id));
CREATE POLICY "repertoire_update_admin" ON church_repertoire
  FOR UPDATE TO authenticated
  USING (has_church_role(church_id, 'church_admin'));
CREATE POLICY "repertoire_delete_admin" ON church_repertoire
  FOR DELETE TO authenticated
  USING (has_church_role(church_id, 'church_admin'));

-- 5.7 song_variants
ALTER TABLE song_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants_select_member" ON song_variants
  FOR SELECT TO authenticated
  USING (is_church_member(church_id));
CREATE POLICY "variants_select_anon" ON song_variants
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM church_repertoire cr
    WHERE cr.church_id = song_variants.church_id
      AND cr.song_id = (
        SELECT sv.song_id FROM song_versions sv WHERE sv.id = song_variants.song_version_id
      )
      AND cr.is_published = true
  ));
CREATE POLICY "variants_insert_member" ON song_variants
  FOR INSERT TO authenticated
  WITH CHECK (is_church_member(church_id));
CREATE POLICY "variants_update_owner" ON song_variants
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "variants_delete_owner" ON song_variants
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- 5.8 teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams_select_member" ON teams
  FOR SELECT TO authenticated
  USING (is_church_member(church_id));
CREATE POLICY "teams_insert_leader" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (has_church_role(church_id, 'worship_director'));
CREATE POLICY "teams_update_leader" ON teams
  FOR UPDATE TO authenticated
  USING (has_church_role(church_id, 'worship_director'));
CREATE POLICY "teams_delete_admin" ON teams
  FOR DELETE TO authenticated
  USING (has_church_role(church_id, 'church_admin'));

-- 5.9 team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_members_select_member" ON team_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND is_church_member(teams.church_id)
  ));
CREATE POLICY "team_members_insert_leader" ON team_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND has_church_role(teams.church_id, 'worship_director')
  ));
CREATE POLICY "team_members_delete_leader" ON team_members
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND has_church_role(teams.church_id, 'worship_director')
  ));

-- 5.10 people
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "people_select_member" ON people
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM church_memberships cm
    WHERE cm.id = people.membership_id AND is_church_member(cm.church_id)
  ));
CREATE POLICY "people_insert_own" ON people
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM church_memberships cm
    WHERE cm.id = people.membership_id AND cm.user_id = auth.uid()
  ));
CREATE POLICY "people_update_own" ON people
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM church_memberships cm
    WHERE cm.id = people.membership_id AND cm.user_id = auth.uid()
  ));

-- 5.11 services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_select_member" ON services
  FOR SELECT TO authenticated
  USING (is_church_member(church_id));
CREATE POLICY "services_select_anon" ON services
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM churches c WHERE c.id = services.church_id
  ));
CREATE POLICY "services_insert_leader" ON services
  FOR INSERT TO authenticated
  WITH CHECK (has_church_role(church_id, 'worship_director'));
CREATE POLICY "services_update_leader" ON services
  FOR UPDATE TO authenticated
  USING (has_church_role(church_id, 'worship_director'));
CREATE POLICY "services_delete_admin" ON services
  FOR DELETE TO authenticated
  USING (has_church_role(church_id, 'church_admin'));

-- 5.12 setlists
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setlists_select_member" ON setlists
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM services s WHERE s.id = setlists.service_id AND is_church_member(s.church_id)
  ));
CREATE POLICY "setlists_select_anon" ON setlists
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM services s WHERE s.id = setlists.service_id
  ));
CREATE POLICY "setlists_insert_leader" ON setlists
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM services s WHERE s.id = setlists.service_id AND has_church_role(s.church_id, 'worship_director')
  ));
CREATE POLICY "setlists_update_leader" ON setlists
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM services s WHERE s.id = setlists.service_id AND has_church_role(s.church_id, 'worship_director')
    )
    AND frozen_at IS NULL
  );
CREATE POLICY "setlists_delete_admin" ON setlists
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM services s WHERE s.id = setlists.service_id AND has_church_role(s.church_id, 'church_admin')
  ));

-- 5.13 setlist_items
ALTER TABLE setlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select_member" ON setlist_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM setlists sl
    JOIN services s ON s.id = sl.service_id
    WHERE sl.id = setlist_items.setlist_id AND is_church_member(s.church_id)
  ));
CREATE POLICY "items_select_anon" ON setlist_items
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM setlists sl WHERE sl.id = setlist_items.setlist_id
  ));
CREATE POLICY "items_insert_leader" ON setlist_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM setlists sl
    JOIN services s ON s.id = sl.service_id
    WHERE sl.id = setlist_items.setlist_id AND has_church_role(s.church_id, 'worship_director')
  ));
CREATE POLICY "items_update_leader" ON setlist_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM setlists sl
    JOIN services s ON s.id = sl.service_id
    WHERE sl.id = setlist_items.setlist_id AND has_church_role(s.church_id, 'worship_director')
  ));
CREATE POLICY "items_delete_leader" ON setlist_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM setlists sl
    JOIN services s ON s.id = sl.service_id
    WHERE sl.id = setlist_items.setlist_id AND has_church_role(s.church_id, 'worship_director')
  ));

-- 5.14 service_participants
ALTER TABLE service_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_select_member" ON service_participants
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM services s WHERE s.id = service_participants.service_id AND is_church_member(s.church_id)
  ));
CREATE POLICY "participants_insert_leader" ON service_participants
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM services s WHERE s.id = service_participants.service_id AND has_church_role(s.church_id, 'worship_director')
  ));
CREATE POLICY "participants_delete_leader" ON service_participants
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM services s WHERE s.id = service_participants.service_id AND has_church_role(s.church_id, 'worship_director')
  ));

-- 5.15 service_member_roles
ALTER TABLE service_member_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select_member" ON service_member_roles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_participants sp
    JOIN services s ON s.id = sp.service_id
    WHERE sp.id = service_member_roles.service_participant_id AND is_church_member(s.church_id)
  ));
CREATE POLICY "roles_insert_leader" ON service_member_roles
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM service_participants sp
    JOIN services s ON s.id = sp.service_id
    WHERE sp.id = service_member_roles.service_participant_id AND has_church_role(s.church_id, 'worship_director')
  ));
CREATE POLICY "roles_delete_leader" ON service_member_roles
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_participants sp
    JOIN services s ON s.id = sp.service_id
    WHERE sp.id = service_member_roles.service_participant_id AND has_church_role(s.church_id, 'worship_director')
  ));

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Auto-update setlists.updated_at
CREATE OR REPLACE FUNCTION update_setlist_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER setlists_updated_at
  BEFORE UPDATE ON setlists
  FOR EACH ROW
  EXECUTE FUNCTION update_setlist_updated_at();

-- Auto-adopt canonical songs into church_repertoire when created by a church member
CREATE OR REPLACE FUNCTION auto_adopt_canonical_song()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_canonical = true AND NEW.church_id IS NULL THEN
    -- Canonical songs are adopted by churches on first use, not on creation
    -- This function is intentionally empty; adoption happens explicitly
    NULL;
  ELSIF NEW.church_id IS NOT NULL THEN
    -- Church-owned songs are auto-adopted by that church
    INSERT INTO church_repertoire (church_id, song_id, adopted_by)
    VALUES (NEW.church_id, NEW.id, NEW.created_by)
    ON CONFLICT (church_id, song_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_adopt_song
  AFTER INSERT ON songs
  FOR EACH ROW
  EXECUTE FUNCTION auto_adopt_canonical_song();
