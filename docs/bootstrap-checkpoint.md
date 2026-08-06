# Bootstrap Checkpoint

## Status

Completed against the linked hosted project without recording an owner identity or credential in this repository.

## Verified Invariants

- An Auth Admin API lookup normalized the designated owner email and found exactly one user.
- The bootstrap transaction locked `public.platform_admins` before checking it was empty or already owned by that user.
- The transaction ensured exactly one `platform_admins` row and an `active` `user_access_state` row for the same in-memory user ID.
- The transaction verified `is_platform_admin()` and `is_user_active(...)` as true in an owner claim context before committing.

## Rollback Boundary

Before the restrictive cutover, a privileged operator may remove only the bootstrap owner rows from `public.platform_admins` and `public.user_access_state`. Do not perform that rollback after the restrictive cutover without a forward recovery plan.
