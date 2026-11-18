import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Row } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  get<T = Row[]>(path: string): Promise<T> { return firstValueFrom(this.http.get<T>('/api/' + path)); }
  post<T = Row>(path: string, data: unknown): Promise<T> { return firstValueFrom(this.http.post<T>('/api/' + path, data)); }
  put<T = Row>(path: string, data: unknown): Promise<T> { return firstValueFrom(this.http.put<T>('/api/' + path, data)); }
  patch(path: string, data: unknown): Promise<void> { return firstValueFrom(this.http.patch<void>('/api/' + path, data)); }
  delete(path: string): Promise<void> { return firstValueFrom(this.http.delete<void>('/api/' + path)); }
}
export function errorMessage(e: any): string {
  if (e.status === 0 || e.status === 504) return 'API inaccessible. Vérifiez le backend et la connexion Oracle.';
  return e.error?.errors?.join(' · ') || e.error?.message || 'Une erreur est survenue. Réessayez.';
}
