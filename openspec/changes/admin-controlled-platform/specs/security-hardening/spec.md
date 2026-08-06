# Security Hardening Specification

## Purpose

Define the append-only migration sequence, active-state enforcement, six-role tenant permissions, canonical invariants, and bounded public visibility.

## ADDED Requirements

### Requirement: Append-Only Two-Stage Migration

Migration `00003_platform_admin.sql` MUST add only `platform_admins`, `user_access_state`, their indexes/RLS, and helper functions; it MUST NOT tighten existing application policies. A non-committed manual transaction MUST insert exactly one active owner/admin pair using an explicit deployment Auth UUID and verify it. Migration `00004_admin_cutover.sql` MUST perform the restrictive policy cutover, `America/Mexico_City` defaults/backfill, publication boundary, privileged function replacement, PUBLIC revokes, and explicit grants. Applied migrations MUST NOT be rewritten; later database changes use `00005+`.

#### Scenario: Cutover waits for bootstrap

- GIVEN `00003` is applied but the explicit owner verification has not passed
- WHEN rollout reaches the cutover gate
- THEN `00004` is not applied and existing access policies remain unchanged

#### Scenario: Initial owner is exact

- GIVEN `platform_admins` is empty and an existing Auth UUID is supplied
- WHEN the manual transaction runs
- THEN one active-state row and exactly one platform-admin row exist and both helpers return true for that owner

### Requirement: Active-State Tenant Helpers

`is_church_member` and `has_church_role` MUST be replaced in `00004` so they require `public.is_user_active()` and schema-qualify every referenced object under `search_path=''`. Pending/inactive users MUST fail tenant authorization even with an unexpired JWT.

#### Scenario: Inactive membership is ineffective

- GIVEN an inactive user still owns a church membership and access JWT
- WHEN a tenant policy calls a membership helper
- THEN the helper returns false

### Requirement: Privileged Function Security

Every authorization or privileged `SECURITY DEFINER` function, including `is_user_active`, `is_platform_admin`, `is_church_member`, `has_church_role`, `is_curator`, `activate_current_user`, and `create_church`, MUST use a pinned empty search path and schema-qualified objects. `EXECUTE` MUST be revoked from `PUBLIC` and granted only to `authenticated` and `service_role` as required; `activate_current_user` is authenticated-only. `create_church` MUST also check `public.is_platform_admin()` in its body.

#### Scenario: Helper cannot resolve attacker object

- GIVEN an attacker controls an object on another search path
- WHEN `public.is_platform_admin()` runs
- THEN it reads `public.platform_admins` and cannot resolve the attacker object

#### Scenario: Anonymous execution denied

- GIVEN the cutover is applied
- WHEN `anon` invokes a privileged helper
- THEN PostgreSQL denies execution

### Requirement: Six-Role Church and Membership Access

Church visibility MUST be public-only for `anon` and authenticated/no-membership, own-plus-public for tenant roles, and all-read/create for platform admin. Church admin MAY update its own church. Memberships MUST be invisible to anon/no-membership, readable by own-church members, mutable by own church admin, and cross-tenant mutable only through platform-admin `admin-api`.

#### Scenario: Worship director cannot manage memberships

- GIVEN a worship director of church X
- WHEN they insert, update, or delete a church-X membership
- THEN RLS denies the mutation

#### Scenario: Platform admin uses privileged membership boundary

- GIVEN the platform admin is not a member of church X
- WHEN they manage a church-X membership
- THEN the direct tenant policy grants no mutation and `admin-api` performs the authorized service-role action

### Requirement: Six-Role Team and People Access

Active members MUST read own-church teams, team members, and people. Worship directors and church admins MUST create/update teams and add/remove team members; only church admin MUST delete teams. A person MAY create/update only their own profile. Platform-admin status alone MUST grant no tenant team/people access.

#### Scenario: Worship director manages a team

- GIVEN a worship director of church X
- WHEN they create or update a team and add a church-X membership
- THEN RLS permits each mutation and rejects memberships from church Y

#### Scenario: Member edits another profile

- GIVEN a member of church X
- WHEN they update another member's `people` row
- THEN RLS denies the mutation

### Requirement: Six-Role Service and Setlist Access

Active members MUST read own-church services, setlists, and items. Worship directors and church admins MUST create/update services and create/update/delete unfrozen setlists/items. Only church admin MUST delete services. Platform-admin status alone MUST grant no unpublished tenant access or mutation.

#### Scenario: Worship director updates an own-church service

- GIVEN a worship director of church X
- WHEN they update a church-X service
- THEN RLS permits the update and its `WITH CHECK` prevents moving it to church Y

#### Scenario: Frozen setlist rejects mutation

- GIVEN a setlist has `frozen_at` set
- WHEN a worship director updates or deletes an item
- THEN RLS denies the mutation

### Requirement: Public Publication Boundary

Migration `00004` MUST add `services.is_published boolean NOT NULL DEFAULT false`. Anonymous and no-membership public reads of churches/services MUST require `is_published=true` and service status `active` or `completed`. Setlists/items MUST inherit that exact parent condition. Planned or unpublished operational rows MUST remain hidden. Public repertoire/variants MUST require `church_repertoire.is_published=true`.

#### Scenario: Planned service is not public

- GIVEN a service is marked published but status is `planned`
- WHEN anon requests it and its setlist
- THEN no service, setlist, or item row is visible

#### Scenario: Published active service is public

- GIVEN a service is `active` and `is_published=true`
- WHEN anon opens its public view
- THEN that service, its setlist/items, and only published repertoire content are visible

### Requirement: SQL Role-Matrix Verification

Automated SQL verification MUST cover `anon`, active authenticated/no-membership, `member`, `worship_director`, `church_admin`, and active `platform_admin` across churches, memberships, songs/versions, teams/people, services/setlists/items, `platform_admins`, `user_access_state`, and representative `admin-api` authorization. It MUST also test pending/inactive denial.

#### Scenario: Matrix agrees with policies

- GIVEN `00004` is applied to representative two-church fixtures
- WHEN every matrix cell is exercised
- THEN allowed operations succeed and cross-tenant or disallowed operations return no row or permission denial
