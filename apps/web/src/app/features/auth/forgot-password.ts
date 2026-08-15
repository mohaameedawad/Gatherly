import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `<main class="auth-page">
    <section class="auth-story">
      <a class="brand"><span class="brand-mark">G</span>Gatherly</a>
      <div>
        <span class="pill">Conference platform</span>
        <h1>Forgot<br /><em>your password?</em></h1>
        <p>Enter your email and we'll send you a link to reset your password.</p>
      </div>
      <blockquote>
        “The hallway conversation starts with a thoughtful schedule.”
        <footer>— Gatherly principle</footer>
      </blockquote>
    </section>
    <section class="auth-form">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <span class="eyebrow">Reset password</span>
        <h2>Forgot your password?</h2>
        <p>We'll email you a link to reset it.</p>
        <label>Email<input formControlName="email" type="email" /></label>
        @if (message()) {
          <div class="alert" style="background: #dff3e7; color: #16856b;">{{ message() }}</div>
        }
        <div class="alert" style="background: #fff0d9; color: #9b641b; margin-top: 1rem;">
          <strong>Development mode:</strong> Check the <strong>API terminal console</strong> for the
          reset link (emails are not sent in workshop mode).
        </div>
        <button class="btn primary full" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Sending…' : 'Send reset link' }}
        </button>
        <small
          >Remembered it?
          <a routerLink="/login" style="color: #6d5dfc; font-weight: 600;">Sign in</a></small
        >
      </form>
    </section>
  </main>`,
})
export class ForgotPassword {
  private a = inject(AuthService);
  loading = signal(false);
  message = signal('');
  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });
  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.a.forgotPassword(this.form.value.email!).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.message.set(r.message);
      },
      error: () => {
        this.loading.set(false);
        this.message.set(
          'If an account exists for this email, a password reset link has been sent.',
        );
      },
    });
  }
}
