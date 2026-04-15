import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymentInitResponse {
  payment_url: string;
  tx_id: string;
}

export interface PaymentVerifyResponse {
  status: string;
  plan?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private api = `${environment.apiUrl}/api/payments`;
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {}

  initiate(plan: string, email: string): Observable<PaymentInitResponse> {
    return this.http.post<PaymentInitResponse>(
      `${this.api}/initiate`,
      { plan, email },
      { headers: this.headers }
    );
  }

  verify(tx_id: string, plan: string, email: string): Observable<PaymentVerifyResponse> {
    return this.http.post<PaymentVerifyResponse>(
      `${this.api}/verify`,
      { tx_id, plan, email },
      { headers: this.headers }
    );
  }
}
