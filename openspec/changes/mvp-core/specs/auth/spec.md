# auth Specification

## Purpose

Supabase-backed email/password authentication with church membership and role-based access (`church_admin`, `worship_director`, `member`). Governs route protection, church selection/creation after sign up, and profile management.

## Requirements

### Requirement: Email/Password Authentication

The system MUST provide sign up, sign in, and sign out using Supabase Auth (email + password). Sessions MUST persist across reloads.

#### Scenario: Successful sign up

- GIVEN a visitor with a valid email and password (>= 8 chars)
- WHEN they submit the sign-up form
- THEN an auth account is created in `auth.users`
- AND no `church_memberships` row exists yet

#### Scenario: Sign in persists session

- GIVEN a registered user not currently signed in
- WHEN they submit valid credentials
- THEN a Supabase session is established
- AND subsequent page reloads keep the session active

#### Scenario: Sign out clears session

- GIVEN an authenticated user
- WHEN they trigger sign out
- THEN the Supabase session is revoked
- AND the user is redirected to the sign-in route

### Requirement: Church Membership Linking

After sign up, the system MUST require the user to either create a church or join an existing one before reaching app routes. Membership is stored in `church_memberships(user_id, church_id, role)`.

#### Scenario: New church creation

- GIVEN a freshly signed-up user with no membership
- WHEN they create a new church (name, slug unique, timezone)
- THEN a `churches` row and a `church_memberships` row are created
- AND the membership `role` is `church_admin`

#### Scenario: Joining an existing church

- GIVEN a freshly signed-up user
- WHEN an admin of church X adds their account as a member
- THEN a `church_memberships` row is created with role `member`
- AND RLS (`is_church_member`) permits access to church X data

### Requirement: Role-Based UI Access

The system MUST enforce three church roles: `church_admin`, `worship_director`, `member`. UI affordances MUST reflect the effective role; data enforcement stays in RLS.

#### Scenario: Member sees restricted actions

- GIVEN a user with role `member` in current church
- WHEN they load the songs list
- THEN create/edit/delete controls are hidden
- AND they can still view songs

#### Scenario: Worship director can manage teams

- GIVEN a user with role `worship_director`
- WHEN they attempt to create a team
- THEN the action is permitted (RLS `teams_insert_leader` passes)

### Requirement: Auth Guard on Routes

The system MUST guard all app routes except public views and the auth flow. Unauthenticated users MUST be redirected to sign in.

#### Scenario: Unauthenticated access redirect

- GIVEN a visitor with no session
- WHEN they navigate to `/songs`
- THEN they are redirected to `/sign-in`
- AND the intended target is preserved as a redirect target

### Requirement: Profile Management

The system MUST let each member manage their `people` profile (`display_name`, `instruments[]`, `musical_roles[]`). A `people` row is keyed by `membership_id`.

#### Scenario: Edit own profile

- GIVEN an authenticated member of current church
- WHEN they update their display name and instruments
- THEN `people` is updated for their `membership_id`
- AND RLS `people_update_own` allows only their own row

#### Scenario: Profile auto-creation

- GIVEN a user who just joined a church (new membership)
- WHEN they reach profile setup
- THEN a `people` row is created with `display_name` defaulting to a placeholder