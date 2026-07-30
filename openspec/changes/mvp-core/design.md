# Design: MVP Core Foundation

## Technical Approach

Feature-based React SPA with a service-layer abstraction over Supabase. All data access flows through `src/services/` → `src/lib/supabase.ts` → Postgres (RLS-enforced). ChordPro parsing/rendering and transposition are pure client-side modules in `src/lib/`. TanStack Query owns all server state; React Router v7 owns navigation. No global client state store.

Build order follows the proposal: auth → songs → chordpro → teams → services → public views. Each feature is self-contained under `src/features/{name}/` with colocated components, hooks, and feature-local types.

## Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|-------------|-----------|
| 1 | Server state | TanStack Query v5 | Redux, Zustand, SWR | Already in deps; caching, invalidation, optimistic updates built-in; no boilerplate store setup |
| 2 | Routing | React Router v7 with component guards | Remix loaders, Next.js | Already in deps; client-side SPA fits Supabase-only backend; guards via `<AuthGuard>` wrapper component |
| 3 | Auth state | Supabase client session | Custom JWT store | Supabase handles token refresh, persistence; `onAuthStateChange` listener drives React state |
| 4 | ChordPro processing | Pure TS modules in `src/lib/` | Server-side parsing, WASM | No server round-trips needed; parser is deterministic; keeps latency at zero for transpose/render |
| 5 | Validation | Zod v4 at service boundaries | Yup, manual checks | Already in deps; schemas shared between forms and services; type inference |
| 6 | Church context | React context + query | URL param, global store | Single-church-per-session MVP; context provides `churchId` to all queries; avoids prop drilling |
| 7 | Public views | Separate route tree, anon Supabase client | Same tree with conditional auth | Clean separation; anon queries use no session; no auth side-effects per spec |

## Data Flow

```
Authenticated flow:
  Component ──→ useQuery/useMutation hook (feature)
       │                    │
       │              service function (src/services/)
       │                    │
       │              supabase client (src/lib/supabase.ts)
       │                    │
       └── TanStack cache ←─┘  Postgres + RLS

Public flow:
  PublicComponent ──→ useQuery hook
       │                    │
       │              publicService function
       │                    │
       │              supabase client (anon, no session)
       │                    │
       └── TanStack cache ←─┘  Postgres (anon RLS policies)

Auth flow:
  LoginForm ──→ authService.signIn()
       │              │
       │         supabase.auth.signInWithPassword()
       │              │
       └── redirect ←─┘  session established
```

## Route Design

| Route | Auth | Church-scoped | Layout |
|-------|------|---------------|--------|
| `/sign-in`, `/sign-up` | Public | No | AuthLayout |
| `/dashboard` | Required | No (church picker) | AppLayout |
| `/songs`, `/songs/:id`, `/songs/new`, `/songs/:id/edit` | Required | Yes | AppLayout |
| `/teams`, `/teams/:id` | Required | Yes | AppLayout |
| `/services`, `/services/:id`, `/services/new` | Required | Yes | AppLayout |
| `/setlists/:id` | Required | Yes | AppLayout |
| `/profile` | Required | Yes | AppLayout |
| `/s/:serviceId` | Public (anon) | No | PublicLayout |

Guard logic: `<AuthGuard>` checks `supabase.auth.getSession()`. If no session → redirect to `/sign-in?redirect=<target>`. If session but no membership → redirect to `/dashboard` (church selection). Church-scoped routes additionally check `<ChurchGuard>` for active membership.

## Component Design

### Feature: auth (`src/features/auth/`)
- `LoginForm` — email/password sign-in
- `SignupForm` — registration with validation
- `AuthGuard` — route protection wrapper
- `ChurchGuard` — church membership check
- `ChurchSelect` — create/join church after signup

### Feature: songs (`src/features/songs/`)
- `SongList` — filterable catalog with search
- `SongCard` — list item with tags, key
- `SongForm` — create/edit with Zod validation
- `SongVersions` — version list per song
- `VersionForm` — version editor with ChordPro textarea
- `ChordProEditor` — textarea with preview toggle

### Feature: chordpro (`src/lib/chordpro/` + `src/lib/transposition/`)
- `ChordProRenderer` — lyrics-only and chords modes
- `TransposeControl` — semitone +/- buttons

### Feature: teams (`src/features/teams/`)
- `TeamList`, `TeamCard`, `TeamForm`
- `TeamMembers` — roster management
- `PeopleList`, `PersonCard`, `ProfileForm`

### Feature: services (`src/features/services/`)
- `ServiceList`, `ServiceCard`, `ServiceForm`, `ServiceStatusBadge`
- `SetlistEditor` — ordered song list with drag-reorder
- `SetlistItem` — song row with version/key selector
- `ParticipantList`, `ParticipantForm`

### Feature: public-views (`src/features/public-views/`)
- `PublicSetlist` — read-only setlist
- `PublicLyrics` — lyrics with toggle + transpose
- `ShareButton` — copy-link-to-clipboard

### Shared (`src/components/shared/`)
- `PageHeader`, `EmptyState`, `LoadingSpinner`, `ErrorBoundary`, `ConfirmDialog`

## Service Layer Design

All functions live in `src/services/` and accept typed params, return typed results. Components never import `supabase` directly.

**`src/services/authService.ts`**: `signUp`, `signIn`, `signOut`, `getCurrentUser`, `createChurch`, `joinChurch`, `getMembership`

**`src/services/songService.ts`**: `getSongs(churchId, filters?)`, `getSong(id)`, `createSong`, `updateSong`, `deleteSong`, `getVersions(songId)`, `createVersion`, `updateVersion`, `deleteVersion`, `adoptSong(churchId, songId)`, `getRepertoire(churchId)`, `createVariant`, `updateVariant`

**`src/services/teamService.ts`**: `getTeams(churchId)`, `getTeam(id)`, `createTeam`, `updateTeam`, `deleteTeam`, `getMembers(teamId)`, `addMember`, `removeMember`

**`src/services/peopleService.ts`**: `getPeople(churchId)`, `getPerson(membershipId)`, `createProfile`, `updateProfile`

**`src/services/serviceService.ts`**: `getServices(churchId, filters?)`, `getService(id)`, `createService`, `updateService`, `deleteService`, `changeStatus`, `getSetlist(serviceId)`, `getSetlistItems(setlistId)`, `addSetlistItem`, `updateSetlistItem`, `reorderSetlistItem`, `removeSetlistItem`, `freezeSetlist`, `getParticipants(serviceId)`, `addParticipant`, `removeParticipant`, `addParticipantRole`, `removeParticipantRole`

**`src/services/publicService.ts`**: `getPublicSetlist(serviceId)`, `getPublicSongLyrics(versionId, variantId?)`

## Type Design

Key types in `src/types/` mapping 1:1 to DB schema:

```typescript
// src/types/models.ts — generated via `npm run db:types` + manual refinements
type ChurchRole = 'church_admin' | 'worship_director' | 'member'
type ServiceStatus = 'planned' | 'active' | 'completed'

interface Church { id: string; name: string; slug: string; type: 'managed' | 'lightweight'; timezone: string }
interface ChurchMembership { id: string; user_id: string; church_id: string; role: ChurchRole }
interface Song { id: string; title: string; author: string | null; tempo: number | null; tags: string[]; church_id: string | null; is_canonical: boolean }
interface SongVersion { id: string; song_id: string; version_name: string; key: string; chordpro_content: string; notes: string | null }
interface ChurchRepertoire { church_id: string; song_id: string; is_published: boolean; archived_at: string | null }
interface SongVariant { id: string; church_id: string; song_version_id: string; local_key: string; local_content: string | null }
interface Team { id: string; church_id: string; name: string; description: string | null }
interface TeamMember { team_id: string; membership_id: string }
interface Person { membership_id: string; display_name: string; instruments: string[]; musical_roles: string[] }
interface Service { id: string; church_id: string; team_id: string; service_date: string; start_time: string; timezone: string; status: ServiceStatus; notes: string | null }
interface Setlist { id: string; service_id: string; frozen_at: string | null; frozen_content: unknown }
interface SetlistItem { id: string; setlist_id: string; song_id: string; song_version_id: string; key: string; sort_order: number; notes: string | null }
interface ServiceParticipant { id: string; service_id: string; membership_id: string }
interface ServiceMemberRole { service_participant_id: string; role: string }
```

```typescript
// src/lib/chordpro/types.ts
interface ChordProDocument { title?: string; key?: string; sections: ChordProSection[] }
interface ChordProSection { type: 'verse' | 'chorus' | 'bridge' | 'unknown'; lines: ChordProLine[] }
interface ChordProLine { segments: (ChordSegment | LyricSegment)[] }
interface ChordSegment { type: 'chord'; chord: string }
interface LyricSegment { type: 'lyric'; text: string }
```

## ChordPro Module Design

**Parser** (`src/lib/chordpro/parser.ts`): Regex-based tokenizer → directive extraction → chord/lyric segment pairing → `ChordProDocument` AST. Handles `{title:}`, `{key:}`, section blocks (`start_of_chorus`/`end_of_chorus`, etc.), `[Chord]` brackets, plain lyric lines, blank lines.

**Renderer** (`src/lib/chordpro/renderer.tsx`): React component accepting `ChordProDocument` + `mode: 'lyrics' | 'chords'` + `semitones: number`. In chords mode, renders chord above the syllable it precedes. In lyrics mode, strips all chord segments.

**Transposer** (`src/lib/transposition/transposer.ts`): Note array `[C, C#, D, D#, E, F, F#, G, G#, A, A#, B]`. Parses chord root + quality + bass (slash chords). Shifts root and bass independently by semitones modulo 12. Preserves quality suffix (m7, maj, dim, sus4, etc.).

## State Management

- **Server state**: TanStack Query — one `queryKey` per resource (e.g., `['songs', churchId]`, `['service', serviceId]`). Mutations invalidate related queries.
- **Auth state**: `useAuth()` hook wrapping Supabase `onAuthStateChange` + React context.
- **Church context**: `ChurchProvider` stores active `churchId` after selection; consumed by all church-scoped queries.
- **Navigation**: React Router `useNavigate`, `useParams`, `useSearchParams`.
- **Transient UI state** (transpose, view toggle): `useState` / `localStorage`. No global store.

## Error Handling

- Service functions throw typed errors; TanStack Query surfaces them via `error` state.
- `ErrorBoundary` at layout level catches unhandled render errors.
- Toast notifications for mutation failures (RLS denials → "Not authorized" message).
- Form validation errors handled inline via Zod schema + field-level messages.

## Mobile-First Patterns

- Tailwind responsive: default = mobile, `sm:`, `md:`, `lg:` breakpoints scale up.
- Touch targets ≥ 44px (`min-h-11` in Tailwind).
- Bottom tab navigation on mobile (`<BottomNav>`), sidebar on `md+` (`<Sidebar>`).
- Public lyrics view: large font, smooth scroll, no horizontal overflow.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/providers/QueryProvider.tsx` | Create | TanStack Query client + provider |
| `src/app/providers/AuthProvider.tsx` | Create | Auth state context + listener |
| `src/app/providers/ChurchProvider.tsx` | Create | Active church context |
| `src/app/router/index.tsx` | Create | Route tree with guards |
| `src/app/layouts/AppLayout.tsx` | Create | Authenticated shell (nav + content) |
| `src/app/layouts/AuthLayout.tsx` | Create | Sign-in/up centered layout |
| `src/app/layouts/PublicLayout.tsx` | Create | Minimal public view shell |
| `src/components/shared/*.tsx` | Create | PageHeader, EmptyState, LoadingSpinner, ErrorBoundary, ConfirmDialog |
| `src/types/models.ts` | Create | All DB-mapped TypeScript interfaces |
| `src/services/authService.ts` | Create | Auth + church membership functions |
| `src/services/songService.ts` | Create | Song/version/repertoire/variant CRUD |
| `src/services/teamService.ts` | Create | Team + member management |
| `src/services/peopleService.ts` | Create | People profile CRUD |
| `src/services/serviceService.ts` | Create | Service/setlist/participant functions |
| `src/services/publicService.ts` | Create | Anon setlist + lyrics queries |
| `src/lib/chordpro/parser.ts` | Create | ChordPro source → AST |
| `src/lib/chordpro/renderer.tsx` | Create | AST → React lyrics/chords view |
| `src/lib/chordpro/types.ts` | Create | ChordPro AST interfaces |
| `src/lib/transposition/transposer.ts` | Create | Chord transposition engine |
| `src/features/auth/*` | Create | LoginForm, SignupForm, AuthGuard, ChurchGuard, ChurchSelect |
| `src/features/songs/*` | Create | SongList, SongCard, SongForm, SongVersions, VersionForm, ChordProEditor |
| `src/features/teams/*` | Create | TeamList, TeamCard, TeamForm, TeamMembers, PeopleList, PersonCard, ProfileForm |
| `src/features/services/*` | Create | ServiceList, ServiceCard, ServiceForm, SetlistEditor, SetlistItem, ParticipantList |
| `src/features/public-views/*` | Create | PublicSetlist, PublicLyrics, ShareButton |
| `src/App.tsx` | Modify | Replace placeholder with router + providers |
| `src/main.tsx` | Modify | Wrap with QueryProvider |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | ChordPro parser (directives, sections, edge cases) | Vitest (to be installed) |
| Unit | Transposer (all chord types, slash chords, wrap-around) | Vitest |
| Unit | Zod schemas (validation boundaries) | Vitest |
| Integration | Service functions against local Supabase | Vitest + Supabase test client |
| Manual | Mobile UX, touch targets, scroll behavior | Real device testing |

No test runner installed yet — Vitest will be added as a task prerequisite.

## Threat Matrix

N/A — no shell commands, subprocesses, VCS/PR automation, executable-file classification, or process-integration boundary. Frontend routing (React Router) is not the routing boundary this matrix targets.

## Migration / Rollout

No migration required. Database schema is complete (migration `00001_core_schema.sql`). Frontend is purely additive — each feature can be built and merged independently. Rollback = revert commits to last stable state.

## Open Questions

- [ ] Confirm whether `songs_select_auth` policy should filter by `is_canonical OR church_id = user's church` (current policy returns ALL authenticated songs — may need tightening)
- [ ] Decide if setlist reorder uses optimistic updates or waits for server confirmation
- [ ] Confirm PWA manifest and service worker scope for the MVP
