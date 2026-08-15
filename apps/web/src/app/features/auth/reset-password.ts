import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
function matchPassword(passwordControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.parent?.get(passwordControlName);
    if (!password) return null;
    return control.value === password.value ? null : { mismatch: true };
  };
}
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `<main class="auth-page">
    <section class="auth-story">
      <a class="brand"><span class="brand-mark">G</span>Gatherly</a>
      <div>
        <span class="pill">Conference platform</span>
        <h1>Reset<br /><em>your password.</em></h1>
        <p>Choose a new password to get back into your account.</p>
      </div>
      <blockquote>
        “The hallway conversation starts with a thoughtful schedule.”
        <footer>— Gatherly principle</footer>
      </blockquote>
    </section>
    <section class="auth-form">
      @if (!token()) {
        <span class="eyebrow">Reset password</span>
        <h2>Link missing</h2>
        <div class="alert">This link is missing its reset token.</div>
        <a class="btn primary full" routerLink="/forgot-password">Request a new link</a>
      } @else if (success()) {
        <span class="eyebrow">All set</span>
        <h2>Password reset</h2>
        <div class="alert" style="background: #dff3e7; color: #16856b;">{{ success() }}</div>
        <a class="btn primary full" routerLink="/login">Continue to sign in</a>
      } @else if (error()) {
        <span class="eyebrow">Reset password</span>
        <h2>Reset failed</h2>
        <div class="alert">{{ error() }}</div>
        <a class="btn primary full" routerLink="/forgot-password">Request a new link</a>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <span class="eyebrow">Reset password</span>
          <h2>Choose a new password</h2>
          <label>New password<input formControlName="password" type="password" /></label
          ><label
            >Confirm new password<input formControlName="confirmPassword" type="password"
          /></label>
          @if (
            form.controls.confirmPassword.touched &&
            form.controls.confirmPassword.errors?.['mismatch']
          ) {
            <div class="alert">Passwords do not match.</div>
          }
          <button class="btn primary full" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Resetting…' : 'Reset password' }}
          </button>
        </form>
      }
    </section>
  </main>`,
})
export class ResetPassword {
  private a = inject(AuthService);
  private route = inject(ActivatedRoute);
  token = signal<string | null>(null);
  loading = signal(false);
  success = signal('');
  error = signal('');
  form = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, matchPassword('password')],
    }),
  });
  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    this.token.set(token);
  }
  submit() {
    if (this.form.invalid || !this.token()) return;
    this.loading.set(true);
    this.error.set('');
    this.a.resetPassword(this.token()!, this.form.value.password!).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.success.set(r.message);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.error?.message ?? 'This password reset link is invalid or has expired');
      },
    });
  }
}
