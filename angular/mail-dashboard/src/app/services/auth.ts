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
}
