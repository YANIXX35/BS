import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Email {
  id: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
  unread: boolean;
}

export interface EmailsPage {
  emails: Email[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface Status {
  running: boolean;
  email: string;
  telegram: boolean;
  whatsapp: boolean;
}

export interface Stats {
  total_messages: number;
  unread_count: number;
  email: string;
}

export interface UserSettings {
  name: string;
  email: string;
  phone: string;
  gmail_address: string;
  telegram_chat_id: string;
  green_api_instance: string;
  green_api_token: string;
  app_password?: string;
  app_password_set?: boolean;
  avatar?: string;
  theme_color?: string;
  font_family?: string;
  theme_mode?: string;
  theme_secondary?: string;
  theme_updated_at?: string;   // ISO timestamp — used for conflict detection
}

@Injectable({ providedIn: 'root' })
export class EmailService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  getEmails(email: string, page = 1, limit = 20): Observable<EmailsPage> {
    return this.http.get<EmailsPage>(`${this.apiUrl}/emails`, {
      params: { email, page: String(page), limit: String(limit) }
    });
  }

  getStatus(): Observable<Status> {
    return this.http.get<Status>(`${this.apiUrl}/status`);
  }

  getStats(email: string): Observable<Stats> {
    return this.http.get<Stats>(`${this.apiUrl}/stats`, { params: { email } });
  }

  getUserSettings(email: string): Observable<UserSettings> {
    // Ajouter timestamp pour casser le cache navigateur et garantir la synchronisation
    const timestamp = Date.now();
    return this.http.get<UserSettings>(`${this.apiUrl}/user/settings`, {
      params: { email, _t: timestamp },
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' }
    });
  }

  updateUserSettings(settings: Partial<UserSettings> & { email: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/settings`, settings);
  }

  savePreferences(email: string, prefs: { theme_color?: string; font_family?: string; avatar?: string; theme_mode?: string; theme_secondary?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/settings`, { email, ...prefs });
  }

  getWhatsappQr(email: string): Observable<{ type: string; message: string }> {
    return this.http.get<{ type: string; message: string }>(`${this.apiUrl}/user/whatsapp-qr`, { params: { email } });
  }

  getGmailConnectUrl(email: string): Observable<{ auth_url: string }> {
    return this.http.get<{ auth_url: string }>(`${this.apiUrl}/auth/gmail-connect`, { params: { email } });
  }

  getGmailStatus(email: string): Observable<{ connected: boolean }> {
    return this.http.get<{ connected: boolean }>(`${this.apiUrl}/auth/gmail-status`, { params: { email } });
  }

  testGmailImap(gmail_address: string, app_password: string): Observable<{ success: boolean; message?: string; error?: string }> {
    return this.http.post<{ success: boolean; message?: string; error?: string }>(
      `${this.apiUrl}/auth/gmail-test`,
      { gmail_address, app_password }
    );
  }
}
