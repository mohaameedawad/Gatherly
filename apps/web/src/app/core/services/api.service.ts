import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Conference, ConferenceDetail, Room, Track, User, Session } from '../models/models';
type ConferenceDraft = Omit<Conference, 'id' | 'slug' | 'status' | 'organizerId' | 'theme'>;
type RoomDraft = Omit<Room, 'id' | 'conferenceId'>;
type TrackDraft = Omit<Track, 'id' | 'conferenceId'>;
type SessionDraft = Omit<Session, 'id' | 'conferenceId' | 'status' | 'cancelledReason'>;
@Injectable({ providedIn: 'root' })
export class ApiService {
  private h = inject(HttpClient);
  private api = 'http://localhost:3000/api';
  conferences() {
    return this.h.get<Conference[]>(`${this.api}/conferences`);
  }
  conference(id: string) {
    return this.h.get<ConferenceDetail>(`${this.api}/conferences/${id}`);
  }
  createConference(input: ConferenceDraft) {
    return this.h.post<Conference>(`${this.api}/conferences`, input);
  }
  updateConference(id: number, input: ConferenceDraft) {
    return this.h.patch<Conference>(`${this.api}/conferences/${id}`, input);
  }
  publishConference(id: number) {
    return this.h.post<Conference>(`${this.api}/conferences/${id}/publish`, {});
  }
  cancelConference(id: number, reason: string) {
    return this.h.post<Conference>(`${this.api}/conferences/${id}/cancel`, { reason });
  }
  completeConference(id: number) {
    return this.h.post<Conference>(`${this.api}/conferences/${id}/complete`, {});
  }
  register(id: number) {
    return this.h.post<ConferenceDetail>(`${this.api}/conferences/${id}/register`, {});
  }
  toggleAgenda(id: number) {
    return this.h.patch<{ selected: boolean }>(`${this.api}/conferences/sessions/${id}/agenda`, {});
  }
  createSession(conferenceId: number, input: SessionDraft) {
    return this.h.post<Session>(`${this.api}/conferences/${conferenceId}/sessions`, input);
  }
  deleteSession(conferenceId: number, sessionId: number) {
    return this.h.delete<void>(`${this.api}/conferences/${conferenceId}/sessions/${sessionId}`);
  }
  cancelSession(conferenceId: number, sessionId: number, reason: string) {
    return this.h.post<Session>(
      `${this.api}/conferences/${conferenceId}/sessions/${sessionId}/cancel`,
      { reason },
    );
  }
  rooms(conferenceId: number) {
    return this.h.get<Room[]>(`${this.api}/conferences/${conferenceId}/rooms`);
  }
  createRoom(conferenceId: number, input: RoomDraft) {
    return this.h.post<Room>(`${this.api}/conferences/${conferenceId}/rooms`, input);
  }
  updateRoom(conferenceId: number, roomId: number, input: RoomDraft) {
    return this.h.patch<Room>(`${this.api}/conferences/${conferenceId}/rooms/${roomId}`, input);
  }
  deleteRoom(conferenceId: number, roomId: number) {
    return this.h.delete<void>(`${this.api}/conferences/${conferenceId}/rooms/${roomId}`);
  }
  tracks(conferenceId: number) {
    return this.h.get<Track[]>(`${this.api}/conferences/${conferenceId}/tracks`);
  }
  createTrack(conferenceId: number, input: TrackDraft) {
    return this.h.post<Track>(`${this.api}/conferences/${conferenceId}/tracks`, input);
  }
  updateTrack(conferenceId: number, trackId: number, input: TrackDraft) {
    return this.h.patch<Track>(`${this.api}/conferences/${conferenceId}/tracks/${trackId}`, input);
  }
  deleteTrack(conferenceId: number, trackId: number) {
    return this.h.delete<void>(`${this.api}/conferences/${conferenceId}/tracks/${trackId}`);
  }
  users() {
    return this.h.get<User[]>(`${this.api}/admin/users`);
  }
  toggleUser(id: number) {
    return this.h.patch<User>(`${this.api}/admin/users/${id}/toggle`, {});
  }
}
