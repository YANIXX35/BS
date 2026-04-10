import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Email {
  id: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
  unread: boolean;
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
}

@Injectable({ providedIn: 'root' })
export class EmailService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getEmails(): Observable<Email[]> {
    return this.http.get<Email[]>(`${this.apiUrl}/emails`);
  }

  getStatus(): Observable<Status> {
    return this.http.get<Status>(`${this.apiUrl}/status`);
  }

  getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.apiUrl}/stats`);
  }

  getUserSettings(email: string): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${this.apiUrl}/user/settings`, { params: { email } });
  }

  updateUserSettings(settings: Partial<UserSettings> & { email: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/settings`, settings);
  }

  getWhatsappQr(email: string): Observable<{ type: string; message: string }> {
    return this.http.get<{ type: string; message: string }>(`${this.apiUrl}/user/whatsapp-qr`, { params: { email } });
  }
}
