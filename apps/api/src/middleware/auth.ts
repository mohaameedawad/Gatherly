import type { NextFunction, Request, Response } from "express";
import { tokens } from "../auth/tokens.js";
import { store } from "../db/store.js";
import type { Role } from "../types.js";
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.headers.authorization;
    if (!raw?.startsWith("Bearer "))
      return res
        .status(401)
        .json({ message: "Authentication required", code: "AUTH_REQUIRED" });
    const p = tokens.verifyAccess(raw.slice(7));
    const u = store.findUserById(Number(p.sub));
    if (!u?.active)
      return res
        .status(401)
        .json({ message: "Account unavailable", code: "ACCOUNT_UNAVAILABLE" });
    const { passwordHash, ...safe } = u;
    req.user = safe;
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Session expired or invalid", code: "INVALID_TOKEN" });
  }
}
export const authorize =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) =>
    roles.includes(req.user!.role)
      ? next()
      : res
          .status(403)
          .json({
            message: "You do not have permission for this action",
            code: "FORBIDDEN",
          });
