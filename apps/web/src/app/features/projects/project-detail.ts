import { Component, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ConferenceDetail as Model, Session, Room, Track } from '../../core/models/models';
import { AuthService } from '../../core/auth/auth.service';
import { CommonModule } from '@angular/common';
@Component({
  imports: [RouterLink, FormsModule, CommonModule],
  template: `
    @if (toast()) {
      <div class="toast" style="position: fixed; top: 20px; right: 20px; z-index: 1000; padding: 16px 24px; background: #10b981; color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease-out;">
        {{ toast() }}
      </div>
    }
    @if (conference(); as c) {
    <a class="back" routerLink="/conferences">← All conferences</a>
    <header class="event-hero" [style.--event-color]="c.theme">
      <div>
        <span class="status" [attr.data-status]="c.status">{{ c.status }}</span>
        <h1>{{ c.title }}</h1>
        <p>{{ c.summary }}</p>
        <div class="event-meta">
          <span>◷ {{ date(c.startsAt) }}</span
          ><span>⌖ {{ c.venue }}, {{ c.city }}</span>
        </div>
        @if (auth.hasRole('ADMIN') || auth.user()?.id === c.organizerId) {
          <a class="btn small" [routerLink]="['/conferences', c.id, 'edit']">Edit draft</a>
          <a class="btn small secondary" [routerLink]="['/conferences', c.id, 'rooms']"
            >Rooms & tracks</a
          >
        }
      </div>
      <div class="registration-card">
        <span>Registration</span><strong>{{ c.registrations }} / {{ c.capacity }}</strong>
        <div class="progress"><i [style.width.%]="(c.registrations / c.capacity) * 100"></i></div>
        @if (auth.hasRole('ATTENDEE')) {
          <button class="btn primary full" [disabled]="c.isRegistered" (click)="register(c.id)">
            {{ c.isRegistered ? 'You are registered' : 'Reserve my place' }}
          </button>
        } @else {
          <small>Previewing as {{ auth.user()?.role }}</small>
        }
      </div>
    </header>
    <div class="detail-grid">
      <section class="card event-info">
        <h2>About this gathering</h2>
        <p>{{ c.summary }}</p>
        <dl>
          <div>
            <dt>Doors open</dt>
            <dd>{{ time(c.startsAt) }}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{{ c.venue }}</dd>
          </div>
          <div>
            <dt>Program</dt>
            <dd>{{ c.sessions.length }} sessions</dd>
          </div>
        </dl>
      </section>
      <section class="card tasks">
        <div class="section-head">
          <div>
            <h2>Program</h2>
            <p>Build a personal agenda without schedule conflicts.</p>
          </div>
          @if (auth.hasRole('ADMIN', 'ORGANIZER')) {
            <button class="btn small" (click)="toggleForm()">＋ Add session</button>
          }
        </div>
        @if (showForm()) {
          <form class="session-form" (ngSubmit)="submitSession()" style="padding: 16px; margin: 12px 0; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
            <h3 style="margin-top: 0;">New Session</h3>
            
            <div style="margin-bottom: 12px;">
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Title *</label>
              <input 
                type="text" 
                [(ngModel)]="formData.title" 
                name="title"
                required
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                placeholder="Session title">
            </div>
            
            <div style="margin-bottom: 12px;">
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Abstract *</label>
              <textarea 
                [(ngModel)]="formData.abstract" 
                name="abstract"
                required
                rows="3"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit;"
                placeholder="Session description"></textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Room *</label>
                <select 
                  [(ngModel)]="formData.room" 
                  name="room"
                  required
                  style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                  <option value="">Select room</option>
                  @for (room of rooms(); track room.id) {
                    <option [value]="room.name">{{ room.name }} ({{ room.capacity }} seats)</option>
                  }
                </select>
              </div>
              
              <div>
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Track *</label>
                <select 
                  [(ngModel)]="formData.track" 
                  name="track"
                  required
                  style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                  <option value="">Select track</option>
                  @for (track of tracks(); track track.id) {
                    <option [value]="track.name">{{ track.name }}</option>
                  }
                </select>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Start Time *</label>
                <input 
                  type="datetime-local" 
                  [(ngModel)]="formData.startsAt" 
                  name="startsAt"
                  required
                  [min]="c.startsAt.slice(0, 16)"
                  [max]="c.endsAt.slice(0, 16)"
                  style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
              </div>
              
              <div>
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">End Time *</label>
                <input 
                  type="datetime-local" 
                  [(ngModel)]="formData.endsAt" 
                  name="endsAt"
                  required
                  [min]="formData.startsAt || c.startsAt.slice(0, 16)"
                  [max]="c.endsAt.slice(0, 16)"
                  style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
              </div>
              
              <div>
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Capacity *</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.capacity" 
                  name="capacity"
                  required
                  min="1"
                  [max]="selectedRoomCapacity()"
                  style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                  placeholder="Max attendees">
              </div>
            </div>
            
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button 
                type="button" 
                (click)="cancelForm()"
                class="btn small secondary"
                style="padding: 8px 16px;">
                Cancel
              </button>
              <button 
                type="submit"
                class="btn small primary"
                style="padding: 8px 16px;">
                Create Session
              </button>
            </div>
          </form>
        }
        @if (errorMessage()) {
          <div class="error-message" style="padding: 12px; margin: 12px 0; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00;">
            {{ errorMessage() }}
          </div>
        }
        
        <!-- Filters Section -->
        <div class="filters" style="padding: 16px; margin: 12px 0; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
          <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 1rem;">Filter Sessions</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 0.875rem; font-weight: 500;">Search</label>
              <input 
                type="text" 
                [(ngModel)]="filters.search" 
                (ngModelChange)="applyFilters()"
                placeholder="Search title or abstract..."
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem;">
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 0.875rem; font-weight: 500;">Day</label>
              <select 
                [(ngModel)]="filters.day" 
                (ngModelChange)="applyFilters()"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem;">
                <option value="">All days</option>
                @for (day of uniqueDays(); track day) {
                  <option [value]="day">{{ day }}</option>
                }
              </select>
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 0.875rem; font-weight: 500;">Track</label>
              <select 
                [(ngModel)]="filters.track" 
                (ngModelChange)="applyFilters()"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem;">
                <option value="">All tracks</option>
                @for (track of uniqueTracks(); track track) {
                  <option [value]="track">{{ track }}</option>
                }
              </select>
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 0.875rem; font-weight: 500;">Room</label>
              <select 
                [(ngModel)]="filters.room" 
                (ngModelChange)="applyFilters()"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem;">
                <option value="">All rooms</option>
                @for (room of uniqueRooms(); track room) {
                  <option [value]="room">{{ room }}</option>
                }
              </select>
            </div>
          </div>
          
          @if (hasActiveFilters()) {
            <div style="margin-top: 12px;">
              <button 
                (click)="clearFilters()" 
                class="btn small secondary"
                style="padding: 6px 12px; font-size: 0.875rem;">
                Clear all filters
              </button>
              <span style="margin-left: 12px; font-size: 0.875rem; color: #666;">
                Showing {{ filteredSessions().length }} of {{ c.sessions.length }} sessions
              </span>
            </div>
          }
        </div>
        
        @for (s of filteredSessions(); track s.id) {
          <article class="session">
            <div class="session-time">
              <strong>{{ time(s.startsAt) }}</strong
              ><small>{{ duration(s) }} min</small>
            </div>
            <div>
              <span class="track" [style.opacity]="s.status === 'CANCELLED' ? '0.5' : '1'">{{ s.track }}</span>
              <h3 [style.opacity]="s.status === 'CANCELLED' ? '0.5' : '1'">
                {{ s.title }}
                @if (s.status === 'CANCELLED') {
                  <span style="color: #dc2626; font-size: 0.875rem; font-weight: normal;"> [CANCELLED]</span>
                }
              </h3>
              <p [style.opacity]="s.status === 'CANCELLED' ? '0.5' : '1'">{{ s.abstract }}</p>
              @if (s.status === 'CANCELLED' && s.cancelledReason) {
                <p style="color: #dc2626; font-size: 0.875rem; margin-top: 8px;">Reason: {{ s.cancelledReason }}</p>
              }
              <small [style.opacity]="s.status === 'CANCELLED' ? '0.5' : '1'">⌖ {{ s.room }} · {{ s.capacity }} seats</small>
            </div>
            @if (auth.hasRole('ATTENDEE') && c.isRegistered && s.status !== 'CANCELLED') {
              <button
                class="agenda-btn"
                [class.selected]="c.agendaSessionIds.includes(s.id)"
                (click)="toggle(s)"
              >
                {{ c.agendaSessionIds.includes(s.id) ? '✓ Added' : '+ Agenda' }}
              </button>
            }
            @if ((auth.hasRole('ADMIN') || auth.user()?.id === c.organizerId) && s.status !== 'CANCELLED') {
              <div style="display: flex; gap: 8px; margin-left: auto;">
                <button
                  class="btn small secondary"
                  (click)="cancelSession(s)"
                  style="padding: 4px 12px; font-size: 0.875rem;">
                  Cancel
                </button>
                <button
                  class="btn small"
                  (click)="deleteSession(s)"
                  style="padding: 4px 12px; font-size: 0.875rem; background: #dc2626; border-color: #dc2626;">
                  Delete
                </button>
              </div>
            }
          </article>
        } @empty {
          @if (hasActiveFilters()) {
            <div class="empty">
              <strong>No sessions found</strong>
              <p style="margin-top: 8px; color: #666;">Try adjusting your filters to see more results.</p>
            </div>
          } @else {
            <div class="empty"><strong>Program coming soon</strong></div>
          }
        }
      </section>
    </div>
  }`,
})
export class ProjectDetail {
  p = inject(ActivatedRoute);
  router = inject(Router);
  api = inject(ApiService);
  auth = inject(AuthService);
  conference = signal<Model | null>(null);
  errorMessage = signal<string | null>(null);
  showForm = signal<boolean>(false);
  rooms = signal<Room[]>([]);
  tracks = signal<Track[]>([]);
  toast = signal<string | null>(null);
  cancelFormData = { sessionId: 0, reason: '' };
  showCancelModal = signal<boolean>(false);
  
  // Filters
  filters = {
    search: '',
    day: '',
    track: '',
    room: '',
  };
  
  // Computed values for filter options
  uniqueDays = computed(() => {
    const c = this.conference();
    if (!c) return [];
    const days = new Set<string>();
    c.sessions.forEach(s => {
      const date = new Date(s.startsAt).toLocaleDateString('en', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      days.add(date);
    });
    return Array.from(days).sort();
  });
  
  uniqueTracks = computed(() => {
    const c = this.conference();
    if (!c) return [];
    return Array.from(new Set(c.sessions.map(s => s.track))).sort();
  });
  
  uniqueRooms = computed(() => {
    const c = this.conference();
    if (!c) return [];
    return Array.from(new Set(c.sessions.map(s => s.room))).sort();
  });
  
  // Filtered sessions
  filteredSessions = computed(() => {
    const c = this.conference();
    if (!c) return [];
    
    let sessions = c.sessions;
    
    // Filter by search text
    if (this.filters.search.trim()) {
      const search = this.filters.search.toLowerCase();
      sessions = sessions.filter(s => 
        s.title.toLowerCase().includes(search) || 
        s.abstract.toLowerCase().includes(search)
      );
    }
    
    // Filter by day
    if (this.filters.day) {
      sessions = sessions.filter(s => {
        const date = new Date(s.startsAt).toLocaleDateString('en', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
        return date === this.filters.day;
      });
    }
    
    // Filter by track
    if (this.filters.track) {
      sessions = sessions.filter(s => s.track === this.filters.track);
    }
    
    // Filter by room
    if (this.filters.room) {
      sessions = sessions.filter(s => s.room === this.filters.room);
    }
    
    return sessions;
  });
  
  formData = {
    title: '',
    abstract: '',
    track: '',
    room: '',
    startsAt: '',
    endsAt: '',
    capacity: 10,
  };
  
  constructor() {
    this.load();
    this.loadFiltersFromUrl();
    
    // Watch for query param changes
    effect(() => {
      this.p.queryParams.subscribe(params => {
        this.filters.search = params['search'] || '';
        this.filters.day = params['day'] || '';
        this.filters.track = params['track'] || '';
        this.filters.room = params['room'] || '';
      });
    });
  }
  
  load() {
    this.api
      .conference(this.p.snapshot.paramMap.get('id')!)
      .subscribe((x) => this.conference.set(x));
  }
  
  register(id: number) {
    this.api.register(id).subscribe((x) => this.conference.set(x));
  }
  
  toggle(s: Session) {
    this.api.toggleAgenda(s.id).subscribe(() => this.load());
  }
  
  toggleForm() {
    const c = this.conference();
    if (!c) return;
    
    // Clear previous error
    this.errorMessage.set(null);
    
    // If opening form, fetch rooms and tracks
    if (!this.showForm()) {
      this.api.rooms(c.id).subscribe({
        next: (rooms) => {
          this.rooms.set(rooms);
          this.api.tracks(c.id).subscribe({
            next: (tracks) => {
              this.tracks.set(tracks);
              
              if (rooms.length === 0 || tracks.length === 0) {
                this.errorMessage.set('Cannot create session: Please configure rooms and tracks first by clicking \'Rooms & tracks\' button');
                return;
              }
              
              // Initialize form with conference dates
              this.formData.startsAt = c.startsAt.slice(0, 16);
              this.formData.endsAt = c.endsAt.slice(0, 16);
              this.formData.room = rooms[0]?.name || '';
              this.formData.track = tracks[0]?.name || '';
              
              this.showForm.set(true);
            },
            error: () => {
              this.errorMessage.set('Failed to load tracks');
            }
          });
        },
        error: () => {
          this.errorMessage.set('Failed to load rooms');
        }
      });
    } else {
      this.showForm.set(false);
      this.resetForm();
    }
  }
  
  cancelForm() {
    this.showForm.set(false);
    this.errorMessage.set(null);
    this.resetForm();
  }
  
  resetForm() {
    this.formData = {
      title: '',
      abstract: '',
      track: '',
      room: '',
      startsAt: '',
      endsAt: '',
      capacity: 10,
    };
  }
  
  selectedRoomCapacity() {
    const room = this.rooms().find(r => r.name === this.formData.room);
    return room?.capacity || 100;
  }
  
  submitSession() {
    const c = this.conference();
    if (!c) return;
    
    this.errorMessage.set(null);
    
    this.api.createSession(c.id, {
      title: this.formData.title,
      abstract: this.formData.abstract,
      track: this.formData.track,
      room: this.formData.room,
      startsAt: this.formData.startsAt,
      endsAt: this.formData.endsAt,
      capacity: this.formData.capacity,
      speakerId: this.auth.user()?.id || 1,
    }).subscribe({
      next: () => {
        this.showForm.set(false);
        this.resetForm();
        this.showToast('Session created successfully!');
        this.load();
      },
      error: (err) => {
        const message = err.error?.message || 'Failed to create session';
        this.errorMessage.set(message);
      }
    });
  }
  
  showToast(message: string) {
    this.toast.set(message);
    setTimeout(() => this.toast.set(null), 3000);
  }
  
  deleteSession(session: Session) {
    const c = this.conference();
    if (!c) return;
    
    if (!confirm(`Delete "${session.title}"? This action cannot be undone.`)) {
      return;
    }
    
    this.errorMessage.set(null);
    this.api.deleteSession(c.id, session.id).subscribe({
      next: () => {
        this.showToast('Session deleted successfully!');
        this.load();
      },
      error: (err) => {
        const message = err.error?.message || 'Failed to delete session';
        this.errorMessage.set(message);
      }
    });
  }
  
  cancelSession(session: Session) {
    const c = this.conference();
    if (!c) return;
    
    const reason = prompt('Please provide a reason for cancellation (minimum 10 characters):');
    if (!reason) return;
    
    if (reason.trim().length < 10) {
      this.errorMessage.set('Cancellation reason must be at least 10 characters');
      return;
    }
    
    this.errorMessage.set(null);
    this.api.cancelSession(c.id, session.id, reason).subscribe({
      next: () => {
        this.showToast('Session cancelled successfully!');
        this.load();
      },
      error: (err) => {
        const message = err.error?.message || 'Failed to cancel session';
        this.errorMessage.set(message);
      }
    });
  }
  
  loadFiltersFromUrl() {
    const params = this.p.snapshot.queryParams;
    this.filters.search = params['search'] || '';
    this.filters.day = params['day'] || '';
    this.filters.track = params['track'] || '';
    this.filters.room = params['room'] || '';
  }
  
  applyFilters() {
    // Update URL with current filters
    const queryParams: any = {};
    if (this.filters.search) queryParams.search = this.filters.search;
    if (this.filters.day) queryParams.day = this.filters.day;
    if (this.filters.track) queryParams.track = this.filters.track;
    if (this.filters.room) queryParams.room = this.filters.room;
    
    this.router.navigate([], {
      relativeTo: this.p,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }
  
  clearFilters() {
    this.filters = {
      search: '',
      day: '',
      track: '',
      room: '',
    };
    this.router.navigate([], {
      relativeTo: this.p,
      queryParams: {}
    });
  }
  
  hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.day || this.filters.track || this.filters.room);
  }
  
  date = (x: string) =>
    new Date(x).toLocaleDateString('en', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  time = (x: string) =>
    new Date(x).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
  duration = (s: Session) =>
    (new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000;
}
