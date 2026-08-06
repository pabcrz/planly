# Proposal: Admin-Controlled Platform

## Intent

Convert Planly from self-service signup to an invitation-only, platform-admin-controlled product. The change establishes one authoritative initial owner, closes cross-tenant RLS gaps, adds canonical catalog administration, localizes every user-facing surface to neutral Spanish, and completes the Planly rebrand described by the README product scope.

## Scope

### In Scope
- `public.platform_admins` as the sole authorization source; product bootstrap creates exactly one initial owner row.
- `public.user_access_state` as the authoritative `pending | active | inactive` gate for authenticated data access.
- Public signup removal and Supabase invitation acceptance at `/auth/invite` using `token_hash`.
- One service-role `admin-api` Edge Function for paginated users, invitations, activation, memberships, and church creation.
- Restrictive six-role RLS for tenant data, canonical songs/versions, admin tables, and bounded public views.
- Neutral Spanish UI, Planly branding, `es-MX` formatting, fixed `America/Mexico_City` timezone, and sanitized notifications.
- Repository Planly invitation, recovery, and magic-link templates plus a staged hosted-email contract: Supabase default Auth emails are accepted for the current authorized-team testing stage; hosted Planly branding, arbitrary external-recipient invitation delivery, and new-invitation compensation proof are deferred to the external-production gate.

### Out of Scope
- More than one platform admin, self-service signup, audit history beyond timestamps, AI import, projection, native apps, or music-platform sync.
- Immediate invalidation of already-issued access JWTs; they remain valid until expiry.

## Capabilities

### New Capabilities
- `platform-admin`: authoritative admin/access state and the complete `admin-api` contract.
- `security-hardening`: restrictive RLS, privileged function grants, and public publication boundaries.
- `localization`: Spanish inventory, Planly branding, timezone, date, and relative-time formatting.
- `notifications`: global `react-hot-toast` behavior with accessible sanitized messages.

### Modified Capabilities
- `auth`: invitation-only authentication, token-hash acceptance, activation states, SMTP, and branded templates.
- `song-catalog`: platform-admin canonical CRUD and tenant-safe song/version policies.

## Approach

Use a two-stage append-only database rollout and seven implementation slices, each under 800 authored changed lines:

1. `00003`: add only `platform_admins`, `user_access_state`, indexes, RLS on those new tables, and helper functions.
2. Non-committed bootstrap transaction: insert exactly one owner and active-state row using an explicit deployed Auth user UUID, then verify both rows.
3. `00004`: restrictive policy cutover, public publication boundary, `America/Mexico_City` defaults/backfill, and privileged function replacements/revokes.
4. One `admin-api` Edge Function and typed SPA client.
5. Admin routes and user/church/membership UI.
6. Invitation acceptance and canonical catalog UI.
7. Localization, branding, notifications, auth templates, SMTP documentation, and verification.

Applied migrations are never rewritten; later schema work starts at `00005`.

## Affected Areas

| Area | Impact |
|------|--------|
| `supabase/migrations/00003_platform_admin.sql` | Additive authority/access-state foundation only |
| `supabase/migrations/00004_admin_cutover.sql` | Restrictive RLS, publication boundary, timezone, function replacement/grants |
| `supabase/functions/admin-api/` | All privileged admin actions |
| `supabase/templates/`, operator SMTP guide | Spanish Planly auth mail and staged external-launch checklist |
| `src/features/{admin,auth,songs}/`, `src/services/` | Admin, invite, canonical, and API flows |
| `src/features/{people,services,setlists,teams,public-views}/`, `src/app/layouts/`, `src/components/shared/`, `src/lib/` | Complete localization and notification inventory |

## Risks

| Risk | Mitigation |
|------|------------|
| Sole-owner lockout | Verify bootstrap before `00004`; rollback restores prior policies. |
| Partial Auth/database mutation | Per-action idempotency and compensation; inactive DB state gates sensitive access. |
| Revoked session still has a JWT | Short Auth JWT expiry plus active-state checks for sensitive database and Edge actions. |
| Built-in SMTP or default hosted templates are mistaken for production readiness | Limit both to authorized project-team testing. Supabase Auth rejected the disposable harness address with `email_address_invalid` before delivery; this is a provider email-validation constraint, not an `admin-api` defect. Before inviting external users, require custom SMTP, an owned verified sending domain, deployed Planly templates with authenticated readback and render verification, external-recipient delivery proof, and the new-invitation compensation smoke. |

## Rollback Plan

Before `00004`, remove only the additive `00003` objects if bootstrap fails. After cutover, deploy a new forward migration restoring the prior policies/functions; never edit applied migrations. Disable `admin-api` and re-enable the prior routes/config only as a coordinated application rollback.

## Dependencies

- Linked Supabase project and service-role secret stored outside Git.
- An existing Auth user UUID supplied explicitly during production bootstrap.
- Supabase built-in SMTP and its default hosted Auth emails are accepted for current authorized-team testing. The current stage still proves non-email-dependent behavior, including idempotent `invite_user` behavior for an existing user without external delivery, disposable-user deactivation/reactivation, membership create/update-role/revoke, church creation idempotency, last-admin revoke protection, and any documented non-email compensation seam. Before external-user production launch, custom SMTP, an owned verified sending domain, deployment plus authenticated readback/render verification of all three Planly templates, external-recipient delivery proof, and the new-invitation compensation smoke are mandatory; these are not blockers for this testing stage or unrelated deployment.

## Success Criteria

- [ ] Exactly one initial owner is verified before restrictive cutover; ordinary users receive no `super_admin` metadata.
- [ ] Invitation, deactivation/reactivation, membership, church, canonical catalog, and six-role authorization scenarios pass.
- [ ] No raw exception reaches users; all inventoried surfaces are neutral Spanish and branded Planly.
- [ ] All seven slices remain under 800 authored changed lines.
