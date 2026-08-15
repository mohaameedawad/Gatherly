import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { store } from "../db/store.js";
import { tokens } from "../auth/tokens.js";
import { authenticate } from "../middleware/auth.js";
import { sendVerificationEmail } from "../notifications/mailer.js";
export const authRouter = Router();
const login = z.object({ email: z.email(), password: z.string().min(8) });
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
const verifyEmailSchema = z.object({ token: z.string().min(1) });
const resendVerificationSchema = z.object({ email: z.email() });
authRouter.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      message: "Registration validation failed",
      issues: parsed.error.issues,
    });
  if (store.findUserByEmail(parsed.data.email))
    return res.status(409).json({
      message: "An account with this email already exists",
      code: "EMAIL_TAKEN",
    });
  const hash = bcrypt.hashSync(parsed.data.password, 10);
  const u = store.createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: hash,
  });
  const token = store.createVerificationToken(u.id);
  sendVerificationEmail(u, token);
  const { passwordHash, ...user } = u;
  res.status(201).json({ ...tokens.issue(u), user });
});
authRouter.post("/login", (req, res) => {
  const parsed = login.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      message: "Enter a valid email and password",
      issues: parsed.error.issues,
    });
  const u = store.findUserByEmail(parsed.data.email);
  if (
    !u ||
    !u.active ||
    !bcrypt.compareSync(parsed.data.password, u.passwordHash)
  )
    return res.status(401).json({
      message: "Email or password is incorrect",
      code: "INVALID_CREDENTIALS",
    });
  const { passwordHash, ...user } = u;
  res.json({ ...tokens.issue(u), user });
});
authRouter.post("/refresh", (req, res) => {
  try {
    const p = tokens.verifyRefresh(req.body.refreshToken);
    const u = store.findUserById(Number(p.sub));
    if (!u?.active) throw Error();
    res.json(tokens.issue(u));
  } catch {
    res.status(401).json({
      message: "Refresh token is invalid",
      code: "INVALID_REFRESH_TOKEN",
    });
  }
});
authRouter.post("/verify-email", (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      message: "Verification token is required",
      issues: parsed.error.issues,
    });
  const result = store.consumeVerificationToken(parsed.data.token);
  if (result.status !== "OK")
    return res.status(400).json({
      message: "This verification link is invalid or has expired",
      code: "INVALID_TOKEN",
    });
  res.json({
    message: "Email verified",
    verified: true,
    userId: result.userId,
  });
});
authRouter.post("/resend-verification", (req, res) => {
  const parsed = resendVerificationSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      message: "Enter a valid email address",
      issues: parsed.error.issues,
    });
  const genericResponse = {
    message:
      "If an account exists for this email and needs verification, a new link has been sent.",
  };
  const u = store.findUserByEmail(parsed.data.email);
  if (u && !u.emailVerified) {
    const token = store.createVerificationToken(u.id);
    sendVerificationEmail(u, token);
  }
  res.json(genericResponse);
});
authRouter.get("/me", authenticate, (req, res) => res.json(req.user));
