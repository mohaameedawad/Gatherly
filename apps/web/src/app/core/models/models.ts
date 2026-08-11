export type Role = 'ADMIN' | 'ORGANIZER' | 'SPEAKER' | 'ATTENDEE';
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  active: boolean;
}
export interface Conference {
  id: number;
  title: string;
  slug: string;
  summary: string;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SOLD_OUT' | 'COMPLETED';
  capacity: number;
  organizerId: number;
  theme: string;
  timezone: string;
}
export interface Session {
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
  status?: 'ACTIVE' | 'CANCELLED';
  cancelledReason?: string;
}
export interface ConferenceDetail extends Conference {
  sessions: Session[];
  registrations: number;
  isRegistered: boolean;
  agendaSessionIds: number[];
}
export interface Room {
  id: number;
  conferenceId: number;
  name: string;
  capacity: number;
}
export interface Track {
  id: number;
  conferenceId: number;
  name: string;
}
