# Delta for Auth

## ADDED Requirements

### Requirement: Token-Hash Invitation Acceptance

Planly MUST use Supabase invitation links at `/auth/invite?token_hash={{ .TokenHash }}&type=invite`. `inviteUserByEmail` does not support PKCE. The SPA MUST read `token_hash`, call `supabase.auth.verifyOtp({ token_hash, type: 'invite' })` without an email argument, require the returned session, call `supabase.auth.updateUser({ password })`, then activate the current pending user and redirect to `/dashboard`.

#### Scenario: Invitee accepts and sets a password

- GIVEN a valid unused invitation token hash
- WHEN the invitee submits a valid password
- THEN OTP verification establishes a session, the password is updated, access state becomes `active`, and `/dashboard` loads

#### Scenario: Activation fails after password update

- GIVEN OTP verification and password update succeeded but access-state activation failed
- WHEN the flow handles the failure
- THEN the SPA signs out and safely redirects to `/sign-in?invite_error=activation`
- AND it shows no provider exception text

### Requirement: Safe Invitation Error States

The invitation page MUST classify only verified conditions and MUST expose neutral Spanish messages with a safe `/sign-in` action. Ambiguous provider failures MUST use the generic invalid state rather than guess.

#### Scenario: Missing token

- GIVEN `token_hash` is missing or `type` is not `invite`
- WHEN `/auth/invite` loads
- THEN it shows `El enlace de invitación está incompleto. Solicita una nueva invitación.`

#### Scenario: Expired token

- GIVEN Supabase returns a verified expired-token classification
- WHEN verification fails
- THEN it shows `La invitación venció. Solicita una nueva invitación al administrador de Planly.`

#### Scenario: Already-used token

- GIVEN Supabase returns a verified consumed-token classification
- WHEN verification fails
- THEN it shows `Esta invitación ya fue utilizada. Inicia sesión para continuar.`

#### Scenario: Ambiguous invalid token

- GIVEN Supabase does not safely distinguish expiration from prior use
- WHEN verification fails
- THEN it shows `No se pudo validar la invitación. Solicita una nueva invitación.`
- AND raw provider text is not rendered

### Requirement: Authoritative Access Lifecycle

Every provisioned user MUST have one `public.user_access_state` row. New invitations MUST start `pending`; successful acceptance MUST become `active`; deactivation MUST become `inactive`. Pending and inactive sessions MUST be denied protected application data even while an access JWT has not expired.

#### Scenario: Pending user cannot enter the application

- GIVEN a confirmed session whose access state remains `pending`
- WHEN it requests protected tenant data
- THEN RLS denies the request and the UI shows `Tu cuenta está pendiente de activación.`

#### Scenario: Inactive user still holds an access JWT

- GIVEN a deactivated user has an unexpired access JWT
- WHEN they attempt a sensitive database or admin action
- THEN the authoritative active-state check denies it
- AND the UI shows `Tu cuenta está inactiva. Contacta al administrador de Planly.`

### Requirement: Planly Auth Email and SMTP Contract

Planly MUST maintain neutral-Spanish, Planly-branded invite, recovery, and magic-link templates with subjects `Has sido invitado a Planly`, `Restablece tu contraseña de Planly`, and `Tu enlace para iniciar sesión en Planly`. Secrets and provider settings MUST remain outside Git. For the current authorized project-team testing stage, a new Free-plan project using Supabase built-in SMTP MAY use Supabase's default hosted Auth emails when hosted template customization is unavailable. This accepted stage does not claim hosted Planly branding or external-recipient production readiness. The internal stage MUST still prove non-email-dependent `invite_user` idempotency for an existing user without external delivery. Before inviting arbitrary external users in production, Planly MUST use custom SMTP with an owned, verified sending domain, deploy all three Planly templates, authenticate readback and render verification for each, prove delivery to an external recipient, and complete the new-invitation compensation smoke.

#### Scenario: Deployed external-production invitation template link

- GIVEN the external-production gate is being completed and the Planly invitation template is deployed
- WHEN Supabase renders the deployed template
- THEN its action targets `/auth/invite?token_hash={{ .TokenHash }}&type=invite` on the allowed Planly origin

#### Scenario: Authorized-team testing with built-in SMTP

- GIVEN no owned domain or custom SMTP credentials exist
- WHEN a maintainer exercises auth mail for an authorized project-team address
- THEN Supabase built-in SMTP is accepted for the current testing stage
- AND its strict rate limits and project-team-recipient restriction are documented
- AND Supabase default hosted Auth emails are accepted when the Free-plan/default-SMTP policy prevents hosted template customization
- AND this does not claim that Planly-branded hosted templates are deployed or verified

#### Scenario: Internal existing-user invitation idempotency without delivery

- GIVEN an existing user and an identical membership already provisioned by an authorized platform admin
- WHEN the admin repeats `invite_user` with the normalized existing email, church, and role during the authorized-team testing stage
- THEN `admin-api` returns the existing user and membership without sending an external invitation
- AND the result proves idempotent existing-user behavior only
- AND it does not prove arbitrary external-recipient delivery or new-invitation compensation

#### Scenario: External-user production readiness

- GIVEN custom SMTP, owned-domain verification, deployed-template authenticated readback/render verification, external-recipient delivery proof, or the new-invitation compensation smoke is incomplete
- WHEN a release would invite arbitrary external users
- THEN the release checklist blocks external-user production launch
- AND current authorized-team testing and unrelated deployment remain allowed

#### Scenario: Local invitation development

- GIVEN no production SMTP provider has been selected
- WHEN developers exercise auth mail locally with Mailpit
- THEN coding and local verification proceed

## MODIFIED Requirements

### Requirement: Email/Password Authentication

The system MUST provide persistent Supabase email/password sign-in and sign-out. Public signup MUST be disabled; only platform-admin invitations create accounts. Ordinary users MUST NOT receive `app_metadata.platform_role='super_admin'`.

(Previously: public self-service signup was available.)

#### Scenario: Public signup disabled

- GIVEN a visitor
- WHEN they open `/sign-up` or call browser `signUp`
- THEN the route redirects to `/sign-in` and Supabase rejects signup

#### Scenario: Ordinary invitation metadata

- GIVEN the platform admin invites an ordinary user
- WHEN the Auth user is created
- THEN no `super_admin` metadata is written

### Requirement: Provisioned Membership Linking

Memberships MUST be assigned through authorized tenant RLS or `admin-api`; users MUST NOT self-create churches or cross-tenant memberships. An active user with no membership MUST see `Contacta al administrador de Planly para que te asigne a una iglesia.`

(Previously: membership linking followed self-service signup and church creation.)

#### Scenario: No-membership dashboard

- GIVEN an active user with no membership
- WHEN `/dashboard` loads
- THEN the Spanish no-membership state is shown and no tenant data is returned

## REMOVED Requirements

### Requirement: Successful Sign Up

(Reason: Planly is invitation-only.)
(Migration: Remove `/sign-up` and browser `signUp`; use the token-hash invitation flow.)
