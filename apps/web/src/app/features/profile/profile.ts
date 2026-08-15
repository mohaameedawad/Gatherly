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
import { AuthService } from '../../core/auth/auth.service';
function matchPassword(passwordControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.parent?.get(passwordControlName);
    if (!password) return null;
    return control.value === password.value ? null : { mismatch: true };
  };
}
@Component({
  imports: [ReactiveFormsModule],
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
    </section>
    <section class="card">
      <span class="eyebrow">Security</span>
      <h2>Change password</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Current password<input formControlName="currentPassword" type="password" /></label
        ><label>New password<input formControlName="newPassword" type="password" /></label
        ><label
          >Confirm new password<input formControlName="confirmNewPassword" type="password"
        /></label>
        @if (
          form.controls.confirmNewPassword.touched &&
          form.controls.confirmNewPassword.errors?.['mismatch']
        ) {
          <div class="alert">Passwords do not match.</div>
        }
        @if (success()) {
          <div class="alert" style="background: #dff3e7; color: #16856b;">{{ success() }}</div>
        }
        @if (error()) {
          <div class="alert">{{ error() }}</div>
        }
        <button class="btn primary full" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Changing…' : 'Change password' }}
        </button>
      </form>
    </section>`,
})
export class Profile {
  auth = inject(AuthService);
  loading = signal(false);
  success = signal('');
  error = signal('');
  form = new FormGroup({
    currentPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmNewPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, matchPassword('newPassword')],
    }),
  });
  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.success.set('');
    this.error.set('');
    this.auth
      .changePassword(this.form.value.currentPassword!, this.form.value.newPassword!)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set('Password changed.');
          this.form.reset();
        },
        error: (e) => {
          this.loading.set(false);
          this.error.set(e.error?.message ?? 'Unable to change password');
        },
      });
  }
}
