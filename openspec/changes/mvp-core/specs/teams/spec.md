# teams Specification

## Purpose

Musical teams within a church and per-member people profiles (instruments, musical roles). Enforces worship-director-level management of teams and self-management of own profile.

## Requirements

### Requirement: Team Listing

The system MUST list all `teams` for the current church. Only members of the church can view teams (RLS `teams_select_member`).

#### Scenario: Member sees church teams

- GIVEN a member of church X with 2 teams
- WHEN they load the teams list
- THEN both teams are returned (name, description)
- AND teams from other churches are excluded

### Requirement: Team Create and Edit

A `worship_director` (or higher) MUST be able to create and edit teams (`name`, `description`) within their church. RLS `teams_insert_leader` and `teams_update_leader` enforce this.

#### Scenario: Worship director creates team

- GIVEN a user with role `worship_director` in church X
- WHEN they create team "Sunday Band" with `church_id = X`
- THEN the team is inserted and visible to church X members

#### Scenario: Member cannot create team

- GIVEN a user with role `member`
- WHEN they attempt to create a team
- THEN RLS `teams_insert_leader` rejects the insert

### Requirement: Team Delete

Team deletion MUST be `church_admin`-only (RLS `teams_delete_admin`).

#### Scenario: Admin deletes team

- GIVEN a `church_admin` of church X
- WHEN they delete a team
- THEN the team and its `team_members` are removed (ON DELETE CASCADE)

#### Scenario: Worship director cannot delete

- GIVEN a `worship_director` attempting deletion
- WHEN they delete a team
- THEN RLS `teams_delete_admin` denies the operation

### Requirement: Team Member Management

A `worship_director` (or higher) MUST be able to add and remove church members to/from a team via `team_members(team_id, membership_id)`. Self-service join is not required.

#### Scenario: Add member to team

- GIVEN a worship director and an existing church membership M
- WHEN they add M to team T
- THEN a `team_members(team_id=T, membership_id=M)` row is created

#### Scenario: Remove member from team

- GIVEN a team member row exists
- WHEN the worship director removes it
- THEN the row is deleted and the member no longer appears in T's roster

### Requirement: People Profiles

Each church membership MAY have a `people` row with `display_name`, `instruments[]`, `musical_roles[]`. A `people` row is keyed by `membership_id`. Only church members can read; only the owner can create/update their own row (RLS `people_insert_own`, `people_update_own`).

#### Scenario: Member views roster

- GIVEN a member of church X
- WHEN they view the people list for church X
- THEN all `people` rows for church X memberships are returned with display_name and instruments

#### Scenario: Owner edits own profile

- GIVEN user A owns people row P (membership's `user_id = A`)
- WHEN A updates `instruments` and `musical_roles`
- THEN P is updated and the change is visible to other church members

#### Scenario: Cannot edit another's profile

- GIVEN user B attempts to update people row owned by user A
- WHEN they submit the edit
- THEN RLS `people_update_own` denies the update

### Requirement: Musical Roles and Instruments

`instruments[]` and `musical_roles[]` are free-text arrays (per README examples: Vocalista, Guitarra acústica, Bajo, Batería, Líder, Pastor). No fixed enum; values are suggestions, not constraints.

#### Scenario: Add multiple instruments

- GIVEN a member editing their profile
- WHEN they set `instruments = ["Guitarra acústica", "Bajo"]` and `musical_roles = ["Líder"]`
- THEN both arrays are stored and displayed on their profile