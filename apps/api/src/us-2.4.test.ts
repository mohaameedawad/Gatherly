import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import type { Express } from "express";

// This suite needs to inspect the notifications table directly (there is no
// public notifications route yet, per the story). node:sqlite's in-memory
// mode is per-connection, so the app.test.ts suite (DATABASE_PATH=":memory:")
// can't be introspected from outside. We isolate this file with its own
// file-backed DB so a second DatabaseSync connection can read what the app
// wrote.
const dbPath = path.join(os.tmpdir(), `gatherly-us24-${Date.now()}.db`);

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any;

beforeAll(async () => {
  process.env.DATABASE_PATH = dbPath;
  ({ app } = await import("./app.js"));
  ({ store } = await import("./db/store.js"));
});

const login = async (email: string) =>
  (
    await request(app)
      .post("/api/auth/login")
      .send({ email, password: "Workshop123!" })
  ).body.accessToken;

const draft = (over: Partial<Record<string, unknown>> = {}) => ({
  title: "Cancel Complete Conference",
  summary: "A conference used to test cancel/complete flows.",
  venue: "Test Hall",
  city: "Cairo",
  startsAt: "2020-01-01T09:00:00",
  endsAt: "2020-01-02T17:00:00",
  timezone: "Africa/Cairo",
  capacity: 10,
  ...over,
});

const createDraft = async (
  t: string,
  over: Partial<Record<string, unknown>> = {},
) =>
  (
    await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(draft(over))
  ).body.id as number;

/** Creates a fully published conference; caller controls the conference dates
 * via `over` (used to control whether it "has ended" yet for complete tests).
 * `sessionStartsAt`/`sessionEndsAt` let the caller keep the session inside
 * the conference's own start/end bounds without doing timezone-sensitive
 * date math (both conference and session dates are naive local strings). */
const createPublished = async (
  t: string,
  over: Partial<Record<string, unknown>> = {},
  sessionStartsAt = "2020-01-01T09:00:00",
  sessionEndsAt = "2020-01-01T09:45:00",
) => {
  const id = await createDraft(t, over);
  const room = await request(app)
    .post(`/api/conferences/${id}/rooms`)
    .set("Authorization", `Bearer ${t}`)
    .send({ name: "Main Hall", capacity: 10 });
  const track = await request(app)
    .post(`/api/conferences/${id}/tracks`)
    .set("Authorization", `Bearer ${t}`)
    .send({ name: "General" });
  const session = await request(app)
    .post(`/api/conferences/${id}/sessions`)
    .set("Authorization", `Bearer ${t}`)
    .send({
      title: "A Great Session Title",
      abstract: "A sufficiently long abstract describing the session.",
      track: track.body.name,
      room: room.body.name,
      startsAt: sessionStartsAt,
      endsAt: sessionEndsAt,
      capacity: 5,
      speakerId: 3,
    });
  expect(session.status).toBe(201);
  const published = await request(app)
    .post(`/api/conferences/${id}/publish`)
    .set("Authorization", `Bearer ${t}`);
  expect(published.status).toBe(200);
  return id;
};

const queryNotifications = (conferenceId: number) => {
  const testDb = new DatabaseSync(dbPath);
  const rows = testDb
    .prepare("SELECT * FROM notifications WHERE conference_id=?")
    .all(conferenceId) as any[];
  testDb.close();
  return rows;
};

describe("US-2.4 cancel or complete a conference", () => {
  it("lets the owning organizer cancel a draft with a valid reason", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createDraft(t);
    const r = await request(app)
      .post(`/api/conferences/${id}/cancel`)
      .set("Authorization", `Bearer ${t}`)
      .send({ reason: "Venue became unavailable" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("CANCELLED");
    expect(r.body.cancelledReason).toBe("Venue became unavailable");
  });

  it("rejects a cancellation reason under 10 characters", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createDraft(t);
    const r = await request(app)
      .post(`/api/conferences/${id}/cancel`)
      .set("Authorization", `Bearer ${t}`)
      .send({ reason: "short" });
    expect(r.status).toBe(400);
  });

  it("rejects cancelling an already-cancelled conference", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createDraft(t);
    await request(app)
      .post(`/api/conferences/${id}/cancel`)
      .set("Authorization", `Bearer ${t}`)
      .send({ reason: "First cancellation reason" });
    const second = await request(app)
      .post(`/api/conferences/${id}/cancel`)
      .set("Authorization", `Bearer ${t}`)
      .send({ reason: "Second cancellation reason" });
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/CANNOT_CANCEL|Draft or Published/i);
  });

  it("notifies every registrant when a published conference with attendees is cancelled", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createPublished(
      t,
      { startsAt: "2099-01-01T09:00:00", endsAt: "2099-01-02T17:00:00" },
      "2099-01-01T09:00:00",
      "2099-01-01T09:45:00",
    );
    const at = await login("attendee@gatherly.dev");
    const reg = await request(app)
      .post(`/api/conferences/${id}/register`)
      .set("Authorization", `Bearer ${at}`);
    expect(reg.status).toBe(201);
    const cancel = await request(app)
      .post(`/api/conferences/${id}/cancel`)
      .set("Authorization", `Bearer ${t}`)
      .send({ reason: "Speaker had to withdraw" });
    expect(cancel.status).toBe(200);
    const notifications = queryNotifications(id);
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe("CONFERENCE_CANCELLED");
  });

  it("rejects completing a published conference before its end date", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createPublished(
      t,
      { startsAt: "2099-01-01T09:00:00", endsAt: "2099-01-02T17:00:00" },
      "2099-01-01T09:00:00",
      "2099-01-01T09:45:00",
    );
    const r = await request(app)
      .post(`/api/conferences/${id}/complete`)
      .set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(409);
    expect(r.body.message).toMatch(/end date/i);
  });

  it("completes a published conference whose end date has passed", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createPublished(t, {
      startsAt: "2020-01-01T09:00:00",
      endsAt: "2020-01-02T17:00:00",
    });
    const r = await request(app)
      .post(`/api/conferences/${id}/complete`)
      .set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("COMPLETED");
  });

  it("rejects completing a draft conference", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createDraft(t);
    const r = await request(app)
      .post(`/api/conferences/${id}/complete`)
      .set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(409);
  });

  it("rejects completing an already-cancelled conference", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createDraft(t);
    await request(app)
      .post(`/api/conferences/${id}/cancel`)
      .set("Authorization", `Bearer ${t}`)
      .send({ reason: "Not moving forward with this one" });
    const r = await request(app)
      .post(`/api/conferences/${id}/complete`)
      .set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(409);
  });

  it("rejects registering for a cancelled conference", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createDraft(t);
    await request(app)
      .post(`/api/conferences/${id}/cancel`)
      .set("Authorization", `Bearer ${t}`)
      .send({ reason: "Cancelled before it was published" });
    const at = await login("attendee@gatherly.dev");
    const r = await request(app)
      .post(`/api/conferences/${id}/register`)
      .set("Authorization", `Bearer ${at}`);
    expect(r.status).toBe(409);
    expect(r.body.message).toMatch(/no longer accepting registrations/i);
  });

  it("rejects registering for a completed conference", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createPublished(t, {
      startsAt: "2020-01-01T09:00:00",
      endsAt: "2020-01-02T17:00:00",
    });
    await request(app)
      .post(`/api/conferences/${id}/complete`)
      .set("Authorization", `Bearer ${t}`);
    const at = await login("attendee@gatherly.dev");
    const r = await request(app)
      .post(`/api/conferences/${id}/register`)
      .set("Authorization", `Bearer ${at}`);
    expect(r.status).toBe(409);
  });

  it("still allows registering for a published conference that hasn't been cancelled/completed", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createPublished(
      t,
      { startsAt: "2099-01-01T09:00:00", endsAt: "2099-01-02T17:00:00" },
      "2099-01-01T09:00:00",
      "2099-01-01T09:45:00",
    );
    const at = await login("attendee@gatherly.dev");
    const r = await request(app)
      .post(`/api/conferences/${id}/register`)
      .set("Authorization", `Bearer ${at}`);
    expect(r.status).toBe(201);
  });

  it("shows history entries after cancel and after complete", async () => {
    const t = await login("organizer@gatherly.dev");
    const cancelledId = await createDraft(t);
    await request(app)
      .post(`/api/conferences/${cancelledId}/cancel`)
      .set("Authorization", `Bearer ${t}`)
      .send({ reason: "Testing the history endpoint" });
    const cancelHistory = await request(app)
      .get(`/api/conferences/${cancelledId}/history`)
      .set("Authorization", `Bearer ${t}`);
    expect(cancelHistory.status).toBe(200);
    expect(cancelHistory.body.some((h: any) => h.action === "CANCELLED")).toBe(
      true,
    );

    const completedId = await createPublished(t, {
      startsAt: "2020-01-01T09:00:00",
      endsAt: "2020-01-02T17:00:00",
    });
    await request(app)
      .post(`/api/conferences/${completedId}/complete`)
      .set("Authorization", `Bearer ${t}`);
    const completeHistory = await request(app)
      .get(`/api/conferences/${completedId}/history`)
      .set("Authorization", `Bearer ${t}`);
    expect(completeHistory.status).toBe(200);
    expect(
      completeHistory.body.some((h: any) => h.action === "COMPLETED"),
    ).toBe(true);
  });

  it("blocks an attendee from cancelling or completing a conference", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createDraft(t);
    const at = await login("attendee@gatherly.dev");
    const cancel = await request(app)
      .post(`/api/conferences/${id}/cancel`)
      .set("Authorization", `Bearer ${at}`)
      .send({ reason: "I am not allowed to do this" });
    expect(cancel.status).toBe(403);
    const complete = await request(app)
      .post(`/api/conferences/${id}/complete`)
      .set("Authorization", `Bearer ${at}`);
    expect(complete.status).toBe(403);
  });

  it("lets an Admin cancel a conference they don't own", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createDraft(t);
    const admin = await login("admin@gatherly.dev");
    const r = await request(app)
      .post(`/api/conferences/${id}/cancel`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ reason: "Admin override cancellation" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("CANCELLED");
  });

  it("rejects a non-owning organizer from cancelling another organizer's conference", async () => {
    const t = await login("organizer@gatherly.dev");
    const id = await createDraft(t);
    // No second organizer account exists via the public API in this seeded
    // dataset, so we exercise the store's ownership guard directly with a
    // requester who has the ORGANIZER role but a different id.
    expect(() =>
      store.cancelConference(
        id,
        { id: 999, role: "ORGANIZER" },
        "A perfectly valid reason",
      ),
    ).toThrow("FORBIDDEN");
  });
});
