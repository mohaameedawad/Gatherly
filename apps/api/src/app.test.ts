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
      .send(draft({ startsAt: "2027-05-02T09:00:00", endsAt: "2027-05-01T09:00:00" }));
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
