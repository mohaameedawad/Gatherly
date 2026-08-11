import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Room, Track } from '../../core/models/models';

@Component({
  imports: [FormsModule, RouterLink],
  template: `<a class="back" [routerLink]="['/conferences', id]">← Back to conference</a>
    <header class="page-head">
      <div>
        <span class="eyebrow">Conference setup</span>
        <h1>Rooms & tracks</h1>
        <p>Define the rooms and program tracks sessions can be organized under.</p>
      </div>
    </header>
    <div class="detail-grid">
      <section class="card">
        <h2>Rooms</h2>
        <form class="field-row" (ngSubmit)="addRoom()">
          <label
            >Name
            <input
              name="newRoomName"
              [(ngModel)]="newRoomName"
              placeholder="Hall A"
            />
          </label>
          <label
            >Capacity
            <input
              type="number"
              min="1"
              name="newRoomCapacity"
              [(ngModel)]="newRoomCapacity"
            />
          </label>
          <button class="btn small" type="submit">＋ Add room</button>
        </form>
        @if (roomError()) {
          <div class="alert">{{ roomError() }}</div>
        }
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Capacity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rooms(); track r.id) {
              <tr>
                @if (editingRoomId() === r.id) {
                  <td><input [(ngModel)]="editRoomName" name="editRoomName" /></td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      [(ngModel)]="editRoomCapacity"
                      name="editRoomCapacity"
                    />
                  </td>
                  <td>
                    <button class="btn small" (click)="saveRoom(r)">Save</button>
                    <button class="btn small secondary" (click)="cancelRoomEdit()">
                      Cancel
                    </button>
                  </td>
                } @else {
                  <td>{{ r.name }}</td>
                  <td>{{ r.capacity }} seats</td>
                  <td>
                    <button class="btn small secondary" (click)="startRoomEdit(r)">
                      Edit
                    </button>
                    <button class="btn small secondary" (click)="removeRoom(r)">
                      Remove
                    </button>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td class="empty" colspan="3">No rooms yet</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
      <section class="card">
        <h2>Tracks</h2>
        <form class="field-row" (ngSubmit)="addTrack()">
          <label
            >Name
            <input
              name="newTrackName"
              [(ngModel)]="newTrackName"
              placeholder="AI Engineering"
            />
          </label>
          <button class="btn small" type="submit">＋ Add track</button>
        </form>
        @if (trackError()) {
          <div class="alert">{{ trackError() }}</div>
        }
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (t of tracks(); track t.id) {
              <tr>
                @if (editingTrackId() === t.id) {
                  <td><input [(ngModel)]="editTrackName" name="editTrackName" /></td>
                  <td>
                    <button class="btn small" (click)="saveTrack(t)">Save</button>
                    <button class="btn small secondary" (click)="cancelTrackEdit()">
                      Cancel
                    </button>
                  </td>
                } @else {
                  <td>{{ t.name }}</td>
                  <td>
                    <button class="btn small secondary" (click)="startTrackEdit(t)">
                      Edit
                    </button>
                    <button class="btn small secondary" (click)="removeTrack(t)">
                      Remove
                    </button>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td class="empty" colspan="2">No tracks yet</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    </div>`,
})
export class ConferenceRooms {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  id = +this.route.snapshot.paramMap.get('id')!;
  rooms = signal<Room[]>([]);
  tracks = signal<Track[]>([]);
  newRoomName = '';
  newRoomCapacity = 1;
  roomError = signal('');
  editingRoomId = signal<number | null>(null);
  editRoomName = '';
  editRoomCapacity = 1;
  newTrackName = '';
  trackError = signal('');
  editingTrackId = signal<number | null>(null);
  editTrackName = '';
  constructor() {
    this.loadRooms();
    this.loadTracks();
  }
  loadRooms() {
    this.api.rooms(this.id).subscribe((x) => this.rooms.set(x));
  }
  loadTracks() {
    this.api.tracks(this.id).subscribe((x) => this.tracks.set(x));
  }
  addRoom() {
    if (!this.newRoomName.trim()) return;
    this.roomError.set('');
    this.api
      .createRoom(this.id, { name: this.newRoomName, capacity: this.newRoomCapacity })
      .subscribe({
        next: () => {
          this.newRoomName = '';
          this.newRoomCapacity = 1;
          this.loadRooms();
        },
        error: (e) => this.roomError.set(e.error?.message ?? 'Unable to add the room'),
      });
  }
  startRoomEdit(r: Room) {
    this.editingRoomId.set(r.id);
    this.editRoomName = r.name;
    this.editRoomCapacity = r.capacity;
  }
  cancelRoomEdit() {
    this.editingRoomId.set(null);
  }
  saveRoom(r: Room) {
    this.roomError.set('');
    this.api
      .updateRoom(this.id, r.id, { name: this.editRoomName, capacity: this.editRoomCapacity })
      .subscribe({
        next: () => {
          this.editingRoomId.set(null);
          this.loadRooms();
        },
        error: (e) => this.roomError.set(e.error?.message ?? 'Unable to update the room'),
      });
  }
  removeRoom(r: Room) {
    this.roomError.set('');
    this.api.deleteRoom(this.id, r.id).subscribe({
      next: () => this.loadRooms(),
      error: (e) => this.roomError.set(e.error?.message ?? 'Unable to remove the room'),
    });
  }
  addTrack() {
    if (!this.newTrackName.trim()) return;
    this.trackError.set('');
    this.api.createTrack(this.id, { name: this.newTrackName }).subscribe({
      next: () => {
        this.newTrackName = '';
        this.loadTracks();
      },
      error: (e) => this.trackError.set(e.error?.message ?? 'Unable to add the track'),
    });
  }
  startTrackEdit(t: Track) {
    this.editingTrackId.set(t.id);
    this.editTrackName = t.name;
  }
  cancelTrackEdit() {
    this.editingTrackId.set(null);
  }
  saveTrack(t: Track) {
    this.trackError.set('');
    this.api.updateTrack(this.id, t.id, { name: this.editTrackName }).subscribe({
      next: () => {
        this.editingTrackId.set(null);
        this.loadTracks();
      },
      error: (e) => this.trackError.set(e.error?.message ?? 'Unable to update the track'),
    });
  }
  removeTrack(t: Track) {
    this.trackError.set('');
    this.api.deleteTrack(this.id, t.id).subscribe({
      next: () => this.loadTracks(),
      error: (e) => this.trackError.set(e.error?.message ?? 'Unable to remove the track'),
    });
  }
}
