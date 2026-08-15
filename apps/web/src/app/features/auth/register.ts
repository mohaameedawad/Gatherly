import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
@Component({
  imports: [ReactiveFormsModule, RouterLink],
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
        <span class="eyebrow">Get started</span>
        <h2>Create your account</h2>
        <p>Sign up as an attendee to register for conferences.</p>
        <label>Name<input formControlName="name" type="text" /></label
        ><label>Email<input formControlName="email" type="email" /></label
        ><label>Password<input formControlName="password" type="password" /></label>
        @if (error()) {
          <div class="alert">{{ error() }}</div>
        }
        <button class="btn primary full" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Creating account…' : 'Create account' }}
        </button>
        <small>Already have an account? <a routerLink="/login" style="color: #6d5dfc; font-weight: 600;">Sign in</a></small>
      </form>
    </section>
  </main>`,
})
export class Register {
  private a = inject(AuthService);
  private r = inject(Router);
  loading = signal(false);
  error = signal('');
  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });
  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.a
      .register(this.form.value.name!, this.form.value.email!, this.form.value.password!)
      .subscribe({
        next: () => this.r.navigateByUrl('/verify-email'),
        error: (e) => {
          this.error.set(e.error?.message ?? 'Unable to create account');
          this.loading.set(false);
        },
      });
  }
}
