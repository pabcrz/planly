# Design: Admin-Controlled Platform

## Technical Approach

Planly uses `public.platform_admins` as the sole platform-admin authority and `public.user_access_state` as the authoritative pending/active/inactive gate. One `admin-api` Edge Function owns privileged Auth and cross-tenant mutations. RLS remains the primary tenant boundary. Delivery is seven slices under 800 authored changed lines each, with additive migration `00003`, a manual verified bootstrap, and restrictive cutover `00004`.

## Architecture Decisions

| Decision | Choice and rationale |
|----------|----------------------|
| Admin authority | `platform_admins` is authoritative. Product policy bootstraps exactly one initial row and exposes no action to add another. `app_metadata` may optimize UI only and MUST NOT authorize; ordinary users never receive `super_admin` metadata. |
| Access lifecycle | `user_access_state.status` (`pending`, `active`, `inactive`) is authoritative for application access. Auth confirmation/ban fields are synchronized evidence, not the database authorization source. |
| Privileged boundary | One service-role `admin-api` validates the caller with Auth, active state, and `platform_admins` before dispatch. The service key stays outside Git/browser/logs. |
| JWT revocation | Bans and supported refresh-session revocation prevent future refresh/sign-in, but current access JWTs remain valid until `exp`. Configure a short Auth JWT lifetime and require active-state database checks for sensitive work. |
| Canonical ownership | Platform admins alone mutate canonical songs/versions. `global_curators` remains historical but no longer authorizes canonical operations. |
| Tenant leadership | `worship_director` and `church_admin` may create/update church songs and versions, teams, services, setlists, and items in their church; destructive church/service operations remain `church_admin`. |
| Public boundary | Public operational data requires `services.is_published = true` and status `active` or `completed`; setlists/items inherit that parent boundary. Public repertoire requires `church_repertoire.is_published = true`. |
| Localization | Central messages and sanitized error codes cover every visible surface. No raw exception text reaches users. |
| SMTP and hosted templates | Use Supabase built-in SMTP and default hosted Auth emails only for authorized project-team testing while no domain or provider credentials exist and Free-plan/default-SMTP policy prevents hosted template customization. Before external-user production launch, require custom SMTP, an owned verified sending domain, deployed Planly templates with authenticated readback/render verification, external-recipient delivery proof, and the new-invitation compensation smoke. Current-stage acceptance is not production-readiness evidence. |

## Authoritative Data Model

Migration `00003_platform_admin.sql` adds only these tables, indexes, RLS policies, and helper functions; it does not replace existing policies.

```sql
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_access_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'inactive')),
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id),
  reason text
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_admins_select_self ON public.platform_admins
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY user_access_state_select_self ON public.user_access_state
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
-- No authenticated INSERT, UPDATE, or DELETE policy on either table.

REVOKE ALL ON TABLE public.platform_admins, public.user_access_state FROM anon, authenticated;
GRANT SELECT ON TABLE public.platform_admins, public.user_access_state TO authenticated;
GRANT ALL ON TABLE public.platform_admins, public.user_access_state TO service_role;

CREATE OR REPLACE FUNCTION public.is_user_active(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_access_state uas
    WHERE uas.user_id = target_user_id AND uas.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    JOIN public.user_access_state uas ON uas.user_id = pa.user_id
    WHERE pa.user_id = auth.uid() AND uas.status = 'active'
  );
$$;

-- Called only after invite verifyOtp and updateUser({ password }) succeed.
-- It updates only auth.uid(), and only when Auth confirms that email.
CREATE OR REPLACE FUNCTION public.activate_current_user()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'activation_not_allowed'; END IF;
  UPDATE public.user_access_state
  SET status = 'active', changed_at = now(), changed_by = auth.uid(), reason = NULL
  WHERE user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'activation_state_invalid'; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid), public.is_platform_admin(), public.activate_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid), public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_current_user() TO authenticated;
```

## Invitation Acceptance

`inviteUserByEmail` does **not** support PKCE. `admin-api` calls:

```ts
supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
  redirectTo: `${PLANLY_ORIGIN}/auth/invite`,
})
```

The Planly invite template constructs the token-hash URL directly:

```html
<a href="{{ .SiteURL }}/auth/invite?token_hash={{ .TokenHash }}&type=invite">Aceptar invitación</a>
```

An allow-listed equivalent origin may use `.RedirectTo`, but the resulting path and query contract stay `/auth/invite?token_hash={{ .TokenHash }}&type=invite`. The SPA reads `token_hash`; token-hash verification does not require or send an email argument.

```ts
const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: 'invite' })
// data.session is now established
await supabase.auth.updateUser({ password })
await supabase.rpc('activate_current_user')
```

On success, redirect to `/dashboard`. If activation fails after password update, sign out and redirect safely to `/sign-in?invite_error=activation`. Error rendering uses only these sanitized states:

| State | Spanish message | Safe action |
|-------|-----------------|-------------|
| Missing `token_hash` or wrong `type` | `El enlace de invitación está incompleto. Solicita una nueva invitación.` | Link to `/sign-in` |
| Verified expired-token code | `La invitación venció. Solicita una nueva invitación al administrador de Planly.` | Link to `/sign-in` |
| Verified reused/already-consumed code | `Esta invitación ya fue utilizada. Inicia sesión para continuar.` | Link to `/sign-in` |
| Invalid/ambiguous provider response | `No se pudo validar la invitación. Solicita una nueva invitación.` | Link to `/sign-in` |

Provider text is logged only as protected diagnostics and is never rendered. If the provider cannot distinguish expired from consumed, use the invalid/ambiguous state rather than guessing.

## `admin-api` Contract

### Common Protocol

- `POST /functions/v1/admin-api`; `OPTIONS` returns `204`; other methods return `405`.
- `Authorization: Bearer <access-token>` is required. Missing/invalid token returns `401`; inactive/non-admin returns `403`.
- The function validates the token with `auth.getUser(token)`, then checks `user_access_state.status='active'` and `platform_admins` using the service-role client.
- Body is a strict discriminated union; unknown fields/actions or malformed UUID/email/page values return `400` without mutation.
- Success: `{ "ok": true, "data": T }`. Failure: `{ "ok": false, "error": { "code": string, "message": string }, "details"?: { "cleanup_required"?: boolean } }`.
- Public API messages are sanitized neutral Spanish. Internal Supabase/SQL errors and secrets are never returned or logged with credentials.
- `404` means target absent, `409` means existing state conflicts, `422` means a valid request violates a product invariant, `500` means local failure, and `502` means an Auth dependency failed.

### Actions

| Action | Request | Success payload/status | Idempotency and compensation |
|--------|---------|------------------------|------------------------------|
| `list_users` | `{action,page?:number=1,per_page?:number=25}`; `1..100` | `{users:[{id,email,status,memberships}],page,per_page,total,next_page}` / `200` | Read-only; stable `created_at,id` ordering. |
| `invite_user` | `{action,email,church_id,role}` | `{user_id,email,status,membership,invitation_sent,created}` / `201` new or `200` reused | Normalize with `trim().toLowerCase()`. Existing user is reused and not re-emailed. Existing identical membership is returned; different role is `409`. Create pending access row and membership. If membership fails, delete an unconfirmed user created by this request only when it has no other membership/session; otherwise preserve it and return `500` with `cleanup_required:true`. Remove the pending state row when deleting. |
| `deactivate_user` | `{action,user_id,membership_mode:'retain'|'revoke_all'|'revoke_selected',membership_ids?:uuid[]}` | `{user_id,status:'inactive',revoked_membership_ids,refresh_sessions_revoked}` / `200` | Repeating inactive state is `200`. Reject the sole platform admin with `422`. Ban using Auth `banned_until`/`ban_duration`, then transactionally mark inactive and revoke only requested memberships. If the DB transaction fails, restore the prior ban where safe. Revoke refresh sessions when the deployed Auth Admin API supports targeted revocation; report `false` otherwise. Current access JWTs still live until expiry. |
| `reactivate_user` | `{action,user_id}` | `{user_id,status:'active'|'pending'}` / `200` | Clear ban; set `active` only if email is confirmed, otherwise `pending`. On DB failure, restore the prior ban where safe. Revoked memberships are not recreated. |
| `create_membership` | `{action,user_id,church_id,role}` | `{membership}` / `201` or identical existing / `200` | Unique `(user_id,church_id)` makes retries safe; a different existing role returns `409`. Transaction only. |
| `update_membership_role` | `{action,membership_id,role}` | `{membership}` / `200` | Same role returns current row. Missing is `404`; reject a change that removes a church's last `church_admin` with `422`. Transaction only. |
| `revoke_membership` | `{action,membership_id}` | `{membership_id,revoked}` / `200` | Missing row returns `{revoked:false}`. Reject removal of the last `church_admin` with `422`. Transaction only. |
| `create_church` | `{action,name,slug,founding_admin_user_id}` | `{church,founding_membership}` / `201` or exact retry / `200` | Normalize slug. One database transaction inserts church with `America/Mexico_City` and founding `church_admin`. Same slug and same normalized payload returns existing result; different payload is `409`; any failure rolls back both rows. |

## Restrictive SQL Cutover (`00004`)

`00004_admin_cutover.sql` adds `services.is_published boolean NOT NULL DEFAULT false`, backfills and defaults church/service timezone to `America/Mexico_City`, and replaces existing authorization helpers so tenant membership requires active state. It revokes `PUBLIC` execute and grants only `authenticated` and `service_role` where required. `create_church` is replaced with an admin-checked, explicit founding-user form; `authenticated` may execute it, while its body calls `public.is_platform_admin()`.

Canonical song UPDATE preserves the invariant on both old and new rows:

```sql
CREATE POLICY songs_update_authenticated ON public.songs
FOR UPDATE TO authenticated
USING (
  public.is_user_active() AND (
    (is_canonical = true AND church_id IS NULL AND public.is_platform_admin()) OR
    (is_canonical = false AND church_id IS NOT NULL AND public.has_church_role(church_id, 'worship_director'))
  )
)
WITH CHECK (
  public.is_user_active() AND (
    (is_canonical = true AND church_id IS NULL AND public.is_platform_admin()) OR
    (is_canonical = false AND church_id IS NOT NULL AND public.has_church_role(church_id, 'worship_director'))
  )
);
```

Canonical and church-owned version UPDATE authorizes the old parent in `USING` and the new parent in `WITH CHECK`, preventing cross-tenant `song_id` reassignment:

```sql
-- The identical parent predicate is applied separately to OLD row visibility
-- (USING, current song_versions.song_id) and NEW row validity (WITH CHECK).
EXISTS (
  SELECT 1 FROM public.songs s
  WHERE s.id = song_versions.song_id AND (
    (s.is_canonical = true AND s.church_id IS NULL AND public.is_platform_admin()) OR
    (s.is_canonical = false AND s.church_id IS NOT NULL
      AND public.has_church_role(s.church_id, 'worship_director'))
  )
)
```

Version INSERT uses that predicate in `WITH CHECK`; DELETE uses it in `USING`. Song INSERT requires canonical/null/platform-admin or noncanonical/non-null/active church membership. Canonical DELETE requires canonical/null/platform-admin; church song DELETE requires `church_admin`. Authenticated SELECT returns canonical plus own-church rows only; anonymous SELECT returns canonical rows only. All table names inside empty-search-path helpers are schema-qualified, including `public.platform_admins` inside `public.is_platform_admin()`.

Public policies are exact: anon sees a church/service only when the service has `is_published=true` and `status IN ('active','completed')`; anon sees a setlist or item only through such a service; unpublished/planned rows never qualify. Public repertoire/variants require `church_repertoire.is_published=true`. Authenticated tenant reads also require active state and own membership.

## Six-Role Matrix

Legend: `R` read, `C` create, `U` update, `D` delete, `self` own profile/state, `public` published boundary only, `E` through `admin-api`; all tenant rights mean own church only. A platform admin gains no tenant mutation right merely from admin status.

| Resource | anon | auth/no membership | member | worship_director | church_admin | platform_admin |
|----------|------|--------------------|--------|------------------|--------------|----------------|
| Churches | public R | public R | own R | own R | own R/U | all R/C; E C |
| Memberships | - | - | own-church R | own-church R | own-church R/C/U/D | E all; direct self R |
| Songs | canonical R | canonical R | canonical+own R/C | canonical+own R/C/U | canonical+own R/C/U/D | canonical R/C/U/D; tenant only if member |
| Song versions | canonical R | canonical R | canonical+own R | canonical+own R/C/U/D | canonical+own R/C/U/D | canonical R/C/U/D; tenant only if member |
| Teams/team members | - | - | R | R/C/U + member C/D | R/C/U/D + member C/D | only if member |
| People | - | self only if membership exists | R + self C/U | R + self C/U | R + self C/U | only if member |
| Services | public R | public R | R | R/C/U | R/C/U/D | public R; tenant only if member |
| Setlists/items | public R | public R | R | R/C/U/D while unfrozen | R/C/U/D | public R; tenant only if member |
| `platform_admins` | - | - | - | - | - | own row R; sole authority |
| `user_access_state` | - | self R | self R | self R | self R | self R; E all |
| `admin-api` actions | - | - | - | - | - | all eight actions |

Inactive/pending authenticated users retain only the minimum own-state/invitation completion path; they do not inherit the authenticated matrix rows. Church-admin membership management stays tenant-scoped through RLS; cross-tenant management remains Edge-only.

## Localization and Notifications

The string inventory MUST cover auth, admin, dashboard, songs, teams, people, services, setlists and items, public views, profile, app/auth/public layouts, and shared `ErrorBoundary`, `EmptyState`, `ConfirmDialog`, `LoadingSpinner`, and `ShareButton`, plus validation, errors, and toasts. Date/time helpers use `Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City' })`; relative text uses `Intl.RelativeTimeFormat('es-MX')`.

One root `<Toaster>` serves every route. Every visible toast starts with `Éxito:`, `Error:`, or `Cargando:`. Promise mutations use `toast.promise` so one toast transitions loading to success/error with `role="status"` and `aria-live="polite"`; urgent destructive failures MAY use `role="alert"`/`aria-live="assertive"`. Inline field validation remains beside fields and produces no summary toast. Server failures use a code-to-Spanish map and generic fallback; raw server/exception text is never visible.

## SMTP and Auth Templates

- Sender name: `Planly`; sender address, credentials, Site URL, redirect allow-list, and provider are environment/dashboard settings outside Git.
- Subjects: invite `Has sido invitado a Planly`; recovery `Restablece tu contraseña de Planly`; magic link `Tu enlace para iniciar sesión en Planly`.
- Repository templates are neutral Spanish, Planly-branded, and contain token-hash links for their matching `invite`, `recovery`, or `magiclink` flow. They are not evidence that the hosted templates are deployed.
- The operator checklist documents provider setup, DNS verification (SPF/DKIM/DMARC), secret placement, Site URL/redirect allow-list, template upload, authenticated readback/render verification, external-recipient delivery proof, expiry/reuse checks, and rollback.
- Mailpit is sufficient locally. For the current authorized project-team stage, Supabase built-in SMTP and its default hosted Auth emails are accepted, subject to strict rate limits, project-team-recipient restriction, and the documented Free-plan/default-SMTP customization restriction.
- **Verification scope split:** the current authorized-team stage MUST prove non-email-dependent behavior: existing-user `invite_user` idempotency without delivery, disposable-user deactivate/reactivate, membership create/update-role/revoke, church creation idempotency, last-admin revoke protection, and any documented non-email compensation seam. Supabase Auth's `email_address_invalid` rejection of the disposable harness address occurs before delivery and is a provider validation constraint, not an `admin-api` defect.
- **Deferred external-production gate:** before inviting arbitrary external users, configure custom SMTP and an owned verified sending domain; deploy all three Planly templates; authenticate readback and render verification of each; prove delivery to an external recipient; and complete the new-invitation compensation smoke. This deferral is not a waiver, does not establish production readiness, and is not a current-testing or unrelated-deployment blocker.

## Seven Delivery Slices

| Slice | Contents | Budget |
|-------|----------|--------|
| 1 | `00003` additive tables, RLS, helpers, generated types/tests | `<800` authored lines |
| 2 | Manual non-committed bootstrap and verification checklist | `<800` authored lines |
| 3 | `00004` restrictive policy/publication/timezone/function cutover and RLS matrix | `<800` authored lines |
| 4 | `admin-api` plus typed client and action tests | `<800` authored lines |
| 5 | Admin routes and church/user/membership UI | `<800` authored lines |
| 6 | Invitation acceptance and canonical song/version UI | `<800` authored lines |
| 7 | Localization inventory, branding, toasts, templates, SMTP docs, final verification | `<800` authored lines |

## Migration and Rollout

1. Apply `00003` only. It is additive and does not tighten existing policies.
2. Run a non-committed deployment transaction with an explicit existing `auth.users.id`: lock/check `COUNT(*)=0`, insert one `user_access_state(...,'active')`, insert exactly one `platform_admins` row, assert both counts equal one, and commit. Then sign in as that UUID and verify `is_user_active()` and `is_platform_admin()` are true; verify a non-admin is false.
3. Apply `00004` only after bootstrap verification. It performs restrictive policy cutover, timezone defaults/backfill to `America/Mexico_City`, publication boundary, privileged function replacement, `REVOKE EXECUTE FROM PUBLIC`, and explicit grants.
4. Deploy slices 4-7. Any later database correction is a new `00005+` migration; applied migrations are never rewritten.
5. Rollback uses a new forward migration restoring prior policies/functions. Do not remove the sole owner while restrictive policies remain active.

## Testing Strategy

| Layer | Contract evidence |
|-------|-------------------|
| SQL | Six roles, pending/inactive denial, old/new canonical/version checks, public publication boundary, grants, exact-one bootstrap assertions |
| Edge | Every schema/status, normalized-email idempotency, last-admin invariants, compensation and unsupported refresh-revoke result |
| Component | Invite token states, safe redirects, AdminGuard, field-only validation, accessible toast transition |
| Unit | Error sanitization, complete Spanish inventory, `es-MX` date/relative formatting |
| Runtime — current authorized-team stage | Existing-user invitation idempotency without delivery, deactivate/reactivate of disposable users, membership create/update-role/revoke, church create/retry, last-admin revoke invariant, documented non-email compensation seam, and JWT-expiry limitation |
| Runtime — deferred external-production gate | Custom SMTP and owned-domain readiness, deployed-template readback/render verification, external-recipient delivery, and new-invitation compensation smoke |

## Threat Matrix

N/A: no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Application routing is covered by invitation and admin route tests above.

## Open Questions

None.
