# Exploration: admin-controlled-platform

## Current State

Planly currently behaves as a **self-service, multi-tenant SaaS**:

- `src/services/authService.ts` exposes `signUp(email, password)` which calls `supabase.auth.signUp` directly from the browser.
- `src/app/router/index.tsx` mounts `SignupForm` at `/sign-up` inside `AuthLayout`.
- `src/features/auth/ChurchSelect.tsx` renders a "Create a new church" form for every authenticated user, defaulting timezone to `America/Argentina/Buenos_Aires`.
- `createChurch` in `authService.ts` invokes the `create_church` SECURITY DEFINER RPC.
- The migration `00001_core_schema.sql` has `churches_insert_auth` with `WITH CHECK (true)`, so any authenticated user can insert a church row directly; the RPC only atomically adds the founding `church_admin` membership.
- `SongList`, `SongForm`, `SongDetailPage`, `TeamList`, `ServiceList`, etc. are nested under `ChurchGuard`, which redirects to `/dashboard` when no active church is selected.
- `SongList` and `SongForm` require `activeChurchId`; `createSong` always sets `church_id` to the active church and `is_canonical: false`.
- The schema already supports canonical songs: `songs(church_id uuid REFERENCES churches(id) ON DELETE SET NULL, is_canonical boolean NOT NULL DEFAULT false)` and seed data includes 10 canonical songs with `church_id NULL`.
- Auth layout still shows `SelahPlan` branding; `PublicLayout` already shows `Planly`.
- Timezone selector in `ChurchSelect.tsx` offers 14 global options.
- Success/error feedback is only local inline alerts (e.g., `setError`, `setNotice`, `formError`); there is no toast/notification system.
- `supabase/config.toml` has `enable_signup = true` for both `[auth]` and `[auth.email]` and `enable_confirmations = false`.
- `VITE_SUPABASE_ANON_KEY` is the only key shipped to the browser; no service role is currently referenced in the SPA.

## Affected Areas

- `src/services/authService.ts` — remove/rewrite `signUp`, add admin-only provisioning helpers.
- `src/app/router/index.tsx` — remove `/sign-up`, add `/admin` routes, guard by platform admin.
- `src/app/layouts/AppLayout.tsx` — rebrand to `Planly`, add admin link, translate nav strings.
- `src/app/layouts/AuthLayout.tsx` — rebrand, remove "Create one" link, Spanish copy.
- `src/features/auth/SignupForm.tsx` — remove or repurpose as invitation-accept screen.
- `src/features/auth/LoginForm.tsx` — Spanish copy, remove signup link.
- `src/features/auth/ChurchSelect.tsx` — remove creation form, lock timezone, Spanish copy.
- `src/features/auth/DashboardPage.tsx` — Spanish copy, handle no-church state for super admin.
- `src/features/songs/SongList.tsx`, `src/features/songs/SongForm.tsx` — allow super admin to create canonical songs without a church.
- `src/services/songService.ts` — allow `church_id: null` for canonical songs when caller is platform admin.
- `supabase/migrations/00001_core_schema.sql` / new migration — add `platform_admins`, restrict `churches_insert_auth`, update `create_church` RPC.
- `supabase/config.toml` — disable public signup, configure SMTP + branded templates (secrets via env).
- New `supabase/functions/provision-user/` — Edge Function using service_role to create/invite users and assign memberships.
- New `src/features/admin/` — platform admin panel (churches, users, memberships).
- New toast notification layer (e.g., `src/components/shared/ToastProvider.tsx` or simple event emitter) for success/error alerts.
- `src/types/models.ts` / `src/types/database.ts` — regenerate types after schema changes.
- `supabase/seed.sql` — update seed data, remove self-service test users, bootstrap platform admin.

## Approaches

### 1. Minimal: service_role in a single Edge Function + `platform_admins` table

- Add `platform_admins` table keyed by `user_id`.
- Add `is_platform_admin()` helper (SECURITY DEFINER or SECURITY INVOKER) and use it in RLS.
- Restrict `churches_insert_auth` to `is_platform_admin()`.
- Modify `create_church` RPC to require `is_platform_admin()`.
- Create a `provision-user` Edge Function that accepts `email`, `church_id`, `role`, validates the caller via `platform_admins`, then uses `supabase.auth.admin.createUser` or `inviteUserByEmail` and inserts `church_memberships`.
- Build an admin UI that calls the Edge Function.
- Use `app_metadata` for a fast UI hint (e.g., `app_metadata: { platform_role: 'super_admin' }`), but treat the `platform_admins` table as the authoritative source for RLS/Edge Function checks.

**Pros:**
- No service_role key leaves the browser.
- Single source of truth for admin identity (`platform_admins`).
- Extensible to multiple churches and later multi-admin if needed.

**Cons:**
- Requires an Edge Function deployment.
- User provisioning is asynchronous and needs toast/notification UX.

**Effort:** Medium

### 2. Simpler but risky: `app_metadata` only + client-side admin UI

- Mark the owner account with `app_metadata.platform_role = 'super_admin'`.
- Use `supabase.auth.updateUser({ data: ... })` from the SPA or seed it.
- Guard admin UI and RPCs with `auth.jwt() -> 'app_metadata' ->> 'platform_role' = 'super_admin'`.

**Pros:**
- No Edge Function needed for identity checks.
- Faster to implement.

**Cons:**
- Violates the verified security rule: never rely on `app_metadata`/`user_metadata` for authorization without accounting for stale JWT claims.
- Cannot use `inviteUserByEmail` or `createUser` from the browser; would still need a server-side call for provisioning, so the Edge Function is unavoidable anyway.
- Hard to audit who is a platform admin.

**Effort:** Low (but rejected for security reasons)

### 3. Hybrid (recommended): `platform_admins` table + `app_metadata` UI hint + Edge Function for provisioning

- `platform_admins` is the authoritative source for admin checks in RLS and Edge Functions.
- `app_metadata` is written only at provisioning time to speed up UI decisions (hide/show admin nav), but security decisions always re-query the table or use the Edge Function.
- Add a `before_user_created` or `custom_access_token` hook only if necessary to refresh claims; otherwise rely on short JWT expiry and table lookups.
- Use the Edge Function for all admin mutations: create user, invite user, create church, assign membership, create canonical song.

**Pros:**
- Defense in depth: table + server-side code + no browser admin key.
- Future-proof for multiple admins, role changes, audit logs.
- Matches the verified Supabase security guidance: do not use `user_metadata` for authorization; if `app_metadata` is used, account for stale JWT.

**Cons:**
- Slightly more schema and code.

**Effort:** Medium

## Recommendation

Adopt **Approach 3 (hybrid)**.

Reasoning:
- The owner explicitly stated: "I am the sole super admin; I know and provision the users for ~3 churches."
- A single Edge Function holding `SUPABASE_SERVICE_ROLE_KEY` is the only safe way to call `auth.admin.createUser`/`inviteUserByEmail` without exposing the service role in the SPA.
- A dedicated `platform_admins` table is the only auditable, RLS-friendly source of truth for platform-level authorization.
- `app_metadata` may be used for UI hints (e.g., showing an "Admin" menu item), but the table must drive actual authorization and provisioning.

## Detailed Answers to Investigation Questions

### 1. Why users currently can create churches and why songs require an active church

**Church creation:**
- `churches_insert_auth` RLS policy is `FOR INSERT TO authenticated WITH CHECK (true)` — no predicate.
- `create_church` RPC is SECURITY DEFINER and runs as the database owner, so it can insert both the `churches` row and the caller's `church_memberships` row even though `memberships_insert_admin` requires the caller to already be a `church_admin`.
- The `ChurchSelect.tsx` UI exposes this capability to every authenticated user.

**Songs require an active church:**
- `SongList`, `SongForm`, and other catalog routes are nested under `ChurchGuard` in the router.
- `getSongs(activeChurchId!, ...)` and `createSong({ ..., church_id: activeChurchId!, is_canonical: false })` hardcode the active church.
- There is no UI affordance for creating a canonical (`church_id NULL`) song.

### 2. Safest architecture for exactly one platform super admin without exposing service_role in the SPA

- Store the super admin identity in a `platform_admins` table.
- Create a Supabase Edge Function (e.g., `provision-user`) that:
  1. Receives a signed request from the SPA.
  2. Validates the caller against the `platform_admins` table.
  3. Uses `supabase.auth.admin.createUser` or `inviteUserByEmail` with the service role key (safe because it runs server-side).
  4. Inserts the `church_memberships` row.
- All other admin operations (create church, manage memberships, create canonical songs) should also go through either the Edge Function or SECURITY DEFINER RPCs that check `platform_admins`.
- Never commit `SUPABASE_SERVICE_ROLE_KEY` to Git; use Edge Function secrets or `env()` in `config.toml`.

### 3. `platform_admins` table, `app_metadata`, or both; recommend one

**Recommend both, with clear responsibilities:**
- **`platform_admins` table**: authoritative source for platform admin identity and RLS/Edge Function checks.
- **`app_metadata`**: optional, read-only UI hint (e.g., `app_metadata.platform_role`). Do not use it for authorization decisions without re-validating against the table.

Why not `app_metadata` alone:
- JWT claims can be stale until the token refreshes.
- `app_metadata` is less auditable than a table.
- Any provisioning logic (createUser/invite) must run server-side anyway, so the table is the natural place to check.

### 4. How super admin invites/activates users and assigns them to churches/roles

Flow:
1. Super admin opens the platform admin panel (`/admin/users`).
2. Fills "Invite / create user" form: email, target church, role (`church_admin` | `worship_director` | `member`).
3. SPA calls `POST /functions/v1/provision-user` with the form payload.
4. Edge Function:
   - Verifies the JWT belongs to a `platform_admins` row.
   - Calls `supabase.auth.admin.createUser({ email, email_confirm: true, ... })` or `inviteUserByEmail(email, { redirectTo: ... })`.
   - On success, inserts `church_memberships(user_id, church_id, role)`.
   - Returns the created/invited user id and membership id.
5. SPA shows a toast: "Usuario invitado" / "Usuario creado".
6. For existing users, the Edge Function can skip user creation and insert only the membership.

### 5. No-church state: should super admin create canonical songs globally while ordinary users always require membership?

Yes.

- **Canonical songs**: `church_id NULL` and `is_canonical true`. These are the global catalog shared by all churches. The super admin should be able to add/edit these from the admin panel without selecting a church.
- **Ordinary users**: must have a `church_membership` to see church-specific data. If a user is not assigned to any church, they land on a Spanish empty state explaining they need to be assigned by the admin.
- **RLS changes**: `songs_insert_authenticated` should allow `is_canonical = true AND church_id IS NULL AND is_platform_admin()` in addition to the existing church-member path.
- **UI changes**: `SongForm` must allow `church_id: null` + `is_canonical: true` when the current user is a platform admin. `SongList` should probably be accessible to the super admin even without an active church, showing only canonical songs.

### 6. Required additive migrations/RLS/RPCs/Edge Functions

**New migration (do not modify existing migration files):**

```sql
-- 00003_platform_admin.sql
CREATE TABLE platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = auth.uid()
  );
END;
$$;

-- Restrict church creation to platform admins
CREATE POLICY "churches_insert_platform_admin" ON churches
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin());

-- Drop the old permissive policy (or replace via migration)
DROP POLICY IF EXISTS "churches_insert_auth" ON churches;

-- Update membership/admin policies so only platform admins can create the founding admin
CREATE OR REPLACE FUNCTION create_church(...)
  -- require is_platform_admin()
```

**RPCs to add/modify:**
- Update `create_church` to require `is_platform_admin()`.
- Optional `assign_membership(church_id, user_id, role)` SECURITY DEFINER RPC for admin panel (or do it in the Edge Function).
- Optional `create_canonical_song(...)` RPC to ensure the admin path is explicit.

**Edge Function:**
- `supabase/functions/provision-user/index.ts` (service role, validates `platform_admins`).
- Could also add `admin-create-church` if the SPA should not call `create_church` directly.

**RLS updates needed:**
- `churches_insert_auth` → replace with `churches_insert_platform_admin`.
- `songs_insert_authenticated` → add platform admin canonical path.
- `songs_update_canonical` / `songs_delete_canonical` → already restrict to `is_curator()`; consider making the platform admin the only curator (or keep `global_curators` and add the platform admin there).
- `song_versions` policies currently require `is_curator()`; this is fine if the platform admin is also a curator.

### 7. Required Spanish UX changes, notifications/toasts, and Planly branding updates

**Branding:**
- Replace `SelahPlan` with `Planly` in:
  - `src/app/layouts/AppLayout.tsx` header.
  - `src/app/layouts/AuthLayout.tsx` header.
  - `supabase/migrations/00001_core_schema.sql` comments (cosmetic).
  - `supabase/seed.sql` comments and sample data.
  - `README.md` references to `SelahPlan`.

**Spanish UI:**
- Translate all labels in `LoginForm`, `SignupForm` (or its replacement), `ChurchSelect`, `DashboardPage`, `SongList`, `SongForm`, `SongDetailPage`, `TeamList`, `ServiceList`, `ProfilePage`, `PublicLayout`, `PublicSetlist`, etc.
- Examples: `Sign in` → `Iniciar sesión`, `Songs` → `Canciones`, `Teams` → `Equipos`, `Services` → `Servicios`, `Profile` → `Perfil`, `Create account` → `Crear cuenta`, `Sign out` → `Cerrar sesión`.

**Notifications/Toasts:**
- Add a lightweight toast system (e.g., React context + state queue, or a tiny event emitter) since no toast library is installed.
- Replace inline-only success notices with global toasts for mutations: user invited, church created, song saved, membership assigned, etc.
- Keep inline field errors next to form fields.

### 8. Auth email branding configuration steps and what cannot be represented safely in Git

**Steps:**
1. In `supabase/config.toml`:
   - Set `enable_signup = false` under `[auth]` and `[auth.email]`.
   - Configure `[auth.email.smtp]` with host, port, user, `pass = "env(SUPABASE_AUTH_SMTP_PASS)"`, `admin_email`, and `sender_name = "Planly"`.
   - Uncomment `[auth.email.template.invite]` with `subject = "Has sido invitado a Planly"` and a `content_path` pointing to a Spanish HTML template.
2. Create `supabase/templates/invite.html` (Spanish, mentions Planly).
3. Store the SMTP password and any SendGrid/Mailgun API key in environment variables / Supabase Edge Function secrets, **never in Git**.
4. For the hosted project, configure the same SMTP and templates in the Supabase Dashboard under Auth → Email Templates.

**Cannot be in Git:**
- SMTP passwords/API keys.
- `SUPABASE_SERVICE_ROLE_KEY`.
- Any signing keys or OAuth secrets.
- Production `VITE_SUPABASE_ANON_KEY` (already in `.env` but not in `.env.example` and not committed by `.gitignore`?).

**Note:** Free Supabase projects using the default SMTP cannot customize auth email templates. Custom SMTP is required. Document this as a prerequisite.

### 9. Risks in existing RLS, especially named policies

**`churches_insert_auth`:**
- Critical risk: `WITH CHECK (true)` lets any authenticated user create a church. Must be replaced with `is_platform_admin()`.

**`songs_select_auth`:**
- `FOR SELECT TO authenticated USING (true)` lets any authenticated user read all non-canonical songs from all churches. This is a cross-tenant leak.
- Should be tightened to: `is_canonical = true OR is_church_member(church_id)`.

**`songs_select_anon`:**
- `is_canonical = true` is correct for public views, but only if public views actually need canonical songs.

**Version policies:**
- `versions_select_auth` is `USING (true)` — cross-tenant leak for all church-owned song versions.
- Should be tightened to: `EXISTS (SELECT 1 FROM songs WHERE songs.id = song_versions.song_id AND (songs.is_canonical = true OR is_church_member(songs.church_id)))`.

**`anon` service visibility:**
- `services_select_anon` uses `EXISTS (SELECT 1 FROM churches c WHERE c.id = services.church_id)` which is effectively all services because churches exist. Public views likely need only published setlists, not all services.
- `setlists_select_anon`, `items_select_anon`, and `repertoire_select_anon` have similar overly broad checks.
- Public views are meant to be read-only links; the public policies should be keyed by `is_published = true` or the public setlist ID, not by the existence of a parent row.

**`SECURITY DEFINER` RPC:**
- `create_church` is SECURITY DEFINER and currently allows any authenticated caller to create a church and become its admin. Once the insert policy is fixed, the RPC still bypasses the policy and must internally check `is_platform_admin()`.
- `is_church_member`, `has_church_role`, `is_curator` are SECURITY DEFINER helper functions. They are safe because they only read and check `auth.uid()`, but they must not be used to bypass RLS for write operations.

**`auto_expose_new_tables`:**
- `config.toml` leaves it unset (default false), which is good — new tables are not auto-exposed.
- Any new table (e.g., `platform_admins`) must explicitly enable RLS and add policies.

### 10. Recommended incremental implementation slices under 800 changed lines

With the orchestrator's review budget of 800 lines, split the work into 4–5 chained/sequential PRs:

**Slice 1 — Lock down platform admin and disable self-service (≈150 lines)**
- Migration `00003_platform_admin.sql`: add `platform_admins`, `is_platform_admin()`, restrict `churches_insert_auth`.
- Update `create_church` RPC to require `is_platform_admin()`.
- Remove `/sign-up` route; redirect `/sign-up` to `/sign-in`.
- Disable `enable_signup` in `config.toml`.
- Update `seed.sql` to bootstrap one platform admin.
- Regenerate `src/types/database.ts`.

**Slice 2 — Edge Function for user provisioning (≈150 lines)**
- New `supabase/functions/provision-user/index.ts`.
- Update `src/services/authService.ts` to remove `signUp` and add `provisionUser` helper.
- Add Edge Function secret configuration instructions.

**Slice 3 — Super admin panel (≈200 lines)**
- New `src/features/admin/` routes and components: users list, invite user form, churches list, create church form.
- Add `/admin` route guarded by platform admin check.
- Wire `provision-user` Edge Function and `create_church` RPC.
- Seed platform admin with access.

**Slice 4 — Canonical songs without a church (≈150 lines)**
- Update RLS for `songs` and `song_versions` to allow platform admin to create/edit canonical songs.
- Update `SongForm` to support `church_id: null` + `is_canonical: true` when admin.
- Update `SongList` to be accessible for admin without active church.

**Slice 5 — Spanish localization, branding, and toast notifications (≈400 lines)**
- Translate all UI strings to neutral Spanish.
- Replace `SelahPlan` with `Planly`.
- Lock timezone to `America/Mexico_City` (remove selector, default everywhere).
- Add toast provider and replace key mutation success/error notices with toasts.
- This slice is the largest and may need to be split further if line count exceeds 800; e.g., separate "toast system" and "Spanish copy/branding".

**Slice 6 — RLS hardening (non-blocking, ≈200 lines)**
- Tighten `songs_select_auth`, `versions_select_auth`, and public `anon` policies for services/setlists/items.
- Add tests or manual verification queries.

## Risks

- **RLS regression**: changing `churches_insert_auth` and `songs_select_auth` can break existing flows if policies are too restrictive. Must verify each role can still access required data.
- **Service role exposure**: any mistake in Edge Function setup or environment variables could leak the service key. Use `supabase secrets set` and never log the key.
- **Stale JWT claims**: if `app_metadata` is used for UI hints, the admin might not see admin UI immediately after provisioning until token refresh. Mitigate by checking `platform_admins` table on app load.
- **Email deliverability**: custom SMTP is required for branded auth emails. Without it, the default Supabase email still says "Supabase" and not "Planly".
- **Seed data mismatch**: existing seed creates multiple self-service admins and churches. Seed must be updated to reflect the platform-admin-only model.
- **Migration order**: `00003_platform_admin.sql` depends on `auth.users` and existing `churches`/`church_memberships` tables. Keep it additive and idempotent.
- **User experience for non-admin users**: if a user signs in before being provisioned, they will see no churches. The UI must clearly explain "Contacta al administrador de Planly" in Spanish.

## Ready for Proposal

Yes. The next phase should be `sdd-propose` to define the exact scope, acceptance criteria, and rollback plan for the admin-controlled-platform change. The orchestrator should tell the user that this change will disable public signup, introduce a platform super admin panel, require a custom SMTP provider for branded auth emails, and localize the entire UI to Spanish.
