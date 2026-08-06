# Localization Specification

## Purpose

Require a complete neutral-Spanish Planly interface with fixed Mexico City formatting and no raw technical errors.

## ADDED Requirements

### Requirement: Complete Neutral-Spanish Inventory

Every visible string MUST be neutral professional Spanish and branded `Planly`. The inventory MUST cover auth, admin, dashboard, songs, teams, people, services, setlists and items, public views, profile, app/auth/public layouts, shared `ErrorBoundary`, `EmptyState`, `ConfirmDialog`, `LoadingSpinner`, and `ShareButton`, plus validation, errors, and toasts. Shipped UI MUST contain no English copy or `SelahPlan` reference.

#### Scenario: Feature and layout inventory

- GIVEN every application route and layout is rendered with empty, loading, success, and failure states
- WHEN visible text is inspected
- THEN every inventoried surface is neutral Spanish and branded Planly

#### Scenario: Shared components inventory

- GIVEN each shared component is rendered
- WHEN its labels and assistive text are inspected
- THEN `ErrorBoundary`, `EmptyState`, `ConfirmDialog`, `LoadingSpinner`, and `ShareButton` contain neutral Spanish only

#### Scenario: No stale brand ships

- WHEN the production bundle and rendered DOM are inspected
- THEN neither `SelahPlan` nor user-visible English fallback text appears

### Requirement: Fixed Mexico City Timezone

All new church and service timezone defaults MUST be `America/Mexico_City`; migration `00004_admin_cutover.sql` MUST backfill existing church/service values. No timezone selector MUST appear in church, service, or profile UI.

#### Scenario: Existing timezone cutover

- GIVEN existing rows use another timezone
- WHEN `00004` applies
- THEN their timezone is `America/Mexico_City` and future defaults match

#### Scenario: No timezone input

- WHEN a user opens church, service, or profile forms
- THEN no timezone field or selector is rendered

### Requirement: `es-MX` Absolute and Relative Formatting

Absolute dates/times MUST use `Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City' })`. Relative values MUST use `Intl.RelativeTimeFormat('es-MX')`.

#### Scenario: Service date

- GIVEN a service instant corresponding to 10:00 in Mexico City on 2 August 2026
- WHEN it renders
- THEN the date and time use valid `es-MX` output for that timezone

#### Scenario: Relative update time

- GIVEN an item changed three hours ago
- WHEN relative time renders
- THEN it reads `hace 3 horas`

### Requirement: Sanitized User-Facing Failures

Validation, errors, empty states, and toasts MUST use controlled Spanish messages. Raw JavaScript, Supabase, PostgreSQL, Edge Function, network, or server exception text MUST never reach users. Unknown failures MUST map to `Ocurrió un error inesperado. Intenta de nuevo.`

#### Scenario: Unknown server error

- GIVEN a server returns an unmapped internal error
- WHEN any UI surface handles it
- THEN the generic Spanish fallback appears and the raw text remains diagnostic-only

#### Scenario: Field validation

- GIVEN a submitted field violates a client schema
- WHEN validation renders
- THEN a specific neutral-Spanish inline message appears beside that field

### Requirement: Planly Auth-Mail Localization

Invitation, recovery, and magic-link subjects and templates MUST use neutral Spanish and Planly branding. Sender name MUST be `Planly`.

#### Scenario: Mail set is localized

- WHEN each auth template is rendered in a delivery test
- THEN subject, body, call to action, expiry guidance, and support guidance are neutral Spanish
