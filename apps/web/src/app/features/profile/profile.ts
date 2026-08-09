import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
@Component({
  template: `<header class="page-head">
      <div>
        <span class="eyebrow">Account</span>
        <h1>Your profile</h1>
      </div>
    </header>
    <section class="card profile">
      <span class="avatar large">{{ auth.user()?.avatar }}</span>
      <h2>{{ auth.user()?.name }}</h2>
      <p>{{ auth.user()?.email }}</p>
      <span class="role">{{ auth.user()?.role }}</span>
    </section>`,
})
export class Profile {
  auth = inject(AuthService);
}
