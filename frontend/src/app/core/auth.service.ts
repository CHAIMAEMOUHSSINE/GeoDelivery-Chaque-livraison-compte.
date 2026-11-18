import { Injectable, inject, signal } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';

interface Session { token: string; email: string; role: string; }
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  session = signal<Session | null>(this.restore());
  private restore(): Session | null {
    try {
      const s = JSON.parse(sessionStorage.getItem('gd-session') || 'null');
      if (s && JSON.parse(atob(s.token.split('.')[1])).exp * 1000 > Date.now()) return s;
    } catch { /* session expiree ou invalide */ }
    sessionStorage.removeItem('gd-session'); return null;
  }
  async login(email: string, password: string) {
    const session = await this.api.post<Session>('auth/login', { email, password });
    sessionStorage.setItem('gd-session', JSON.stringify(session)); this.session.set(session);
    await this.router.navigateByUrl(session.role === 'DRIVER' ? '/routes' : '/dashboard');
  }
  logout() { sessionStorage.removeItem('gd-session'); this.session.set(null); void this.router.navigateByUrl('/login'); }
}
export const authGuard: CanActivateFn = () => inject(AuthService).session() ? true : inject(Router).createUrlTree(['/login']);
export const dispatchGuard: CanActivateFn = () => inject(AuthService).session()?.role !== 'DRIVER' ? true : inject(Router).createUrlTree(['/routes']);
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService), token = auth.session()?.token;
  return next(token && req.url.startsWith('/api/') ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req)
    .pipe(catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.endsWith('/auth/login')) auth.logout();
      return throwError(() => error);
    }));
};
