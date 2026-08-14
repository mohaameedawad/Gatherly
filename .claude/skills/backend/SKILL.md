---
name: backend
description: Conventions for implementing changes in apps/api (@gatherly/api) — Express 5 + TypeScript + Zod + an in-memory store. Use whenever touching backend/API code in GATHERLY.
---

# Backend conventions (apps/api)

## Stack

- Express 5, TypeScript (strict, ESM — `"type": "module"`), Zod for
  request validation, JWT auth (`jsonwebtoken`), `bcryptjs` for password
  hashing, vitest + supertest for tests.
- `npm run lint` = `tsc --noEmit` — there is no separate ESLint step, type
  errors are the lint errors here.
- `npm run dev -w @gatherly/api` runs the API via `tsx watch`.

## Layout

- `src/types.ts` — shared domain types. Use `interface` for object shapes
  (not `type` aliases); string-literal unions (`Role`, conference
  `status`, etc.) stay as `type`.
- `src/db/store.ts` — the single in-memory data store; persistence and
  domain logic live here, not in routes.
- `src/routes/*.routes.ts` — one router per resource, mounted in
  `src/app.ts`.
- `src/middleware/auth.ts` — `authenticate` (attaches `req.user`) and
  `authorize(...roles)` middleware.
- `src/auth/tokens.ts` — JWT issuing/verification.

## Route pattern

- Build a `Router()`; call `.use(authenticate)` when every route on it
  needs a signed-in user, and add `authorize("ROLE", ...)` per-route for
  role restriction.
- Validate request bodies with a Zod schema via `safeParse`; on failure
  return `400` with `{ message, issues: result.error.issues }`.
- Store methods throw a plain `Error` with a short machine-readable
  `message` (e.g. `"NOT_FOUND"`); the route catches it and maps it to the
  right HTTP status and user-facing message — don't leak raw store error
  messages to the client.
- Ownership/authorization checks that depend on loaded data (e.g. "is this
  your conference") belong in the store method or immediately after
  calling it — don't duplicate the check in multiple places.

## Validation — every form-backed endpoint

Any route that accepts a body from a create/edit form on the frontend
(conference drafts, rooms, tracks, sessions, etc.) must validate it
server-side with Zod before it reaches the store — the frontend's
`Validators`/manual checks are UX only, never trust them as the source of
truth:

- Define one Zod `z.object({...})` schema per form/resource; mark every
  field the form treats as required with no `.optional()` (match the
  frontend's `Validators.required` fields one-for-one).
- Use the built-in Zod constraints that mirror the frontend's, e.g.
  `.min(n)` for min length, `.int().positive()` / `.min(1)` for numeric
  minimums — see `conferenceDraftSchema` in
  `src/routes/conferences.routes.ts` for the pattern.
- Cross-field rules (e.g. "end date must be after start date") go in a
  `.refine((d) => ..., { message, path: [...] })` on the schema, mirroring
  any equivalent cross-field validator on the frontend form.
- Call `.safeParse(req.body)` and on `!x.success` return `400` with
  `{ message: "<Resource> validation failed", issues: x.error.issues }` —
  never let an invalid body reach `store.*`.
- Add a schema for both create (`POST`) and edit (`PATCH`) if the form is
  reused for both; reuse one schema across the two routes when the shape
  is identical (see `conferenceDraftSchema` used by both `POST /` and
  `PATCH /:id`).

## Types

- Prefer `interface` over `type` for object shapes in `types.ts`, to match
  apps/web's `core/models/models.ts`.

## Before reporting done

`npm run lint` from the repo root (or `-w @gatherly/api`) must pass with
no type errors.
