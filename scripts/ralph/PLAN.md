# Ralph Plan

## Goal

Implement the remaining "Not started" user stories in EPIC 2 of
docs/AGENT-READY-FEATURE-BACKLOG.md: US-2.2, US-2.3, US-2.4. US-2.1 is
already done — follow the same conventions it established (Express + zod +
node:sqlite in apps/api/src/{routes,db,types.ts}; Angular standalone
components + reactive forms in apps/web/src/app/features/projects/;
vitest/supertest tests on the API, vitest + TestBed on the web app).

## Guardrails

- Do not touch: `.env`, CI/deploy config, anything under `.claude/` or
  `scripts/ralph/`.
- Max scope: `apps/api/**`, `apps/web/**`, and the status table in
  `docs/AGENT-READY-FEATURE-BACKLOG.md` only.
- Schema changes are allowed, same pattern as US-2.1's migration in
  `apps/api/src/db/store.ts`: `CREATE TABLE IF NOT EXISTS` for new tables,
  guarded `try { ALTER TABLE ... ADD COLUMN ... } catch {}` for new columns
  on existing tables. Never DROP or destructively ALTER an existing column.
- Do not add a new named "input" type for API payloads — derive request
  shapes from the existing `Conference`/`Session` types with `Omit<...>`
  inline, matching the pattern already used in `db/store.ts` and
  `api.service.ts`.
- US-2.3's acceptance criteria require "at least one valid session" to
  publish. Session creation already exists as a backend endpoint
  (`POST /api/conferences/:id/sessions` in `conferences.routes.ts`) but has
  no frontend UI yet — that UI is US-3.1 and is OUT OF SCOPE here. For
  US-2.3, just check existing session data (e.g. via the store) when
  validating whether a conference can be published; do not build a session
  creation form.
- One commit per story, prefixed `ralph:`.

## Checklist

- [x] US-2.2 — Configure rooms and tracks (Organizer can add/edit/remove
      rooms and tracks on a conference; room capacity <= conference
      capacity; names unique within a conference; a room/track used by a
      session cannot be deleted)
- [ ] US-2.3 — Preview and publish a conference (preview stays private
      while Draft; publish requires required details + a room + >=1
      session; Draft -> Published; publishing twice has no duplicate
      effect)
- [ ] US-2.4 — Cancel or complete a conference (cancel a Draft/Published
      conference with a required reason; registered attendees notified —
      stub/log this if EPIC 8 notifications don't exist yet; complete only
      after end date; Cancelled/Completed block new registrations)

## Blockers

<Ralph appends notes here if stuck>
