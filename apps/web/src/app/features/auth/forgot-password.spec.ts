import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { ForgotPassword } from './forgot-password';
import { AuthService } from '../../core/auth/auth.service';

describe('ForgotPassword Component', () => {
  let component: ForgotPassword;
  let fixture: ComponentFixture<ForgotPassword>;
  let authServiceMock: Partial<AuthService>;

  beforeEach(async () => {
    authServiceMock = {
      forgotPassword: vi
        .fn()
        .mockReturnValue(of({ message: 'If an account exists, a reset link has been sent.' })),
    };

    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Form validation', () => {
    it('is invalid when email is empty', () => {
      component.form.controls.email.setValue('');
      expect(component.form.invalid).toBe(true);
    });

    it('is invalid when email is malformed', () => {
      component.form.controls.email.setValue('not-an-email');
      expect(component.form.invalid).toBe(true);
    });

    it('is valid with a well-formed email', () => {
      component.form.controls.email.setValue('user@example.com');
      expect(component.form.valid).toBe(true);
    });
  });

  describe('submit()', () => {
    it('does not call authService.forgotPassword when the form is invalid', () => {
      component.form.controls.email.setValue('');
      component.submit();
      expect(authServiceMock.forgotPassword).not.toHaveBeenCalled();
    });

    it('calls authService.forgotPassword with the entered email and sets message() from the response', () => {
      component.form.controls.email.setValue('user@example.com');
      component.submit();

      expect(authServiceMock.forgotPassword).toHaveBeenCalledWith('user@example.com');
      expect(component.loading()).toBe(false);
      expect(component.message()).toBe('If an account exists, a reset link has been sent.');
    });

    it('sets the same generic message() on a transport/error response (non-enumeration UX)', () => {
      (authServiceMock.forgotPassword as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => ({ error: { message: 'Some backend detail that should not leak' } })),
      );
      component.form.controls.email.setValue('user@example.com');
      component.submit();

      expect(component.loading()).toBe(false);
      expect(component.message()).toBe(
        'If an account exists for this email, a password reset link has been sent.',
      );
    });
  });

  describe('Page structure', () => {
    it('renders the auth page and form sections', () => {
      const main = fixture.nativeElement.querySelector('main.auth-page');
      const form = fixture.nativeElement.querySelector('.auth-form');
      expect(main).toBeTruthy();
      expect(form).toBeTruthy();
    });
  });
});
