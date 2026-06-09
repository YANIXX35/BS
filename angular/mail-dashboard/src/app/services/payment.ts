import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymentInitResponse {
  payment_url: string;
  tx_id: string;
}

export interface PaymentVerifyResponse {
  status: 'paid' | 'pending' | 'processing' | 'failed' | 'expired';
  plan?: string;
}

export const PLAN_PRICES: Record<string, number> = {
  premium:    2000,
  enterprise: 5000,
};

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private api = `${environment.apiUrl}/api/payments`;

  constructor(private http: HttpClient) {}

  initiate(plan: string, email: string): Observable<PaymentInitResponse> {
    return this.http.post<PaymentInitResponse>(`${this.api}/initiate`, { plan, email });
  }

  verify(tx_id: string, plan: string, email: string): Observable<PaymentVerifyResponse> {
    return this.http.post<PaymentVerifyResponse>(`${this.api}/verify`, { tx_id, plan, email });
  }
}
