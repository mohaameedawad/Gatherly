import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ResetPassword } from './reset-password';
import { AuthService } from '../../core/auth/auth.service';

describe('ResetPassword Component', () => {
  let component: ResetPassword;
  let fixture: ComponentFixture<ResetPassword>;
  let authServiceMock: Partial<AuthService>;

  async function setup(token: string | null) {
    authServiceMock = {
      resetPassword: vi
        .fn()
        .mockReturnValue(of({ message: 'Your password has been reset.', reset: true })),
      user: signal(null) as any,
      accessToken: signal(null) as any,
    };

    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => token,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('No token in URL', () => {
    it('sets token() to null and does not render the reset form', async () => {
      await setup(null);
      expect(component.token()).toBeNull();

      const form = fixture.nativeElement.querySelector('form');
      expect(form).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Link missing');
    });

    it('submit() no-ops when token is missing, even with a valid-looking form', async () => {
      await setup(null);
      component.form.setValue({ password: 'longenough1', confirmPassword: 'longenough1' });
      component.submit();
      expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('Token present in URL', () => {
    it('sets token() from the query param', async () => {
      await setup('reset-token-abc');
      expect(component.token()).toBe('reset-token-abc');
    });

    it('creates the component and renders the reset form', async () => {
      await setup('reset-token-abc');
      expect(component).toBeTruthy();
      const form = fixture.nativeElement.querySelector('form');
      expect(form).toBeTruthy();
    });

    describe('Form validation', () => {
      it('requires the password to be at least 8 characters', async () => {
        await setup('reset-token-abc');
        const password = component.form.controls.password;
        password.setValue('short1');
        expect(password.hasError('minlength')).toBe(true);
        password.setValue('longenough1');
        expect(password.hasError('minlength')).toBe(false);
      });

      it('sets a mismatch error on confirmPassword when it differs from password, and clears it once they match', async () => {
        await setup('reset-token-abc');
        component.form.controls.password.setValue('longenough1');
        component.form.controls.confirmPassword.setValue('different1');
        expect(component.form.controls.confirmPassword.hasError('mismatch')).toBe(true);
        expect(component.form.invalid).toBe(true);

        component.form.controls.confirmPassword.setValue('longenough1');
        expect(component.form.controls.confirmPassword.hasError('mismatch')).toBe(false);
        expect(component.form.valid).toBe(true);
      });
    });

    describe('submit()', () => {
      it('no-ops when the form is invalid', async () => {
        await setup('reset-token-abc');
        component.form.controls.password.setValue('short');
        component.form.controls.confirmPassword.setValue('short');
        component.submit();
        expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
      });

      it('calls authService.resetPassword with the token and new password', async () => {
        await setup('reset-token-abc');
        component.form.setValue({ password: 'longenough1', confirmPassword: 'longenough1' });
        component.submit();
        expect(authServiceMock.resetPassword).toHaveBeenCalledWith(
          'reset-token-abc',
          'longenough1',
        );
      });

      it('on success sets success() from the response message and shows the success state', async () => {
        await setup('reset-token-abc');
        component.form.setValue({ password: 'longenough1', confirmPassword: 'longenough1' });
        component.submit();
        fixture.detectChanges();

        expect(component.loading()).toBe(false);
        expect(component.success()).toBe('Your password has been reset.');
        expect(component.error()).toBe('');
        expect(fixture.nativeElement.textContent).toContain('Password reset');
      });

      it('CRITICAL (AC3): on success does NOT persist a session or mutate auth state — no silent re-login after a revoking reset', async () => {
        await setup('reset-token-abc');
        component.form.setValue({ password: 'longenough1', confirmPassword: 'longenough1' });
        component.submit();

        // The mocked AuthService only exposes resetPassword — no persist-adjacent method
        // (login/register/changePassword) exists on the mock at all, so if the component
        // tried to call any of them it would throw. Additionally assert the auth signals
        // themselves were never written to.
        expect((authServiceMock.user as ReturnType<typeof signal>)()).toBeNull();
        expect((authServiceMock.accessToken as ReturnType<typeof signal>)()).toBeNull();
        expect(localStorage.getItem('tf_access')).toBeNull();
        expect(localStorage.getItem('tf_refresh')).toBeNull();
        expect(localStorage.getItem('tf_user')).toBeNull();
      });

      it('on error sets error() from e.error.message', async () => {
        await setup('reset-token-abc');
        (authServiceMock.resetPassword as ReturnType<typeof vi.fn>).mockReturnValue(
          throwError(() => ({ error: { message: 'Token expired' } })),
        );
        component.form.setValue({ password: 'longenough1', confirmPassword: 'longenough1' });
        component.submit();

        expect(component.loading()).toBe(false);
        expect(component.error()).toBe('Token expired');
        expect(component.success()).toBe('');
      });

      it('on error without a message falls back to the default expired-link text', async () => {
        await setup('reset-token-abc');
        (authServiceMock.resetPassword as ReturnType<typeof vi.fn>).mockReturnValue(
          throwError(() => ({})),
        );
        component.form.setValue({ password: 'longenough1', confirmPassword: 'longenough1' });
        component.submit();

        expect(component.error()).toBe('This password reset link is invalid or has expired');
      });
    });
  });
});
