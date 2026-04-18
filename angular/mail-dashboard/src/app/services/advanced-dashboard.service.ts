import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdvancedStats {
  total_emails: number;
  unread_emails: number;
  sent_emails: number;
  average_per_day: number;
  evolution: Array<{
    date: string;
    count: number;
    unread: number;
  }>;
  status_distribution: Array<{
    status: string;
    count: number;
  }>;
  top_senders: Array<{
    sender: string;
    count: number;
  }>;
}

export interface DashboardFilters {
  period: number;
  status: string;
  sender_filter: string;
  start_date: string | null;
  end_date: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdvancedDashboardService {
  private api = `${environment.apiUrl}/api/dashboard`;
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {}

  getAdvancedStats(email: string, filters: DashboardFilters): Observable<AdvancedStats> {
    const params = new URLSearchParams();
    params.set('email', email);
    params.set('period', filters.period.toString());
    params.set('status', filters.status);
    if (filters.sender_filter) {
      params.set('sender', filters.sender_filter);
    }
    if (filters.start_date) {
      params.set('start_date', filters.start_date);
    }
    if (filters.end_date) {
      params.set('end_date', filters.end_date);
    }

    return this.http.get<AdvancedStats>(`${this.api}/advanced-stats?${params.toString()}`, {
      headers: this.headers
    });
  }

  exportToCSV(email: string, filters: DashboardFilters): Observable<Blob> {
    const params = new URLSearchParams();
    params.set('email', email);
    params.set('period', filters.period.toString());
    params.set('status', filters.status);
    if (filters.sender_filter) {
      params.set('sender', filters.sender_filter);
    }

    return this.http.get(`${this.api}/export-csv?${params.toString()}`, {
      headers: this.headers,
      responseType: 'blob'
    });
  }

  exportToPDF(email: string, filters: DashboardFilters): Observable<Blob> {
    const params = new URLSearchParams();
    params.set('email', email);
    params.set('period', filters.period.toString());
    params.set('status', filters.status);
    if (filters.sender_filter) {
      params.set('sender', filters.sender_filter);
    }

    return this.http.get(`${this.api}/export-pdf?${params.toString()}`, {
      headers: this.headers,
      responseType: 'blob'
    });
  }
}
