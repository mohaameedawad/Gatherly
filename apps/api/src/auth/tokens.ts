import jwt from "jsonwebtoken";
import type { User } from "../types.js";
const access = () =>
  process.env.ACCESS_TOKEN_SECRET ?? "workshop-only-change-me";
const refresh = () =>
  process.env.REFRESH_TOKEN_SECRET ?? "workshop-refresh-change-me";
const payload = (u: User) => ({
  sub: String(u.id),
  email: u.email,
  role: u.role,
  name: u.name,
});
export const tokens = {
  issue: (u: User) => ({
    accessToken: jwt.sign(payload(u), access(), { expiresIn: "15m" }),
    refreshToken: jwt.sign(payload(u), refresh(), { expiresIn: "7d" }),
  }),
  verifyAccess: (t: string) => jwt.verify(t, access()) as jwt.JwtPayload,
  verifyRefresh: (t: string) => jwt.verify(t, refresh()) as jwt.JwtPayload,
};
