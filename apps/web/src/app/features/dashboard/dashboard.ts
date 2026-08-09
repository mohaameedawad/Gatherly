import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Conference } from '../../core/models/models';
import { AuthService } from '../../core/auth/auth.service';
@Component({
  imports: [RouterLink],
  template: `<header class="page-head">
      <div>
        <span class="eyebrow">Live conference operations</span>
        <h1>Bring people and ideas together.</h1>
        <p>
          One product for discovery, registration, schedules, speakers, and the on-site experience.
        </p>
      </div>
      <a class="btn primary" routerLink="/conferences">Explore events</a>
    </header>
    <section class="stats">
      <article>
        <span>Upcoming conferences</span><strong>{{ published() }}</strong
        ><small class="positive">Open for discovery</small>
      </article>
      <article>
        <span>Available seats</span><strong>{{ capacity() }}</strong
        ><small>Across the program</small>
      </article>
      <article>
        <span>Your role</span><strong class="role-stat">{{ auth.user()?.role }}</strong
        ><small>Role-sensitive workspace</small>
      </article>
    </section>
    <section class="section-head">
      <div>
        <h2>Coming up</h2>
        <p>Curated gatherings for builders and leaders.</p>
      </div>
    </section>
    <div class="project-grid">
      @for (c of conferences(); track c.id) {
        <a
          class="card project-card event-card"
          [routerLink]="['/conferences', c.id]"
          [style.--event-color]="c.theme"
          ><div class="event-date">
            <strong>{{ day(c.startsAt) }}</strong
            ><span>{{ month(c.startsAt) }}</span>
          </div>
          <span class="status" [attr.data-status]="c.status">{{ c.status }}</span>
          <h3>{{ c.title }}</h3>
          <p>{{ c.summary }}</p>
          <footer>
            <span>⌖ {{ c.city }}</span
            ><span>◎ {{ c.capacity }} seats</span>
          </footer></a
        >
      }
    </div>`,
})
export class Dashboard {
  api = inject(ApiService);
  auth = inject(AuthService);
  conferences = signal<Conference[]>([]);
  published = () => this.conferences().filter((x) => x.status === 'PUBLISHED').length;
  capacity = () => this.conferences().reduce((s, x) => s + x.capacity, 0);
  day = (x: string) => new Date(x).getDate();
  month = (x: string) => new Date(x).toLocaleString('en', { month: 'short' });
  constructor() {
    this.api.conferences().subscribe((x) => this.conferences.set(x));
  }
}
