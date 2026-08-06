# Notifications Specification

## Purpose

Define one accessible `react-hot-toast` layer with explicit Spanish state labels and strictly sanitized failure messages.

## ADDED Requirements

### Requirement: Global Toaster

The app MUST mount exactly one `react-hot-toast` `<Toaster>` at the application root so every route can publish notifications without a local provider.

#### Scenario: Toaster exists once

- GIVEN the application root and any route render
- WHEN the DOM is inspected
- THEN one global Toaster is available and no route mounts a duplicate

### Requirement: Explicit Visible State Labels

Every toast MUST include a visible text prefix `Éxito:`, `Error:`, or `Cargando:` (or an exactly equivalent explicit Spanish label). Color/icon alone MUST NOT communicate state.

#### Scenario: Invitation success

- GIVEN an invitation succeeds
- WHEN its toast resolves
- THEN visible and announced text begins `Éxito:`

#### Scenario: Mutation pending

- GIVEN a church mutation is pending
- WHEN its toast appears
- THEN visible and announced text begins `Cargando:`

### Requirement: `toast.promise` Lifecycle

Promise-backed mutations SHOULD use `toast.promise` so one notification transitions from loading to success or sanitized error without duplicate toasts. Loading MUST remain until settlement and the final state MUST replace it.

#### Scenario: Save promise resolves

- GIVEN a canonical-song save promise is pending
- WHEN it resolves
- THEN one toast transitions from `Cargando: Guardando canción...` to `Éxito: Canción guardada.`

#### Scenario: Save promise rejects

- GIVEN the promise rejects with an internal exception
- WHEN the toast transitions
- THEN it shows a mapped `Error:` message and never includes the exception text

### Requirement: Sanitized Error Mapping Only

Toast error callbacks MUST accept controlled error codes and map them to neutral Spanish. Specs and implementation MUST NOT allow an underlying server/provider message to be appended, interpolated, or displayed. Unknown codes MUST use `Error: Ocurrió un error inesperado. Intenta de nuevo.`

#### Scenario: Raw Edge error is present

- GIVEN an Edge response includes diagnostic text internally
- WHEN the client creates an error toast
- THEN only the sanitized code mapping is visible

### Requirement: Inline Field Validation Without Duplicate Summary

Field-level validation MUST remain inline beside the affected field. A client-validation failure MUST NOT produce a summary toast. A server failure after valid submission MAY produce one sanitized outcome toast and MUST NOT duplicate the same message inline.

#### Scenario: Required field fails locally

- GIVEN a required field is empty
- WHEN the form is submitted
- THEN `Este campo es obligatorio.` appears inline and no toast is emitted

#### Scenario: Valid form fails on server

- GIVEN client validation passed
- WHEN the server rejects the mutation
- THEN one sanitized error toast appears and no duplicate inline summary is added

### Requirement: Accessible Announcement Semantics

Normal loading and success toasts MUST use `role="status"` with `aria-live="polite"`. Errors MUST remain text-labelled; urgent destructive failures MAY use `role="alert"` with `aria-live="assertive"`. Toast dismissal MUST not remove focus or steal keyboard focus.

#### Scenario: Screen reader follows promise transition

- GIVEN a screen-reader user starts a mutation
- WHEN `toast.promise` transitions from loading to success
- THEN the labelled loading and success states are announced politely from the same notification lifecycle

#### Scenario: Urgent destructive failure

- GIVEN a destructive action fails and is classified urgent
- WHEN its toast appears
- THEN `Error:` is visible and the alert is announced assertively
