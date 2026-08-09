import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { store } from "../db/store.js";
import { tokens } from "../auth/tokens.js";
import { authenticate } from "../middleware/auth.js";
export const authRouter = Router();
const login = z.object({ email: z.email(), password: z.string().min(8) });
authRouter.post("/login", (req, res) => {
  const parsed = login.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({
        message: "Enter a valid email and password",
        issues: parsed.error.issues,
      });
  const u = store.findUserByEmail(parsed.data.email);
  if (
    !u ||
    !u.active ||
    !bcrypt.compareSync(parsed.data.password, u.passwordHash)
  )
    return res
      .status(401)
      .json({
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
    res
      .status(401)
      .json({
        message: "Refresh token is invalid",
        code: "INVALID_REFRESH_TOKEN",
      });
  }
});
authRouter.get("/me", authenticate, (req, res) => res.json(req.user));
