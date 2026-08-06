# Tasks: Admin-Controlled Platform

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,800 authored across 7 units (generated types excluded) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 7 stacked PRs to main |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### WU00002 Hosted Non-Admin Helper Smoke Attempt (Blocked)

- The authorized disposable-user harness stopped before an Auth user was created; it therefore produced no identity, token, session, `platform_admins`, or `user_access_state` fixture to clean up.
- Sanitized result: `create_status=failed`, `helper_boolean=null`, `overall=fail`. The two duplicate non-admin helper rows remain unchecked because the required authenticated `false` result and cleanup proof were not established.
- No `sdd-attempt` settlement operation was called; native acquire had already returned `proceed` and settlement remains orchestrator-owned.

### WU00002 Hosted Non-Admin Helper Smoke Retry (Blocked)

- Current official Supabase documentation confirms a supported trusted-server API shape for confirmed user creation, password authentication, global sign-out, and hard deletion. However, the bounded in-memory preflight classified the current local runtime as `missing_required_runtime_configuration` for the required trusted admin client.
- No hosted call, Auth-user creation, authentication, helper invocation, session revocation, deletion, database query, log read, or configuration change was attempted. Sanitized result: `preflight_status=missing_required_runtime_configuration`, `mutation_performed=false`, `helper_boolean=null`, `overall=blocked`.
- The two duplicate non-admin helper rows remain unchecked. A later authorized attempt requires a safe trusted admin runtime configuration and must prove the exact `false` result plus post-cleanup absence before either row can be reconciled.

### WU00002 Hosted Non-Admin Helper Reconciliation and Smoke (Admitted)

- A single bounded Node parent acquired trusted keys only through its child `supabase projects api-keys --project-ref <safe-ref> --reveal --output json` process; stdout was parsed only in memory and no key, credential, token, or fixture identity was emitted or persisted.
- Reconciliation found and removed `0` prior fixture users matching the reserved opaque `rsvd9c4a2f6e-` harness prefix, then confirmed `0` residual fixture users before creating exactly one confirmed fixture.
- The harness inserted one minimal active `user_access_state` row, proved the fixture's `platform_admins` count was `0`, authenticated through the public client, and received the exact `public.is_platform_admin()` boolean `false`.
- `finally` revoked the fixture's global refresh session with its user JWT, removed its access-state row, hard-deleted the Auth user, and proved `0` fixture users, `0` access-state rows, and `0` platform-admin rows. No server-side target-session enumeration endpoint was used or available; the authenticated fixture session was explicitly revoked before deletion.
- Sanitized result SHA-256: `74a615b9146eb5f26a50b9c77245ed87a2557af88dddfb696b779e535c078ba9` (`status=passed`, `helper_boolean=false`, all reconciliation and cleanup counts `0`). Native acquire was `proceed`; no `sdd-attempt` operation ran and orchestrator-owned settlement is preserved.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 00001 | Additive `platform_admins`, `user_access_state`, helpers | PR 1 | `supabase db push` + `psql` helper verification | Linked Supabase; invoke `is_platform_admin()`, `is_user_active()` | Drop objects from `20260802185516_platform_admin.sql` only (additive) |
| 00002 | Non-committed bootstrap: deploy UUID owner, verify before cutover | PR 2 | Manual SQL transaction + helper RPCs | Deployed Supabase project with explicit auth user | N/A (non-committed; verifiable rollback via delete) |
| 00003 | Restrictive RLS cutover, publication boundary, timezone, privileged functions, six-role matrix | PR 3 | Linked migration parity + rollback/catalog checks + `npm run db:types && npm run lint` | Linked Supabase transactional verification + `supabase db advisors` | Forward migration restoring prior policies/functions |
| 00004 | `admin-api` Edge Function + typed SPA client + action tests | PR 4 | `npm test` + deployed unauthorized/owner read-only smokes | Unit test suite via `vitest` for client schema + Edge validation | Revert `src/services/adminService.ts`; disable function deploy |
| 00005 | Admin routes, AdminGuard, react-hot-toast install, user/church/membership mutation UI | PR 5 | `npm run build && npm run lint` | Navigate `/admin/users`, `/admin/churches` as platform admin | Remove `/admin` router tree + toast provider |
| 00006 | Invitation acceptance `/auth/invite` + canonical song/version admin UI + token-hash tests | PR 6 | `npm run build && npm run lint` | Full invite flow: email → `/auth/invite?token_hash=...` → password → `/dashboard` | Remove `/auth/invite` route, revert song form canonical path |
| 00007 | Full Spanish localization, Planly rebrand, toast sweep, auth templates, SMTP checklist, final verification | PR 7 | `npm run build && npm run lint` | UI sweep every route + layout; email template render test via Mailpit | Atomic string revert per feature; restore prior templates |

---

## Spec Coverage Map

| Spec Domain | 00001 | 00002 | 00003 | 00004 | 00005 | 00006 | 00007 |
|-------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| platform-admin | HA, AT | HA(bootstrap) | — | Full: all 8 actions, status codes | Guard+route auth | — | — |
| auth | — | — | — | — | signup removal | Full: invite, errors, lifecycle | Templates, SMTP, config |
| security-hardening | Stage 1 | Stage 1(bootstrap) | Full | — | — | — | — |
| song-catalog | — | — | Full: all RLS | — | — | Canonical UI, church roles | — |
| localization | — | — | Timezone fix | — | — | — | Full: all surfaces, es-MX |
| notifications | — | — | — | — | Toast install, error map, promise lifecycle | — | Toast sweep, accessible semantics |

Legend: HA=Sole Authority, AT=Admin Tables

---

## Deployment Gate: Bootstrap Checkpoint (after 00001, before 00003)

**BLOCKER**: Do NOT apply migration `20260802192919_restrictive_rls_cutover.sql` until all of:
- [x] Explicit deployed Auth user UUID identified from the hosted Supabase project
- [x] Non-committed SQL transaction executed on production:
  ```sql
  BEGIN;
  SELECT assert(COUNT(*) = 0) FROM public.platform_admins;
  INSERT INTO public.user_access_state (user_id, status) VALUES ('<DEPLOYED_UUID>', 'active');
  INSERT INTO public.platform_admins (user_id) VALUES ('<DEPLOYED_UUID>');
  SELECT assert(COUNT(*) = 1) FROM public.platform_admins;
  SELECT assert(COUNT(*) = 1) FROM public.user_access_state WHERE user_id = '<DEPLOYED_UUID>';
  COMMIT;
  ```
- [x] Owner claim context and `SELECT public.is_platform_admin();` returned `true`
- [x] Non-admin user `SELECT public.is_platform_admin();` returns `false`
- [x] `SELECT public.is_user_active();` returned `true` for owner

---

## Work Unit 00001 — Additive Admin Tables & Helpers [x]

- [x] Work unit implementation complete

### Completion Correction — Church Enumeration [x]

- [x] Added authorized, strict `list_churches` pagination to `admin-api`; it returns every church, including zero-membership churches, with a stable schema and per-church member count.
- [x] Updated the SPA types/client and church panel to use `list_churches` rather than deriving churches from memberships.
- [x] Added protocol, client mapping, and panel tests; deployed with `supabase functions deploy admin-api --use-api` and authorized-owner smoke passed without exposing identity or credentials.

**Goal**: Add `platform_admins`, `user_access_state`, their indexes/RLS, and three helper functions without altering existing policies.

**Dependencies**: Existing `auth.users` (supabase managed); `00001_core_schema.sql` and `00002_create_church_rpc.sql` applied.

**Estimated authored lines**: ~100 (generated types excluded; candidate identity includes `src/types/database.ts`)

### Files

| Action | Path | Symbols |
|--------|------|---------|
| CREATE | `supabase/migrations/20260802185516_platform_admin.sql` | `platform_admins`, `user_access_state`, indexes, RLS policies (select-self only), grants, `is_user_active(uuid)`, `is_platform_admin()`, `activate_current_user()` |
| CREATE | `supabase/migrations/20260802185911_revoke_platform_admin_helper_anon_execute.sql` | Append-only correction revoking explicit `anon` execution on the platform-admin helpers |
| UPDATE | `src/types/models.ts` | Add `PlatformAdmin`, `UserAccessState` interfaces |
| REGEN | `src/types/database.ts` | `npm run db:types` (generated; excluded from line count) |
| UPDATE | `supabase/seed.sql` | Replace self-service seed; add owner UUID placeholder + `INSERT INTO platform_admins` + `user_access_state` for seed users |

### Validation

- [x] Timestamped migrations applied cleanly to the linked project; timestamped names are required output from `supabase migration new`, not a design deviation
- [x] `SELECT * FROM public.platform_admins;` as `authenticated` returns only the caller's row
- [x] `SELECT * FROM public.user_access_state;` as `authenticated` returns only the caller's row
- [x] `anon` cannot select either table or execute the privileged helpers
- [x] `INSERT/UPDATE/DELETE` on admin tables is rejected as `authenticated`
- [x] `public.is_user_active()` and `public.is_platform_admin()` returned the expected owner values; bootstrap counts proved exactly one active platform admin
- [x] Linked type generation, tests, build, and lint pass

Validation note: Docker was unavailable, so local reset was safely replaced by linked apply/grant/RLS verification and rollback-only checks. No persistent verification fixtures were retained.

### Spec Coverage

- `platform-admin`: Sole Platform-Admin Authority (both scenarios), Protected Admin Tables (both scenarios)

| Focused test command | Runtime harness | Rollback boundary |
|----------------------|-----------------|-------------------|
| Linked `supabase db push`, type generation, and SQL grant/RLS/helper verification | Linked Supabase; invoke `is_platform_admin()` and `is_user_active()` under controlled claims | Undo timestamped additive objects only; existing `00001`/`00002` untouched |

---

## Work Unit 00002 — Non-Committed Bootstrap Verification [x]

- [x] Work unit implementation complete

**Goal**: Verify the exact-one-owner bootstrap on production before the restrictive `00004` cutover. Non-code unit; produces a deployment checklist.

**Dependencies**: 00001 migration applied on production; deployed Auth user UUID known.

**Estimated authored lines**: ~40 (checklist documentation only)

### Artifacts

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `docs/bootstrap-checkpoint.md` | Step-by-step manual bootstrap SQL, verification queries, rollback instructions |

### Validation (manual, non-automated)

- [x] Exactly one `platform_admins` row exists for the resolved owner
- [x] Exactly one active `user_access_state` row exists for the resolved owner
- [x] Owner `is_platform_admin()` → `true`
- [x] Non-admin `is_platform_admin()` → `false` (completed by the bounded hosted reconciliation smoke)
- [x] Owner `is_user_active()` → `true`

### Spec Coverage

- `security-hardening`: Cutover waits for bootstrap, Initial owner is exact
- `platform-admin`: Table authorizes the owner

| Focused test command | Runtime harness | Rollback boundary |
|----------------------|-----------------|-------------------|
| Manual — SQL verification snippets in checklist doc | Deployed Supabase project; owner signs in via SPA then runs verify SQL | Non-committed; `DELETE FROM platform_admins; DELETE FROM user_access_state;` reverts |

---

## Work Unit 00003 — Restrictive Cutover Migration [x]

- [x] Work unit implementation complete

**Goal**: Tighten all RLS policies, add publication boundary (`services.is_published`), backfill `America/Mexico_City`, replace privilege helpers with active-state-aware versions, revoke PUBLIC execute, add explicit grants. Include six-role SQL verification matrix.

**Dependencies**: 00001 applied; 00002 bootstrap verified and signed off on production.

**Estimated authored lines**: ~400 (generated types excluded; candidate identity includes `src/types/database.ts`)

### Files

| Action | Path | Symbols |
|--------|------|---------|
| CREATE | `supabase/migrations/20260802192919_restrictive_rls_cutover.sql` | All policy replacements (churches, memberships, songs, versions, repertoire, variants, teams, team_members, people, services, setlists, items, participants, roles); `services.is_published` column + backfill; `America/Mexico_City` timezone default + backfill; `is_church_member` + `has_church_role` + `is_curator` replacements (active-state gated, schema-qualified, empty search_path); `create_church` replacement (checks `is_platform_admin()`); all `REVOKE EXECUTE FROM PUBLIC` + explicit grants |
| CREATE | `supabase/tests/00004_six_role_matrix.sql` | Six-role verification: anon, auth/no-membership, member, worship_director, church_admin, platform_admin across all resources; pending/inactive denial cases |
| REGEN | `src/types/database.ts` | `npm run db:types` (generated; excluded) |

### Validation

- [x] Linked migration history and repository migration parity verified; remote transactional preflight safely replaced unavailable Docker reset
- [x] Tests, linked generated types, lint, and build pass
- [x] Six-role policy matrix and deterministic catalog invariants verified remotely
- [x] Pending/inactive users denied tenant reads/writes
- [x] Canonical song invariant: `WITH CHECK` prevents ownership change
- [x] Cross-tenant version reassignment rejected
- [x] Public anon: only `is_published=true` + `status IN ('active','completed')` visible
- [x] `public.is_platform_admin()` has empty search_path; resolves `public.platform_admins` only
- [x] `anon` cannot execute any privileged helper
- [x] `supabase db advisors` ran; accepted warnings are limited to intentionally authenticated SECURITY DEFINER helpers and pre-existing performance findings

Advisor note: security warnings remain for intentionally authenticated SECURITY DEFINER helpers and pre-existing performance findings; no anonymous privileged execution is allowed.

### Spec Coverage

- `security-hardening`: All 8 requirements (full)
- `song-catalog`: All ADDED + MODIFIED requirements (canonical invariant, version parent auth, church roles, listing, versions)
- `localization`: Fixed Mexico City Timezone (both scenarios)

| Focused test command | Runtime harness | Rollback boundary |
|----------------------|-----------------|-------------------|
| Linked migration parity, rollback/catalog verification, `npm run db:types`, tests, build, and lint | Linked transactional role/catalog verification; `supabase db advisors` | Forward timestamped migration restoring prior policies; never edit the applied cutover migration |

---

## Work Unit 00004 — Admin API Edge Function [x]

**Goal**: One `admin-api` Edge Function with service-role Auth mutations, strict request validation, idempotency, compensation, and sanitized error envelopes. Typed SPA client.

**Dependencies**: 00003 applied; production bootstrap owner verified; `SUPABASE_SERVICE_ROLE_KEY` set as Edge Function secret.

**Estimated authored lines**: ~500

### Files

| Action | Path | Symbols |
|--------|------|---------|
| CREATE | `supabase/functions/admin-api/index.ts` | `corsHeaders`, `validateToken`, `validateAdminAndActive`, action handlers: `list_users`, `invite_user`, `deactivate_user`, `reactivate_user`, `create_membership`, `update_membership_role`, `revoke_membership`, `create_church`; error envelope: `{ok,data}` / `{ok:false,error:{code,message}}` |
| CREATE | `supabase/functions/admin-api/deno.json` | Deno imports config |
| CREATE | `supabase/functions/admin-api/protocol.test.ts` | Protocol tests: strict action schemas, pagination, malformed identifiers, unknown fields, and sanitized error envelopes |
| CREATE | `src/services/adminService.ts` | `AdminApiClient` class with typed methods per action; `adminApi` singleton |
| CREATE | `src/types/admin.ts` | Request/response types, action discriminated union, error codes |

### Validation

- [x] `admin-api` deployed through the supported `supabase functions deploy admin-api --use-api` path without Docker
- [x] Deployed request without authorization returned `401`
- [x] Disposable authorized owner session returned `200` and valid schemas for `list_users` and `list_churches`
- [x] Protocol tests prove strict request validation and sanitized error envelopes without provider text, credentials, or service keys
- [x] Full suite passes: 62 tests in 11 files, including Edge protocol and typed client mapping tests
- [x] `npm run build` and `npm run lint` pass; lint has 0 errors and 21 accepted Fast Refresh warnings
- [x] Completed the current authorized-team non-email matrix: existing-user `invite_user` idempotency without external delivery; disposable-user pending/inactive denial and reactivation; membership create/update-role/revoke; church create/retry; last-admin revoke invariant; and the non-email atomic church-creation compensation seam. The external-production gate remains a release prerequisite: custom SMTP, owned verified sending domain, deployed/readback/render-verified Planly templates, external-recipient delivery, and new-invitation compensation smoke. No external invitation was attempted.

#### WU00004 Internal-Stage Hosted Matrix Evidence (2026-08-05)

- One in-memory Node parent acquired keys only from child-process `supabase projects api-keys --project-ref <safe-ref> --reveal --output json` stdout. No identity, email, UUID, token, key, password, raw CLI JSON, provider message, or environment value was emitted or persisted.
- Reconciliation and `finally` cleanup both confirmed zero fixture users/churches/memberships/access-state/platform-admin rows: `0/0/0/0/0`. Owner and disposable harness sessions were released with local scope before cleanup.
- Sanitized action/status coverage: existing-user `invite_user` `200` (`created=false`, `invitation_sent=false`); `create_church` `201`, exact retry `200` with the same resource; last church-admin revoke `422`; pending and inactive RLS/helper denial `200`; reactivation/active restore `200`; membership create `201`, update-role `200`, revoke `200`, repeat revoke `200` (`revoked=false`); non-email founding-user failure `500` with zero church/membership residue.
- Sanitized runtime evidence SHA-256: `a59b49c4bd02939bdeeee1487bf396591a7af2770c482f22543b6c4ff4e75e67` (canonical ordered action/status array only).
- Native acquire was `proceed`; no `sdd-attempt` operation ran. Settlement remains orchestrator-owned.

### Spec Coverage

- `platform-admin`: Common Protocol (4 scenarios), Paginated User Listing, Idempotent Invitation (3 scenarios), Deactivation/Reactivation (4 scenarios), Membership Actions (2 scenarios), Atomic Church Creation (2 scenarios), Status and Error Semantics

| Focused test command | Runtime harness | Rollback boundary |
|----------------------|-----------------|-------------------|
| `npm test` then deployed unauthorized and authorized-owner read-only smokes | Owner token → `list_users` and `list_churches`; remaining hosted matrix: current non-email stage plus deferred external-production invitation/delivery/compensation gate | Remove `src/services/adminService.ts`; `supabase functions delete admin-api`; re-deploy prior config |

---

## Work Unit 00005 — Admin Routes & Mutation UI [x]

- [x] Work unit implementation complete

**Goal**: Install `react-hot-toast`, mount global Toaster, create error-code-to-Spanish map, build admin-guarded routes for user/church/membership management, wire `admin-api` client.

**Dependencies**: 00004 deployed; `react-hot-toast` npm package available.

**Estimated authored lines**: ~650

### Files

| Action | Path | Symbols |
|--------|------|---------|
| INSTALL | `package.json` | Add `react-hot-toast` (dependency) |
| UPDATE | `src/App.tsx` | Import and mount `<Toaster position="top-right" />` inside App component |
| CREATE | `src/lib/toast.ts` | `toastSuccess(msg)`, `toastError(codeOrMsg)`, `toastLoading(msg)`, `toastPromise(promise, msgs)`; `ERROR_CODE_MAP: Record<string,string>` — sanitized Spanish fallback map; `getErrorMessage(code)` |
| CREATE | `src/features/auth/AdminGuard.tsx` | Checks `is_platform_admin()` RPC; redirects non-admin to `/dashboard` |
| CREATE | `src/features/admin/AdminLayout.tsx` | Sidebar nav: Usuarios, Iglesias, Canciones canónicas; `Outlet` |
| CREATE | `src/features/admin/UserListPage.tsx` | Paginated table with `list_users`; columns: email, status, memberships |
| CREATE | `src/features/admin/InviteUserForm.tsx` | Form: email, church select, role select; calls `invite_user`; toast.promise |
| CREATE | `src/features/admin/ChurchListPage.tsx` | Table of churches with member counts |
| CREATE | `src/features/admin/CreateChurchForm.tsx` | Form: name, slug, founding admin select; calls `create_church`; toast.promise |
| CREATE | `src/features/admin/UserDetailPage.tsx` | User detail: status toggle (deactivate/reactivate), membership list with add/update/revoke |
| UPDATE | `src/app/router/index.tsx` | Add `/admin` tree under `AdminGuard`, remove `/sign-up` route entirely |
| UPDATE | `src/services/authService.ts` | Remove `signUp` export; keep `signIn`, `signOut`, `getCurrentUser`, `getMemberships` |
| REMOVE | `src/features/auth/SignupForm.tsx` | Delete file (invitation replaces signup) |

### Validation

- [x] `AdminGuard` tests prove non-admin redirect to `/dashboard` and table-authorized admin access
- [x] `/admin/users`, `/admin/users/:userId`, `/admin/churches`, and canonical-song admin routes are mounted behind `AdminGuard`
- [x] Toast tests prove labelled loading/success lifecycle and sanitized Spanish error mapping without raw provider text
- [x] Admin UI uses the typed `admin-api` client for user, church, membership, role, and state mutations
- [x] `/sign-up` redirects to `/sign-in`; browser self-service signup code is removed
- [x] Full 62-test suite, `npm run build`, and `npm run lint` pass (0 lint errors; accepted Fast Refresh warnings only)

### Spec Coverage

- `auth`: Public signup disabled, Ordinary invitation metadata
- `notifications`: Global Toaster, Explicit Labels (2 scenarios), Promise Lifecycle (2 scenarios), Sanitized Mapping, Inline Validation (2 scenarios)

| Focused test command | Runtime harness | Rollback boundary |
|----------------------|-----------------|-------------------|
| `npm run build && npm run lint` | Navigate `/admin/users`, `/admin/churches`, invite user form, church create form, user detail as platform admin | Remove `/admin` router subtree, AdminGuard; restore `SignupForm` import; revert `authService.ts` signUp removal |

---

## Work Unit 00006 — Invitation Acceptance & Canonical Song UI [x]

- [x] Work unit implementation complete

**Goal**: Build `/auth/invite?token_hash=...&type=invite` SPA route with token-hash acceptance, password set, activation, and safe error states. Add canonical song/version admin UI with church-id-null creation. Include token-hash acceptance flow tests.

**Dependencies**: 00005; invitation email template available in Mailpit (locally); `activate_current_user()` RPC from 00001.

**Estimated authored lines**: ~450

### Files

| Action | Path | Symbols |
|--------|------|---------|
| CREATE | `src/features/auth/InvitePage.tsx` | `InvitePage`: read `token_hash`+`type` from URL; call `verifyOtp`; `updateUser({password})`; `rpc('activate_current_user')`; four safe error states; redirect `/dashboard` on success or `/sign-in?error=` on failure |
| CREATE | `src/features/auth/InvitePage.test.tsx` | Tests: missing token → incomplete message; expired token → vencimiento message; consumed token → used message; ambiguous → generic message; valid token+password → redirect to `/dashboard`; activation fail → redirect to `/sign-in?invite_error=activation` |
| UPDATE | `src/app/router/index.tsx` | Add `/auth/invite` route inside `AuthLayout` |
| CREATE | `src/features/admin/CanonicalSongAdmin.tsx` | List canonical songs; inline edit/delete; new canonical song form with `is_canonical:true, church_id:null` |
| UPDATE | `src/features/songs/SongForm.tsx` | Support `church_id: null` + `is_canonical: true` when `is_platform_admin()`; add canonical toggle gated by admin check |
| UPDATE | `src/features/songs/SongList.tsx` | When admin without active church, show canonical songs only |
| UPDATE | `src/features/songs/SongDetailPage.tsx` | Admin can access canonical song detail without church context |
| UPDATE | `src/services/songService.ts` | `createSong` allows `church_id: null` when `is_canonical: true`; `getSongs` supports null `churchId` for canonical-only query |
| UPDATE | `src/app/layouts/AuthLayout.tsx` | Rebrand from `SelahPlan` to `Planly` (branding partial — full sweep in 00007) |

### Validation

- [x] `/auth/invite?token_hash=VALID&type=invite` → password form → accept → `/dashboard`
- [x] `/auth/invite` without token → incomplete message + link to `/sign-in`
- [x] Expired token → "La invitación venció" message
- [x] Used token → "Esta invitación ya fue utilizada" message
- [x] Platform admin creates canonical song without church context via authoritative owner-claim transaction
- [x] Canonical song edit preserves `is_canonical=true, church_id=NULL`; breaking update is rejected
- [x] Canonical version create/edit/delete works in the same rollback-only transaction
- [x] `npm run build && npm run lint` pass

### Spec Coverage

- `auth`: Token-Hash Invitation (2 scenarios), Safe Error States (4 scenarios)
- `song-catalog`: Canonical Song Invariant (3 scenarios), Canonical Version Parent Authorization, Platform Admin Canonical View

| Focused test command | Runtime harness | Rollback boundary |
|----------------------|-----------------|-------------------|
| `npm run build && npm run lint` | Full invite flow: Mailpit email → token-hash URL → password set → `/dashboard`; canonical CRUD via admin panel | Remove `/auth/invite` route + `InvitePage`; revert canonical-song path in `SongForm`/`SongList`; restore `songService` |

---

## Work Unit 00007 — Localization, Branding, Templates & Final Verification [x]

- [x] Work unit implementation complete

**Goal**: Neutral Spanish across every inventoried surface, Planly rebrand, `es-MX` date/relative formatting, `react-hot-toast` sweep for all mutation flows, auth templates, SMTP operator checklist, final verification of all specs.

**Dependencies**: 00001–00006 implemented; Supabase built-in SMTP is accepted for authorized-team testing. Custom SMTP and an owned, verified domain are required before external-user production launch.

**Estimated authored lines**: ~700

### Files

| Action | Path | Symbols / Strings |
|--------|------|-------------------|
| UPDATE | `src/app/layouts/AppLayout.tsx` | `SelahPlan`→`Planly`; nav labels: `Dashboard`→`Tablero`, `Songs`→`Canciones`, `Teams`→`Equipos`, `Services`→`Servicios`, `Profile`→`Perfil`, `Sign out`→`Cerrar sesión`; add `Admin`→`Administración` link gated by admin |
| UPDATE | `src/app/layouts/AuthLayout.tsx` | `SelahPlan`→`Planly`; remove "Create one" link |
| UPDATE | `src/features/auth/LoginForm.tsx` | `Sign in`→`Iniciar sesión`, all labels/placeholders/errors Spanish |
| UPDATE | `src/features/auth/DashboardPage.tsx` | Spanish empty states, no-membership: `Contacta al administrador de Planly para que te asigne a una iglesia.` |
| UPDATE | `src/features/auth/ChurchSelect.tsx` | Remove timezone selector; lock to `America/Mexico_City`; Spanish labels |
| UPDATE | `src/features/songs/*` (SongList, SongForm, SongDetailPage, SongCard, SongVersions, VersionForm, ChordProEditor) | All labels, placeholders, errors Spanish |
| UPDATE | `src/features/teams/*` (TeamList, TeamDetailPage, ProfileForm) | All labels Spanish |
| UPDATE | `src/features/services/*` (ServiceList, ServiceForm, ServiceDetailPage, SetlistPage) | All labels, status text, date picks Spanish |
| UPDATE | `src/features/people/*` | All labels Spanish |
| UPDATE | `src/features/public-views/*` (PublicSetlist, PublicLyrics) | All labels Spanish |
| UPDATE | `src/features/admin/*` (AdminLayout, UserListPage, InviteUserForm, ChurchListPage, CreateChurchForm, UserDetailPage, CanonicalSongAdmin) | All labels Spanish |
| UPDATE | `src/components/shared/*` (ErrorBoundary, EmptyState, ConfirmDialog, LoadingSpinner, ShareButton, PageHeader) | All default strings Spanish |
| CREATE | `src/lib/formatDate.ts` | `formatDate(iso)` → `Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City'})`; `formatRelative(date)` → `Intl.RelativeTimeFormat('es-MX')` |
| UPDATE | All mutation service calls | Convert inline alerts to `toast.promise`/`toastError`; `ERROR_CODE_MAP` handles every known server code |
| CREATE | `supabase/templates/invite.html` | Spanish Planly invitation: token-hash link `/auth/invite?token_hash=...&type=invite` |
| CREATE | `supabase/templates/recovery.html` | Spanish Planly recovery: subject `Restablece tu contraseña de Planly` |
| CREATE | `supabase/templates/magic-link.html` | Spanish Planly magic link: subject `Tu enlace para iniciar sesión en Planly` |
| CREATE | `docs/smtp-checklist.md` | Operator steps: provider config, DNS (SPF/DKIM/DMARC), secrets, Site URL, redirect allow-list, template upload, test delivery, rollback; custom SMTP and verified domain gate external-user production launch |
| UPDATE | `supabase/config.toml` | `[auth]` + `[auth.email]` → `enable_signup = false`; SMTP section with `env()` placeholders; template paths |
| UPDATE | `supabase/seed.sql` | Replace `SelahPlan` with `Planly` in comments; update seed to platform-admin model with `platform_admins` + `user_access_state` rows |

### Validation

- [x] Controlled static scan found no shipped English UI, `SelahPlan`, Argentina/non-Mexico timezone, or raw rendered server-error interpolation; comments and test fixtures were excluded
- [x] `Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City' })` and `Intl.RelativeTimeFormat('es-MX')` tests pass, including `hace 3 horas`
- [x] Shared fallback/control copy (`ErrorBoundary`, `ConfirmDialog`, `EmptyState`, `LoadingSpinner`, `ShareButton`) is Spanish
- [x] Toast tests prove `Cargando:` → `Éxito:`/sanitized `Error:` protocol; inline schema validation remains field-local
- [x] Spanish Planly invite, recovery, and magic-link template artifacts exist with the token-hash invite URL
- [x] SMTP checklist documents provider, DNS, secrets, redirects, template upload, delivery verification, rollback, and the external-user production prerequisite
- [x] Full suite passes: 62 tests in 11 files
- [x] `npm run build` passes (`tsc -b` plus Vite production build)
- [x] `npm run lint` passes with 0 errors and 21 accepted Fast Refresh warnings
- [x] Vite preview returned HTTP 200 for `/sign-in`, `/auth/invite`, and `/s/example`
- [x] Revalidated the rendered `ServiceForm`: focused create/update component tests prove no timezone control is rendered. Each flow rejects accessible English/Spanish timezone labels and inventories the expected form-control IDs, while both mutation contracts send `America/Mexico_City`.
- [x] Hosted public/email signup is disabled for project `xiiibqgmkkstpwsstyvx`: a targeted Management API update changed only `disable_signup`, authenticated readback returned `true`, and public `/auth/v1/settings` returned HTTP 200 with `disable_signup=true` after an 8-second propagation wait
- [x] Maintainer accepted Supabase built-in SMTP for the current authorized-team testing stage: no owned domain or custom SMTP credentials exist, and a real administrator password-recovery request returned HTTP 200/accepted without printing or persisting identity. This proves request acceptance only, not external delivery or production readiness.
- [x] Current authorized-team hosted Auth email stage accepted: Supabase default Auth emails are accepted because this new Free-plan project uses built-in SMTP and cannot customize hosted templates
  - Evidence (2026-08-03): authenticated Management API readback proved all six intended invite/recovery/magic-link subject and content fields stale. A PATCH containing only those six stale fields returned HTTP 400; immediate authenticated readback proved every intended field remained stale and the fingerprint of all 236 unrelated Auth fields was unchanged. No hosted user, session, fixture, credential, Site URL, redirect allow-list, SMTP mode, or unrelated Auth field was created or changed.
  - This satisfies the current authorized-team testing decision only. It does not claim hosted Planly branding, external-recipient delivery, or external-user production readiness.
- **Deferred external-production gate (not a current-stage task):** before inviting any external production user, configure custom SMTP and an owned verified sending domain; deploy all three Planly invite, recovery, and magic-link templates; authenticate readback and render verification of each; and prove delivery to an external recipient.

### Spec Coverage

- `localization`: All 5 requirements (full inventory, timezone, es-MX formatting, sanitized failures, Planly auth-mail)
- `notifications`: Accessible Semantics (2 scenarios)
- `auth`: Planly Auth Email and SMTP Contract (3 scenarios), No-membership dashboard

| Focused test command | Runtime harness | Rollback boundary |
|----------------------|-----------------|-------------------|
| `npm run build && npm run lint` | UI sweep every route; Mailpit render test for all 3 templates; `es-MX` date/relative output verification | Each feature's strings revert atomically; restore prior templates; re-enable signup in config |
