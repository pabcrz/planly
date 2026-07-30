-- ============================================================
-- SelahPlan Seed Data
-- Exercises every table, role, and RLS policy path
-- ============================================================

-- ============================================================
-- 1. USERS (auth.users — Supabase managed, use raw inserts)
-- ============================================================

-- These are placeholder UUIDs. In a real local dev setup, create users
-- via supabase dashboard or `supabase functions serve` with invite flow.
-- For dev, we insert directly into auth.users (requires supabase seed privilege).

-- Admin 1 (Iglesia Gracia)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@iglesiagracia.org', '{"name":"Carlos Admin"}');

-- Worship Director 1 (Iglesia Gracia)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000002', 'lider@iglesiagracia.org', '{"name":"María Líder"}');

-- Member 1 (Iglesia Gracia)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000003', 'miembro@iglesiagracia.org', '{"name":"Pedro Músico"}');

-- Admin 2 (Ministerio Selah)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000004', 'admin@ministerioselah.org', '{"name":"Ana Admin"}');

-- Worship Director 2 (Ministerio Selah)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000005', 'lider@ministerioselah.org', '{"name":"David Líder"}');

-- Member 2 (Ministerio Selah)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000006', 'miembro@ministerioselah.org', '{"name":"Lucía Vocalista"}');

-- Curator (global catalog governance)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000007', 'curador@selahplan.org', '{"name":"Juan Curador"}');

-- Lightweight church member (Colectivo Adoración)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000008', 'usuario@colectivoadoracion.org', '{"name":"Sofía Lectora"}');

-- ============================================================
-- 2. CHURCHES
-- ============================================================

INSERT INTO churches (id, name, slug, type, timezone)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Iglesia Gracia', 'iglesia-gracia', 'managed', 'America/Argentina/Buenos_Aires'),
  ('10000000-0000-0000-0000-000000000002', 'Ministerio Selah', 'ministerio-selah', 'managed', 'America/Argentina/Buenos_Aires'),
  ('10000000-0000-0000-0000-000000000003', 'Colectivo Adoración', 'colectivo-adoracion', 'lightweight', 'America/Argentina/Cordoba');

-- ============================================================
-- 3. MEMBERSHIPS
-- ============================================================

-- Iglesia Gracia
INSERT INTO church_memberships (id, user_id, church_id, role)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'church_admin'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'worship_director'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'member');

-- Ministerio Selah
INSERT INTO church_memberships (id, user_id, church_id, role)
VALUES
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'church_admin'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'worship_director'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'member');

-- Colectivo Adoración (lightweight — member only)
INSERT INTO church_memberships (id, user_id, church_id, role)
VALUES
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', 'member');

-- ============================================================
-- 4. GLOBAL CURATOR
-- ============================================================

INSERT INTO global_curators (user_id, granted_by)
VALUES ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- 5. CANONICAL SONGS
-- ============================================================

INSERT INTO songs (id, title, author, tempo, tags, is_canonical, created_by)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'Sublime Gracia', 'John Newton', 72, '{himno,clásico,gracia}', true, '00000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000002', 'Grande es Tu Fidelidad', 'Thomas Chisholm', 68, '{himno,fidelidad,clásico}', true, '00000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000003', 'Digno de Adorar', 'Hillsong', 76, '{contemporáneo,adoración}', true, '00000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000004', 'Rey de Gloria', 'Marcos Witt', 82, '{contemporáneo,alabanza}', true, '00000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000005', 'Eres Todopoderoso', 'Danilo Montero', 74, '{contemporáneo,adoración,poder}', true, '00000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000006', 'En Espíritu y en Verdad', 'Ingrid Rosario', 70, '{contemporáneo,intimidad}', true, '00000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000007', 'Al Que Está Sentado en el Trono', 'Marco Barrientos', 78, '{contemporáneo,adoración,trono}', true, '00000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000008', 'Quiero Más de Ti', 'Jaime Murrell', 66, '{contemporáneo,anhelo,intimidad}', true, '00000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000009', 'Poderoso Para Salvar', 'Hillsong', 80, '{contemporáneo,salvación,poder}', true, '00000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000010', 'Nada Es Imposible', 'Planetshakers', 90, '{contemporáneo,fe,energía}', true, '00000000-0000-0000-0000-000000000007');

-- ============================================================
-- 6. SONG VERSIONS
-- ============================================================

INSERT INTO song_versions (id, song_id, version_name, key, chordpro_content, created_by)
VALUES
  -- Sublime Gracia (2 versions)
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Original', 'G', '{title: Sublime Gracia}\n{key: G}\n[G]Sublime gracia del Se[G7]ñor\n[C]que a un infeliz sal[G]vó', '00000000-0000-0000-0000-000000000007'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Versión Moderna', 'D', '{title: Sublime Gracia}\n{key: D}\n[D]Sublime gracia del Se[A]ñor\n[G]que a un infeliz sal[D]vó', '00000000-0000-0000-0000-000000000007'),

  -- Grande es Tu Fidelidad
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Original', 'Eb', '{title: Grande es Tu Fidelidad}\n{key: Eb}\n[Eb]Oh Dios eterno tu mise[Ab]ricordia\n[Bb]ni una sombra de duda ten[Eb]drá', '00000000-0000-0000-0000-000000000007'),

  -- Digno de Adorar
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', 'Original', 'A', '{title: Digno de Adorar}\n{key: A}\n[A]Digno de adorar\n[E]digno de alabar\n[D]te doy mi corazón', '00000000-0000-0000-0000-000000000007'),

  -- Rey de Gloria (2 versions)
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000004', 'Original', 'C', '{title: Rey de Gloria}\n{key: C}\n[C]Rey de gloria\n[G]rey de majestad\n[Am]levantamos nuestra [F]voz', '00000000-0000-0000-0000-000000000007'),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000004', 'Acústico', 'G', '{title: Rey de Gloria (Acústico)}\n{key: G}\n[G]Rey de gloria\n[D]rey de majestad\n[Em]levantamos nuestra [C]voz', '00000000-0000-0000-0000-000000000007'),

  -- Eres Todopoderoso
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000005', 'Original', 'D', '{title: Eres Todopoderoso}\n{key: D}\n[D]Eres todopoderoso\n[G]eres grande y fuerte\n[A]no hay nadie como [D]tú', '00000000-0000-0000-0000-000000000007'),

  -- En Espíritu y en Verdad
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000006', 'Original', 'E', '{title: En Espíritu y en Verdad}\n{key: E}\n[E]En espíritu y en verdad\n[A]te adoraré\n[B]te adora[E]ré', '00000000-0000-0000-0000-000000000007'),

  -- Al Que Está Sentado
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000007', 'Original', 'G', '{title: Al Que Está Sentado}\n{key: G}\n[G]Al que está sentado en el [C]trono\n[D]sea la gloria y el po[G]der', '00000000-0000-0000-0000-000000000007'),

  -- Quiero Más de Ti
  ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000008', 'Original', 'A', '{title: Quiero Más de Ti}\n{key: A}\n[A]Quiero más de ti\n[D]hambriento estoy\n[E]lléname de tu pre[A]sencia', '00000000-0000-0000-0000-000000000007'),

  -- Poderoso Para Salvar
  ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000009', 'Original', 'A', '{title: Poderoso Para Salvar}\n{key: A}\n[A]Poderoso para salvar\n[D]poderoso para li[E]brar\n[F#m]Cristo el Señor', '00000000-0000-0000-0000-000000000007'),

  -- Nada Es Imposible (2 versions)
  ('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000010', 'Original', 'B', '{title: Nada Es Imposible}\n{key: B}\n[B]Nada es imposible para [E]ti\n[F#]no hay cadena que no puedas rom[B]per', '00000000-0000-0000-0000-000000000007'),
  ('40000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000010', 'En Español', 'B', '{title: Nada Es Imposible}\n{key: B}\n{subtitle: Versión en Español}\n[B]Nada es imposible para [E]ti\n[F#]no hay cadena que no puedas rom[B]per', '00000000-0000-0000-0000-000000000007');

-- ============================================================
-- 7. CHURCH REPERTOIRE
-- ============================================================

-- Iglesia Gracia adopts 6 songs (2 published)
INSERT INTO church_repertoire (church_id, song_id, adopted_by, is_published)
VALUES
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', false),
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', false),
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', false),
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002', false);

-- Ministerio Selah adopts 6 songs (2 published)
INSERT INTO church_repertoire (church_id, song_id, adopted_by, is_published)
VALUES
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', true),
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', true),
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', false),
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000005', false),
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000005', false),
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', false);

-- Colectivo Adoración adopts 3 songs (all published — lightweight church focuses on public access)
INSERT INTO church_repertoire (church_id, song_id, adopted_by, is_published)
VALUES
  ('10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008', true),
  ('10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', true),
  ('10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', true);

-- ============================================================
-- 8. SONG VARIANTS
-- ============================================================

-- Iglesia Gracia variants
INSERT INTO song_variants (id, church_id, song_version_id, local_key, local_notes, created_by)
VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'A', 'Subimos un tono para la congregación', '00000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'D', 'Versión más lenta para el jueves', '00000000-0000-0000-0000-000000000002');

-- Ministerio Selah variants
INSERT INTO song_variants (id, church_id, song_version_id, local_key, local_notes, created_by)
VALUES
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000012', 'A', 'Bajamos medio tono para la vocalista', '00000000-0000-0000-0000-000000000005'),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', 'D', 'Transportamos a D para los vientos', '00000000-0000-0000-0000-000000000005');

-- ============================================================
-- 9. TEAMS
-- ============================================================

-- Iglesia Gracia: 2 teams
INSERT INTO teams (id, church_id, name, description)
VALUES
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Equipo Alpha', 'Equipo principal de domingo mañana'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Equipo Jueves', 'Servicio de jueves noche');

-- Ministerio Selah: 1 team (the second church only has one team for MVP)
INSERT INTO teams (id, church_id, name, description)
VALUES
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Selah Band', 'Equipo musical del ministerio');

-- ============================================================
-- 10. TEAM MEMBERS
-- ============================================================

INSERT INTO team_members (team_id, membership_id)
VALUES
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),  -- María líder en Alpha
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003'),  -- Pedro músico en Alpha
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),  -- María líder en Jueves
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005'),  -- David líder en Selah Band
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006');  -- Lucía vocalista en Selah Band

-- ============================================================
-- 11. PEOPLE (musical profiles)
-- ============================================================

INSERT INTO people (membership_id, display_name, instruments, musical_roles)
VALUES
  ('20000000-0000-0000-0000-000000000002', 'María Líder', '{piano,voz}', '{líder,vocalista}'),
  ('20000000-0000-0000-0000-000000000003', 'Pedro Músico', '{guitarra_acústica,guitarra_eléctrica}', '{guitarrista,vocalista}'),
  ('20000000-0000-0000-0000-000000000005', 'David Líder', '{piano,bajo}', '{líder,director}'),
  ('20000000-0000-0000-0000-000000000006', 'Lucía Vocalista', '{voz}', '{vocalista}');

-- ============================================================
-- 12. SERVICES
-- ============================================================

-- Iglesia Gracia: 3 services (planned, active, completed)
INSERT INTO services (id, church_id, team_id, service_date, start_time, timezone, status, notes)
VALUES
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '2026-07-30', '10:00', 'America/Argentina/Buenos_Aires', 'planned', 'Servicio del próximo domingo'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', '2026-07-29', '20:00', 'America/Argentina/Buenos_Aires', 'active', 'Servicio de jueves en curso'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '2026-07-27', '10:00', 'America/Argentina/Buenos_Aires', 'completed', 'Servicio del domingo pasado');

-- Ministerio Selah: 1 service (planned)
INSERT INTO services (id, church_id, team_id, service_date, start_time, timezone, status)
VALUES
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', '2026-08-02', '11:00', 'America/Argentina/Buenos_Aires', 'planned');

-- ============================================================
-- 13. SETLISTS
-- ============================================================

-- Iglesia Gracia: setlist for planned service (not frozen)
INSERT INTO setlists (id, service_id)
VALUES ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001');

-- Iglesia Gracia: setlist for active service (not frozen yet)
INSERT INTO setlists (id, service_id)
VALUES ('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002');

-- Iglesia Gracia: setlist for completed service (FROZEN)
INSERT INTO setlists (id, service_id, frozen_at, frozen_content)
VALUES (
  '80000000-0000-0000-0000-000000000003',
  '70000000-0000-0000-0000-000000000003',
  '2026-07-27T23:59:59-03:00',
  '{
    "version": 1,
    "frozen_at": "2026-07-27T23:59:59-03:00",
    "items": [
      {
        "song_title": "Sublime Gracia",
        "version_name": "Original",
        "key": "G",
        "chordpro_content": "{title: Sublime Gracia}\\n{key: G}\\n[G]Sublime gracia del Se[G7]ñor\\n[C]que a un infeliz sal[G]vó",
        "notes": "Apertura suave",
        "sort_order": 1
      },
      {
        "song_title": "Rey de Gloria",
        "version_name": "Original",
        "key": "C",
        "chordpro_content": "{title: Rey de Gloria}\\n{key: C}\\n[C]Rey de gloria\\n[G]rey de majestad\\n[Am]levantamos nuestra [F]voz",
        "notes": null,
        "sort_order": 2
      },
      {
        "song_title": "Eres Todopoderoso",
        "version_name": "Original",
        "key": "D",
        "chordpro_content": "{title: Eres Todopoderoso}\\n{key: D}\\n[D]Eres todopoderoso\\n[G]eres grande y fuerte\\n[A]no hay nadie como [D]tú",
        "notes": "Canción central del servicio",
        "sort_order": 3
      },
      {
        "song_title": "Poderoso Para Salvar",
        "version_name": "Original",
        "key": "A",
        "chordpro_content": "{title: Poderoso Para Salvar}\\n{key: A}\\n[A]Poderoso para salvar\\n[D]poderoso para li[E]brar\\n[F#m]Cristo el Señor",
        "notes": null,
        "sort_order": 4
      },
      {
        "song_title": "Al Que Está Sentado",
        "version_name": "Original",
        "key": "G",
        "chordpro_content": "{title: Al Que Está Sentado}\\n{key: G}\\n[G]Al que está sentado en el [C]trono\\n[D]sea la gloria y el po[G]der",
        "notes": "Cierre de adoración",
        "sort_order": 5
      }
    ]
  }'::jsonb
);

-- Ministerio Selah: setlist for planned service
INSERT INTO setlists (id, service_id)
VALUES ('80000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000004');

-- ============================================================
-- 14. SETLIST ITEMS
-- ============================================================

-- Planned service (Iglesia Gracia) — 4 items
INSERT INTO setlist_items (id, setlist_id, song_id, song_version_id, key, notes, sort_order)
VALUES
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'G', 'Apertura suave', 1),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004', 'A', NULL, 2),
  ('90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000007', 'D', 'Canción central', 3),
  ('90000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000011', 'A', 'Cierre', 4);

-- Active service (Iglesia Gracia) — 3 items
INSERT INTO setlist_items (id, setlist_id, song_id, song_version_id, key, notes, sort_order)
VALUES
  ('90000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000005', 'C', NULL, 1),
  ('90000000-0000-0000-0000-000000000006', '80000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000009', 'G', NULL, 2),
  ('90000000-0000-0000-0000-000000000007', '80000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000007', 'D', 'Última canción de la noche', 3);

-- Ministerio Selah planned — 3 items
INSERT INTO setlist_items (id, setlist_id, song_id, song_version_id, key, notes, sort_order)
VALUES
  ('90000000-0000-0000-0000-000000000008', '80000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', 'Eb', NULL, 1),
  ('90000000-0000-0000-0000-000000000009', '80000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000008', 'E', NULL, 2),
  ('90000000-0000-0000-0000-000000000010', '80000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000012', 'B', 'Cierre con energía', 3);

-- ============================================================
-- 15. SERVICE PARTICIPANTS
-- ============================================================

-- Planned service (Iglesia Gracia): 2 participants
INSERT INTO service_participants (id, service_id, membership_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003');

-- Active service (Iglesia Gracia): 1 participant
INSERT INTO service_participants (id, service_id, membership_id)
VALUES
  ('a0000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');

-- Completed service (Iglesia Gracia): 2 participants
INSERT INTO service_participants (id, service_id, membership_id)
VALUES
  ('a0000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003');

-- Ministerio Selah planned: 1 participant
INSERT INTO service_participants (id, service_id, membership_id)
VALUES
  ('a0000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000006');

-- ============================================================
-- 16. SERVICE MEMBER ROLES (multi-role)
-- ============================================================

-- María: líder + pianista en servicio planned
INSERT INTO service_member_roles (service_participant_id, role)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'líder'),
  ('a0000000-0000-0000-0000-000000000001', 'piano');

-- Pedro: guitarrista + vocalista en servicio planned
INSERT INTO service_member_roles (service_participant_id, role)
VALUES
  ('a0000000-0000-0000-0000-000000000002', 'guitarra_acústica'),
  ('a0000000-0000-0000-0000-000000000002', 'vocalista');

-- María: líder en servicio active
INSERT INTO service_member_roles (service_participant_id, role)
VALUES
  ('a0000000-0000-0000-0000-000000000003', 'líder');

-- María: líder + piano en servicio completed
INSERT INTO service_member_roles (service_participant_id, role)
VALUES
  ('a0000000-0000-0000-0000-000000000004', 'líder'),
  ('a0000000-0000-0000-0000-000000000004', 'piano');

-- Pedro: guitarra + bajo en servicio completed
INSERT INTO service_member_roles (service_participant_id, role)
VALUES
  ('a0000000-0000-0000-0000-000000000005', 'guitarra_eléctrica'),
  ('a0000000-0000-0000-0000-000000000005', 'bajo');

-- Lucía: vocalista en Ministerio Selah
INSERT INTO service_member_roles (service_participant_id, role)
VALUES
  ('a0000000-0000-0000-0000-000000000006', 'vocalista');
