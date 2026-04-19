import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {

  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  async init(userEmail: string): Promise<void> {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    try {
      const app = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
      const messaging = getMessaging(app);

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[FCM] Permission refusée');
        return;
      }

      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const token = await getToken(messaging, {
        vapidKey: environment.firebase.vapidKey,
        serviceWorkerRegistration: swReg,
      });

      if (token) {
        console.log('[FCM] Token obtenu:', token.substring(0, 20) + '...');
        this.http.post(`${this.apiUrl}/api/fcm/register`, { email: userEmail, fcm_token: token })
          .subscribe({ error: (e) => console.error('[FCM] Erreur enregistrement token:', e) });
      }

      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        if (Notification.permission === 'granted') {
          new Notification(title || 'MailNotifier', {
            body: body || 'Nouveau mail reçu',
            icon: '/icons/icon-192x192.png',
          });
        }
      });

    } catch (e) {
      console.error('[FCM] Erreur init:', e);
    }
  }
}
