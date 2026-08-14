export type Role = "ADMIN" | "ORGANIZER" | "SPEAKER" | "ATTENDEE";
export type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  avatar: string;
  active: boolean;
};
export type Conference = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string;
  status: "DRAFT" | "PUBLISHED" | "SOLD_OUT" | "COMPLETED" | "CANCELLED";
  capacity: number;
  organizerId: number;
  theme: string;
  timezone: string;
  cancelledReason?: string;
};
export type Session = {
  id: number;
  conferenceId: number;
  title: string;
  abstract: string;
  track: string;
  room: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  speakerId: number;
  status?: "ACTIVE" | "CANCELLED";
  cancelledReason?: string;
};
export type Room = {
  id: number;
  conferenceId: number;
  name: string;
  capacity: number;
};
export type Track = {
  id: number;
  conferenceId: number;
  name: string;
};
export type ConferenceDetail = Conference & {
  sessions: Session[];
  registrations: number;
  isRegistered: boolean;
  agendaSessionIds: number[];
};
declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, "passwordHash">;
    }
  }
}
