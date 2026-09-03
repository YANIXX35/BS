import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WavePaymentResponse {
  payment_id: number;
  wave_url: string;
  amount: number;
}

export const PLAN_PRICES: Record<string, number> = {
  premium:    2000,
  enterprise: 5000,
};

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private api = `${environment.apiUrl}/api/payments`;

  constructor(private http: HttpClient) {}

  createWavePayment(phone: string, plan: string): Observable<WavePaymentResponse> {
    return this.http.post<WavePaymentResponse>(`${this.api}/wave`, { phone, plan });
  }
}
