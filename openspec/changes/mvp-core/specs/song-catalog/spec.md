# song-catalog Specification

## Purpose

Catalog of songs (canonical + church-owned) with multiple versions, church repertoire adoption, church-local variants, tags, and search. Enforces curator-only edits on canonical songs and admin edits on church-owned songs via RLS.

## Requirements

### Requirement: Song Listing

The system MUST list all canonical songs plus church-owned songs for the current church. Anonymous users (public views) MUST see canonical songs only (RLS `songs_select_anon`).

#### Scenario: Authenticated member sees merged catalog

- GIVEN an authenticated member of church X
- WHEN they open the songs list
- THEN all `songs` where `is_canonical = true` OR `church_id = X` are returned
- AND songs from other churches are excluded

#### Scenario: Anon sees canonical only

- GIVEN an anonymous request
- WHEN the songs list is fetched
- THEN only `songs` with `is_canonical = true` are visible

### Requirement: Song Create

The system MUST allow creating a song with `title` (required), `author`, `tempo`, `tags[]`, `reference_urls` (jsonb). Canonical songs require a global curator; church-owned songs require church membership.

#### Scenario: Member creates church-owned song

- GIVEN a member of church X
- WHEN they create a song with `church_id = X`, `is_canonical = false`
- THEN `songs` is inserted and a `church_repertoire` row is auto-created (trigger `auto_adopt_song`)

#### Scenario: Non-curator cannot create canonical

- GIVEN an authenticated user who is not a global curator
- WHEN they attempt to insert a song with `is_canonical = true`
- THEN RLS `songs_insert_authenticated` rejects the insert

### Requirement: Song Edit and Delete

Edits on canonical songs MUST be curator-only; edits on church-owned songs MUST be admin-only (`has_church_role(church_id, 'church_admin')`).

#### Scenario: Admin edits church-owned song

- GIVEN a `church_admin` of church X
- WHEN they edit a song with `church_id = X`
- THEN the update succeeds

#### Scenario: Member cannot delete song

- GIVEN a `member` role user
- WHEN they attempt to delete a church-owned song
- THEN RLS `songs_delete_canonical` denies the operation

### Requirement: Song Versions

A song MAY have multiple `song_versions` (`version_name`, `key`, `chordpro_content`, `notes`). Version mutation is curator-only for canonical songs.

#### Scenario: List versions of a song

- GIVEN a song with 3 versions
- WHEN the song detail view loads
- THEN all 3 versions are returned with key and version_name

#### Scenario: Curator adds version to canonical song

- GIVEN a global curator (`is_curator()` true)
- WHEN they add a version to a canonical song
- THEN RLS `versions_insert_curator` permits the insert

### Requirement: Church Repertoire Adoption

A church member MAY adopt a canonical song into `church_repertoire` (one row per `church_id`+`song_id`). Adopted songs can be archived (`archived_at`) and published (`is_published`).

#### Scenario: Adopt canonical song

- GIVEN a member of church X and a canonical song S
- WHEN they adopt S
- THEN a `church_repertoire(church_id=X, song_id=S)` row is created with `is_published = false`

#### Scenario: Archive adopted song

- GIVEN an adopted song in church X's repertoire
- WHEN an admin archives it
- THEN `archived_at` is set and it no longer appears in the active repertoire view

### Requirement: Church-Local Variants

A church MAY override a `song_version`'s key and content via `song_variants` (`local_key`, `local_content`, `local_notes`). Variant edits are owner-only (`created_by = auth.uid()`).

#### Scenario: Create local variant

- GIVEN a member of church X
- WHEN they create a variant for version V with `local_key = "G"`
- THEN a `song_variants` row is created with `church_id = X`, `song_version_id = V`

#### Scenario: Other member cannot edit variant

- GIVEN a variant created by user A in church X
- WHEN user B (also a member of X) attempts to update it
- THEN RLS `variants_update_owner` denies the update

### Requirement: Tags and Search

The system MUST support `tags[]` as filterable categories and search by title, author, or taggs (GIN index `idx_songs_tags`).

#### Scenario: Filter by tag

- GIVEN songs tagged `["advent", "worship"]`
- WHEN the user filters by tag `advent`
- THEN only songs whose `tags` array contains `advent` are returned

#### Scenario: Search by title

- GIVEN songs with titles "Amazing Grace" and "Grace Flows"
- WHEN the user searches "grace"
- THEN both songs are returned (case-insensitive)