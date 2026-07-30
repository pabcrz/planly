# Proposal: MVP Core Foundation

## Intent

Churches manage worship planning with fragmented tools (chat apps, shared drives, paper), causing duplicated song catalogs, inconsistent chord sheets, and no reliable usage history. Planly replaces this with a mobile-first web platform: worship directors prepare setlists, teams access references, members consult lyrics/chords from any device.

## Scope

### In Scope
- Auth: sign up/in, church membership with `church_admin | worship_director | member` roles, RLS-enforced
- Song Catalog: CRUD (title, author, tempo, tags, reference URLs), canonical + church-owned songs, repertoire adoption, church-local variants
- Song Versions: multiple per song with ChordPro content, key, notes
- ChordPro: parser, lyrics/chords views, transposition — independent `src/lib/` modules
- Teams & People: musical teams per church, people with instruments and musical roles
- Services & Setlists: service creation (date/time/team), ordered setlists (song/version/key), participant roster
- Public Views: read-only shared links for setlists and lyrics, mobile-optimized
- Architecture: feature-based (`src/features/`), service layer (`src/services/`), Zod validation, no direct Supabase in components

### Out of Scope
AI song import, music licensing, native apps, slide projection, music platform sync, notifications

## Capabilities

### New Capabilities
- `auth` — Supabase Auth flows, church membership, role-based access
- `song-catalog` — Songs/versions CRUD, repertoire, church-local variants
- `chordpro` — ChordPro parsing, lyrics/chords rendering, key transposition
- `teams` — Teams per church, people with instruments and musical roles
- `services` — Service creation, ordered setlists, participant rosters
- `public-views` — Anonymous read-only setlist and lyrics views, mobile-first

### Modified Capabilities
None — no existing specs in `openspec/specs/`.

## Approach

Schema already pushed (15 tables, RLS, enums, indexes, triggers). Build frontend per README order: auth → songs → chordpro → teams → services → public views. Supabase client at `src/lib/supabase.ts`; all data access through `src/services/`. ChordPro as pure TS parser + renderer components, no server round-trips. Mobile-first with Tailwind, PWA-ready.

## Affected Areas

| Area | Impact |
|------|--------|
| `src/features/{auth,songs,teams,services,setlists}/` | New |
| `src/lib/{chordpro,transposition}/` | New |
| `src/services/`, `src/types/` | New |
| `src/app/{providers,router,layouts}/` | New |
| `supabase/migrations/` | None (schema complete) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ChordPro parser edge cases | Med | Strict subset first; extensible grammar |
| Mobile UX gaps (no gestures) | Med | PWA patterns; real-device testing |
| Scope creep into multi-church | Low | Existing schema enforces boundaries via RLS |

## Rollback Plan

No migration changes — schema is final. Frontend is additive: revert commits to last stable state. Supabase project unchanged. If auth breaks, disable email confirmation temporarily.

## Dependencies

- Supabase project (linked, operational)
- Local Supabase CLI for type generation

## Success Criteria

- [ ] Register songs with versions and chord sheets
- [ ] Create two teams matching church context
- [ ] Create a service and assign a team
- [ ] Build a setlist selecting versions and keys
- [ ] View setlist/lyrics/chords from a phone
- [ ] Share a read-only public link
- [ ] Consult per-team song usage history without duplicates
