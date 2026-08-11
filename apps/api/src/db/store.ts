import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import bcrypt from "bcryptjs";
import type {
  Conference,
  ConferenceDetail,
  Role,
  Room,
  Session,
  Track,
  User,
} from "../types.js";

const path = process.env.DATABASE_PATH ?? "./data/gatherly.db";
mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT,email TEXT UNIQUE,password_hash TEXT,role TEXT,avatar TEXT,active INTEGER);
CREATE TABLE IF NOT EXISTS conferences(id INTEGER PRIMARY KEY,title TEXT,slug TEXT UNIQUE,summary TEXT,venue TEXT,city TEXT,starts_at TEXT,ends_at TEXT,status TEXT,capacity INTEGER,organizer_id INTEGER,theme TEXT,timezone TEXT);
CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY,conference_id INTEGER,title TEXT,abstract TEXT,track TEXT,room TEXT,starts_at TEXT,ends_at TEXT,capacity INTEGER,speaker_id INTEGER);
CREATE TABLE IF NOT EXISTS registrations(conference_id INTEGER,user_id INTEGER,status TEXT DEFAULT 'CONFIRMED',PRIMARY KEY(conference_id,user_id));
CREATE TABLE IF NOT EXISTS agenda(user_id INTEGER,session_id INTEGER,PRIMARY KEY(user_id,session_id));
CREATE TABLE IF NOT EXISTS rooms(id INTEGER PRIMARY KEY,conference_id INTEGER,name TEXT,capacity INTEGER);
CREATE TABLE IF NOT EXISTS tracks(id INTEGER PRIMARY KEY,conference_id INTEGER,name TEXT);`);
// Idempotent migration for columns added after the initial release; safe to
// re-run against a pre-existing database file that predates them.
try {
  db.exec("ALTER TABLE conferences ADD COLUMN timezone TEXT");
} catch {
  // column already exists
}
if (
  (db.prepare("SELECT count(*) count FROM users").get() as { count: number })
    .count === 0
) {
  const add = db.prepare(
      "INSERT INTO users(name,email,password_hash,role,avatar,active) VALUES(?,?,?,?,?,1)",
    ),
    password = bcrypt.hashSync("Workshop123!", 10);
  [
    ["Amina Hassan", "admin@gatherly.dev", "ADMIN", "AH"],
    ["Omar Khaled", "organizer@gatherly.dev", "ORGANIZER", "OK"],
    ["Layla Samir", "speaker@gatherly.dev", "SPEAKER", "LS"],
    ["Nour Adel", "attendee@gatherly.dev", "ATTENDEE", "NA"],
  ].forEach((x) => add.run(x[0], x[1], password, x[2], x[3]));
  const event = db.prepare(
    "INSERT INTO conferences(title,slug,summary,venue,city,starts_at,ends_at,status,capacity,organizer_id,theme) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
  );
  event.run(
    "Cairo Product & AI Summit",
    "cairo-product-ai-2026",
    "Two days of practical product engineering, responsible AI, and teams shipping real software.",
    "The GrEEK Campus",
    "Cairo",
    "2026-10-15T09:00:00",
    "2026-10-16T17:30:00",
    "PUBLISHED",
    450,
    2,
    "#6d5dfc",
  );
  event.run(
    "MENA Frontend Forum",
    "mena-frontend-2026",
    "A focused gathering for modern web architecture, design systems, performance, and accessibility.",
    "Bibliotheca Alexandrina",
    "Alexandria",
    "2026-11-07T09:30:00",
    "2026-11-07T18:00:00",
    "PUBLISHED",
    280,
    2,
    "#e0643b",
  );
  event.run(
    "Engineering Leadership Exchange",
    "leadership-exchange-2027",
    "An intimate peer forum for engineering managers and technical leaders.",
    "District 5",
    "New Cairo",
    "2027-01-22T10:00:00",
    "2027-01-22T17:00:00",
    "DRAFT",
    120,
    2,
    "#16856b",
  );
  const session = db.prepare(
    "INSERT INTO sessions(conference_id,title,abstract,track,room,starts_at,ends_at,capacity,speaker_id) VALUES(?,?,?,?,?,?,?,?,?)",
  );
  session.run(
    1,
    "From Copilot to Orchestration",
    "Design reliable AI-assisted delivery workflows with clear boundaries and review gates.",
    "AI Engineering",
    "Main Stage",
    "2026-10-15T10:00:00",
    "2026-10-15T10:45:00",
    450,
    3,
  );
  session.run(
    1,
    "Design Systems That Scale",
    "Turn tokens, components, and governance into a coherent product language.",
    "Product Design",
    "Nile Room",
    "2026-10-15T11:15:00",
    "2026-10-15T12:00:00",
    160,
    3,
  );
  session.run(
    1,
    "Production-Grade Angular",
    "Signals, architecture, performance, and the decisions that keep large apps maintainable.",
    "Frontend",
    "Delta Room",
    "2026-10-15T13:30:00",
    "2026-10-15T14:15:00",
    140,
    3,
  );
  session.run(
    2,
    "The Accessible Component Contract",
    "Practical accessibility requirements for reusable UI components.",
    "Design Systems",
    "Auditorium",
    "2026-11-07T11:00:00",
    "2026-11-07T11:45:00",
    280,
    3,
  );
  db.prepare(
    "INSERT INTO registrations(conference_id,user_id) VALUES(1,4)",
  ).run();
  db.prepare("INSERT INTO agenda(user_id,session_id) VALUES(4,1)").run();
}
const safe = (r: any): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  passwordHash: r.password_hash,
  role: r.role as Role,
  avatar: r.avatar,
  active: !!r.active,
});
const conference = (r: any): Conference => ({
  id: r.id,
  title: r.title,
  slug: r.slug,
  summary: r.summary,
  venue: r.venue,
  city: r.city,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  status: r.status,
  capacity: r.capacity,
  organizerId: r.organizer_id,
  theme: r.theme,
  timezone: r.timezone ?? "",
});
const slugify = (title: string) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "conference";
const session = (r: any): Session => ({
  id: r.id,
  conferenceId: r.conference_id,
  title: r.title,
  abstract: r.abstract,
  track: r.track,
  room: r.room,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  capacity: r.capacity,
  speakerId: r.speaker_id,
});
const room = (r: any): Room => ({
  id: r.id,
  conferenceId: r.conference_id,
  name: r.name,
  capacity: r.capacity,
});
const track = (r: any): Track => ({
  id: r.id,
  conferenceId: r.conference_id,
  name: r.name,
});
const requireOwnedConference = (
  id: number,
  requester: { id: number; role: Role },
) => {
  const r = db.prepare("SELECT * FROM conferences WHERE id=?").get(id);
  if (!r) throw Error("NOT_FOUND");
  const c = conference(r);
  if (requester.role !== "ADMIN" && c.organizerId !== requester.id)
    throw Error("FORBIDDEN");
  return c;
};
export const store = {
  findUserByEmail: (email: string) => {
    const r = db
      .prepare("SELECT * FROM users WHERE lower(email)=lower(?)")
      .get(email);
    return r ? safe(r) : undefined;
  },
  findUserById: (id: number) => {
    const r = db.prepare("SELECT * FROM users WHERE id=?").get(id);
    return r ? safe(r) : undefined;
  },
  users: () =>
    (db.prepare("SELECT * FROM users ORDER BY name").all() as any[]).map(safe),
  conferences: (includeDraft = false): Conference[] =>
    (
      db
        .prepare(
          includeDraft
            ? "SELECT * FROM conferences ORDER BY starts_at"
            : "SELECT * FROM conferences WHERE status != 'DRAFT' ORDER BY starts_at",
        )
        .all() as any[]
    ).map(conference),
  conference: (id: number, userId: number): ConferenceDetail | undefined => {
    const r = db.prepare("SELECT * FROM conferences WHERE id=?").get(id);
    if (!r) return;
    const c = conference(r);
    return {
      ...c,
      sessions: (
        db
          .prepare(
            "SELECT * FROM sessions WHERE conference_id=? ORDER BY starts_at",
          )
          .all(id) as any[]
      ).map(session),
      registrations: (
        db
          .prepare(
            "SELECT count(*) count FROM registrations WHERE conference_id=?",
          )
          .get(id) as any
      ).count,
      isRegistered: !!db
        .prepare(
          "SELECT 1 FROM registrations WHERE conference_id=? AND user_id=?",
        )
        .get(id, userId),
      agendaSessionIds: (
        db
          .prepare(
            "SELECT a.session_id FROM agenda a JOIN sessions s ON s.id=a.session_id WHERE a.user_id=? AND s.conference_id=?",
          )
          .all(userId, id) as any[]
      ).map((x) => x.session_id),
    };
  },
  register: (conferenceId: number, userId: number) => {
    const c = conference(
      db.prepare("SELECT * FROM conferences WHERE id=?").get(conferenceId),
    );
    if (!c) throw Error("NOT_FOUND");
    const count = (
      db
        .prepare(
          "SELECT count(*) count FROM registrations WHERE conference_id=?",
        )
        .get(conferenceId) as any
    ).count;
    if (count >= c.capacity) throw Error("SOLD_OUT");
    db.prepare(
      "INSERT OR IGNORE INTO registrations(conference_id,user_id) VALUES(?,?)",
    ).run(conferenceId, userId);
  },
  toggleAgenda: (sessionId: number, userId: number) => {
    const exists = db
      .prepare("SELECT 1 FROM agenda WHERE user_id=? AND session_id=?")
      .get(userId, sessionId);
    if (exists)
      db.prepare("DELETE FROM agenda WHERE user_id=? AND session_id=?").run(
        userId,
        sessionId,
      );
    else
      db.prepare("INSERT INTO agenda(user_id,session_id) VALUES(?,?)").run(
        userId,
        sessionId,
      );
    return !exists;
  },
  createSession: (
    conferenceId: number,
    s: Omit<Session, "id" | "conferenceId">,
  ) => {
    const x = db
      .prepare(
        "INSERT INTO sessions(conference_id,title,abstract,track,room,starts_at,ends_at,capacity,speaker_id) VALUES(?,?,?,?,?,?,?,?,?)",
      )
      .run(
        conferenceId,
        s.title,
        s.abstract,
        s.track,
        s.room,
        s.startsAt,
        s.endsAt,
        s.capacity,
        s.speakerId,
      );
    return session(
      db.prepare("SELECT * FROM sessions WHERE id=?").get(x.lastInsertRowid),
    );
  },
  toggleUser: (id: number) => {
    db.prepare("UPDATE users SET active=1-active WHERE id=?").run(id);
    return store.findUserById(id);
  },
  createConference: (
    input: Omit<Conference, "id" | "slug" | "status" | "organizerId" | "theme">,
    organizerId: number,
  ) => {
    const base = slugify(input.title);
    let slug = base;
    for (
      let n = 2;
      db.prepare("SELECT 1 FROM conferences WHERE slug=?").get(slug);
      n++
    )
      slug = `${base}-${n}`;
    const x = db
      .prepare(
        "INSERT INTO conferences(title,slug,summary,venue,city,starts_at,ends_at,status,capacity,organizer_id,theme,timezone) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        input.title,
        slug,
        input.summary,
        input.venue,
        input.city,
        input.startsAt,
        input.endsAt,
        "DRAFT",
        input.capacity,
        organizerId,
        "#6d5dfc",
        input.timezone,
      );
    return conference(
      db.prepare("SELECT * FROM conferences WHERE id=?").get(x.lastInsertRowid),
    );
  },
  updateConference: (
    id: number,
    requester: { id: number; role: Role },
    patch: Omit<Conference, "id" | "slug" | "status" | "organizerId" | "theme">,
  ) => {
    const r = db.prepare("SELECT * FROM conferences WHERE id=?").get(id);
    if (!r) throw Error("NOT_FOUND");
    const existing = conference(r);
    if (requester.role !== "ADMIN" && existing.organizerId !== requester.id)
      throw Error("FORBIDDEN");
    db.prepare(
      "UPDATE conferences SET title=?,summary=?,venue=?,city=?,starts_at=?,ends_at=?,capacity=?,timezone=? WHERE id=?",
    ).run(
      patch.title,
      patch.summary,
      patch.venue,
      patch.city,
      patch.startsAt,
      patch.endsAt,
      patch.capacity,
      patch.timezone,
      id,
    );
    return conference(
      db.prepare("SELECT * FROM conferences WHERE id=?").get(id),
    );
  },
  rooms: (
    conferenceId: number,
    requester: { id: number; role: Role },
  ): Room[] => {
    requireOwnedConference(conferenceId, requester);
    return (
      db
        .prepare("SELECT * FROM rooms WHERE conference_id=? ORDER BY name")
        .all(conferenceId) as any[]
    ).map(room);
  },
  createRoom: (
    conferenceId: number,
    requester: { id: number; role: Role },
    input: Omit<Room, "id" | "conferenceId">,
  ) => {
    const c = requireOwnedConference(conferenceId, requester);
    if (input.capacity > c.capacity) throw Error("CAPACITY_EXCEEDED");
    if (
      db
        .prepare(
          "SELECT 1 FROM rooms WHERE conference_id=? AND lower(name)=lower(?)",
        )
        .get(conferenceId, input.name)
    )
      throw Error("DUPLICATE_NAME");
    const x = db
      .prepare("INSERT INTO rooms(conference_id,name,capacity) VALUES(?,?,?)")
      .run(conferenceId, input.name, input.capacity);
    return room(
      db.prepare("SELECT * FROM rooms WHERE id=?").get(x.lastInsertRowid),
    );
  },
  updateRoom: (
    conferenceId: number,
    roomId: number,
    requester: { id: number; role: Role },
    input: Omit<Room, "id" | "conferenceId">,
  ) => {
    const c = requireOwnedConference(conferenceId, requester);
    if (
      !db
        .prepare("SELECT 1 FROM rooms WHERE id=? AND conference_id=?")
        .get(roomId, conferenceId)
    )
      throw Error("NOT_FOUND");
    if (input.capacity > c.capacity) throw Error("CAPACITY_EXCEEDED");
    if (
      db
        .prepare(
          "SELECT 1 FROM rooms WHERE conference_id=? AND lower(name)=lower(?) AND id!=?",
        )
        .get(conferenceId, input.name, roomId)
    )
      throw Error("DUPLICATE_NAME");
    db.prepare("UPDATE rooms SET name=?,capacity=? WHERE id=?").run(
      input.name,
      input.capacity,
      roomId,
    );
    return room(db.prepare("SELECT * FROM rooms WHERE id=?").get(roomId));
  },
  deleteRoom: (
    conferenceId: number,
    roomId: number,
    requester: { id: number; role: Role },
  ) => {
    requireOwnedConference(conferenceId, requester);
    const existing = db
      .prepare("SELECT * FROM rooms WHERE id=? AND conference_id=?")
      .get(roomId, conferenceId) as any;
    if (!existing) throw Error("NOT_FOUND");
    if (
      db
        .prepare(
          "SELECT 1 FROM sessions WHERE conference_id=? AND lower(room)=lower(?)",
        )
        .get(conferenceId, existing.name)
    )
      throw Error("IN_USE");
    db.prepare("DELETE FROM rooms WHERE id=?").run(roomId);
  },
  tracks: (
    conferenceId: number,
    requester: { id: number; role: Role },
  ): Track[] => {
    requireOwnedConference(conferenceId, requester);
    return (
      db
        .prepare("SELECT * FROM tracks WHERE conference_id=? ORDER BY name")
        .all(conferenceId) as any[]
    ).map(track);
  },
  createTrack: (
    conferenceId: number,
    requester: { id: number; role: Role },
    input: Omit<Track, "id" | "conferenceId">,
  ) => {
    requireOwnedConference(conferenceId, requester);
    if (
      db
        .prepare(
          "SELECT 1 FROM tracks WHERE conference_id=? AND lower(name)=lower(?)",
        )
        .get(conferenceId, input.name)
    )
      throw Error("DUPLICATE_NAME");
    const x = db
      .prepare("INSERT INTO tracks(conference_id,name) VALUES(?,?)")
      .run(conferenceId, input.name);
    return track(
      db.prepare("SELECT * FROM tracks WHERE id=?").get(x.lastInsertRowid),
    );
  },
  updateTrack: (
    conferenceId: number,
    trackId: number,
    requester: { id: number; role: Role },
    input: Omit<Track, "id" | "conferenceId">,
  ) => {
    requireOwnedConference(conferenceId, requester);
    if (
      !db
        .prepare("SELECT 1 FROM tracks WHERE id=? AND conference_id=?")
        .get(trackId, conferenceId)
    )
      throw Error("NOT_FOUND");
    if (
      db
        .prepare(
          "SELECT 1 FROM tracks WHERE conference_id=? AND lower(name)=lower(?) AND id!=?",
        )
        .get(conferenceId, input.name, trackId)
    )
      throw Error("DUPLICATE_NAME");
    db.prepare("UPDATE tracks SET name=? WHERE id=?").run(input.name, trackId);
    return track(db.prepare("SELECT * FROM tracks WHERE id=?").get(trackId));
  },
  deleteTrack: (
    conferenceId: number,
    trackId: number,
    requester: { id: number; role: Role },
  ) => {
    requireOwnedConference(conferenceId, requester);
    const existing = db
      .prepare("SELECT * FROM tracks WHERE id=? AND conference_id=?")
      .get(trackId, conferenceId) as any;
    if (!existing) throw Error("NOT_FOUND");
    if (
      db
        .prepare(
          "SELECT 1 FROM sessions WHERE conference_id=? AND lower(track)=lower(?)",
        )
        .get(conferenceId, existing.name)
    )
      throw Error("IN_USE");
    db.prepare("DELETE FROM tracks WHERE id=?").run(trackId);
  },
};
