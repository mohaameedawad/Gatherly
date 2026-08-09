# Gatherly Product Specification

## Product promise

Gatherly gives attendees a calm path from discovery to arrival, while organizers coordinate program, capacity, speakers, and operations in one place.

## Personas

- **Attendee:** discover, reserve a seat, build a conflict-free agenda, check in, and give feedback.
- **Organizer:** create and publish, curate sessions, manage capacity, run check-in, and view attendance.
- **Speaker:** submit proposals, maintain a profile, see accepted sessions, and receive updates.
- **Admin:** govern accounts, roles, safety, and audit history.

## Lifecycle and rules

`DRAFT → PUBLISHED → SOLD_OUT (optional) → COMPLETED`

- Anonymous protected calls receive `401`.
- Attendees cannot see drafts; organizers and admins can.
- Registration is unique and cannot exceed conference capacity.
- A personal agenda requires conference registration.
- Only organizers/admins create sessions; invalid input returns structured errors.
- Suspended accounts cannot authenticate or refresh.

## epics

| Epic | Acceptance focus | Dependency |
| --- | --- | --- |
| Publishing | Required fields, preview, valid transitions, ownership | Existing RBAC |
| Speaker proposals | Submit, review, accept/reject, notify | Conference draft |
| Schedule engine | No room/speaker overlap; attendee warning | Sessions |
| Waitlist | Ordered queue, transactional promotion | Registration |
| Check-in | Signed QR, one ticket, idempotent scan | Registration |
| Ticketing | Types, promo limits, webhook idempotency, refunds | Publishing |
| Notifications | Templates, preferences, retry/outbox | Domain events |
| Feedback | One rating per attended session, moderation | Check-in |
| Analytics | Funnel, attendance, popularity, export | Event data |

## Quality requirements

- WCAG 2.2 AA on critical attendee flows
- Mobile-first check-in; keyboard-complete organizer UI
- UTC persistence and explicit display timezones
- Least privilege, auditability, validation, and idempotency
- No card data stored by Gatherly
