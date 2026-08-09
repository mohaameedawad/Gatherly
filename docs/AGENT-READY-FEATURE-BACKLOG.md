# Gatherly Feature Backlog

This backlog describes the missing features for Gatherly using epics, user stories, acceptance criteria, dependencies, and authorization rules.

## Roles

- **Admin:** Manages the whole platform, users, roles, and all conferences.
- **Organizer:** Creates and manages conferences they own.
- **Speaker:** Manages a speaker profile, submits proposals, and views assigned sessions.
- **Attendee:** Registers for conferences, builds an agenda, receives tickets, checks in, and submits feedback.
- **Anonymous:** Can browse published public conferences and create an account.

## Dependency order

| Order | Epic | Depends on |
| --- | --- | --- |
| 1 | EPIC 1 — User accounts | Existing authentication and RBAC |
| 2 | EPIC 2 — Conference management | Existing authentication and RBAC |
| 3 | EPIC 3 — Session management | Conference management |
| 4 | EPIC 4 — Speaker proposals | Conference and session management |
| 5 | EPIC 5 — Scheduling | Session management |
| 6 | EPIC 6 — Registration and waitlist | Published conferences |
| 7 | EPIC 7 — Tickets and check-in | Confirmed registration |
| 8 | EPIC 8 — Notifications | Domain actions from other epics |
| 9 | EPIC 9 — Feedback and analytics | Check-in and attendance data |
| 10 | EPIC 10 — Paid tickets | Conference publishing and registration |

---

# EPIC 1 — User Accounts and Profiles

## US-1.1 — Create an attendee account

**User story:** As a visitor, I want to create an account so that I can register for conferences.

**Acceptance criteria**

1. A visitor can register with name, email, and password.
2. Email addresses are unique and case-insensitive.
3. Invalid input displays clear validation errors.
4. A new account receives the Attendee role by default.
5. The user receives an email-verification link.
6. An unverified account cannot register for a conference.

**Dependencies:** Existing authentication system; email notification capability for real delivery.

**Authorization:** Anonymous users may sign up. Only Admin can assign a different role.

## US-1.2 — Verify an email address

**User story:** As a new attendee, I want to verify my email so that I can use protected conference features.

**Acceptance criteria**

1. A valid verification link marks the account as verified.
2. An expired or previously used link is rejected.
3. A user can request a new verification link.
4. The response does not reveal whether an unrelated email exists.

**Dependencies:** US-1.1; notifications.

**Authorization:** Account owner only.

## US-1.3 — Reset or change a password

**User story:** As a user, I want to reset a forgotten password or change my current password.

**Acceptance criteria**

1. A user can request a password-reset link.
2. A valid, unexpired link allows the password to be changed once.
3. Existing sessions are revoked after a successful reset.
4. A signed-in user can change the password by supplying the current password.

**Dependencies:** Existing authentication; notifications.

**Authorization:** Account owner only.

## US-1.4 — Manage a personal profile

**User story:** As a user, I want to update my profile so that my account information is accurate.

**Acceptance criteria**

1. A user can edit name, avatar, timezone, and preferred language.
2. A Speaker can also edit biography, company, job title, expertise, and social links.
3. Invalid images or links are rejected.
4. Profile changes are visible after saving.

**Dependencies:** US-1.1.

**Authorization:** Users edit only their own profile. Admin may view profiles but cannot silently impersonate a user.

---

# EPIC 2 — Conference Management and Publishing

## US-2.1 — Create a conference draft

**User story:** As an Organizer, I want to create a conference draft so that I can prepare it before publication.

**Acceptance criteria**

1. Organizer can enter title, description, dates, timezone, venue, capacity, and cover image.
2. End date must be later than start date.
3. Capacity must be greater than zero.
4. The conference is saved with Draft status.
5. Drafts are not visible to Anonymous, Speaker, or Attendee users.
6. Organizer can leave and continue editing later.

**Dependencies:** Existing RBAC.

**Authorization:** Organizer can create conferences. Organizer can access only conferences they own. Admin can access all conferences.

## US-2.2 — Configure rooms and tracks

**User story:** As an Organizer, I want to define rooms and tracks so that sessions can be organized correctly.

**Acceptance criteria**

1. Organizer can add, edit, and remove rooms.
2. Each room has a name and capacity.
3. Room capacity cannot exceed conference capacity.
4. Organizer can add, edit, and remove tracks.
5. Room and track names are unique within a conference.
6. A room or track used by a session cannot be deleted.

**Dependencies:** US-2.1.

**Authorization:** Conference owner and Admin only.

## US-2.3 — Preview and publish a conference

**User story:** As an Organizer, I want to preview and publish a conference so that attendees can discover it.

**Acceptance criteria**

1. Organizer can preview the conference as it will appear publicly.
2. Preview remains private while the conference is a draft.
3. A conference cannot be published without required details, a room, and at least one valid session.
4. Publishing changes status from Draft to Published.
5. Published conference appears in public discovery.
6. Publishing the same conference twice does not create duplicate effects.

**Dependencies:** US-2.1, US-2.2, US-3.1.

**Authorization:** Conference owner and Admin may preview or publish. Other Organizers cannot access the draft.

## US-2.4 — Cancel or complete a conference

**User story:** As an Organizer, I want to update the conference lifecycle so that its public state is accurate.

**Acceptance criteria**

1. Organizer can cancel a Draft or Published conference and must enter a reason.
2. Registered attendees are notified when a conference is cancelled.
3. A conference can be completed only after its end date.
4. Cancelled and Completed conferences cannot accept new registrations.
5. Lifecycle changes are recorded in history.

**Dependencies:** US-2.3; EPIC 8 for notifications.

**Authorization:** Conference owner and Admin only.

---

# EPIC 3 — Session Management

## US-3.1 — Create and edit a session

**User story:** As an Organizer, I want to create sessions so that I can build the conference program.

**Acceptance criteria**

1. Organizer can provide title, description, type, date, start/end time, room, track, speakers, and capacity.
2. Session time must be inside conference dates.
3. End time must be later than start time.
4. Session capacity cannot exceed room capacity.
5. Room, track, and speakers must be valid.
6. Organizer can edit a session and see the updated program.

**Dependencies:** US-2.1 and US-2.2.

**Authorization:** Conference owner and Admin only.

## US-3.2 — Cancel or delete a session

**User story:** As an Organizer, I want to remove or cancel a session when the program changes.

**Acceptance criteria**

1. An unpublished session with no attendee agenda entries can be deleted.
2. A published session is cancelled instead of permanently deleted.
3. Cancellation requires a reason.
4. Cancelled sessions cannot be added to an agenda.
5. Affected speakers and attendees are notified.

**Dependencies:** US-3.1; EPIC 8 for notifications.

**Authorization:** Conference owner and Admin only.

## US-3.3 — Browse and filter the schedule

**User story:** As an Attendee, I want to filter the schedule so that I can find relevant sessions.

**Acceptance criteria**

1. Users can filter by day, track, room, speaker, and search text.
2. Several filters can be applied together.
3. Filter selections are represented in the URL.
4. Empty results display a clear message.
5. Cancelled sessions are clearly identified.

**Dependencies:** US-3.1.

**Authorization:** Anyone may browse sessions of Published conferences. Draft sessions follow conference-draft permissions.

---

# EPIC 4 — Speaker Proposals

## US-4.1 — Submit a session proposal

**User story:** As a Speaker, I want to submit a proposal so that it may be included in a conference.

**Acceptance criteria**

1. Speaker can save a proposal as a draft.
2. Proposal includes title, abstract, outcomes, format, duration, level, topics, and co-speakers.
3. Proposal can be submitted only while the conference call for proposals is open.
4. Speaker can view proposal status and history.
5. Speaker can withdraw a proposal before it becomes a scheduled session.

**Dependencies:** US-1.4 and US-2.1.

**Authorization:** Speaker manages only their own proposals. Admin may view all. Organizer views proposals only for conferences they own.

## US-4.2 — Review a proposal

**User story:** As an Organizer, I want to review proposals so that I can select valuable sessions.

**Acceptance criteria**

1. Organizer can list and filter submitted proposals.
2. Organizer can add internal notes and a score.
3. Organizer can accept or reject a proposal and provide a reason.
4. Speaker is notified of the decision.
5. Decision and reviewer are recorded in history.

**Dependencies:** US-4.1; EPIC 8 for notifications.

**Authorization:** Conference owner and Admin only. Internal notes are never visible to Speakers or Attendees.

## US-4.3 — Convert an accepted proposal into a session

**User story:** As an Organizer, I want to convert an accepted proposal into a session so that it can be scheduled.

**Acceptance criteria**

1. Only an accepted proposal can be converted.
2. Proposal information pre-fills the new session.
3. One proposal can create only one session.
4. Organizer completes room, track, capacity, and time before publishing it.
5. The proposal keeps a link to the resulting session.

**Dependencies:** US-4.2 and US-3.1.

**Authorization:** Conference owner and Admin only.

---

# EPIC 5 — Conflict-Free Scheduling

## US-5.1 — Prevent room conflicts

**User story:** As an Organizer, I want room conflicts prevented so that two sessions are not scheduled in the same room simultaneously.

**Acceptance criteria**

1. Creating or editing an overlapping session in the same room is rejected.
2. Sessions that touch at the exact end/start time are allowed.
3. Cancelled sessions do not cause conflicts.
4. The error identifies the conflicting session.

**Dependencies:** US-3.1.

**Authorization:** The rule applies to every Organizer and Admin action.

## US-5.2 — Prevent speaker conflicts

**User story:** As a Speaker, I want schedule conflicts prevented so that I am not assigned to simultaneous sessions.

**Acceptance criteria**

1. A speaker cannot be assigned to overlapping sessions.
2. Conflicts are checked across all conferences.
3. The error identifies the conflicting session.
4. Cancelled sessions do not cause conflicts.

**Dependencies:** US-3.1.

**Authorization:** The rule applies to every Organizer and Admin action.

## US-5.3 — Warn about agenda conflicts

**User story:** As an Attendee, I want to know when sessions overlap so that I can build a valid agenda.

**Acceptance criteria**

1. Adding an overlapping session is rejected.
2. The attendee sees the conflicting session and time.
3. The attendee can navigate to the existing agenda item.
4. Removing an agenda item more than once does not cause an error.

**Dependencies:** Existing personal agenda and US-3.1.

**Authorization:** Attendee manages only their own agenda. Admin and Organizer cannot silently change it.

## US-5.4 — Export a calendar

**User story:** As an Attendee, I want to export my agenda so that I can use it in a calendar application.

**Acceptance criteria**

1. Attendee can download their agenda as an `.ics` file.
2. Calendar entries include session, time, timezone, room, and description.
3. Updated exports keep stable event identifiers.
4. No private data from other attendees is included.

**Dependencies:** US-5.3.

**Authorization:** Attendee exports only their own agenda. Anyone may export the public conference schedule.

---

# EPIC 6 — Registration and Waitlist

## US-6.1 — View My Events and cancel registration

**User story:** As an Attendee, I want to manage my conference registrations.

**Acceptance criteria**

1. Attendee sees upcoming, past, cancelled, and waitlisted events.
2. Attendee can cancel an active registration.
3. Cancelling again produces no duplicate action or error.
4. Agenda entries for that conference are removed or deactivated.
5. A cancelled registration releases one seat.

**Dependencies:** Existing registration and agenda features.

**Authorization:** Attendee manages only their registrations. Organizer can view registrations for owned conferences. Admin can view all.

## US-6.2 — Join a waitlist

**User story:** As an Attendee, I want to join a waitlist when a conference is full.

**Acceptance criteria**

1. A sold-out conference offers a waitlist option.
2. An attendee can have only one active waitlist entry per conference.
3. Queue order is first-in, first-out.
4. Attendee can leave the waitlist.
5. Attendee can see their current waitlist status.

**Dependencies:** Published conference and registration capacity.

**Authorization:** Verified Attendee only; users manage only their own waitlist entry.

## US-6.3 — Promote the next attendee

**User story:** As a waitlisted Attendee, I want to receive an offer when a seat becomes available.

**Acceptance criteria**

1. Registration cancellation promotes the next eligible attendee.
2. The seat is held until a defined expiry time.
3. The attendee can accept or decline the offer.
4. Expired or declined offers move to the next attendee.
5. Concurrent actions never exceed conference capacity.

**Dependencies:** US-6.1, US-6.2, and EPIC 8.

**Authorization:** System performs promotion. Attendee accepts or declines only their own offer. Organizer may view but cannot change queue order.

---

# EPIC 7 — Tickets and Check-In

## US-7.1 — Receive a QR ticket

**User story:** As a registered Attendee, I want a QR ticket so that I can enter the conference.

**Acceptance criteria**

1. A confirmed registration creates one active ticket.
2. Attendee can view or download the ticket.
3. QR code contains no readable personal data.
4. Reissuing a ticket invalidates the previous ticket.
5. Cancelled registrations produce invalid tickets.

**Dependencies:** Confirmed registration from EPIC 6.

**Authorization:** Attendee accesses only their own ticket. Organizer/Admin can verify but cannot download tickets in bulk without an approved operational need.

## US-7.2 — Check in an attendee

**User story:** As check-in staff, I want to scan a ticket so that I can admit a valid attendee.

**Acceptance criteria**

1. Staff can scan QR or enter a code manually.
2. Valid ticket records attendee, conference, time, and staff member.
3. Invalid, revoked, cancelled, or wrong-conference tickets are rejected.
4. Scanning the same ticket twice does not increase attendance twice.
5. The result is easy to understand on a mobile device.

**Dependencies:** US-7.1.

**Authorization:** Admin or a user with Check-In Staff permission for that conference. Organizer must explicitly grant staff access.

## US-7.3 — View live attendance

**User story:** As an Organizer, I want to see live attendance so that I can manage event operations.

**Acceptance criteria**

1. Dashboard shows registered, checked-in, and remaining counts.
2. Counts update regularly during the event.
3. Organizer can search for a registered attendee for manual check-in.
4. Reversing a mistaken check-in requires a reason and keeps history.

**Dependencies:** US-7.2.

**Authorization:** Conference owner, assigned Check-In Staff, and Admin. Staff see only the data necessary for check-in.

---

# EPIC 8 — Notifications

## US-8.1 — Receive in-app notifications

**User story:** As a user, I want notifications about important conference activity.

**Acceptance criteria**

1. User sees unread count and notification list.
2. User can mark one or all notifications as read.
3. Notification links to the relevant conference, session, proposal, or registration.
4. One business event does not create duplicate notifications.

**Dependencies:** Events produced by other epics.

**Authorization:** Users access only their notifications. Admin cannot read notification content unless explicitly required for support and audited.

## US-8.2 — Receive email notifications

**User story:** As a user, I want important updates by email so that I do not miss changes.

**Acceptance criteria**

1. Emails cover registration, cancellation, waitlist offers, proposal decisions, and session changes.
2. Email uses the user's preferred language and conference timezone.
3. Failed delivery is retried.
4. Duplicate processing does not send duplicate email.

**Dependencies:** US-8.1 and an email provider.

**Authorization:** System sends emails only for authorized business events.

## US-8.3 — Manage notification preferences

**User story:** As a user, I want to choose optional notifications so that I control communication.

**Acceptance criteria**

1. User can enable or disable optional email and in-app categories.
2. Required transactional messages remain enabled.
3. Preferences apply to future messages.
4. Current choices are clearly displayed.

**Dependencies:** US-1.4 and US-8.2.

**Authorization:** Account owner only.

---

# EPIC 9 — Feedback and Analytics

## US-9.1 — Rate a session

**User story:** As an Attendee, I want to rate a session I attended so that organizers and speakers can improve.

**Acceptance criteria**

1. Only a checked-in attendee can rate the session.
2. Rating is between one and five; comment is optional.
3. One attendee can submit one active review per session.
4. Attendee can edit their review.
5. A cancelled session cannot be reviewed.

**Dependencies:** Session check-in from EPIC 7.

**Authorization:** Attendee manages only their review. Organizer/Admin may moderate. Speaker sees aggregate results, not reviewer identity.

## US-9.2 — Submit conference feedback

**User story:** As an Attendee, I want to evaluate the conference experience.

**Acceptance criteria**

1. Checked-in attendee can rate organization, venue, content, and overall recommendation.
2. One attendee can submit one active conference response.
3. Attendee can report inappropriate public comments.
4. Moderation actions require a reason.

**Dependencies:** Conference check-in from EPIC 7.

**Authorization:** Attendee manages their feedback. Organizer views feedback for owned conferences. Admin moderates all.

## US-9.3 — View conference analytics

**User story:** As an Organizer, I want analytics so that I can evaluate conference performance.

**Acceptance criteria**

1. Dashboard shows registrations, cancellations, waitlist conversion, attendance, session popularity, capacity usage, and ratings.
2. Metrics can be filtered by date, track, room, and ticket type when applicable.
3. Organizer can export results to CSV.
4. Export prevents spreadsheet formula injection.
5. Empty data displays a useful state rather than misleading percentages.

**Dependencies:** EPIC 6, EPIC 7, and US-9.1.

**Authorization:** Conference owner and Admin only. Organizer cannot access another Organizer's analytics.

---

# EPIC 10 — Paid Tickets

## US-10.1 — Configure ticket types

**User story:** As an Organizer, I want to create ticket types so that I can offer different admission options.

**Acceptance criteria**

1. Organizer can create Free, Standard, Early-Bird, and VIP tickets.
2. Each type has price, currency, quantity, sales dates, and purchase limit.
3. Total ticket inventory cannot exceed conference capacity.
4. Ticket sales cannot start after they end.
5. Published ticket changes do not invalidate completed purchases.

**Dependencies:** US-2.3.

**Authorization:** Conference owner and Admin only.

## US-10.2 — Apply a promo code

**User story:** As an Attendee, I want to use a promo code so that I can receive an eligible discount.

**Acceptance criteria**

1. Valid code applies the correct fixed or percentage discount.
2. Expired, exhausted, or inapplicable codes are rejected.
3. Server calculates the final total.
4. Usage limits are enforced even during concurrent checkouts.

**Dependencies:** US-10.1.

**Authorization:** Attendee applies a code to their checkout. Organizer manages codes for owned conferences. Admin can audit all codes.

## US-10.3 — Pay for a registration

**User story:** As an Attendee, I want to pay securely so that my registration is confirmed.

**Acceptance criteria**

1. Checkout displays ticket, discount, fees, and final total.
2. Inventory is temporarily reserved during payment.
3. Registration is confirmed only after verified payment success.
4. Duplicate payment callbacks do not create duplicate registrations or charges.
5. Gatherly never stores raw card details.
6. Failed or expired payments release reserved inventory.

**Dependencies:** US-10.1, US-10.2, and payment-provider integration.

**Authorization:** Attendee pays only for their order. Organizer can view payment status for owned conferences but not card data. Admin can investigate payment records.

## US-10.4 — Cancel and refund a paid ticket

**User story:** As an Attendee, I want to cancel an eligible paid ticket and receive the correct refund.

**Acceptance criteria**

1. Refund eligibility follows the conference cancellation policy.
2. User sees the refund amount before confirming.
3. Successful refund updates payment and registration status.
4. Repeating the request does not refund twice.
5. Organizer and attendee receive confirmation.

**Dependencies:** US-10.3 and EPIC 8.

**Authorization:** Attendee requests refund for their order. Organizer/Admin may initiate a policy-approved refund and the action is recorded.

---

# Global authorization matrix

| Capability | Admin | Organizer | Speaker | Attendee | Anonymous |
| --- | :---: | :---: | :---: | :---: | :---: |
| Browse published conferences | Yes | Yes | Yes | Yes | Yes |
| View draft conference | All | Owned only | No | No | No |
| Create/edit/publish conference | All | Owned only | No | No | No |
| Manage sessions | All | Owned only | No | No | No |
| Submit proposal | No | No | Own | No | No |
| Review proposal | All | Owned conference | No | No | No |
| Register or join waitlist | No | No | No | Own | No |
| Manage personal agenda | No | No | No | Own | No |
| Access attendee ticket | Verify | Verify owned conference | No | Own | No |
| Perform check-in | All | Owned/assigned conference | No | No | No |
| Submit feedback | No | No | No | Own attended event | No |
| View analytics | All | Owned conference | Limited aggregate | No | No |
| Manage users and roles | Yes | No | No | No | No |

## Global authorization rules

1. The API must enforce every rule; hiding a button in Angular is not authorization.
2. Organizer permissions are always limited by conference ownership.
3. Users may access only their own profiles, registrations, agendas, tickets, notifications, and feedback unless a specific role rule allows otherwise.
4. Anonymous users can access only explicitly public Published conference data.
5. Suspended users cannot authenticate, refresh sessions, or perform protected actions.
6. Admin access to sensitive operational data must be recorded.
7. Role changes, publishing, cancellation, check-in reversal, moderation, and refunds require history records.

