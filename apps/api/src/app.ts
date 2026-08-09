import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/auth.routes.js";
import { conferencesRouter } from "./routes/conferences.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
export const app = express();
app.use(
  helmet(),
  cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:4200" }),
  express.json({ limit: "100kb" }),
);
app.get("/api/health", (_, res) =>
  res.json({ status: "ok", service: "gatherly-api" }),
);
app.use("/api/auth", authRouter);
app.use("/api/conferences", conferencesRouter);
app.use("/api/admin", adminRouter);
app.use((_, res) => res.status(404).json({ message: "Route not found" }));
