import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { User } from '../models/models';
const API = 'http://localhost:3000/api';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  user = signal<User | null>(this.read<User>('tf_user'));
  accessToken = signal(localStorage.getItem('tf_access'));
  isAuthenticated = computed(() => !!this.user() && !!this.accessToken());
  login(email: string, password: string) {
    return this.http
      .post<any>(`${API}/auth/login`, { email, password })
      .pipe(tap((r) => this.persist(r)));
  }
  register(name: string, email: string, password: string) {
    return this.http
      .post<any>(`${API}/auth/register`, { name, email, password })
      .pipe(tap((r) => this.persist(r)));
  }
  verifyEmail(token: string) {
    return this.http.post<{ message: string; verified: boolean; userId: number }>(
      `${API}/auth/verify-email`,
      { token },
    );
  }
  resendVerification(email: string) {
    return this.http.post<{ message: string }>(`${API}/auth/resend-verification`, { email });
  }
  markEmailVerified(userId: number) {
    const u = this.user();
    if (!u || u.id !== userId) return;
    const updated = { ...u, emailVerified: true };
    this.user.set(updated);
    localStorage.setItem('tf_user', JSON.stringify(updated));
  }
  private persist(r: any) {
    localStorage.setItem('tf_access', r.accessToken);
    localStorage.setItem('tf_refresh', r.refreshToken);
    localStorage.setItem('tf_user', JSON.stringify(r.user));
    this.accessToken.set(r.accessToken);
    this.user.set(r.user);
  }
  logout() {
    localStorage.removeItem('tf_access');
    localStorage.removeItem('tf_refresh');
    localStorage.removeItem('tf_user');
    this.user.set(null);
    this.accessToken.set(null);
    this.router.navigateByUrl('/login');
  }
  hasRole(...r: string[]) {
    return !!this.user() && r.includes(this.user()!.role);
  }
  private read<T>(k: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(k) ?? 'null');
    } catch {
      return null;
    }
  }
}
