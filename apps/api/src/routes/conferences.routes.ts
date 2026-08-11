import { Router, type Response } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth.js";
import { store } from "../db/store.js";
export const conferencesRouter = Router();
conferencesRouter.use(authenticate);
conferencesRouter.get("/", (req, res) =>
  res.json(
    store.conferences(
      req.user!.role === "ADMIN" || req.user!.role === "ORGANIZER",
    ),
  ),
);
conferencesRouter.get("/:id", (req, res) => {
  const c = store.conference(+req.params.id, req.user!.id);
  if (!c) return res.status(404).json({ message: "Conference not found" });
  if (c.status === "DRAFT" && !["ADMIN", "ORGANIZER"].includes(req.user!.role))
    return res.status(403).json({ message: "Conference is not published" });
  res.json(c);
});
const conferenceDraftSchema = z
  .object({
    title: z.string().min(3),
    summary: z.string().min(1),
    venue: z.string().min(2),
    city: z.string().min(2),
    startsAt: z.iso.datetime({ local: true }),
    endsAt: z.iso.datetime({ local: true }),
    timezone: z.string().min(1),
    capacity: z.number().int().positive(),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: "End date must be later than start date",
    path: ["endsAt"],
  });
conferencesRouter.post("/", authorize("ADMIN", "ORGANIZER"), (req, res) => {
  const x = conferenceDraftSchema.safeParse(req.body);
  if (!x.success)
    return res.status(400).json({
      message: "Conference validation failed",
      issues: x.error.issues,
    });
  res.status(201).json(store.createConference(x.data, req.user!.id));
});
conferencesRouter.patch("/:id", authorize("ADMIN", "ORGANIZER"), (req, res) => {
  const x = conferenceDraftSchema.safeParse(req.body);
  if (!x.success)
    return res.status(400).json({
      message: "Conference validation failed",
      issues: x.error.issues,
    });
  try {
    res.json(store.updateConference(+req.params.id, req.user!, x.data));
  } catch (e) {
    const m = (e as Error).message;
    res.status(m === "NOT_FOUND" ? 404 : 403).json({
      message:
        m === "NOT_FOUND"
          ? "Conference not found"
          : "You do not own this conference",
    });
  }
});
conferencesRouter.post("/:id/register", authorize("ATTENDEE"), (req, res) => {
  try {
    store.register(+req.params.id, req.user!.id);
    res.status(201).json(store.conference(+req.params.id, req.user!.id));
  } catch (e) {
    const m = (e as Error).message;
    res.status(m === "NOT_FOUND" ? 404 : 409).json({
      message:
        m === "SOLD_OUT" ? "Conference is at capacity" : "Conference not found",
    });
  }
});
conferencesRouter.patch(
  "/sessions/:id/agenda",
  authorize("ATTENDEE"),
  (req, res) =>
    res.json({ selected: store.toggleAgenda(+req.params.id, req.user!.id) }),
);
const sessionSchema = z.object({
  title: z.string().min(5),
  abstract: z.string().min(20),
  track: z.string().min(2),
  room: z.string().min(2),
  startsAt: z.iso.datetime({ local: true }),
  endsAt: z.iso.datetime({ local: true }),
  capacity: z.number().int().positive(),
  speakerId: z.number().int().positive(),
});
conferencesRouter.post(
  "/:id/sessions",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const x = sessionSchema.safeParse(req.body);
    if (!x.success)
      return res
        .status(400)
        .json({ message: "Session validation failed", issues: x.error.issues });
    res.status(201).json(store.createSession(+req.params.id, x.data));
  },
);
const conferenceErrorStatus = (m: string) =>
  ({
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    CAPACITY_EXCEEDED: 400,
    DUPLICATE_NAME: 409,
    IN_USE: 409,
  })[m] ?? 400;
const conferenceErrorMessage = (m: string) =>
  ({
    NOT_FOUND: "Conference not found",
    FORBIDDEN: "You do not own this conference",
    CAPACITY_EXCEEDED: "Capacity cannot exceed the conference capacity",
    DUPLICATE_NAME: "That name is already used in this conference",
    IN_USE: "Cannot delete: still used by a session",
  })[m] ?? "Request could not be completed";
const respondWithConferenceError = (res: Response, e: unknown) => {
  const m = (e as Error).message;
  res
    .status(conferenceErrorStatus(m))
    .json({ message: conferenceErrorMessage(m) });
};
const roomSchema = z.object({
  name: z.string().min(2),
  capacity: z.number().int().positive(),
});
const trackSchema = z.object({
  name: z.string().min(2),
});
conferencesRouter.get(
  "/:id/rooms",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    try {
      res.json(store.rooms(+req.params.id, req.user!));
    } catch (e) {
      respondWithConferenceError(res, e);
    }
  },
);
conferencesRouter.post(
  "/:id/rooms",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const x = roomSchema.safeParse(req.body);
    if (!x.success)
      return res
        .status(400)
        .json({ message: "Room validation failed", issues: x.error.issues });
    try {
      res.status(201).json(store.createRoom(+req.params.id, req.user!, x.data));
    } catch (e) {
      respondWithConferenceError(res, e);
    }
  },
);
conferencesRouter.patch(
  "/:id/rooms/:roomId",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const x = roomSchema.safeParse(req.body);
    if (!x.success)
      return res
        .status(400)
        .json({ message: "Room validation failed", issues: x.error.issues });
    try {
      res.json(
        store.updateRoom(+req.params.id, +req.params.roomId, req.user!, x.data),
      );
    } catch (e) {
      respondWithConferenceError(res, e);
    }
  },
);
conferencesRouter.delete(
  "/:id/rooms/:roomId",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    try {
      store.deleteRoom(+req.params.id, +req.params.roomId, req.user!);
      res.status(204).send();
    } catch (e) {
      respondWithConferenceError(res, e);
    }
  },
);
conferencesRouter.get(
  "/:id/tracks",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    try {
      res.json(store.tracks(+req.params.id, req.user!));
    } catch (e) {
      respondWithConferenceError(res, e);
    }
  },
);
conferencesRouter.post(
  "/:id/tracks",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const x = trackSchema.safeParse(req.body);
    if (!x.success)
      return res
        .status(400)
        .json({ message: "Track validation failed", issues: x.error.issues });
    try {
      res
        .status(201)
        .json(store.createTrack(+req.params.id, req.user!, x.data));
    } catch (e) {
      respondWithConferenceError(res, e);
    }
  },
);
conferencesRouter.patch(
  "/:id/tracks/:trackId",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const x = trackSchema.safeParse(req.body);
    if (!x.success)
      return res
        .status(400)
        .json({ message: "Track validation failed", issues: x.error.issues });
    try {
      res.json(
        store.updateTrack(
          +req.params.id,
          +req.params.trackId,
          req.user!,
          x.data,
        ),
      );
    } catch (e) {
      respondWithConferenceError(res, e);
    }
  },
);
conferencesRouter.delete(
  "/:id/tracks/:trackId",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    try {
      store.deleteTrack(+req.params.id, +req.params.trackId, req.user!);
      res.status(204).send();
    } catch (e) {
      respondWithConferenceError(res, e);
    }
  },
);
