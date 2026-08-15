import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./app.js";
import { store } from "./db/store.js";

describe("US-1.3: Reset or change a password", () => {
  // AC1: A user can request a password reset link via email.
  describe("AC1: Request password reset link", () => {
    it("forgot-password for an existing email → 200 generic message, token round-trips to a working reset", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Alice Forgot",
        email: "alice.forgot@example.com",
        password: "SecurePass123!",
      });
      expect(registerRes.status).toBe(201);
      const userId = registerRes.body.user.id;

      const forgotRes = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "alice.forgot@example.com" });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.message).toBe(
        "If an account exists for this email, a password reset link has been sent.",
      );

      // Mailer only console.logs the token; fetch a usable token directly
      // from the store the same way the handler would have generated one.
      const token = store.createResetToken(userId);
      const resetRes = await request(app)
        .post("/api/auth/reset-password")
        .send({ token, password: "NewSecurePass456!" });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.reset).toBe(true);
    });

    it("forgot-password with invalid email format → 400", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Enter a valid email address");
      expect(res.body.issues).toBeDefined();
    });

    it("forgot-password with missing email → 400", async () => {
      const res = await request(app).post("/api/auth/forgot-password").send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Enter a valid email address");
    });
  });

  // AC2: A reset link lets the user set a new password, is single-use, and rejects garbage tokens.
  describe("AC2: Reset link sets new password and is single-use", () => {
    it("reset-password with a valid token → 200; reusing the SAME token → 400 INVALID_TOKEN", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Bob Reuse",
        email: "bob.reuse@example.com",
        password: "SecurePass123!",
      });
      const userId = registerRes.body.user.id;

      const token = store.createResetToken(userId);
      const firstRes = await request(app)
        .post("/api/auth/reset-password")
        .send({ token, password: "BrandNewPass789!" });
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.message).toBe(
        "Your password has been reset. Please sign in again.",
      );

      const secondRes = await request(app)
        .post("/api/auth/reset-password")
        .send({ token, password: "AnotherPass000!" });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.code).toBe("INVALID_TOKEN");
      expect(secondRes.body.message).toBe(
        "This password reset link is invalid or has expired",
      );
    });

    it("garbage/nonexistent token → 400 INVALID_TOKEN", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          token: "definitely-not-a-real-token-xyz",
          password: "SomePass123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_TOKEN");
      expect(res.body.message).toBe(
        "This password reset link is invalid or has expired",
      );
    });

    it("password actually changes: new password logs in, old password is rejected", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Carol Change",
        email: "carol.change@example.com",
        password: "OldPassword123!",
      });
      const userId = registerRes.body.user.id;

      const token = store.createResetToken(userId);
      const resetRes = await request(app)
        .post("/api/auth/reset-password")
        .send({ token, password: "NewPassword456!" });
      expect(resetRes.status).toBe(200);

      const newLoginRes = await request(app).post("/api/auth/login").send({
        email: "carol.change@example.com",
        password: "NewPassword456!",
      });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.accessToken).toBeTruthy();

      const oldLoginRes = await request(app).post("/api/auth/login").send({
        email: "carol.change@example.com",
        password: "OldPassword123!",
      });
      expect(oldLoginRes.status).toBe(401);
      expect(oldLoginRes.body.code).toBe("INVALID_CREDENTIALS");
    });
  });

  // AC3: Session revocation — a password reset invalidates every previously issued token.
  describe("AC3: Password reset revokes prior sessions", () => {
    it("resetting a password invalidates the OLD accessToken and refreshToken (401 on /me and /refresh)", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Dana Revoke",
        email: "dana.revoke@example.com",
        password: "OriginalPass123!",
      });
      const userId = registerRes.body.user.id;

      // Log in to obtain a fresh, independent session (separate from register's tokens).
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "dana.revoke@example.com",
        password: "OriginalPass123!",
      });
      const oldAccessToken = loginRes.body.accessToken;
      const oldRefreshToken = loginRes.body.refreshToken;

      // Sanity check: old tokens work before the reset.
      const preMeRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${oldAccessToken}`);
      expect(preMeRes.status).toBe(200);

      // Reset the password via the forgot/reset flow.
      const token = store.createResetToken(userId);
      const resetRes = await request(app)
        .post("/api/auth/reset-password")
        .send({ token, password: "BrandNewPass789!" });
      expect(resetRes.status).toBe(200);

      // OLD access token must now be rejected.
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${oldAccessToken}`);
      expect(meRes.status).toBe(401);
      expect(meRes.body.code).toBe("INVALID_TOKEN");

      // OLD refresh token must now be rejected.
      const refreshRes = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: oldRefreshToken });
      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.code).toBe("INVALID_REFRESH_TOKEN");
    });
  });

  // AC4: A signed-in user can change their password directly.
  describe("AC4: Signed-in user changes password", () => {
    it("change-password with correct currentPassword → 200, new accessToken works immediately on /me", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Eve Change",
        email: "eve.change@example.com",
        password: "OriginalPass123!",
      });
      const accessToken = registerRes.body.accessToken;

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: "OriginalPass123!",
          newPassword: "UpdatedPass456!",
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.message).toBe("Password changed");
      expect(changeRes.body.accessToken).toBeTruthy();
      expect(changeRes.body.refreshToken).toBeTruthy();
      expect(changeRes.body.user).toBeDefined();
      expect(changeRes.body.user.passwordHash).toBeUndefined();

      // The freshly-issued access token (post-bump) must work immediately.
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${changeRes.body.accessToken}`);
      expect(meRes.status).toBe(200);
    });

    it("change-password with wrong currentPassword → 401 INVALID_CREDENTIALS, password unchanged", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Frank Wrong",
        email: "frank.wrong@example.com",
        password: "OriginalPass123!",
      });
      const accessToken = registerRes.body.accessToken;

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: "WrongPassword!!",
          newPassword: "UpdatedPass456!",
        });

      expect(changeRes.status).toBe(401);
      expect(changeRes.body.code).toBe("INVALID_CREDENTIALS");
      expect(changeRes.body.message).toBe("Current password is incorrect");

      // Confirm the password was NOT changed.
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "frank.wrong@example.com",
        password: "OriginalPass123!",
      });
      expect(loginRes.status).toBe(200);
    });

    it("change-password revokes OLD tokens but the freshly-returned pair keeps working", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Grace Revoke",
        email: "grace.revoke@example.com",
        password: "OriginalPass123!",
      });
      const userId = registerRes.body.user.id;

      // Independent login session, obtained before the change.
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "grace.revoke@example.com",
        password: "OriginalPass123!",
      });
      const oldAccessToken = loginRes.body.accessToken;
      const oldRefreshToken = loginRes.body.refreshToken;

      // Change password using the register-issued token.
      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${registerRes.body.accessToken}`)
        .send({
          currentPassword: "OriginalPass123!",
          newPassword: "UpdatedPass456!",
        });
      expect(changeRes.status).toBe(200);
      const newAccessToken = changeRes.body.accessToken;
      const newRefreshToken = changeRes.body.refreshToken;

      // OLD login-session tokens must now be rejected.
      const oldMeRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${oldAccessToken}`);
      expect(oldMeRes.status).toBe(401);
      expect(oldMeRes.body.code).toBe("INVALID_TOKEN");

      const oldRefreshRes = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: oldRefreshToken });
      expect(oldRefreshRes.status).toBe(401);
      expect(oldRefreshRes.body.code).toBe("INVALID_REFRESH_TOKEN");

      // NEW tokens returned by change-password itself still work.
      const newMeRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${newAccessToken}`);
      expect(newMeRes.status).toBe(200);
      expect(newMeRes.body.id).toBe(userId);

      const newRefreshRes = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: newRefreshToken });
      expect(newRefreshRes.status).toBe(200);
      expect(newRefreshRes.body.accessToken).toBeTruthy();
    });

    it("change-password without a Bearer token → 401", async () => {
      const res = await request(app)
        .post("/api/auth/change-password")
        .send({
          currentPassword: "whatever123",
          newPassword: "NewPassword456!",
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("AUTH_REQUIRED");
    });
  });

  // Validation edge cases across all three endpoints.
  describe("Validation edge cases", () => {
    it("reset-password with missing fields → 400 with issues", async () => {
      const res = await request(app).post("/api/auth/reset-password").send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "A reset token and a new password of at least 8 characters are required",
      );
      expect(res.body.issues).toBeDefined();
    });

    it("reset-password with a password under 8 chars → 400", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({ token: "some-token", password: "short" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "A reset token and a new password of at least 8 characters are required",
      );
    });

    it("change-password with missing fields → 400 with issues", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Henry Empty",
        email: "henry.empty@example.com",
        password: "SecurePass123!",
      });
      const accessToken = registerRes.body.accessToken;

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Current password and a new password of at least 8 characters are required",
      );
      expect(res.body.issues).toBeDefined();
    });

    it("change-password with a new password under 8 chars → 400", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Ivy Short",
        email: "ivy.short@example.com",
        password: "SecurePass123!",
      });
      const accessToken = registerRes.body.accessToken;

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ currentPassword: "SecurePass123!", newPassword: "short" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Current password and a new password of at least 8 characters are required",
      );
    });
  });

  // Non-enumeration: forgot-password must not reveal account existence.
  describe("Non-enumeration: forgot-password reveals nothing about account state", () => {
    it("unverified, verified/seeded, and nonexistent emails all return identical status+body", async () => {
      await request(app).post("/api/auth/register").send({
        name: "Jack Unverified",
        email: "jack.unverified@example.com",
        password: "SecurePass123!",
      });

      const unverifiedRes = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "jack.unverified@example.com" });

      const verifiedRes = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "attendee@gatherly.dev" });

      const nonexistentRes = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "i.dont.exist.anywhere@example.com" });

      expect(unverifiedRes.status).toBe(200);
      expect(verifiedRes.status).toBe(200);
      expect(nonexistentRes.status).toBe(200);

      expect(unverifiedRes.body).toEqual(verifiedRes.body);
      expect(verifiedRes.body).toEqual(nonexistentRes.body);
    });
  });

  // Regression: existing US-1.1 flows remain unaffected by the token_version migration.
  describe("Regression: existing login/me flows unaffected", () => {
    it("seeded demo accounts still log in fine and /me works (token_version defaults to 0)", async () => {
      const roles = ["admin", "organizer", "speaker", "attendee"] as const;
      for (const role of roles) {
        const loginRes = await request(app)
          .post("/api/auth/login")
          .send({ email: `${role}@gatherly.dev`, password: "Workshop123!" });
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.accessToken).toBeTruthy();

        const meRes = await request(app)
          .get("/api/auth/me")
          .set("Authorization", `Bearer ${loginRes.body.accessToken}`);
        expect(meRes.status).toBe(200);
      }
    });
  });
});
