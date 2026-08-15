import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `<main class="auth-page">
    <section class="auth-story">
      <a class="brand"><span class="brand-mark">G</span>Gatherly</a>
      <div>
        <span class="pill">Conference platform</span>
        <h1>Confirm<br /><em>your email.</em></h1>
        <p>
          Verifying your address unlocks conference registration and the full attendee experience.
        </p>
      </div>
      <blockquote>
        “The hallway conversation starts with a thoughtful schedule.”
        <footer>— Gatherly principle</footer>
      </blockquote>
    </section>
    <section class="auth-form">
      @if (verifying()) {
        <span class="eyebrow">One moment</span>
        <h2>Verifying your email…</h2>
      } @else if (verified()) {
        <span class="eyebrow">All set</span>
        <h2>Email verified</h2>
        <div class="alert" style="background: #dff3e7; color: #16856b;">Your email address has been verified.</div>
        <a class="btn primary full" routerLink="/login">Continue to sign in</a>
      } @else if (!error()) {
        <span class="eyebrow">Check your inbox</span>
        <h2>Verification email sent</h2>
        <div class="alert" style="background: #dff3e7; color: #16856b;">
          We've sent a verification link to your email address. Click the link to verify your account.
        </div>
        <div class="alert" style="background: #fff0d9; color: #9b641b; margin-top: 1rem;">
          <strong>Development mode:</strong> Check the <strong>API terminal console</strong> for the verification link
          (emails are not sent in workshop mode).
        </div>
        <p style="color: var(--muted); margin: 1.5rem 0;">
          Didn't see it? Check your spam folder or request a new link below.
        </p>
        <form [formGroup]="form" (ngSubmit)="resend()">
          <label>Email<input formControlName="email" type="email" /></label>
          @if (resendMessage()) {
            <div class="alert" style="background: #dff3e7; color: #16856b;">{{ resendMessage() }}</div>
          }
          <button class="btn primary full" [disabled]="form.invalid || resending()">
            {{ resending() ? 'Sending…' : 'Resend verification link' }}
          </button>
        </form>
        <small
          >Already verified?
          <a routerLink="/login" style="color: #6d5dfc; font-weight: 600;">Sign in</a></small
        >
      } @else {
        <span class="eyebrow">Verify email</span>
        <h2>Verification failed</h2>
        @if (error()) {
          <div class="alert">{{ error() }}</div>
        }
        <p>The verification link may be invalid or expired. Enter your email to receive a new one.</p>
        <form [formGroup]="form" (ngSubmit)="resend()">
          <label>Email<input formControlName="email" type="email" /></label>
          @if (resendMessage()) {
            <div class="alert" style="background: #dff3e7; color: #16856b;">{{ resendMessage() }}</div>
          }
          <button class="btn primary full" [disabled]="form.invalid || resending()">
            {{ resending() ? 'Sending…' : 'Resend verification link' }}
          </button>
        </form>
        <small
          >Already verified?
          <a routerLink="/login" style="color: #6d5dfc; font-weight: 600;">Sign in</a></small
        >
      }
    </section>
  </main>`,
})
export class VerifyEmail {
  private a = inject(AuthService);
  private route = inject(ActivatedRoute);
  verifying = signal(false);
  verified = signal(false);
  resending = signal(false);
  error = signal('');
  resendMessage = signal('');
  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });
  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.verifying.set(true);
      this.a.verifyEmail(token).subscribe({
        next: (r) => {
          this.verifying.set(false);
          this.verified.set(true);
          this.a.markEmailVerified(r.userId);
        },
        error: (e) => {
          this.verifying.set(false);
          this.error.set(e.error?.message ?? 'This verification link is invalid or has expired');
        },
      });
    }
  }
  resend() {
    if (this.form.invalid) return;
    this.resending.set(true);
    this.error.set('');
    this.resendMessage.set('');
    this.a.resendVerification(this.form.value.email!).subscribe({
      next: (r) => {
        this.resending.set(false);
        this.resendMessage.set(r.message);
      },
      error: (e) => {
        this.resending.set(false);
        this.error.set(e.error?.message ?? 'Unable to send verification link');
      },
    });
  }
}
