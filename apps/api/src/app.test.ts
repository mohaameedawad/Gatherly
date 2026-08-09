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
