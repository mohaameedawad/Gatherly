import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./app.js";
const login = async (role: "attendee" | "organizer") =>
  (
    await request(app)
      .post("/api/auth/login")
      .send({ email: `${role}@gatherly.dev`, password: "Workshop123!" })
  ).body.accessToken;
describe("conference security and workflow", () => {
  it("rejects anonymous access", async () =>
    expect((await request(app).get("/api/conferences")).status).toBe(401));
  it("lets an attendee read and register", async () => {
    const t = await login("attendee");
    expect(
      (
        await request(app)
          .get("/api/conferences/1")
          .set("Authorization", `Bearer ${t}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post("/api/conferences/2/register")
          .set("Authorization", `Bearer ${t}`)
      ).status,
    ).toBe(201);
  });
  it("blocks attendee session creation", async () => {
    const t = await login("attendee");
    expect(
      (
        await request(app)
          .post("/api/conferences/1/sessions")
          .set("Authorization", `Bearer ${t}`)
          .send({})
      ).status,
    ).toBe(403);
  });
  it("allows organizer to see drafts", async () => {
    const t = await login("organizer");
    const r = await request(app)
      .get("/api/conferences")
      .set("Authorization", `Bearer ${t}`);
    expect(r.body.some((x: any) => x.status === "DRAFT")).toBe(true);
  });
});
describe("US-2.1 create a conference draft", () => {
  const draft = (over: Partial<Record<string, unknown>> = {}) => ({
    title: "New Draft Conference",
    summary: "A brand new gathering for the community.",
    venue: "Test Hall",
    city: "Cairo",
    startsAt: "2027-05-01T09:00:00",
    endsAt: "2027-05-02T17:00:00",
    timezone: "Africa/Cairo",
    capacity: 50,
    ...over,
  });
  it("lets an organizer create a draft", async () => {
    const t = await login("organizer");
    const r = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(draft());
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("DRAFT");
    expect(r.body.title).toBe("New Draft Conference");
  });
  it("blocks an attendee from creating a conference", async () => {
    const t = await login("attendee");
    const r = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(draft());
    expect(r.status).toBe(403);
  });
  it("rejects an end date before the start date", async () => {
    const t = await login("organizer");
    const r = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(
        draft({
          startsAt: "2027-05-02T09:00:00",
          endsAt: "2027-05-01T09:00:00",
        }),
      );
    expect(r.status).toBe(400);
  });
  it("rejects a non-positive capacity", async () => {
    const t = await login("organizer");
    const r = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(draft({ capacity: 0 }));
    expect(r.status).toBe(400);
  });
  it("does not show the new draft to an attendee", async () => {
    const ot = await login("organizer");
    const created = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${ot}`)
      .send(draft({ title: "Attendee Should Not See This" }));
    const at = await login("attendee");
    const list = await request(app)
      .get("/api/conferences")
      .set("Authorization", `Bearer ${at}`);
    expect(list.body.some((x: any) => x.id === created.body.id)).toBe(false);
  });
  it("lets the owning organizer edit their draft", async () => {
    const t = await login("organizer");
    const created = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(draft());
    const updated = await request(app)
      .patch(`/api/conferences/${created.body.id}`)
      .set("Authorization", `Bearer ${t}`)
      .send(draft({ title: "Updated Title" }));
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe("Updated Title");
  });
});
describe("US-2.2 configure rooms and tracks", () => {
  const draft = (over: Partial<Record<string, unknown>> = {}) => ({
    title: "Rooms & Tracks Conference",
    summary: "A brand new gathering for the community.",
    venue: "Test Hall",
    city: "Cairo",
    startsAt: "2027-06-01T09:00:00",
    endsAt: "2027-06-02T17:00:00",
    timezone: "Africa/Cairo",
    capacity: 50,
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
    ).body.id;
  it("blocks attendee from listing or managing rooms", async () => {
    const ot = await login("organizer");
    const id = await createDraft(ot);
    const at = await login("attendee");
    expect(
      (
        await request(app)
          .get(`/api/conferences/${id}/rooms`)
          .set("Authorization", `Bearer ${at}`)
      ).status,
    ).toBe(403);
  });
  it("lets the owning organizer add, edit, and remove a room", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    const created = await request(app)
      .post(`/api/conferences/${id}/rooms`)
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Hall A", capacity: 30 });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Hall A");
    const updated = await request(app)
      .patch(`/api/conferences/${id}/rooms/${created.body.id}`)
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Hall A2", capacity: 40 });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Hall A2");
    const deleted = await request(app)
      .delete(`/api/conferences/${id}/rooms/${created.body.id}`)
      .set("Authorization", `Bearer ${t}`);
    expect(deleted.status).toBe(204);
    const list = await request(app)
      .get(`/api/conferences/${id}/rooms`)
      .set("Authorization", `Bearer ${t}`);
    expect(list.body).toHaveLength(0);
  });
  it("rejects a room capacity above the conference capacity", async () => {
    const t = await login("organizer");
    const id = await createDraft(t, { capacity: 20 });
    const r = await request(app)
      .post(`/api/conferences/${id}/rooms`)
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Hall A", capacity: 21 });
    expect(r.status).toBe(400);
  });
  it("rejects a duplicate room name within a conference", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    await request(app)
      .post(`/api/conferences/${id}/rooms`)
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Hall A", capacity: 10 });
    const dup = await request(app)
      .post(`/api/conferences/${id}/rooms`)
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "hall a", capacity: 10 });
    expect(dup.status).toBe(409);
  });
  it("prevents deleting a room that is used by a session", async () => {
    const t = await login("organizer");
    const r = await request(app)
      .post("/api/conferences/1/rooms")
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Main Stage", capacity: 400 });
    expect(r.status).toBe(201);
    const del = await request(app)
      .delete(`/api/conferences/1/rooms/${r.body.id}`)
      .set("Authorization", `Bearer ${t}`);
    expect(del.status).toBe(409);
  });
  it("lets the owning organizer add, edit, and remove a track", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    const created = await request(app)
      .post(`/api/conferences/${id}/tracks`)
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Track A" });
    expect(created.status).toBe(201);
    const updated = await request(app)
      .patch(`/api/conferences/${id}/tracks/${created.body.id}`)
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Track A2" });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Track A2");
    const deleted = await request(app)
      .delete(`/api/conferences/${id}/tracks/${created.body.id}`)
      .set("Authorization", `Bearer ${t}`);
    expect(deleted.status).toBe(204);
  });
  it("rejects a duplicate track name within a conference", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    await request(app)
      .post(`/api/conferences/${id}/tracks`)
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Track A" });
    const dup = await request(app)
      .post(`/api/conferences/${id}/tracks`)
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "track a" });
    expect(dup.status).toBe(409);
  });
  it("prevents deleting a track that is used by a session", async () => {
    const t = await login("organizer");
    const r = await request(app)
      .post("/api/conferences/1/tracks")
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "AI Engineering" });
    expect(r.status).toBe(201);
    const del = await request(app)
      .delete(`/api/conferences/1/tracks/${r.body.id}`)
      .set("Authorization", `Bearer ${t}`);
    expect(del.status).toBe(409);
  });
});
describe("US-2.3 preview and publish a conference", () => {
  const draft = (over: Partial<Record<string, unknown>> = {}) => ({
    title: "Publish Ready Conference",
    summary: "A brand new gathering for the community.",
    venue: "Test Hall",
    city: "Cairo",
    startsAt: "2027-07-01T09:00:00",
    endsAt: "2027-07-02T17:00:00",
    timezone: "Africa/Cairo",
    capacity: 50,
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
    ).body.id;
  const addRoom = async (t: string, id: number) =>
    (
      await request(app)
        .post(`/api/conferences/${id}/rooms`)
        .set("Authorization", `Bearer ${t}`)
        .send({ name: "Main Hall", capacity: 50 })
    ).body;
  const addTrack = async (t: string, id: number) =>
    (
      await request(app)
        .post(`/api/conferences/${id}/tracks`)
        .set("Authorization", `Bearer ${t}`)
        .send({ name: "General" })
    ).body;
  const addSession = async (
    t: string,
    id: number,
    room: string,
    track: string,
  ) =>
    request(app)
      .post(`/api/conferences/${id}/sessions`)
      .set("Authorization", `Bearer ${t}`)
      .send({
        title: "A Great Session Title",
        abstract:
          "A sufficiently long abstract describing the session in detail.",
        track,
        room,
        startsAt: "2027-07-01T10:00:00",
        endsAt: "2027-07-01T10:45:00",
        capacity: 30,
        speakerId: 3,
      });
  it("lets the owning organizer preview their draft", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    const r = await request(app)
      .get(`/api/conferences/${id}`)
      .set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("DRAFT");
  });
  it("keeps a draft private from an attendee", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    const at = await login("attendee");
    const r = await request(app)
      .get(`/api/conferences/${id}`)
      .set("Authorization", `Bearer ${at}`);
    expect(r.status).toBe(403);
  });
  it("rejects publishing without a room", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    const r = await request(app)
      .post(`/api/conferences/${id}/publish`)
      .set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(400);
  });
  it("rejects publishing without a session", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    await addRoom(t, id);
    const r = await request(app)
      .post(`/api/conferences/${id}/publish`)
      .set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(400);
  });
  it("publishes a draft once it has a room and a session, and it becomes publicly discoverable", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    const room = await addRoom(t, id);
    const track = await addTrack(t, id);
    const session = await addSession(t, id, room.name, track.name);
    expect(session.status).toBe(201);
    const published = await request(app)
      .post(`/api/conferences/${id}/publish`)
      .set("Authorization", `Bearer ${t}`);
    expect(published.status).toBe(200);
    expect(published.body.status).toBe("PUBLISHED");
    const at = await login("attendee");
    const list = await request(app)
      .get("/api/conferences")
      .set("Authorization", `Bearer ${at}`);
    expect(list.body.some((x: any) => x.id === id)).toBe(true);
  });
  it("publishing an already-published conference is idempotent", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    const room = await addRoom(t, id);
    const track = await addTrack(t, id);
    await addSession(t, id, room.name, track.name);
    const first = await request(app)
      .post(`/api/conferences/${id}/publish`)
      .set("Authorization", `Bearer ${t}`);
    expect(first.status).toBe(200);
    const second = await request(app)
      .post(`/api/conferences/${id}/publish`)
      .set("Authorization", `Bearer ${t}`);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe("PUBLISHED");
  });
  it("blocks an attendee from publishing", async () => {
    const t = await login("organizer");
    const id = await createDraft(t);
    const at = await login("attendee");
    const r = await request(app)
      .post(`/api/conferences/${id}/publish`)
      .set("Authorization", `Bearer ${at}`);
    expect(r.status).toBe(403);
  });
});
