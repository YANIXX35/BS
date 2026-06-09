// TEMPLATE — Copier ce fichier en environment.ts et environment.prod.ts
// Ne JAMAIS commiter les fichiers environment.ts / environment.prod.ts (clés API sensibles)
export const environment = {
  production: false,
  apiUrl: 'https://your-backend-url.com',
  firebase: {
    apiKey: 'VOTRE_FIREBASE_API_KEY',
    authDomain: 'VOTRE_PROJECT.firebaseapp.com',
    projectId: 'VOTRE_PROJECT',
    storageBucket: 'VOTRE_PROJECT.firebasestorage.app',
    messagingSenderId: 'VOTRE_SENDER_ID',
    appId: 'VOTRE_APP_ID',
    vapidKey: 'VOTRE_VAPID_KEY',
  }
};
