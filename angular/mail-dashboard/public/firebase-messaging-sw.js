importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDa3yXuaplIOg1d105B6ZU961K0FwbjVEc',
  authDomain: 'mailnotifier-d92d1.firebaseapp.com',
  projectId: 'mailnotifier-d92d1',
  storageBucket: 'mailnotifier-d92d1.firebasestorage.app',
  messagingSenderId: '735656671658',
  appId: '1:735656671658:web:1b77dca19f935d9c1293d3',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'MailNotifier', {
    body: body || 'Vous avez reçu un nouveau mail',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'mailnotifier-email',
    renotify: true,
    data: { url: 'https://bs-mailnotif-nine.vercel.app/dashboard' },
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || 'https://bs-mailnotif-nine.vercel.app/dashboard';
  event.waitUntil(clients.openWindow(url));
});
