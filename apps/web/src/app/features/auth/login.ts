import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
@Component({
  imports: [ReactiveFormsModule],
  template: `<main class="auth-page">
    <section class="auth-story">
      <a class="brand"><span class="brand-mark">G</span>Gatherly</a>
      <div>
        <span class="pill">Conference platform</span>
        <h1>Where ideas<br /><em>gather.</em></h1>
        <p>
          Discover conferences, design your agenda, and give organizers one calm place to run the
          experience.
        </p>
      </div>
      <blockquote>
        “The hallway conversation starts with a thoughtful schedule.”
        <footer>— Gatherly principle</footer>
      </blockquote>
    </section>
    <section class="auth-form">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <span class="eyebrow">Welcome</span>
        <h2>Sign in to Gatherly</h2>
        <p>Explore the product through any workshop role.</p>
        <label>Email<input formControlName="email" type="email" /></label
        ><label>Password<input formControlName="password" type="password" /></label>
        @if (error()) {
          <div class="alert">{{ error() }}</div>
        }
        <button class="btn primary full" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>
        <div class="demo-users">
          <button type="button" (click)="fill('admin')">Admin</button
          ><button type="button" (click)="fill('organizer')">Organizer</button
          ><button type="button" (click)="fill('speaker')">Speaker</button
          ><button type="button" (click)="fill('attendee')">Attendee</button>
        </div>
        <small>All demo passwords: <code>Workshop123!</code></small>
      </form>
    </section>
  </main>`,
})
export class Login {
  private a = inject(AuthService);
  private r = inject(Router);
  loading = signal(false);
  error = signal('');
  form = new FormGroup({
    email: new FormControl('attendee@gatherly.dev', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { // Workshop123!
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  fill(role: string) {
    this.form.controls.email.setValue(`${role}@gatherly.dev`);
  }
  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.a.login(this.form.value.email!, this.form.value.password!).subscribe({
      next: () => this.r.navigateByUrl('/dashboard'),
      error: (e) => {
        this.error.set(e.error?.message ?? 'Unable to sign in');
        this.loading.set(false);
      },
    });
  }
}
