import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  is_verified: number;
  is_suspended: boolean;
  is_banned: boolean;
  created_at: string;
}

export interface Payment {
  id: number;
  name: string;
  email: string;
  plan: string;
  amount: number;
  status: string;
  created_at: string;
  phone?: string;
  payment_method?: string;
}

export interface AdminStats {
  total_users: number;
  total_admins: number;
  verified_users: number;
  premium_users: number;
  total_payments: number;
  total_revenue: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = `${environment.apiUrl}/api/admin`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.api}/stats`);
  }

  getUsers(page = 1, limit = 100): Observable<{ users: AdminUser[]; total: number; page: number; pages: number }> {
    return this.http.get<{ users: AdminUser[]; total: number; page: number; pages: number }>(
      `${this.api}/users?page=${page}&limit=${limit}`
    );
  }

  createUser(user: Partial<AdminUser> & { password?: string }): Observable<any> {
    return this.http.post(`${this.api}/users`, user);
  }

  updateUser(id: number, user: Partial<AdminUser>): Observable<any> {
    return this.http.put(`${this.api}/users/${id}`, user);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.api}/users/${id}`);
  }

  getPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.api}/payments`);
  }

  createPayment(payment: any): Observable<any> {
    return this.http.post(`${this.api}/payments`, payment);
  }

  deletePayment(id: number): Observable<any> {
    return this.http.delete(`${this.api}/payments/${id}`);
  }

  confirmPayment(id: number): Observable<any> {
    return this.http.post(`${this.api}/payments/${id}/confirm`, {});
  }

  suspendUser(id: number, suspended: boolean): Observable<any> {
    return this.http.patch(`${this.api}/users/${id}/suspend`, { is_suspended: suspended });
  }

  banUser(id: number, banned: boolean): Observable<any> {
    return this.http.patch(`${this.api}/users/${id}/ban`, { is_banned: banned });
  }

  getUserEmailsAdmin(email: string): Observable<{ emails: any[]; error?: string }> {
    return this.http.get<{ emails: any[]; error?: string }>(`${this.api}/users/${encodeURIComponent(email)}/emails`);
  }

  getGmailScopeStatus(): Observable<{ users: GmailScopeUser[]; total: number; upgraded: number; pending: number }> {
    return this.http.get<{ users: GmailScopeUser[]; total: number; upgraded: number; pending: number }>(`${this.api}/gmail-scope-status`);
  }

  resetGmailScope(email: string = 'all'): Observable<{ success: boolean; reset_count: number }> {
    return this.http.post<{ success: boolean; reset_count: number }>(`${this.api}/reset-gmail-scope`, { email });
  }

  getUserActivity(): Observable<UserActivity[]> {
    return this.http.get<UserActivity[]>(`${this.api}/user-activity`);
  }

  getBackups(): Observable<Backup[]> {
    return this.http.get<Backup[]>(`${this.api}/backups`);
  }

  createBackup(): Observable<any> {
    return this.http.post(`${this.api}/backups/create`, {});
  }

  deleteBackup(id: number): Observable<any> {
    return this.http.delete(`${this.api}/backups/${id}`);
  }

  getBackupDownloadUrl(id: number): string {
    return `${this.api}/backups/${id}/download`;
  }
}

export interface GmailScopeUser {
  email: string;
  name: string;
  has_scope: boolean;
  gmail_connected_email: string | null;
}

export interface Backup {
  id: number;
  label: string;
  size_bytes: number;
  nb_users: number;
  nb_payments: number;
  created_at: string;
}

export interface UserActivity {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  login_count: number;
  last_login: string | null;
  gmail_connected: boolean;
  created_at: string;
}
