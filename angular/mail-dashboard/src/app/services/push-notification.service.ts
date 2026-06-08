import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {

  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  async init(userEmail: string): Promise<void> {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Firebase chargé uniquement si l'utilisateur accepte les notifications
      const [{ initializeApp, getApps }, { getMessaging, getToken, onMessage }] = await Promise.all([
        import('firebase/app'),
        import('firebase/messaging'),
      ]);

      const app = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
      const messaging = getMessaging(app);

      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const token = await getToken(messaging, {
        vapidKey: environment.firebase.vapidKey,
        serviceWorkerRegistration: swReg,
      });

      if (token) {
        this.http.post(`${this.apiUrl}/api/fcm/register`, { email: userEmail, fcm_token: token })
          .subscribe({ error: () => {} });
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

    } catch { /* FCM non critique */ }
  }
}
