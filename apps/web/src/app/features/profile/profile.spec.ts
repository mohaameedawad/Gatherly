import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { Profile } from './profile';
import { AuthService } from '../../core/auth/auth.service';
import { User } from '../../core/models/models';

describe('Profile Component', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let authServiceMock: Partial<AuthService>;

  const testUser: User = {
    id: 1,
    name: 'Jane Attendee',
    email: 'jane@example.com',
    role: 'ATTENDEE' as any,
    avatar: 'JA',
    active: true,
    emailVerified: true,
  };

  beforeEach(async () => {
    authServiceMock = {
      user: signal<User | null>(testUser) as any,
      changePassword: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Read-only profile display', () => {
    it('renders name, email, role, and avatar from auth.user()', () => {
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Jane Attendee');
      expect(text).toContain('jane@example.com');
      expect(text).toContain('ATTENDEE');
      expect(fixture.nativeElement.querySelector('.avatar.large').textContent).toContain('JA');
    });
  });

  describe('Change password form validation', () => {
    it('requires currentPassword, newPassword, and confirmNewPassword', () => {
      expect(component.form.controls.currentPassword.hasError('required')).toBe(true);
      expect(component.form.controls.newPassword.hasError('required')).toBe(true);
      expect(component.form.controls.confirmNewPassword.hasError('required')).toBe(true);
      expect(component.form.invalid).toBe(true);
    });

    it('enforces a minimum length of 8 on newPassword', () => {
      const newPassword = component.form.controls.newPassword;
      newPassword.setValue('short1');
      expect(newPassword.hasError('minlength')).toBe(true);
      newPassword.setValue('longenough1');
      expect(newPassword.hasError('minlength')).toBe(false);
    });

    it('sets a mismatch error on confirmNewPassword when it differs, and clears it once matching', () => {
      component.form.controls.newPassword.setValue('longenough1');
      component.form.controls.confirmNewPassword.setValue('different1');
      expect(component.form.controls.confirmNewPassword.hasError('mismatch')).toBe(true);

      component.form.controls.confirmNewPassword.setValue('longenough1');
      expect(component.form.controls.confirmNewPassword.hasError('mismatch')).toBe(false);
    });
  });

  describe('submit()', () => {
    it('no-ops when the form is invalid', () => {
      component.submit();
      expect(authServiceMock.changePassword).not.toHaveBeenCalled();
    });

    it('calls auth.changePassword with currentPassword and newPassword on valid submit', () => {
      component.form.setValue({
        currentPassword: 'oldpass1',
        newPassword: 'newpass123',
        confirmNewPassword: 'newpass123',
      });
      component.submit();
      expect(authServiceMock.changePassword).toHaveBeenCalledWith('oldpass1', 'newpass123');
    });

    it('on success sets success() to "Password changed." and resets the form', () => {
      component.form.setValue({
        currentPassword: 'oldpass1',
        newPassword: 'newpass123',
        confirmNewPassword: 'newpass123',
      });
      component.submit();

      expect(component.loading()).toBe(false);
      expect(component.success()).toBe('Password changed.');
      expect(component.error()).toBe('');
      expect(component.form.value.currentPassword).toBeFalsy();
      expect(component.form.value.newPassword).toBeFalsy();
      expect(component.form.value.confirmNewPassword).toBeFalsy();
    });

    it('on error sets error() from e.error.message', () => {
      (authServiceMock.changePassword as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => ({ error: { message: 'Current password is incorrect' } })),
      );
      component.form.setValue({
        currentPassword: 'wrongpass',
        newPassword: 'newpass123',
        confirmNewPassword: 'newpass123',
      });
      component.submit();

      expect(component.loading()).toBe(false);
      expect(component.error()).toBe('Current password is incorrect');
      expect(component.success()).toBe('');
    });

    it('on error without a message falls back to the default text', () => {
      (authServiceMock.changePassword as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => ({})),
      );
      component.form.setValue({
        currentPassword: 'wrongpass',
        newPassword: 'newpass123',
        confirmNewPassword: 'newpass123',
      });
      component.submit();

      expect(component.error()).toBe('Unable to change password');
    });
  });
});
