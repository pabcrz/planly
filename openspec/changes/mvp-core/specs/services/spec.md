# services Specification

## Purpose

Church services with assigned teams, automatically created setlists, ordered setlist items (song + version + key), participant rosters with multi-role, and a freeze snapshot for finalized setlists.

## Requirements

### Requirement: Service Create

A `worship_director` (or higher) MUST be able to create a service: `church_id`, `team_id`, `service_date`, `start_time`, `timezone`, `notes`. Status defaults to `planned`. A setlist MUST be auto-created with the service (1:1 via `setlists.service_id`).

#### Scenario: Create service with setlist

- GIVEN a worship director of church X
- WHEN they create a service for team T on date 2026-08-02
- THEN `services` is inserted with `status = planned`
- AND a `setlists` row is created with `service_id = <new service id>`

#### Scenario: Member cannot create service

- GIVEN a `member` role user
- WHEN they create a service
- THEN RLS `services_insert_leader` denies the insert

### Requirement: Service Listing and Filter

The system MUST list services for the current church, filtered by date range, team, and status. Only church members can see the authenticated list (RLS `services_select_member`).

#### Scenario: Filter by date range and team

- GIVEN church X with services on multiple dates and teams
- WHEN the user filters to August 2026, team T, status `planned`
- THEN only matching services are returned, ordered by `service_date`, `start_time`

### Requirement: Service Edit and Status Transition

A worship director MUST be able to edit service details and transition `status` across `planned → active → completed`. RLS `services_update_leader` enforces.

#### Scenario: Transition planned to active

- GIVEN a service with `status = planned`
- WHEN the worship director sets `status = active`
- THEN the service status is updated

#### Scenario: Invalid status transition ignored

- GIVEN a service with `status = completed`
- WHEN the director attempts to revert to `planned`
- THEN the system rejects the transition (completed is terminal)

### Requirement: Service Delete

Service deletion MUST be `church_admin`-only (RLS `services_delete_admin`); the `team_id` FK is `ON DELETE RESTRICT`.

#### Scenario: Admin deletes service

- GIVEN a `church_admin` of church X
- WHEN they delete a service
- THEN the service, its setlist, items, and participants are removed (cascade)

#### Scenario: Cannot delete team referenced by service

- GIVEN a team T referenced by services
- WHEN an admin deletes team T
- THEN `teams` FK `ON DELETE RESTRICT` blocks deletion

### Requirement: Setlist Items

The worship director MUST be able to add, remove, and reorder `setlist_items` (each references `song_id`, `song_version_id`, `key`, `notes`, `sort_order`). The `setlist_id`+`sort_order` pair is unique.

#### Scenario: Add song to setlist

- GIVEN a setlist with 2 items (sort_order 1, 2)
- WHEN the director adds a new song version with key "G"
- THEN a `setlist_items` row is inserted at `sort_order = 3`

#### Scenario: Reorder songs

- GIVEN a setlist with items at sort_order 1, 2, 3
- WHEN the director moves the third song to position 1
- THEN the affected sort_orders are renumbered to keep uniqueness

#### Scenario: Remove song keeps contiguous order

- GIVEN items at 1, 2, 3
- WHEN the middle item is deleted
- THEN items are renumbered to 1, 2

### Requirement: Participant Roster

The worship director MUST be able to add/remove `service_participants` (membership roster) and assign multiple `service_member_roles` per participant.

#### Scenario: Add participant with two roles

- GIVEN a service S and church membership M
- WHEN the director adds M with roles `["Vocalista", "Líder"]`
- THEN a `service_participants` row and two `service_member_roles` rows are created

#### Scenario: Remove participant

- GIVEN a participant exists on service S
- WHEN the director removes them
- THEN the participant and their roles are deleted (cascade)

### Requirement: Setlist Freeze

The worship director MUST be able to freeze a setlist. Freezing sets `frozen_at` and stores a `frozen_content` snapshot. Once frozen, RLS `setlists_update_leader` denies edits (`frozen_at IS NULL`).

#### Scenario: Freeze setlist

- GIVEN a service setlist with items
- WHEN the director freezes it
- THEN `frozen_at` is set to now and `frozen_content` contains a snapshot of items
- AND subsequent setlist_items updates are denied by RLS

#### Scenario: Public view uses frozen content

- GIVEN a frozen setlist viewed via public URL
- WHEN rendered
- THEN the frozen snapshot is used (post-freeze edits, if any, are ignored)