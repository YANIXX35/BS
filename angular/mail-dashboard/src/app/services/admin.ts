import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  is_verified: number;
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
  private api = 'http://localhost:5000/api/admin';

  constructor(private http: HttpClient) {}

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.api}/stats`);
  }

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.api}/users`);
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
}
