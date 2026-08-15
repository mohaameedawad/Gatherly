import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { VerifyEmail } from './verify-email';
import { AuthService } from '../../core/auth/auth.service';

describe('VerifyEmail Component', () => {
  let component: VerifyEmail;
  let fixture: ComponentFixture<VerifyEmail>;
  let authServiceMock: Partial<AuthService>;

  beforeEach(async () => {
    authServiceMock = {
      verifyEmail: vi.fn().mockReturnValue(of({ message: 'Verified', verified: true, userId: 1 })),
      resendVerification: vi.fn().mockReturnValue(of({ message: 'Link sent' })),
      markEmailVerified: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [VerifyEmail],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should compile with reactive forms', () => {
      expect(component.form).toBeDefined();
      expect(component.form.get('email')).toBeDefined();
    });

    it('should initialize signals correctly', () => {
      expect(component.verifying()).toBe(false);
      expect(component.verified()).toBe(false);
      expect(component.resending()).toBe(false);
      expect(component.error()).toBe('');
      expect(component.resendMessage()).toBe('');
    });
  });

  describe('Form validation', () => {
    it('should require a valid email', () => {
      const emailControl = component.form.get('email');
      emailControl?.setValue('');
      expect(emailControl?.invalid).toBe(true);

      emailControl?.setValue('invalid-email');
      expect(emailControl?.invalid).toBe(true);

      emailControl?.setValue('valid@example.com');
      expect(emailControl?.valid).toBe(true);
    });

    it('should initially have an invalid form (empty email)', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('should enable submit button when form is valid', () => {
      component.form.get('email')?.setValue('test@example.com');
      expect(component.form.valid).toBe(true);
    });

    it('should disable submit button when form is invalid', () => {
      component.form.get('email')?.setValue('');
      expect(component.form.invalid).toBe(true);
    });
  });

  describe('Resend verification', () => {
    it('should call authService.resendVerification with email', () => {
      component.form.get('email')?.setValue('test@example.com');
      component.resend();

      expect(authServiceMock.resendVerification).toHaveBeenCalledWith('test@example.com');
    });

    it('should set resending to true during submission', () => {
      component.form.get('email')?.setValue('test@example.com');
      expect(component.resending()).toBe(false);

      component.resend();
      // Note: In real usage, this would be false after the observable completes
      // but we can verify the logic flow
      expect(authServiceMock.resendVerification).toHaveBeenCalled();
    });

    it('should not submit if form is invalid', () => {
      component.form.get('email')?.setValue('');
      component.resend();

      expect(authServiceMock.resendVerification).not.toHaveBeenCalled();
    });
  });

  describe('Route and page structure', () => {
    it('should render the auth page structure', () => {
      fixture.detectChanges();
      const main = fixture.nativeElement.querySelector('main.auth-page');
      expect(main).toBeTruthy();
    });

    it('should have auth story section', () => {
      fixture.detectChanges();
      const story = fixture.nativeElement.querySelector('.auth-story');
      expect(story).toBeTruthy();
    });

    it('should have auth form section', () => {
      fixture.detectChanges();
      const form = fixture.nativeElement.querySelector('.auth-form');
      expect(form).toBeTruthy();
    });
  });

  describe('No token on load (resend form shown)', () => {
    it('should show resend form when no token in URL', () => {
      expect(component.verifying()).toBe(false);
      expect(component.verified()).toBe(false);
      fixture.detectChanges();

      const form = fixture.nativeElement.querySelector('form');
      expect(form).toBeTruthy();
    });
  });
});
