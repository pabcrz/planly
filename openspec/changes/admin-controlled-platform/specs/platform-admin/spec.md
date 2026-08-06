# Platform Admin Specification

## Purpose

Define Planly's sole platform-admin authority, authoritative user lifecycle, and complete privileged `admin-api` boundary.

## ADDED Requirements

### Requirement: Sole Platform-Admin Authority

`public.platform_admins` MUST be the sole authorization source. Product bootstrap MUST insert exactly one initial owner row using an explicit deployed Auth UUID. `app_metadata` MAY optimize UI rendering but MUST NOT authorize RLS, routes, RPCs, or Edge actions. No ordinary user may receive `super_admin` metadata.

#### Scenario: Table authorizes the owner

- GIVEN an active user has the sole `platform_admins` row
- WHEN an admin route, RPC, RLS policy, or Edge action checks authority
- THEN the table-backed check authorizes the user

#### Scenario: Metadata cannot authorize

- GIVEN a user lacks a `platform_admins` row but has stale admin metadata
- WHEN they request an admin capability
- THEN access is denied

### Requirement: Protected Admin Tables and Helpers

RLS MUST be enabled on `public.platform_admins` and `public.user_access_state`. Authenticated users MAY select only their own rows and MUST have no direct mutation policy. Service role MAY manage rows. `public.is_platform_admin()` MUST be `SECURITY DEFINER STABLE SET search_path=''`, reference `public.platform_admins`, require active state, revoke `EXECUTE` from `PUBLIC`, and grant only `authenticated` and `service_role`.

#### Scenario: Ordinary user cannot enumerate authority

- GIVEN an active ordinary user
- WHEN they select either admin table
- THEN they see only their own access-state row and no platform-admin row

#### Scenario: PUBLIC cannot execute helper

- GIVEN an anonymous caller
- WHEN it invokes `public.is_platform_admin()`
- THEN PostgreSQL denies execution

### Requirement: Common `admin-api` Protocol

One `admin-api` Edge Function MUST accept POST actions only. It MUST verify the bearer token with Supabase Auth, require `user_access_state='active'`, require a `platform_admins` row, validate a strict per-action body, and use service role only server-side. It MUST return `{ok:true,data}` or a sanitized `{ok:false,error:{code,message}}` envelope.

#### Scenario: Unauthorized request

- GIVEN a missing or invalid bearer token
- WHEN `admin-api` receives a request
- THEN it returns `401` and performs no mutation

#### Scenario: Active non-admin request

- GIVEN a valid active ordinary-user token
- WHEN `admin-api` receives a request
- THEN it returns `403` and performs no mutation

#### Scenario: Invalid action schema

- GIVEN an authorized admin sends malformed, unknown, or extra fields
- WHEN validation runs
- THEN it returns `400` and performs no mutation

### Requirement: Paginated User Listing

`list_users` MUST accept `{action:'list_users',page?:number,per_page?:number}` with defaults `1` and `25`, maximum `100`, and return `{users,page,per_page,total,next_page}` ordered stably by creation time and id. Each user MUST include id, email, authoritative status, and memberships.

#### Scenario: Paginated list succeeds

- GIVEN the platform admin requests page 2 with `per_page=25`
- WHEN users exist
- THEN the function returns `200`, at most 25 users, total, and next-page metadata

### Requirement: Idempotent Invitation and Membership Assignment

`invite_user` MUST accept normalized email, church UUID, and role. It MUST reuse an existing Auth user without resending, create pending access for a new invite, and assign membership. It MUST return `201` for a new invite or `200` for an exact retry/existing user. A conflicting existing role MUST return `409`.

#### Scenario: New invitation succeeds

- GIVEN a new normalized email and valid church/role
- WHEN `invite_user` runs
- THEN Auth invitation, pending state, and membership are created
- AND the payload reports `invitation_sent=true` and `created=true`

#### Scenario: Exact invitation retry

- GIVEN the normalized email already has the requested membership and role
- WHEN the same invitation is retried
- THEN it returns the existing user and membership with `200` and sends no duplicate email

#### Scenario: Membership assignment fails after new Auth user

- GIVEN this request created an unconfirmed user but membership assignment fails
- WHEN compensation runs
- THEN it deletes that user and pending state only if no other membership/session exists
- AND otherwise returns `500` with `cleanup_required=true` without unsafe deletion

### Requirement: Deactivation and Reactivation

`deactivate_user` MUST accept user UUID plus membership mode `retain`, `revoke_all`, or `revoke_selected` and optional selected membership UUIDs. It MUST ban Auth, transactionally set inactive state, revoke only requested memberships, and attempt targeted refresh-session revocation where the deployed Auth API supports it. `reactivate_user` MUST clear the ban and set `active` only for confirmed email, otherwise `pending`.

#### Scenario: Deactivation is safely repeatable

- GIVEN a non-admin user is already inactive
- WHEN the same deactivation is retried
- THEN it returns `200` with inactive state and the requested membership result

#### Scenario: Sole owner cannot be deactivated

- GIVEN the target is the sole platform admin
- WHEN deactivation is requested
- THEN it returns `422` and changes nothing

#### Scenario: JWT limitation is represented honestly

- GIVEN deactivation revoked refresh sessions
- WHEN an old access JWT has not expired
- THEN the response does not claim immediate JWT invalidation
- AND sensitive database checks still deny the inactive user

#### Scenario: Reactivation does not restore memberships

- GIVEN a user's memberships were revoked during deactivation
- WHEN the user is reactivated
- THEN the ban clears and access state changes appropriately
- AND memberships remain revoked until explicitly recreated

### Requirement: Membership Actions

`create_membership`, `update_membership_role`, and `revoke_membership` MUST use strict UUID/role schemas and database transactions. Exact create/update retries MUST return current state. A conflicting create MUST return `409`; missing update MUST return `404`; missing revoke MUST return `200` with `revoked=false`. Removing or demoting a church's last `church_admin` MUST return `422`.

#### Scenario: Membership create retry

- GIVEN `(user_id,church_id)` already exists with the requested role
- WHEN `create_membership` repeats
- THEN it returns the existing membership with `200`

#### Scenario: Last church admin protected

- GIVEN a church has one `church_admin`
- WHEN update or revoke would leave none
- THEN the function returns `422` and rolls back

### Requirement: Atomic Church Creation

`create_church` MUST accept name, normalized unique slug, and founding-admin user UUID. It MUST atomically create a church with timezone `America/Mexico_City` and one founding `church_admin` membership. An exact retry MUST return `200`; a slug with different payload MUST return `409`.

#### Scenario: Church creation succeeds

- GIVEN valid input and an authorized platform admin
- WHEN `create_church` runs
- THEN it returns `201` with the church and founding membership

#### Scenario: Founding membership fails

- GIVEN church insertion succeeds but founding membership insertion fails
- WHEN the transaction ends
- THEN neither row persists

### Requirement: Status and Error Semantics

The API MUST use `200/201` success, `400` malformed request, `401` unauthenticated, `403` unauthorized/inactive, `404` missing target, `409` state conflict, `422` invariant violation, `500` database/internal failure, and `502` Auth dependency failure. Raw exceptions, credentials, and service keys MUST NOT appear in responses or logs.

#### Scenario: Auth dependency failure

- GIVEN Supabase Auth fails during a privileged Auth mutation
- WHEN compensation completes
- THEN the function returns sanitized `502` without provider text
