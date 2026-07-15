import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = `${environment.apiUrl}/api/auth`;
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {}

  register(
    name: string, email: string, password: string,
    phone?: string, gmail_address?: string,
    telegram_chat_id?: string, green_api_instance?: string, green_api_token?: string
  ): Observable<any> {
    return this.http.post(`${this.api}/register`,
      { name, email, password, phone, gmail_address, telegram_chat_id, green_api_instance, green_api_token },
      { headers: this.headers }
    ).pipe(timeout(30000));
  }

  verifyOtp(email: string, code: string): Observable<any> {
    return this.http.post(`${this.api}/verify-otp`, { email, code }, { headers: this.headers })
      .pipe(timeout(15000));
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.api}/login`, { email, password }, { headers: this.headers })
      .pipe(timeout(15000));
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.api}/forgot-password`, { email }, { headers: this.headers })
      .pipe(timeout(15000));
  }

  resetPassword(email: string, code: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.api}/reset-password`, { email, code, newPassword }, { headers: this.headers })
      .pipe(timeout(15000));
  }

  googleLogin(credential: string): Observable<any> {
    return this.http.post(`${this.api}/google-login`, { credential }, { headers: this.headers })
      .pipe(timeout(15000));
  }

  googleLoginCode(code: string): Observable<any> {
    return this.http.post(`${this.api}/google-code`, { code }, { headers: this.headers })
      .pipe(timeout(15000));
  }

  googleLoginToken(accessToken: string): Observable<any> {
    return this.http.post(`${this.api}/google-token`, { access_token: accessToken }, { headers: this.headers })
      .pipe(timeout(15000));
  }

  getPublicConfig(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/api/config`).pipe(timeout(10000));
  }

  logout(): Observable<any> {
    return this.http.post(`${this.api}/logout`, {}).pipe(timeout(10000));
  }

  verify2fa(tempToken: string, code: string): Observable<any> {
    return this.http.post(`${this.api}/2fa/validate`, { temp_token: tempToken, code }, { headers: this.headers })
      .pipe(timeout(15000));
  }

  toggle2fa(password: string, enabled: boolean): Observable<any> {
    return this.http.post(`${this.api}/2fa/toggle`, { password, enabled }, { headers: this.headers })
      .pipe(timeout(15000));
  }
}
