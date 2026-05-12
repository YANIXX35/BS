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
  category?: 'important' | 'newsletter' | 'normal';
}

export interface EmailDetail extends Email {
  to: string;
  body: string;
  body_type: string;
  category: 'important' | 'newsletter' | 'normal';
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

export interface AiEmailItem {
  id: string;
  category: 'important' | 'newsletter' | 'normal';
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AiAnalysis {
  summary: string;
  urgent_count: number;
  important_count: number;
  newsletter_count: number;
  normal_count: number;
  actions: string[];
  emails: AiEmailItem[];
}

export interface GmailStatus {
  connected: boolean;
  gmail_email: string | null;
  expired: boolean;
}

export interface UserSettings {
  name: string;
  email: string;
  phone: string;
  gmail_address: string;
  telegram_chat_id: string;
  green_api_instance: string;
  green_api_token: string;
  app_password_set?: boolean;
  avatar?: string;
  theme_color?: string;
  font_family?: string;
  theme_mode?: string;
  theme_secondary?: string;
  theme_updated_at?: string;   // ISO timestamp — used for conflict detection
  telegram_enabled?: boolean;
  whatsapp_enabled?: boolean;
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

  uploadAvatar(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/user/avatar`, form);
  }

  getWhatsappQr(email: string): Observable<{ type: string; message: string }> {
    return this.http.get<{ type: string; message: string }>(`${this.apiUrl}/user/whatsapp-qr`, { params: { email } });
  }

  checkWhatsappNumber(phone: string): Observable<{ exists: boolean; chatId: string; phone: string }> {
    return this.http.get<{ exists: boolean; chatId: string; phone: string }>(`${this.apiUrl}/user/whatsapp-check`, { params: { phone } });
  }

  // ─── GMAIL OAUTH 2.0 ─────────────────────────────────────────────────────────

  /** Redirige le navigateur vers Google pour l'autorisation OAuth. */
  connectGmail(userEmail: string): void {
    window.location.href = `${environment.apiUrl}/api/gmail/connect?email=${encodeURIComponent(userEmail)}`;
  }

  /** Statut de connexion OAuth Gmail (connected, gmail_email, expired). */
  getGmailStatus(email: string): Observable<GmailStatus> {
    return this.http.get<GmailStatus>(`${this.apiUrl}/gmail/status`, { params: { email } });
  }

  /** Révoque les tokens et déconnecte Gmail. */
  disconnectGmail(email: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/gmail/disconnect`, { email });
  }

  analyzeInbox(email: string): Observable<AiAnalysis> {
    return this.http.get<AiAnalysis>(`${this.apiUrl}/ai/analyze`, { params: { email } });
  }

  getEmailDetail(userEmail: string, messageId: string): Observable<EmailDetail> {
    return this.http.get<EmailDetail>(`${this.apiUrl}/email/${messageId}`, {
      params: { email: userEmail }
    });
  }

  chat(message: string, history: Array<{role: string; text: string}>): Observable<{response: string}> {
    return this.http.post<{response: string}>(`${this.apiUrl}/chatbot`, { message, history });
  }
}
