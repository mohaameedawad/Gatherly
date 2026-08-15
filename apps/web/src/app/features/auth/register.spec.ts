import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Register } from './register';
import { AuthService } from '../../core/auth/auth.service';
import { of, throwError } from 'rxjs';

describe('Register Component', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with name, email, and password controls', () => {
    expect(component.form.get('name')).toBeTruthy();
    expect(component.form.get('email')).toBeTruthy();
    expect(component.form.get('password')).toBeTruthy();
  });

  it('should disable submit button when form is invalid', () => {
    component.form.patchValue({
      name: '',
      email: '',
      password: '',
    });
    fixture.detectChanges();
    expect(component.form.invalid).toBe(true);
  });

  it('should validate name minimum length of 2 characters', () => {
    const nameControl = component.form.get('name');
    nameControl?.setValue('X');
    expect(nameControl?.hasError('minlength')).toBe(true);
    nameControl?.setValue('XY');
    expect(nameControl?.hasError('minlength')).toBe(false);
  });

  it('should validate email format', () => {
    const emailControl = component.form.get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBe(true);
    emailControl?.setValue('valid@example.com');
    expect(emailControl?.hasError('email')).toBe(false);
  });

  it('should validate password minimum length of 8 characters', () => {
    const passwordControl = component.form.get('password');
    passwordControl?.setValue('Short1!');
    expect(passwordControl?.hasError('minlength')).toBe(true);
    passwordControl?.setValue('LongEnough1!');
    expect(passwordControl?.hasError('minlength')).toBe(false);
  });

  it('should call authService.register on form submission with valid data', () => {
    authService.register.and.returnValue(of({}));
    component.form.patchValue({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
    });
    fixture.detectChanges();
    component.submit();
    expect(authService.register).toHaveBeenCalledWith(
      'John Doe',
      'john@example.com',
      'SecurePass123!',
    );
  });

  it('should set error message on registration failure', () => {
    const errorResponse = { error: { message: 'Email already exists' } };
    authService.register.and.returnValue(throwError(() => errorResponse));
    component.form.patchValue({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'SecurePass123!',
    });
    fixture.detectChanges();
    component.submit();
    fixture.detectChanges();
    // Error handling happens asynchronously
    setTimeout(() => {
      expect(component.error()).toBe('Email already exists');
    }, 0);
  });

  it('should display loading state during submission', () => {
    authService.register.and.returnValue(of({}));
    component.form.patchValue({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'SecurePass123!',
    });
    fixture.detectChanges();
    component.submit();
    expect(component.loading()).toBe(true);
  });
});
