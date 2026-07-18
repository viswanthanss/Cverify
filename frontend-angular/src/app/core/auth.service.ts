import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, Observable } from 'rxjs';
import { TokenOut, User } from './models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'cverify_token';
  private readonly USER_KEY  = 'cverify_user';

  private _user = signal<User | null>(this._loadUser());
  readonly user   = this._user.asReadonly();
  readonly isLoggedIn      = computed(() => !!this._user());
  readonly isRecruiter     = computed(() => ['recruiter', 'admin'].includes(this._user()?.role ?? ''));
  readonly isAdmin         = computed(() => this._user()?.role === 'admin');
  readonly isCandidate     = computed(() => this._user()?.role === 'candidate');
  readonly isOnlyRecruiter = computed(() => this._user()?.role === 'recruiter');

  constructor(private http: HttpClient) {}

  get token(): string { return localStorage.getItem(this.TOKEN_KEY) ?? ''; }

  authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` };
  }

  login(email: string, password: string): Observable<TokenOut> {
    return this.http
      .post<TokenOut>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap(r => this._store(r)));
  }

  register(email: string, password: string, full_name: string, role: string, company?: string): Observable<TokenOut> {
    return this.http
      .post<TokenOut>(`${environment.apiUrl}/auth/register`, { email, password, full_name, role, company })
      .pipe(tap(r => this._store(r)));
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
  }

  private _store(r: TokenOut): void {
    localStorage.setItem(this.TOKEN_KEY, r.access_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(r.user));
    this._user.set(r.user);
  }

  private _loadUser(): User | null {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY) ?? 'null'); }
    catch { return null; }
  }
}
