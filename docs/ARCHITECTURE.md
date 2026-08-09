# Gatherly Architecture

Angular communicates with an Express REST API. The API owns authentication, authorization, validation, and conference invariants, then persists to SQLite. The browser is never trusted as an authorization boundary.

## Boundaries

- API `auth/`: access/refresh tokens.
- API `middleware/`: authentication and role policy.
- API `routes/`: HTTP mapping and validation.
- API `db/store.ts`: starter persistence adapter and invariants.
- Web `core/`: session, HTTP, models, guards, interceptor.
- Web `features/`: lazy route slices.
- Web `styles.scss`: design tokens and reusable primitives.

| Capability | Admin | Organizer | Speaker | Attendee |
| --- | :---: | :---: | :---: | :---: |
| Published conferences | ✓ | ✓ | ✓ | ✓ |
| Drafts | ✓ | ✓ |  |  |
| Create sessions | ✓ | ✓ |  |  |
| Register / agenda |  |  |  | ✓ |
| Manage users | ✓ |  |  |  |

Before ticketing/check-in, extract application services and transactional repositories. Add an outbox for notifications and payment effects. Replace localStorage refresh tokens with rotating, revocable, secure HTTP-only cookies. Add migrations, audit records, structured logs, request correlation, rate limits, and state-transition integration tests.
