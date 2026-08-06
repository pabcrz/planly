# Delta for Song Catalog

## ADDED Requirements

### Requirement: Canonical Song Invariant

Only an active platform admin MUST create, update, or delete canonical songs. Every canonical row MUST preserve `is_canonical=true AND church_id IS NULL`. Song UPDATE authorization MUST apply to both the existing row (`USING`) and resulting row (`WITH CHECK`) so canonical and tenant ownership cannot be converted.

#### Scenario: Platform admin creates canonical song

- GIVEN an active platform admin without church context
- WHEN they insert `is_canonical=true` and `church_id=NULL`
- THEN RLS permits the insert

#### Scenario: Canonical song cannot become tenant-owned

- GIVEN an existing canonical song
- WHEN the platform admin updates `church_id` or clears `is_canonical`
- THEN `WITH CHECK` rejects the update

#### Scenario: Ordinary user cannot mutate canonical song

- GIVEN any active non-platform-admin role
- WHEN it inserts, updates, or deletes a canonical song
- THEN RLS denies the mutation

### Requirement: Canonical Version Parent Authorization

Only an active platform admin MUST mutate versions whose parent song is canonical. Version UPDATE MUST authorize the old `song_id` parent in `USING` and the new `song_id` parent in `WITH CHECK` using `is_canonical=true`, `church_id IS NULL`, and platform-admin authority.

#### Scenario: Canonical version parent reassignment rejected

- GIVEN a canonical version and a church-owned target song
- WHEN the platform admin changes the version's `song_id`
- THEN the new-parent `WITH CHECK` rejects the update

### Requirement: Church-Owned Song and Version Roles

An active church member MUST read canonical and own-church songs/versions and MAY create an own-church noncanonical song. Only own-church `worship_director` or `church_admin` MUST update church songs and create/update/delete their versions. Only own-church `church_admin` MUST delete a church song. Every mutation MUST require `is_canonical=false AND church_id IS NOT NULL` on the relevant parent and MUST prevent cross-tenant reassignment.

#### Scenario: Worship director updates church song and version

- GIVEN a worship director of church X
- WHEN they update a noncanonical church-X song and its version
- THEN RLS permits both operations

#### Scenario: Member cannot edit church version

- GIVEN a member of church X without director/admin role
- WHEN they insert, update, or delete a church-X version
- THEN RLS denies the mutation

#### Scenario: Worship director cannot delete parent song

- GIVEN a worship director of church X
- WHEN they delete a church-X song
- THEN RLS denies the deletion

#### Scenario: New version parent cannot cross tenants

- GIVEN a worship director of church X updates a church-X version
- WHEN the new `song_id` belongs to church Y
- THEN the new-parent `WITH CHECK` rejects the update

## MODIFIED Requirements

### Requirement: Song Listing

Anonymous and authenticated/no-membership users MUST see canonical songs only. Active tenant members MUST see canonical plus own-church songs. The platform admin MAY manage canonical songs without active church context but MUST NOT receive tenant-song visibility solely from admin status.

(Previously: authenticated selection exposed all tenant songs.)

#### Scenario: Tenant isolation

- GIVEN an active member of church X
- WHEN songs are listed
- THEN canonical and church-X rows are visible and church-Y rows are absent

#### Scenario: Platform admin canonical view

- GIVEN the platform admin has no church membership
- WHEN the canonical admin route loads
- THEN canonical rows are visible and tenant rows are absent

### Requirement: Song Versions

Version selection MUST follow the parent song's visibility. Canonical versions are public/readable; authenticated tenant versions require active membership in the owning church. Mutation MUST follow the old/new parent and role requirements above.

(Previously: authenticated selection exposed every tenant version and curator-only mutation did not define tenant roles or new-parent checks.)

#### Scenario: Other-church versions hidden

- GIVEN a member of church X requests versions of a church-Y song
- WHEN RLS evaluates the parent
- THEN no version row is returned
