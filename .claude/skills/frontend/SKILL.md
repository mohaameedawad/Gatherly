---
name: frontend
description: Conventions for implementing changes in apps/web — Angular 21 standalone components with signals and inline templates. Use whenever touching frontend/UI code in GATHERLY.
---

# Frontend conventions (apps/web)

## Stack

- Angular 21, standalone components (no NgModules), signals for local
  state, the `@if`/`@for` control-flow syntax in templates, `inject()` for
  DI, `FormsModule` + `[(ngModel)]` for simple forms.
- `npm start -w web` (`ng serve`) for the dev server; `ng test`
  (vitest + jsdom) for tests.

## Layout

- `core/models/models.ts` — shared TypeScript types mirroring the API's
  `types.ts`. Use `interface` for object shapes, matching the backend
  convention.
- `core/services/api.service.ts` — the one place HTTP calls to the API are
  made from.
- `core/auth/`, `core/guards/`, `core/interceptors/` — auth state, route
  guards, the auth HTTP interceptor.
- `features/<area>/` — one component per screen/feature (e.g.
  `features/projects/conference-rooms.ts`), with a colocated `.spec.ts`.
- `layout/` — shell/nav chrome.

## Component pattern

- Standalone `@Component` with an inline `template` (this codebase does
  not use separate `.html` files for feature components) and `imports`
  listing only what the template needs (`FormsModule`, `RouterLink`,
  etc.).
- Local UI state as `signal(...)`; read it by calling the signal in the
  template (`rooms()`, `roomError()`).
- Route params via `inject(ActivatedRoute)`; API calls via
  `inject(ApiService)`.
- List rendering: `@for (x of xs(); track x.id)`; conditional rendering:
  `@if (...) { } @else { }`.

## Form validation — required on every form

Every form must validate required fields client-side, matching whatever
the corresponding backend Zod schema requires — the two must stay in sync
field-for-field. There are two established patterns, pick by form
complexity:

- **Structured multi-field forms** (e.g. `conference-form.ts`): use
  `ReactiveFormsModule` with a `FormGroup`/`FormControl` per field,
  `Validators.required` on every required field plus `minLength`/`min`
  where the backend also enforces one, and a `FormGroup`-level custom
  validator function (e.g. `dateOrderValidator`) for cross-field rules
  mirroring the backend's `.refine()`. Show per-field errors with a
  `fieldError(name)` helper that reads `control.errors`/`control.touched`
  and returns a message per error key (`required`, `minlength`, `min`).
  Disable submit while invalid: `[disabled]="form.invalid || saving()"`,
  and guard `submit()` with `if (this.form.invalid) return;`.
- **Simple inline add/edit rows** (e.g. `conference-rooms.ts`): use
  `FormsModule` + `[(ngModel)]`, guard the handler with a manual check
  before calling the API (e.g. `if (!this.newRoomName.trim()) return;`),
  and surface server-side validation failures via an error `signal(...)`
  (`roomError`) rendered in an `.alert` div from the API's `4xx` response
  body (`e.error?.message`).

Client-side validation is a UX convenience only — the backend's Zod schema
is the source of truth, so always still handle the `4xx` error response
from the API even when the form validated locally.

## Types

- Add or extend shared shapes in `core/models/models.ts` using
  `interface`, not `type`, for object shapes — keep it in sync with the
  API's `types.ts`.

## Before reporting done

Manually sanity-check the screen renders (dev server) when the change is
UI-visible; `tester` writes the automated coverage afterward.
