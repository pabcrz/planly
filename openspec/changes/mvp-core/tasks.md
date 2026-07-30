# Tasks: MVP Core Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,250 |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 → PR #2 → PR #3 → PR #4 → PR #5 (stacked-to-main) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
800-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | App shell + auth flows | PR 1 | `npx vitest run` | `npm run dev` → sign-in/sign-up/dashboard flow | `src/app/`, `src/features/auth/`, `src/services/authService.ts` |
| 2 | Song catalog + ChordPro engine | PR 2 | `npx vitest run src/lib/` | `npm run dev` → create song + version with ChordPro, transpose | `src/lib/chordpro/`, `src/lib/transposition/`, `src/features/songs/`, `src/services/songService.ts` |
| 3 | Teams + people profiles | PR 3 | `npx vitest run` | `npm run dev` → create team, add members, edit profile | `src/features/teams/`, `src/services/teamService.ts`, `src/services/peopleService.ts` |
| 4 | Services + setlists | PR 4 | `npx vitest run` | `npm run dev` → create service, build setlist, assign participants, freeze | `src/features/services/`, `src/services/serviceService.ts` |
| 5 | Public views | PR 5 | `npx vitest run` | `npm run dev` → visit `/s/:serviceId`, open lyrics, transpose, toggle view | `src/features/public-views/`, `src/services/publicService.ts`, `src/app/layouts/PublicLayout.tsx` |

---

## PR #1: Foundation + Auth (~600 lines)

### Task 1: Install Vitest and configure test setup

**Priority**: high
**Depends on**: none
**Estimated lines**: 40
**Feature**: foundation

#### Description
Install Vitest as dev dependency. Create `vitest.config.ts` with React plugin and jsdom environment. Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `package.json`. No test files yet — this is the prerequisite for unit tests in later tasks.

#### Files to create/modify
- `vitest.config.ts` — Vitest config with @vitejs/plugin-react, jsdom
- `package.json` — add test scripts, vitest + @testing-library/react + jsdom devDeps

#### Validation
- [x] `npx vitest run` succeeds (0 tests is OK — harness works)
- [x] `npm run dev` still works (no regressions)

#### Spec coverage
- N/A (infrastructure prerequisite)


### Task 2: Generate Supabase database types

**Priority**: high
**Depends on**: none
**Estimated lines**: 0 (generated)
**Feature**: foundation

#### Description
Run `npm run db:types` to generate `src/types/database.ts` from the local Supabase instance. This file is auto-generated and provides the `Database` type used across all service functions for typed queries.

#### Files to create/modify
- `src/types/database.ts` — auto-generated Supabase types

#### Validation
- [x] File exists at `src/types/database.ts` with Tables, Enums, Functions types
- [x] Import resolves (`import { Database } from '@/types/database'`)

#### Spec coverage
- N/A (type generation prerequisite)


### Task 3: Create application type models

**Priority**: high
**Depends on**: Task 2
**Estimated lines**: 70
**Feature**: foundation

#### Description
Create `src/types/models.ts` with all application-level TypeScript interfaces mapping 1:1 to the DB schema. Types include: `Church`, `ChurchMembership`, `ChurchRole`, `Song`, `SongVersion`, `ChurchRepertoire`, `SongVariant`, `Team`, `TeamMember`, `Person`, `Service`, `ServiceStatus`, `Setlist`, `SetlistItem`, `ServiceParticipant`, `ServiceMemberRole`. Export `ChurchRole` and `ServiceStatus` as type aliases from the generated Database enums.

#### Files to create/modify
- `src/types/models.ts` — all application model interfaces

#### Validation
- [x] All 16 interfaces compile with `tsc -b`
- [x] `ChurchRole` resolves to `'church_admin' | 'worship_director' | 'member'`
- [x] `ServiceStatus` resolves to `'planned' | 'active' | 'completed'`

#### Spec coverage
- song-catalog/song-listing, teams/team-listing, services/service-create, auth/church-membership-linking


### Task 4: Create anon Supabase client export

**Priority**: high
**Depends on**: none
**Estimated lines**: 5
**Feature**: foundation

#### Description
Add an anonymous Supabase client export to `src/lib/supabase.ts`. The authenticated client already exists; export a second `supabaseAnon` instance created without auto-refresh for public views.

#### Files to create/modify
- `src/lib/supabase.ts` — add `supabaseAnon` export

#### Validation
- [x] `supabaseAnon` import works; client has no session
- [x] `supabase` (auth client) still works for existing consumers

#### Spec coverage
- public-views/no-auth-side-effects


### Task 5: Create QueryProvider

**Priority**: high
**Depends on**: none
**Estimated lines**: 25
**Feature**: foundation

#### Description
Create `src/app/providers/QueryProvider.tsx` wrapping `<QueryClientProvider>` from TanStack Query v5 with sensible defaults: `staleTime: 30_000`, `retry: 1`. Export as a component that wraps children.

#### Files to create/modify
- `src/app/providers/QueryProvider.tsx` — TanStack Query client + provider

#### Validation
- [x] Component renders children without error
- [x] `useQuery` calls inside children resolve correctly

#### Spec coverage
- N/A (data-fetching infrastructure)


### Task 6: Create AuthProvider

**Priority**: high
**Depends on**: none
**Estimated lines**: 55
**Feature**: auth

#### Description
Create `src/app/providers/AuthProvider.tsx` with React context providing: `user` (nullable), `session` (nullable), `isLoading` (boolean), `memberships` (ChurchMembership[]), `signOut()` method. Subscribe to `supabase.auth.onAuthStateChange`; fetch memberships via `authService.getMemberships()` when user changes. Export `useAuth()` hook.

#### Files to create/modify
- `src/app/providers/AuthProvider.tsx` — auth state context + listener
- `src/services/authService.ts` — `getMemberships(userId)` stub

#### Validation
- [x] `useAuth().user` is null when not signed in
- [x] `useAuth().isLoading` is true during initial session check
- [x] Sign-in updates `user` and `memberships` automatically

#### Spec coverage
- auth/email-password-authentication (session persistence)


### Task 7: Create ChurchProvider

**Priority**: high
**Depends on**: Task 6
**Estimated lines**: 40
**Feature**: auth

#### Description
Create `src/app/providers/ChurchProvider.tsx` with React context providing: `activeChurchId` (string | null), `activeMembership` (ChurchMembership | null), `setActiveChurch(id)`. On mount, auto-select membership if user has exactly one. Persist active church to localStorage. Export `useChurch()` hook.

#### Files to create/modify
- `src/app/providers/ChurchProvider.tsx` — active church context

#### Validation
- [x] Single-membership users auto-select that church
- [x] `setActiveChurch` updates context and localStorage
- [x] `useChurch().activeChurchId` drives query keys

#### Spec coverage
- auth/church-membership-linking


### Task 8: Create route tree with guards

**Priority**: high
**Depends on**: Task 6, Task 7
**Estimated lines**: 80
**Feature**: foundation

#### Description
Create `src/app/router/index.tsx` using React Router v7 `createBrowserRouter`. Define all routes from the design table:
- `/sign-in`, `/sign-up` → AuthLayout (public)
- `/dashboard` → AppLayout + `<ChurchGuard>` (no church scoping)
- `/songs`, `/songs/:id`, `/songs/new`, `/songs/:id/edit` → AppLayout + `<ChurchGuard>`
- `/teams`, `/teams/:id` → AppLayout + `<ChurchGuard>`
- `/services`, `/services/:id`, `/services/new` → AppLayout + `<ChurchGuard>`
- `/setlists/:id` → AppLayout + `<ChurchGuard>`
- `/profile` → AppLayout + `<ChurchGuard>`
- `/s/:serviceId` → PublicLayout (no auth)

Use lazy loading for feature pages (placeholder components until built). Export the router instance.

#### Files to create/modify
- `src/app/router/index.tsx` — route tree with guards

#### Validation
- [x] `/sign-in` renders AuthLayout
- [x] `/songs` redirects to `/sign-in?redirect=/songs` when unauthenticated
- [x] `/s/:any-uuid` renders PublicLayout without auth check

#### Spec coverage
- auth/auth-guard-on-routes


### Task 9: Create AppLayout

**Priority**: high
**Depends on**: Task 8
**Estimated lines**: 80
**Feature**: foundation

#### Description
Create `src/app/layouts/AppLayout.tsx` — authenticated app shell with: top header (logo, church selector), `<Sidebar>` navigation on `md+`, `<BottomNav>` on mobile, `<Outlet>` for child routes. Supabase sign-out button in header. Include `<ErrorBoundary>` wrapping `<Outlet>`. Use Tailwind responsive classes (mobile-first).

#### Files to create/modify
- `src/app/layouts/AppLayout.tsx` — authenticated shell
- `src/components/shared/ErrorBoundary.tsx` — React error boundary (componentDidCatch)
- `src/components/shared/LoadingSpinner.tsx` — centered spinner with `role="status"`

#### Validation
- [x] Header shows app name and sign-out button
- [x] `<BottomNav>` visible on viewport < 768px; `<Sidebar>` visible ≥ 768px
- [x] Render error in `<Outlet>` shows fallback UI, not white screen

#### Spec coverage
- N/A (layout infrastructure)


### Task 10: Create AuthLayout

**Priority**: medium
**Depends on**: Task 8
**Estimated lines**: 30
**Feature**: auth

#### Description
Create `src/app/layouts/AuthLayout.tsx` — centered card layout for sign-in/up. White card on gray background, max-w-md, centered vertically. Logo placeholder at top. No navigation chrome. Redirect already-authenticated users to `/dashboard`.

#### Files to create/modify
- `src/app/layouts/AuthLayout.tsx` — auth flow layout

#### Validation
- [x] `/sign-in` shows centered card, no sidebar/bottom nav
- [x] Already-authenticated user visiting `/sign-in` auto-redirects to `/dashboard`

#### Spec coverage
- auth/email-password-authentication (sign-in flow)


### Task 11: Create shared UI components

**Priority**: medium
**Depends on**: none
**Estimated lines**: 75
**Feature**: foundation

#### Description
Create reusable components in `src/components/shared/`:
- `PageHeader` — title + optional action button, responsive padding
- `EmptyState` — centered icon + message + optional CTA
- `ConfirmDialog` — modal with title, message, confirm/cancel buttons using `<dialog>`

#### Files to create/modify
- `src/components/shared/PageHeader.tsx` — page title + action
- `src/components/shared/EmptyState.tsx` — empty state placeholder
- `src/components/shared/ConfirmDialog.tsx` — modal confirmation

#### Validation
- [x] `PageHeader` renders title and optional button
- [x] `EmptyState` renders icon + message centered
- [x] `ConfirmDialog` opens/closes via `<dialog>` API; confirm fires callback

#### Spec coverage
- N/A (shared UI components)


### Task 12: Wire providers into App and main

**Priority**: high
**Depends on**: Tasks 5, 6, 7, 8
**Estimated lines**: 25
**Feature**: foundation

#### Description
Replace the placeholder in `src/App.tsx` with `<QueryProvider>` → `<AuthProvider>` → `<ChurchProvider>` → `<RouterProvider>`. Update `src/main.tsx` to import and render the new `App`.

#### Files to create/modify
- `src/App.tsx` — replace placeholder with provider stack + router
- `src/main.tsx` — update App import if needed

#### Validation
- [x] `npm run dev` boots without errors
- [x] Browser shows sign-in page on first load (redirect from guarded route)
- [x] Build succeeds: `npm run build`

#### Spec coverage
- auth/auth-guard-on-routes


### Task 13: Create authService

**Priority**: high
**Depends on**: Task 3, Task 4
**Estimated lines**: 80
**Feature**: auth

#### Description
Create `src/services/authService.ts` with typed functions: `signUp(email, password)`, `signIn(email, password)`, `signOut()`, `getCurrentUser()`, `getMemberships(userId)`, `createChurch(name, slug, timezone)`, `joinChurch(churchId)`. All return typed results. No component imports supabase directly. Use Zod v4 for input validation on `createChurch`.

#### Files to create/modify
- `src/services/authService.ts` — auth + church membership service

#### Validation
- [x] `signIn('test@test.com', 'password123')` resolves with session
- [x] `signOut()` clears the session
- [x] `getMemberships(userId)` returns array of ChurchMembership
- [x] `createChurch` validates slug uniqueness client-side before insert

#### Spec coverage
- auth/email-password-authentication, auth/church-membership-linking


### Task 14: Create LoginForm and SignupForm

**Priority**: high
**Depends on**: Task 13
**Estimated lines**: 130
**Feature**: auth

#### Description
Create `src/features/auth/LoginForm.tsx` — email + password fields, "Sign in" button, error display, link to `/sign-up`. Create `src/features/auth/SignupForm.tsx` — email + password (≥ 8 chars) + confirm password, "Create account" button, validation messages. Both use `authService` functions, not supabase directly. On success, redirect to `/dashboard`.

#### Files to create/modify
- `src/features/auth/LoginForm.tsx` — sign-in form
- `src/features/auth/SignupForm.tsx` — registration form

#### Validation
- [x] Sign in with valid credentials redirects to `/dashboard`
- [x] Sign in with invalid credentials shows error message
- [x] Sign up creates account in Supabase Auth
- [x] Password < 8 chars shows validation error

#### Spec coverage
- auth/email-password-authentication (sign up, sign in, sign out)


### Task 15: Create AuthGuard and ChurchGuard

**Priority**: high
**Depends on**: Task 6, Task 7
**Estimated lines**: 50
**Feature**: auth

#### Description
Create `src/features/auth/AuthGuard.tsx` — wrapper component that checks `useAuth().user`. If null and `isLoading` is false, redirect to `/sign-in?redirect=<current path>`. If loading, show `<LoadingSpinner>`. Otherwise render children.

Create `src/features/auth/ChurchGuard.tsx` — wrapper that checks `useChurch().activeChurchId`. If null, redirect to `/dashboard` (church picker). Otherwise render children.

#### Files to create/modify
- `src/features/auth/AuthGuard.tsx` — route protection
- `src/features/auth/ChurchGuard.tsx` — church membership check

#### Validation
- [x] Unauthenticated visit to `/songs` redirects to `/sign-in?redirect=%2Fsongs`
- [x] Authenticated user with no church selection redirected to `/dashboard`
- [x] Authenticated user with active church sees child route content

#### Spec coverage
- auth/auth-guard-on-routes, auth/role-based-ui-access


### Task 16: Create ChurchSelect and Dashboard page

**Priority**: high
**Depends on**: Task 7, Task 13
**Estimated lines**: 70
**Feature**: auth

#### Description
Create `src/features/auth/ChurchSelect.tsx` — shows user's memberships. "Create new church" form (name, slug auto-derived, timezone picker). "Join existing" list. On selection, calls `useChurch().setActiveChurch()`. Create placeholder `src/features/auth/DashboardPage.tsx` — welcome message + quick stats placeholder.

#### Files to create/modify
- `src/features/auth/ChurchSelect.tsx` — church creation/selection
- `src/features/auth/DashboardPage.tsx` — post-login landing page

#### Validation
- [x] New user sees "Create church" form and empty memberships list
- [x] Creating church sets `activeChurchId` and redirects to `/dashboard`
- [x] User with memberships sees church list; selecting one sets context

#### Spec coverage
- auth/church-membership-linking (new church creation, joining existing)


---

## PR #2: Songs + ChordPro (~550 lines)

### Task 17: Create ChordPro types

**Priority**: high
**Depends on**: none
**Estimated lines**: 30
**Feature**: chordpro

#### Description
Create `src/lib/chordpro/types.ts` with AST interfaces: `ChordProDocument` (title?, key?, sections[]), `ChordProSection` (type: 'verse'|'chorus'|'bridge'|'unknown', lines[]), `ChordProLine` (segments: (ChordSegment | LyricSegment)[]), `ChordSegment` (type: 'chord', chord: string), `LyricSegment` (type: 'lyric', text: string).

#### Files to create/modify
- `src/lib/chordpro/types.ts` — ChordPro AST interfaces

#### Validation
- [ ] All types compile; importable from `@/lib/chordpro/types`
- [ ] `ChordSegment` and `LyricSegment` discriminated by `type` field

#### Spec coverage
- chordpro/chordpro-parser, chordpro/lyrics-only-render, chordpro/lyrics+chords-render


### Task 18: Create ChordPro parser

**Priority**: high
**Depends on**: Task 17
**Estimated lines**: 120
**Feature**: chordpro

#### Description
Create `src/lib/chordpro/parser.ts` with `parseChordPro(source: string): ChordProDocument`. Regex-based tokenizer: extract directives `{key: value}`, section blocks (`{start_of_chorus}`/`{end_of_chorus}`, verse, bridge), split lines into chord `[Am]` and lyric segments. Handle blank lines as stanza separators. Unknown directives preserved as generic. Export `parseChordPro` as the single public function.

#### Files to create/modify
- `src/lib/chordpro/parser.ts` — ChordPro → AST

#### Validation
- [ ] `{title: Amazing Grace}` produces `document.title = "Amazing Grace"`
- [ ] `{start_of_chorus}\n[G]Holy\n{end_of_chorus}` produces section.type = "chorus"
- [ ] Line `[Am]Amazing [C]grace` produces 4 segments: chord-lyric-chord-lyric
- [ ] Empty lines preserved as empty `ChordProLine` with no segments
- [ ] Unknown directive `{foo: bar}` does not throw

#### Spec coverage
- chordpro/chordpro-parser, chordpro/section-block-directives, chordpro/edge-cases


### Task 19: Create ChordPro unit tests

**Priority**: high
**Depends on**: Tasks 1, 18
**Estimated lines**: 80
**Feature**: chordpro

#### Description
Create `src/lib/chordpro/parser.test.ts` with Vitest tests covering: title/key directives, all section types (chorus/verse/bridge), chord/lyric segment pairing, stacked chords, plain lyric lines, empty lines, unknown directives, malformed input (no crash). Create `src/lib/transposition/transposer.test.ts` (to be filled in Task 21).

#### Files to create/modify
- `src/lib/chordpro/parser.test.ts` — parser unit tests
- `src/lib/transposition/transposer.test.ts` — transposer unit tests (stub)

#### Validation
- [ ] `npx vitest run src/lib/chordpro/` passes all parser tests
- [ ] Tests cover all 8 parser spec scenarios

#### Spec coverage
- chordpro/chordpro-parser, chordpro/section-block-directives, chordpro/edge-cases


### Task 20: Create ChordPro renderer

**Priority**: high
**Depends on**: Task 17
**Estimated lines**: 90
**Feature**: chordpro

#### Description
Create `src/lib/chordpro/renderer.tsx` exporting `<ChordProRenderer>` component. Props: `document: ChordProDocument`, `mode: 'lyrics' | 'chords'`, `semitones: number` (default 0). In lyrics mode: strip chord segments, render plain text. In chords mode: render chord above lyric syllable in a grid layout (chord row + lyric row per line). Apply transposition via `transposeChord()` before rendering. Render section breaks with the section type label. Handle empty lines as paragraph breaks.

#### Files to create/modify
- `src/lib/chordpro/renderer.tsx` — AST → React lyrics/chords view

#### Validation
- [ ] Lyrics mode: `[Am]Amazing grace` → "Amazing grace"
- [ ] Chords mode: `[Am]Amazing` shows "Am" above "Amazing"
- [ ] Section label "CHORUS" shown at section start
- [ ] Empty line produces visual paragraph break

#### Spec coverage
- chordpro/lyrics-only-render, chordpro/lyrics+chords-render


### Task 21: Create transposition engine

**Priority**: high
**Depends on**: none
**Estimated lines**: 80
**Feature**: chordpro

#### Description
Create `src/lib/transposition/transposer.ts` with `transposeChord(chord: string, semitones: number): string`. Note array: `[C, C#, D, D#, E, F, F#, G, G#, A, A#, B]`. Parse chord into root + quality + bass (slash chords). Shift root and bass independently by semitones modulo 12. Preserve quality suffix (m, maj, dim, aug, sus, add, 7, 9, 11, 13). Handle sharp/flat roots. Export `transposeDocument(doc: ChordProDocument, semitones: number): ChordProDocument` — deep-clone and transpose all chords.

#### Files to create/modify
- `src/lib/transposition/transposer.ts` — chord transposition engine

#### Validation
- [ ] `transposeChord('C', 2)` → `'D'`
- [ ] `transposeChord('C', -1)` → `'B'`
- [ ] `transposeChord('C/G', 2)` → `'D/A'`
- [ ] `transposeChord('C#m7', 1)` → `'Dm7'`
- [ ] `transposeChord('F#maj7', 12)` → `'F#maj7'` (wrap-around)

#### Spec coverage
- chordpro/transposition-engine, chordpro/chord-notation-support


### Task 22: Create songService

**Priority**: high
**Depends on**: Task 3, Task 4
**Estimated lines**: 120
**Feature**: song-catalog

#### Description
Create `src/services/songService.ts` with typed functions using the authenticated supabase client + ChurchProvider's churchId:
- `getSongs(churchId, filters?)` — canonical + church-owned, with tag/title search
- `getSong(id)` — single song with versions
- `createSong(data: CreateSongInput)` — Zod-validated
- `updateSong(id, data)`, `deleteSong(id)` — admin-only at RLS level
- `getVersions(songId)`, `createVersion`, `updateVersion`, `deleteVersion`
- `adoptSong(churchId, songId)` — add to church_repertoire
- `getRepertoire(churchId)` — active (non-archived) songs
- `createVariant`, `updateVariant` — church-local overrides

All functions throw on RLS denial. Search uses `.ilike()` for title/author, `.contains()` for tags.

#### Files to create/modify
- `src/services/songService.ts` — song CRUD + repertoire + variants

#### Validation
- [ ] `getSongs(churchId)` returns canonical songs + church-owned songs
- [ ] `createSong({title: "Test", church_id: X})` auto-creates repertoire row
- [ ] `adoptSong(X, canonicalSongId)` creates church_repertoire row

#### Spec coverage
- song-catalog/song-listing, song-catalog/song-create, song-catalog/church-repertoire-adoption, song-catalog/church-local-variants, song-catalog/tags-and-search


### Task 23: Create SongList and SongCard

**Priority**: high
**Depends on**: Task 22
**Estimated lines**: 100
**Feature**: song-catalog

#### Description
Create `src/features/songs/SongList.tsx` — filterable catalog with search input (title/author), tag filter dropdown. Uses `useQuery(['songs', churchId, filters])` calling `songService.getSongs()`. Role-based: members see view-only; worship_director+ see "New Song" button.

Create `src/features/songs/SongCard.tsx` — list item showing title, author, key tags, tempo badge. Links to `/songs/:id`.

#### Files to create/modify
- `src/features/songs/SongList.tsx` — filterable song catalog
- `src/features/songs/SongCard.tsx` — song list item

#### Validation
- [ ] Song list shows all accessible songs for the church
- [ ] Search "grace" filters by title/author (case-insensitive)
- [ ] Tag dropdown filters by tag
- [ ] Member role sees no "New Song" or edit/delete actions
- [ ] Worship director sees "New Song" button

#### Spec coverage
- song-catalog/song-listing, song-catalog/tags-and-search, auth/role-based-ui-access


### Task 24: Create SongForm and song detail page

**Priority**: high
**Depends on**: Task 22
**Estimated lines**: 130
**Feature**: song-catalog

#### Description
Create `src/features/songs/SongForm.tsx` — create/edit form with Zod validation. Fields: title (required), author, tempo (number), tags (comma-separated input). Church-owned toggle determines `church_id` vs `is_canonical` (canonical hidden for non-curator).

Create `src/features/songs/SongDetailPage.tsx` — song detail with versions list, repertoire status, adopt/archive actions. Route: `/songs/:id`.

Create `src/features/songs/SongVersions.tsx` — version list per song with key badges.

Create `src/features/songs/VersionForm.tsx` — version editor: `version_name`, `key` (text), `chordpro_content` (textarea), `notes`. Preview toggle shows `<ChordProRenderer>`.

#### Files to create/modify
- `src/features/songs/SongForm.tsx` — create/edit song
- `src/features/songs/SongDetailPage.tsx` — song detail + versions
- `src/features/songs/SongVersions.tsx` — version list
- `src/features/songs/VersionForm.tsx` — version editor with preview
- `src/features/songs/ChordProEditor.tsx` — textarea + preview toggle

#### Validation
- [ ] Create church-owned song with title "Amazing Grace" → appears in list
- [ ] Edit song author → updates in list
- [ ] Delete song → removed from list
- [ ] Add version with ChordPro content → preview renders lyrics+chords
- [ ] Version created with key "G" displays key badge

#### Spec coverage
- song-catalog/song-create, song-catalog/song-edit-and-delete, song-catalog/song-versions


---

## PR #3: Teams + People (~400 lines)

### Task 25: Create teamService and peopleService

**Priority**: high
**Depends on**: Task 3, Task 4
**Estimated lines**: 100
**Feature**: teams

#### Description
Create `src/services/teamService.ts` with: `getTeams(churchId)`, `getTeam(id)`, `createTeam(churchId, name, description)`, `updateTeam`, `deleteTeam`, `getMembers(teamId)` (joins team_members + church_memberships + people), `addMember(teamId, membershipId)`, `removeMember`.

Create `src/services/peopleService.ts` with: `getPeople(churchId)` (joins church_memberships + people), `getPerson(membershipId)`, `createProfile(membershipId, displayName, instruments, musicalRoles)`, `updateProfile`. Profile upsert pattern: insert if not exists, update if exists.

#### Files to create/modify
- `src/services/teamService.ts` — team + member CRUD
- `src/services/peopleService.ts` — profile CRUD

#### Validation
- [ ] `getTeams(churchId)` returns only church's teams
- [ ] `addMember` creates team_members row; `getMembers` returns joined data
- [ ] `createProfile` creates people row; RLS allows only own membership_id

#### Spec coverage
- teams/team-listing, teams/team-create-and-edit, teams/team-delete, teams/team-member-management, teams/people-profiles


### Task 26: Create TeamList, TeamCard, TeamForm

**Priority**: high
**Depends on**: Task 25
**Estimated lines**: 100
**Feature**: teams

#### Description
Create `src/features/teams/TeamList.tsx` — church teams list using `useQuery(['teams', churchId])`. Worship director+ sees "New Team" button; member sees view-only.

Create `src/features/teams/TeamCard.tsx` — team name, description preview, member count. Links to `/teams/:id`.

Create `src/features/teams/TeamForm.tsx` — create/edit form: name (required), description. Validates via Zod.

Create `src/features/teams/TeamDetailPage.tsx` — team info + member roster. Route: `/teams/:id`.

#### Files to create/modify
- `src/features/teams/TeamList.tsx` — church teams list
- `src/features/teams/TeamCard.tsx` — team list item
- `src/features/teams/TeamForm.tsx` — create/edit team form
- `src/features/teams/TeamDetailPage.tsx` — team detail + roster

#### Validation
- [ ] Team list shows all church teams
- [ ] Worship director creates "Sunday Band" → appears in list
- [ ] Member sees teams but no create/edit/delete controls
- [ ] Team detail shows member roster

#### Spec coverage
- teams/team-listing, teams/team-create-and-edit, teams/team-delete, auth/role-based-ui-access


### Task 27: Create TeamMembers management

**Priority**: medium
**Depends on**: Task 25
**Estimated lines**: 80
**Feature**: teams

#### Description
Create `src/features/teams/TeamMembers.tsx` — member roster table within TeamDetailPage. Shows display_name, instruments, musical_roles. Worship director+ sees "Add member" dropdown (church members not yet in team) and "Remove" button per member. Uses `teamService.getMembers()`, `addMember()`, `removeMember()`.

#### Files to create/modify
- `src/features/teams/TeamMembers.tsx` — roster management

#### Validation
- [ ] Member roster shows people with display_name + instruments
- [ ] Add member dropdown lists only church members not in team
- [ ] Remove member removes from team_members; roster updates

#### Spec coverage
- teams/team-member-management


### Task 28: Create PeopleList, PersonCard, ProfileForm

**Priority**: medium
**Depends on**: Task 25
**Estimated lines**: 100
**Feature**: teams

#### Description
Create `src/features/teams/PeopleList.tsx` — all church people with display_name, instruments, roles.

Create `src/features/teams/PersonCard.tsx` — person preview in list.

Create `src/features/teams/ProfileForm.tsx` — own-profile editor. Fields: display_name, instruments (comma-separated → array), musical_roles (comma-separated → array). Uses `peopleService.updateProfile()`. Auto-creates profile on first visit if none exists (spec: profile-auto-creation scenario). Route: `/profile`.

#### Files to create/modify
- `src/features/teams/PeopleList.tsx` — church people roster
- `src/features/teams/PersonCard.tsx` — person list item
- `src/features/teams/ProfileForm.tsx` — own-profile editor

#### Validation
- [ ] People list shows all church members with profiles
- [ ] Edit own profile: update instruments + roles → changes visible to others
- [ ] First visit to `/profile` auto-creates `people` row with default display_name
- [ ] Cannot edit another member's profile (RLS enforcement, error toast)

#### Spec coverage
- teams/people-profiles, teams/musical-roles-and-instruments, auth/profile-management


---

## PR #4: Services + Setlists (~450 lines)

### Task 29: Create serviceService

**Priority**: high
**Depends on**: Task 3, Task 4
**Estimated lines**: 160
**Feature**: services

#### Description
Create `src/services/serviceService.ts` with typed functions:
- `getServices(churchId, filters?)` — filter by date range, team, status
- `getService(id)` — single service with team info
- `createService(churchId, teamId, serviceDate, startTime, timezone, notes)` — auto-creates setlist row in transaction
- `updateService`, `deleteService`
- `changeStatus(serviceId, newStatus)` — enforces `planned → active → completed`; rejects completed→planned
- `getSetlist(serviceId)`, `getSetlistItems(setlistId)`
- `addSetlistItem(setlistId, songId, songVersionId, key, sortOrder)`
- `updateSetlistItem`, `reorderSetlistItem(id, newSortOrder)` — renumbers sibling items
- `removeSetlistItem` — renumbers remaining items to keep contiguous order
- `freezeSetlist(serviceId)` — sets frozen_at + snapshots items into frozen_content
- `getParticipants(serviceId)`, `addParticipant`, `removeParticipant`
- `addParticipantRole(participantId, role)`, `removeParticipantRole`

Zod validation on all mutation inputs.

#### Files to create/modify
- `src/services/serviceService.ts` — service/setlist/participant CRUD

#### Validation
- [ ] `createService` creates both services + setlists rows
- [ ] `addSetlistItem` inserts with correct sort_order
- [ ] `reorderSetlistItem` renumbers siblings; no duplicate sort_order
- [ ] `removeSetlistItem` renumbers remaining items
- [ ] `freezeSetlist` sets frozen_at; subsequent `updateSetlistItem` rejects (RLS)
- [ ] `changeStatus('planned', 'active')` works; `changeStatus('completed', 'planned')` throws

#### Spec coverage
- services/service-create, services/service-listing-and-filter, services/service-edit-and-status-transition, services/service-delete, services/setlist-items, services/participant-roster, services/setlist-freeze


### Task 30: Create ServiceList, ServiceCard, ServiceForm

**Priority**: high
**Depends on**: Task 29
**Estimated lines**: 130
**Feature**: services

#### Description
Create `src/features/services/ServiceList.tsx` — church services list with filters (date range, team selector, status). Uses `useQuery(['services', churchId, filters])`.

Create `src/features/services/ServiceCard.tsx` — service summary: date, time, team name, status badge. Links to `/services/:id`.

Create `src/features/services/ServiceForm.tsx` — create/edit form. Fields: team_id (dropdown from `teamService.getTeams()`), service_date (date picker), start_time (time picker), timezone (auto-filled from church), notes. Status selector (planned/active/completed) for editing.

Create `src/features/services/ServiceStatusBadge.tsx` — colored badge: planned=blue, active=green, completed=gray.

Create `src/features/services/ServiceDetailPage.tsx` — service info, setlist editor, participant roster. Route: `/services/:id`.

#### Files to create/modify
- `src/features/services/ServiceList.tsx` — filtered service list
- `src/features/services/ServiceCard.tsx` — service summary card
- `src/features/services/ServiceForm.tsx` — create/edit service
- `src/features/services/ServiceStatusBadge.tsx` — status badge
- `src/features/services/ServiceDetailPage.tsx` — service detail page

#### Validation
- [ ] Create service with team T → setlist auto-created
- [ ] Filter by date range and team shows only matching services
- [ ] Status badge color matches status (planned/active/completed)
- [ ] Worship director can transition planned→active→completed

#### Spec coverage
- services/service-create, services/service-listing-and-filter, services/service-edit-and-status-transition


### Task 31: Create SetlistEditor and SetlistItem

**Priority**: high
**Depends on**: Task 29, Task 20, Task 21
**Estimated lines**: 130
**Feature**: services

#### Description
Create `src/features/services/SetlistEditor.tsx` — ordered song list. Features: "Add song" button (opens song picker modal from repertoire), drag-to-reorder (implement with HTML5 drag or simple move-up/move-down buttons for MVP), remove song, freeze setlist button (worship director+). Uses `serviceService` functions.

Create `src/features/services/SetlistItem.tsx` — single setlist row showing: sort_order, song title, version name, key, notes. Edit key field inline. Remove button. Drag handle.

Role-based: worship director+ sees all controls; members see read-only setlist.

#### Files to create/modify
- `src/features/services/SetlistEditor.tsx` — ordered setlist UI
- `src/features/services/SetlistItem.tsx` — setlist row

#### Validation
- [ ] Add song from repertoire → appears at end of setlist
- [ ] Reorder: move song from position 3 to 1 → items renumbered
- [ ] Remove song → items renumbered contiguously
- [ ] Freeze button sets frozen status; edit controls disappear
- [ ] Member sees read-only setlist; no add/remove/reorder controls

#### Spec coverage
- services/setlist-items, services/setlist-freeze, auth/role-based-ui-access


### Task 32: Create ParticipantList and ParticipantForm

**Priority**: medium
**Depends on**: Task 29
**Estimated lines**: 80
**Feature**: services

#### Description
Create `src/features/services/ParticipantList.tsx` — participant roster on ServiceDetailPage. Shows display_name, assigned roles. Worship director+ sees "Add participant" and "Remove" controls.

Create `src/features/services/ParticipantForm.tsx` — modal/drawer: select from church members dropdown, assign roles (multi-select from suggestions: Vocalista, Guitarra, Bajo, Batería, Teclado, Líder, Pastor + free-text). Add/remove roles per participant.

#### Files to create/modify
- `src/features/services/ParticipantList.tsx` — participant roster
- `src/features/services/ParticipantForm.tsx` — add/edit participant with roles

#### Validation
- [ ] Add participant M with roles ["Vocalista", "Líder"] → shows in roster
- [ ] Remove participant → removed from roster and roles deleted
- [ ] Add role to existing participant → new role appears
- [ ] Cannot add same membership twice (UNIQUE service_id+membership_id constraint)

#### Spec coverage
- services/participant-roster


---

## PR #5: Public Views (~250 lines)

### Task 33: Create publicService

**Priority**: high
**Depends on**: Task 3, Task 4 (anon client)
**Estimated lines**: 50
**Feature**: public-views

#### Description
Create `src/services/publicService.ts` using the `supabaseAnon` client (no session). Functions:
- `getPublicSetlist(serviceId)` — fetches setlist + items + song titles + keys via anon policies
- `getPublicSongLyrics(versionId)` — fetches song version chordpro_content for canonical songs (anon policy)
- `getPublicVariantLyrics(variantId)` — fetches variant content for published repertoire

All queries use anon role; no auth required. Return typed results.

#### Files to create/modify
- `src/services/publicService.ts` — anon setlist + lyrics queries

#### Validation
- [ ] `getPublicSetlist(serviceId)` returns setlist items without auth
- [ ] `getPublicSongLyrics(versionId)` works for canonical songs
- [ ] Non-published songs return empty/error (RLS enforcement)

#### Spec coverage
- public-views/anonymous-setlist-access, public-views/song-lyrics-view


### Task 34: Create PublicLayout

**Priority**: medium
**Depends on**: Task 8
**Estimated lines**: 30
**Feature**: public-views

#### Description
Create `src/app/layouts/PublicLayout.tsx` — minimal shell for public views. No auth chrome, no navigation. Clean white/dark background, full-width content. No header beyond optional app name. No session creation or auth side-effects. Wrap in `<QueryProvider>` with `staleTime: 60_000`.

#### Files to create/modify
- `src/app/layouts/PublicLayout.tsx` — minimal public view shell

#### Validation
- [ ] `/s/:any-uuid` renders PublicLayout without sign-in redirect
- [ ] No Supabase auth session created on visit
- [ ] No navigation chrome present

#### Spec coverage
- public-views/no-auth-side-effects


### Task 35: Create PublicSetlist

**Priority**: high
**Depends on**: Task 33, Task 34
**Estimated lines**: 70
**Feature**: public-views

#### Description
Create `src/features/public-views/PublicSetlist.tsx` — read-only setlist view. Fetches via `useQuery(['publicSetlist', serviceId])` → `publicService.getPublicSetlist()`. Renders service info (date, time, church name), ordered song list with titles and keys. Each song links to its lyrics view (client-side route or inline expand). Includes "<ShareButton>" (copy link to clipboard, toast confirmation). Mobile: large tap targets (≥44px), vertical scroll. No admin controls.

#### Files to create/modify
- `src/features/public-views/PublicSetlist.tsx` — public setlist page

#### Validation
- [ ] Open `/s/<valid-service-id>` → renders setlist without login
- [ ] Songs listed in order with title and key
- [ ] Tap song → shows lyrics (inline or linked)
- [ ] Copy link button works; shows confirmation
- [ ] Tap targets ≥ 44px on mobile (375px viewport)

#### Spec coverage
- public-views/anonymous-setlist-access, public-views/copy-shareable-link, public-views/mobile-optimized-layout


### Task 36: Create PublicLyrics with transposition

**Priority**: high
**Depends on**: Tasks 20, 21, 33
**Estimated lines**: 90
**Feature**: public-views

#### Description
Create `src/features/public-views/PublicLyrics.tsx` — song lyrics view (standalone or inline). Fetches chordpro content via `publicService`. Renders using `<ChordProRenderer>` with transposition control. Features:
- **View toggle**: lyrics-only / lyrics+chords. Preference saved to localStorage per user session.
- **Transpose control**: +/- semitone buttons. Transient state only — reset on reload.
- **Scroll mode**: large font, smooth scroll on mobile.
- **Default key**: from song version or variant.
- **Mobile**: touch targets ≥44px, font size ≥18px for readability.

Route: `/s/:serviceId/song/:versionId` or inline expand within PublicSetlist.

#### Files to create/modify
- `src/features/public-views/PublicLyrics.tsx` — lyrics view with transpose + toggle
- `src/features/public-views/ShareButton.tsx` — copy-link with toast

#### Validation
- [ ] Lyrics+chords mode: chords displayed above lyrics
- [ ] Toggle to lyrics-only: chords stripped
- [ ] Transpose +2: all chords shift up; reload resets to original key
- [ ] Toggle preference persists across song navigation via localStorage
- [ ] Mobile: font large enough to read, chords+lyrics aligned, no horizontal overflow
- [ ] No DB writes on transpose/toggle

#### Spec coverage
- public-views/song-lyrics-view, public-views/in-view-transposition, public-views/view-toggle, public-views/mobile-optimized-layout, public-views/no-auth-side-effects
