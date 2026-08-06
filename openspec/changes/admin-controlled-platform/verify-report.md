```yaml
schema: gentle-ai.verify-result/v1
verdict: pass_with_warnings
evidence_revision: sha256:a59b49c4bd02939bdeeee1487bf396591a7af2770c482f22543b6c4ff4e75e67
blockers: 0
critical_findings: 0
requirements: 40/40
scenarios: 81/81
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:af479479e9604f533991cb35f4bc8e7996a1e7f5d588248c8b3c28570efd74e9
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:4b59a5b99b34494796e3fd2d8ee48a674dfefa19ee697b931dd1386c52b4758f
```

# Verification Report: admin-controlled-platform

**Date**: 2026-08-05
**Mode**: verification-bookkeeping reconciliation against repository, tests, migrations, linked/deployed evidence, and Engram apply progress

---

## Verdict

**CURRENT AUTHORIZED-TEAM STAGE PASSED** — Repository-controlled implementation and validation evidence is reconciled, hosted public/email signup is disabled, and the internal-stage hosted `admin-api` non-email matrix passed with zero residual fixtures. The maintainer accepted Supabase built-in SMTP with default hosted Auth emails for authorized-team testing. This verdict does not claim readiness to invite arbitrary external users: the named external-production gate remains mandatory.

The prior report's filename/path findings and bulk "unchecked evidence" finding were stale bookkeeping, not implementation defects. They are removed from the critical count.

---

## Completeness

| Artifact / Area | Status | Evidence |
|---|---|---|
| Proposal, six specs, design | complete | OpenSpec artifacts present |
| Work-unit implementation headers | complete | WU00001-WU00007 remain `[x]` |
| Task bookkeeping | complete | 71/71 task-level checkboxes checked (79 raw `[x]` markers including eight work-unit section headers; zero unchecked); the internal non-email matrix is complete and the external-production email/template/invitation gate remains a release prerequisite. |
| Apply progress | complete | Engram records all seven work units complete with linked/deployed evidence |
| Tests | pass | Focused `ServiceForm` test: 2 tests in 1 file pass. The prior full-suite baseline was 62 tests in 11 files before this test was added; it was not rerun under this bounded work unit. |
| Build/type check | pass | `npm run build`: `tsc -b` and Vite build pass |
| Lint | pass with accepted warnings | 0 errors; 21 Fast Refresh warnings |
| Preview | pass | HTTP 200 for `/sign-in`, `/auth/invite`, and `/s/example` |

---

## Reconciled Evidence

| Work Unit | Verified evidence | Remaining verification |
|---|---|---|
| WU00001 | Linked migration apply, grants/RLS, helper denial for `anon`, generated types, tests, build, and lint | none |
| WU00002 | Exactly one platform admin, exactly one active owner state, owner admin helper `true`, owner active helper `true`; bounded hosted reconciliation removed zero prior fixtures, created one confirmed active ordinary fixture with zero platform-admin rows, authenticated through the public client, and returned exact `is_platform_admin() = false`. `finally` revoked its global refresh session, removed state, hard-deleted Auth, and re-proved zero fixture/auth-state/platform-admin residue. | none |
| WU00003 | Linked migration parity, rollback/catalog verification, policy/catalog invariants, owner continuity, anonymous helper denial, tests, build, lint, and advisor execution | none; advisor warnings are accepted and documented, not "no issues" |
| WU00004 | Function deployed; unauthorized request returned 401; authorized owner `list_users` and `list_churches` returned 200 with valid schemas; protocol/client tests, build, and lint pass. The completed internal matrix proved existing-user invitation idempotency without delivery (`200`, `created=false`, `invitation_sent=false`); pending/inactive denial and active restore; membership create/update-role/revoke/repeat-revoke; church create/retry (`201`/`200`, same resource); last-admin invariant (`422`); and the non-email atomic church-creation failure seam (`500`) with no residual resource. Reconciliation and final cleanup both proved `0/0/0/0/0` fixture users/churches/memberships/access-state/platform-admin rows. | External-recipient invitation delivery and new-invitation compensation remain deferred to the external-production gate. |
| WU00005 | AdminGuard allow/deny tests, guarded routes, sanitized toast lifecycle tests, signup redirect/removal, full tests, build, and lint | none |
| WU00006 | Invitation tests and linked rollback-only canonical song/version CRUD and invariant evidence | none |
| WU00007 | Static Spanish/Planly/timezone/raw-error scan, formatter and toast tests, 62-test suite, build/type check, lint, preview route smoke, template artifacts, SMTP checklist, hosted signup disablement, and current-stage acceptance of built-in SMTP plus default hosted Auth emails for authorized-team testing. The scoped template PATCH returned HTTP 400; authenticated before/after readback proved all six intended fields remained stale and 236 unrelated Auth fields were unchanged. A real administrator recovery request returned HTTP 200/accepted without identity disclosure or persistence. Focused `ServiceForm` component verification proves no timezone control: each rendered flow rejects accessible `Timezone`, `Zona horaria`, and `Huso horario` labels and inventories only its expected form-control IDs; both mutation contracts use `America/Mexico_City`. | Hosted Planly template deployment/readback/render and external delivery are deferred to the named external-production gate, not current-stage verification. |

Docker-dependent local reset/function serving was unavailable. The accepted substitute was linked migration parity, transaction rollback, catalog/grant/RLS verification, deployed endpoint smoke, and repository tests. This preserved production state and did not retain test fixtures.

---

## Path Reconciliation

These are functionally equivalent actual paths, not design deviations:

- `supabase/migrations/20260802185516_platform_admin.sql`
- `supabase/migrations/20260802185911_revoke_platform_admin_helper_anon_execute.sql`
- `supabase/migrations/20260802192919_restrictive_rls_cutover.sql`
- `src/services/adminService.ts`
- `supabase/functions/admin-api/protocol.test.ts`

Supabase CLI's `supabase migration new` requires timestamp-prefixed migration filenames. The prior planned `00003_*`/`00004_*` names were estimates and do not constitute migration drift.

---

## Critical Findings

None for the current authorized-team testing stage. The hosted-template policy restriction is an accepted stage decision with no hosted configuration mutation, not an implementation defect or current-stage blocker.

---

## Deferred External-Production Gate

Before inviting any external production user, all of the following remain mandatory: custom SMTP, an owned verified sending domain, deployment of all three Planly invite/recovery/magic-link templates, authenticated readback and render verification of each template, external-recipient delivery proof, and the new-invitation compensation smoke. Supabase Auth rejected the prior disposable harness address with `email_address_invalid` before delivery; that provider validation constraint defers this proof rather than waiving it. This gate is deferred; it is not evidence of current production readiness and is not a blocker for the accepted authorized-team testing stage.

---

## Hosted Configuration Notes

- Hosted signup is disabled for project `xiiibqgmkkstpwsstyvx`: a targeted Management API PATCH with only `disable_signup=true` succeeded, the before/after comparison found no unrelated configuration changes, authenticated GET returned `true`, and public `/auth/v1/settings` returned HTTP 200 with `disable_signup=true` after an 8-second propagation wait.
- Maintainer scope decision: continue with Supabase built-in SMTP and default hosted Auth emails for authorized project-team testing because no owned domain or custom SMTP credentials exist. Supabase documents this service as testing/demo only, strictly rate-limited, and restricted to project team addresses.
- A real password-recovery request for the active platform administrator returned HTTP 200/accepted without printing or persisting identity. This is request-acceptance evidence, not delivery or external-recipient production-readiness evidence.
- Custom SMTP, an owned verified sending domain, deployed Planly templates with authenticated readback/render verification, and external-recipient delivery proof remain mandatory before inviting arbitrary external users in production.
- Do not infer hosted template deployment from repository files: authenticated before/after readback proved the six intended hosted fields remain stale after the scoped PATCH returned HTTP 400, while all 236 unrelated Auth fields remained unchanged.
- Avoid a full `supabase config push` when it would overwrite hosted Site URL or redirect settings; use a scoped authorized Management API update.
- Continuation result: an authenticated scoped PATCH for only `mailer_subjects_{invite,recovery,magic_link}` and `mailer_templates_{invite,recovery,magic_link}_content` returned HTTP 400. The post-PATCH authenticated readback matched the pre-PATCH fingerprint for all 236 unrelated Auth fields and showed all six intended fields still stale. No hosted fixture, user, session, Site URL, redirect, SMTP, or other Auth setting changed.
- Supabase's current changelog records that new Free-plan projects using the default SMTP service cannot customize Auth templates. The hosted project was created after that policy date and remains in the explicitly accepted built-in-SMTP/default-template, authorized-team testing stage. Use an authorized supported configuration path only when completing the deferred external-production gate; do not use `supabase config push`.

---

## Command Evidence

| Command | Result | SHA-256 |
|---|---|---|
| Prior `npm test` baseline | 62/62 pass before the focused test was added | `9f2ee916a357d8ca4c688c7b54f941cc2f5f5979964161aab7d3a613cfd5a733` |
| Prior `npm run build` baseline | pass before this work unit | `16da632bd405465e95ae16477fb7d9325c9c9c413845890db29c05c1167d7f50` |
| `npm run lint` | 0 errors, 21 accepted warnings | `284b1fbfa02cae435b7aac9969199507916b02475df8e658f973c311fbfe1d57` |
| Sanitized Node template-contract check | 3/3 local invite, recovery, and magic-link contracts pass | N/A (no generated artifact) |
| Authenticated Management API readback → scoped PATCH → readback | PATCH HTTP 400; all six intended fields remain stale; all 236 unrelated Auth fields unchanged | N/A (hosted-state safety evidence) |
| `npm test -- src/features/services/ServiceForm.test.tsx` | 2/2 pass: rendered create/update flows reject accessible `Timezone`, `Zona horaria`, and `Huso horario` labels, inventory only expected form-control IDs, and send `America/Mexico_City` | N/A (JSDOM component harness; service/network boundary is mocked because this work unit verifies the form-to-service contract only) |
| `npm run build` | pass: `tsc -b` and Vite production build | N/A |
| Bounded Node hosted non-admin reconciliation smoke | `status=passed`; exact `helper_boolean=false`; reconciliation `0/0/0`; cleanup fixture users/access-state/platform-admin rows `0/0/0`; authenticated fixture global refresh-session revocation succeeded before hard deletion. No target-session enumeration endpoint was available. | `74a615b9146eb5f26a50b9c77245ed87a2557af88dddfb696b779e535c078ba9` |
| `npm test -- supabase/functions/admin-api/protocol.test.ts` | exit 0; 1 file, 5 tests passed | N/A (repository protocol coverage) |
| Bounded Node hosted `admin-api` internal-stage matrix | `status=passed`; 14 sanitized action/status assertions passed; existing-user invitation did not send mail; reconciliation and final cleanup fixture users/churches/memberships/access-state/platform-admin rows `0/0/0/0/0`; local-scope owner/disposable harness session release succeeded | `a59b49c4bd02939bdeeee1487bf396591a7af2770c482f22543b6c4ff4e75e67` |

---

```json
{"schema":"gentle-ai.evidence/v1","work_unit":"wu00004-admin-api-non-email-matrix","status":"passed","runtime_evidence_sha256":"a59b49c4bd02939bdeeee1487bf396591a7af2770c482f22543b6c4ff4e75e67","cleanup":{"users":0,"churches":0,"memberships":0,"access_state":0,"platform_admins":0},"settlement":{"native_acquire":"proceed","sdd_attempt_operations":0,"owner":"orchestrator"},"deferred_external_production_gate":true}
```
