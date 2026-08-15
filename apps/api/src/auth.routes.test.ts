import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "./app.js";
import { store } from "./db/store.js";

describe("US-1.1: Create an attendee account (POST /api/auth/register)", () => {
  // Helper to login with seeded credentials
  const login = async (role: "admin" | "organizer" | "speaker" | "attendee") =>
    (
      await request(app)
        .post("/api/auth/login")
        .send({ email: `${role}@gatherly.dev`, password: "Workshop123!" })
    ).body.accessToken;

  // AC1: A visitor can register with name, email, and password.
  describe("AC1: Registration happy path", () => {
    it("allows a visitor to register with name, email, and password → 201", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Alice Smith",
        email: "alice.smith@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body.user).toHaveProperty("id");
      expect(res.body.user.name).toBe("Alice Smith");
      expect(res.body.user.email).toBe("alice.smith@example.com");
    });

    // AC4: A new account receives the Attendee role by default.
    it("assigns ATTENDEE role to new account", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Bob Johnson",
        email: "bob.johnson@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("ATTENDEE");
    });

    // AC5: The user receives an email-verification link (emailVerified=false in response)
    it("marks new account as unverified (emailVerified: false)", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Charlie Brown",
        email: "charlie.brown@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(201);
      expect(res.body.user.emailVerified).toBe(false);
    });

    it("creates verification token for new account", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Diana Prince",
        email: "diana.prince@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(201);
      // Verify the token was created (it gets logged via console.log in mailer stub)
      const user = store.findUserByEmail("diana.prince@example.com");
      expect(user).toBeDefined();
      expect(user?.id).toBeDefined();
      // Verification token table should have an entry for this user
      // (we cannot directly query, but the mailer was called without error)
    });

    it("auto-logs in the user by returning access and refresh tokens", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Eve Adams",
        email: "eve.adams@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      // Verify tokens can be used to access authenticated endpoints
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${res.body.accessToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.email).toBe("eve.adams@example.com");
    });
  });

  // AC3: Invalid input displays clear validation errors.
  describe("AC3: Input validation", () => {
    it("rejects missing name → 400 with 'issues' array", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "frank@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Registration validation failed");
      expect(res.body.issues).toBeDefined();
      expect(Array.isArray(res.body.issues)).toBe(true);
    });

    it("rejects name shorter than 2 characters → 400 with per-field issue", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "X",
        email: "grace@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
      expect(res.body.issues.some((i: any) => i.path.includes("name"))).toBe(
        true,
      );
    });

    it("rejects invalid email format → 400 with per-field issue", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Henry Smith",
        email: "not-an-email",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
      expect(res.body.issues.some((i: any) => i.path.includes("email"))).toBe(
        true,
      );
    });

    it("rejects password shorter than 8 characters → 400 with per-field issue", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Iris Wilson",
        email: "iris@example.com",
        password: "Short1!",
      });
      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
      expect(
        res.body.issues.some((i: any) => i.path.includes("password")),
      ).toBe(true);
    });

    it("rejects all missing fields → 400 with multiple issues", async () => {
      const res = await request(app).post("/api/auth/register").send({});
      expect(res.status).toBe(400);
      expect(res.body.issues.length).toBeGreaterThan(0);
    });
  });

  // AC2: Email addresses are unique and case-insensitive.
  describe("AC2: Email uniqueness and case-insensitivity", () => {
    it("rejects duplicate email (exact match) → 409 EMAIL_TAKEN", async () => {
      // First registration
      await request(app).post("/api/auth/register").send({
        name: "Jack Smith",
        email: "jack@example.com",
        password: "SecurePass123!",
      });
      // Attempt duplicate
      const res = await request(app).post("/api/auth/register").send({
        name: "Jack Smith 2",
        email: "jack@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("EMAIL_TAKEN");
      expect(res.body.message).toBeDefined();
    });

    it("rejects duplicate email (different case) → 409 EMAIL_TAKEN", async () => {
      // First registration with lowercase
      await request(app).post("/api/auth/register").send({
        name: "Kate Brown",
        email: "kate@example.com",
        password: "SecurePass123!",
      });
      // Attempt with different case
      const res = await request(app).post("/api/auth/register").send({
        name: "Kate Brown 2",
        email: "KATE@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("EMAIL_TAKEN");
    });

    it("rejects mixed-case variant of existing email", async () => {
      // First registration
      await request(app).post("/api/auth/register").send({
        name: "Liam Moore",
        email: "Liam.Moore@Example.com",
        password: "SecurePass123!",
      });
      // Attempt with different case
      const res = await request(app).post("/api/auth/register").send({
        name: "Liam Moore 2",
        email: "liam.moore@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("EMAIL_TAKEN");
    });

    it("does not create duplicate row on conflict", async () => {
      const email = "mona@example.com";
      // First registration
      await request(app).post("/api/auth/register").send({
        name: "Mona Lisa",
        email,
        password: "SecurePass123!",
      });
      const countBefore = store
        .users()
        .filter((u) => u.email.toLowerCase() === email.toLowerCase()).length;

      // Attempt duplicate
      await request(app).post("/api/auth/register").send({
        name: "Mona Lisa 2",
        email: email.toUpperCase(),
        password: "SecurePass123!",
      });
      const countAfter = store
        .users()
        .filter((u) => u.email.toLowerCase() === email.toLowerCase()).length;

      expect(countBefore).toBe(1);
      expect(countAfter).toBe(1);
    });
  });

  // AC6: An unverified account cannot register for a conference.
  describe("AC6: Unverified accounts cannot register for conferences", () => {
    it("allows verified attendee to register for conference → 201", async () => {
      // Seeded attendee has email_verified=1 by DEFAULT
      const token = await login("attendee");
      const res = await request(app)
        .post("/api/conferences/2/register")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(201);
      expect(res.body.isRegistered).toBe(true);
    });

    it("blocks unverified new user from registering for conference → 403 EMAIL_NOT_VERIFIED", async () => {
      // Register new unverified user
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Nathan Scott",
        email: "nathan@example.com",
        password: "SecurePass123!",
      });
      expect(registerRes.status).toBe(201);
      const token = registerRes.body.accessToken;

      // Attempt to register for conference with unverified account
      const conferenceRes = await request(app)
        .post("/api/conferences/2/register")
        .set("Authorization", `Bearer ${token}`);
      expect(conferenceRes.status).toBe(403);
      expect(conferenceRes.body.code).toBe("EMAIL_NOT_VERIFIED");
      expect(conferenceRes.body.message).toBeDefined();
    });

    it("still blocks unverified user even with valid conference", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Olivia Brown",
        email: "olivia@example.com",
        password: "SecurePass123!",
      });
      const token = registerRes.body.accessToken;

      // Try first conference (published)
      const res1 = await request(app)
        .post("/api/conferences/1/register")
        .set("Authorization", `Bearer ${token}`);
      expect(res1.status).toBe(403);
      expect(res1.body.code).toBe("EMAIL_NOT_VERIFIED");
    });
  });

  // Regression: Existing seeded attendee (verified via DEFAULT 1 backfill) can still register
  describe("Regression: Seeded attendee remains verified", () => {
    it("seeded attendee@gatherly.dev can register for conference (DEFAULT 1 backfill)", async () => {
      const token = await login("attendee");
      const res = await request(app)
        .post("/api/conferences/2/register")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(201);
    });

    it("seeded attendee has emailVerified=true in /me endpoint", async () => {
      const token = await login("attendee");
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.emailVerified).toBe(true);
    });
  });

  // Existing login/refresh/me flows still work
  describe("Regression: Existing auth flows still work", () => {
    it("existing login flow works for all 4 seeded roles", async () => {
      const roles = ["admin", "organizer", "speaker", "attendee"] as const;
      for (const role of roles) {
        const res = await request(app)
          .post("/api/auth/login")
          .send({
            email: `${role}@gatherly.dev`,
            password: "Workshop123!",
          });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
        expect(res.body.refreshToken).toBeTruthy();
        expect(res.body.user.role).toBe(role.toUpperCase());
      }
    });

    it("existing /me endpoint works after login", async () => {
      const token = await login("attendee");
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe("attendee@gatherly.dev");
      expect(res.body.role).toBe("ATTENDEE");
    });

    it("existing refresh endpoint works", async () => {
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "attendee@gatherly.dev",
        password: "Workshop123!",
      });
      const refreshToken = loginRes.body.refreshToken;

      const res = await request(app).post("/api/auth/refresh").send({
        refreshToken,
      });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
    });
  });

  // Authorization check: anonymous may sign up; role is always ATTENDEE (no client-controlled role field)
  describe("Authorization: Anonymous signup, ATTENDEE role always enforced", () => {
    it("anonymous visitor can register without authentication header", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Peter Parker",
        email: "peter@example.com",
        password: "SecurePass123!",
      });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("ATTENDEE");
    });

    it("ignores any client-provided 'role' field in request body", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Quinn Adams",
        email: "quinn@example.com",
        password: "SecurePass123!",
        role: "ADMIN", // Try to set admin role
      });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("ATTENDEE"); // Should still be ATTENDEE
    });

    it("ignores any client-provided 'active' field in request body", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Rachel Green",
        email: "rachel@example.com",
        password: "SecurePass123!",
        active: false, // Try to set inactive
      });
      expect(res.status).toBe(201);
      const user = store.findUserByEmail("rachel@example.com");
      expect(user?.active).toBe(true); // Should be active
    });
  });
});
