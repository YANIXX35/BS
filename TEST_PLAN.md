# Plan de Test Complet - Système de Synchronisation Temps Réel

## 1. Test d'Authentification JWT

### 1.1 Test Login Standard
```bash
# Endpoint: POST https://backend-mail-1.onrender.com/api/auth/login
curl -X POST https://backend-mail-1.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "kyliyanisse@gmail.com", "password": "votre_mot_de_passe"}'

# Réponse attendue:
{
  "message": "Connexion reussie",
  "name": "Kylie Yanisse",
  "email": "kyliyanisse@gmail.com",
  "role": "admin"
}
```

### 1.2 Test JWT Token
```bash
# Endpoint: POST https://backend-mail-1.onrender.com/api/auth/token
curl -X POST https://backend-mail-1.onrender.com/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email": "kyliyanisse@gmail.com", "password": "votre_mot_de_passe"}'

# Réponse attendue:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": 1,
  "email": "kyliyanisse@gmail.com",
  "expires_in": 86400
}
```

### 1.3 Test Forgot Password
```bash
# Endpoint: POST https://backend-mail-1.onrender.com/api/auth/forgot-password
curl -X POST https://backend-mail-1.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "kyliyanisse@gmail.com"}'

# Réponse attendue:
{
  "message": "Code OTP envoyé à kyliyanisse@gmail.com"
}
```

## 2. Test CORS

### 2.1 Test Preflight OPTIONS
```bash
# Test depuis Vercel
curl -X OPTIONS https://backend-mail-1.onrender.com/api/auth/login \
  -H "Origin: https://bs-mailnotif-nine.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization"

# Headers attendus:
# Access-Control-Allow-Origin: https://bs-mailnotif-nine.vercel.app
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
# Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control, Pragma, X-Requested-With
```

### 2.2 Test Requête Réelle
```bash
# Test depuis localhost
curl -X POST https://backend-mail-1.onrender.com/api/auth/login \
  -H "Origin: http://localhost:4200" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test"}'

# Header attendu:
# Access-Control-Allow-Origin: http://localhost:4200
```

## 3. Test WebSocket

### 3.1 Test Connexion WebSocket
```javascript
// Dans la console du navigateur
const socket = io('https://backend-mail-1.onrender.com', {
  query: { token: 'votre_jwt_token' },
  transports: ['websocket', 'polling']
});

socket.on('connect', (data) => {
  console.log('Connecté:', data);
});

socket.on('error', (error) => {
  console.error('Erreur WebSocket:', error);
});
```

### 3.2 Test Join Room
```javascript
socket.emit('join_user_room', {
  user_id: 1,
  token: 'votre_jwt_token'
});

socket.on('joined_room', (data) => {
  console.log('Room rejointe:', data);
});
```

### 3.3 Test Keep-Alive
```javascript
setInterval(() => {
  socket.emit('keep_alive');
}, 30000);

socket.on('keep_alive_response', (data) => {
  console.log('Keep-alive OK:', data.timestamp);
});
```

## 4. Test Synchronisation Temps Réel

### 4.1 Test Chargement Préférences
```bash
# Avec JWT token
curl -X GET https://backend-mail-1.onrender.com/api/preferences \
  -H "Authorization: Bearer votre_jwt_token"

# Réponse attendue:
{
  "preferences": [
    {
      "key": "theme",
      "value": "blue",
      "updated_at": "2026-04-18T15:00:00",
      "version": 1
    }
  ],
  "user_id": 1
}
```

### 4.2 Test Mise à Jour Préférences
```bash
curl -X POST https://backend-mail-1.onrender.com/api/preferences \
  -H "Authorization: Bearer votre_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "theme": "green",
      "fontSize": "16px"
    },
    "version": 1
  }'

# Réponse attendue:
{
  "message": "Préférences mises à jour avec succès",
  "version": 2
}
```

### 4.3 Test Gestion Conflits
```bash
# Envoyer une version ancienne pour simuler un conflit
curl -X POST https://backend-mail-1.onrender.com/api/preferences \
  -H "Authorization: Bearer votre_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "theme": "red"
    },
    "version": 1  # Version plus ancienne que la version courante (ex: 5)
  }'

# Réponse attendue (conflit):
{
  "error": "CONFLICT",
  "message": "Vos préférences ont été modifiées sur un autre appareil",
  "current_preferences": {
    "theme": "green",
    "fontSize": "16px"
  },
  "current_version": 5
}
```

## 5. Test Dashboard Avancé

### 5.1 Test Chargement Dashboard
```bash
# Endpoint pour les statistiques avancées
curl -X GET "https://backend-mail-1.onrender.com/api/dashboard/advanced-stats?email=kyliyanisse@gmail.com&period=30"

# Réponse attendue:
{
  "total_emails": 150,
  "unread_emails": 25,
  "sent_emails": 75,
  "average_per_day": 5.0,
  "evolution": [...],
  "status_distribution": [...],
  "top_senders": [...]
}
```

### 5.2 Test Filtres Dashboard
```bash
# Test avec filtres
curl -X GET "https://backend-mail-1.onrender.com/api/dashboard/advanced-stats?email=kyliyanisse@gmail.com&period=7&status=unread&sender=example@email.com"
```

## 6. Test Multi-Appareils

### 6.1 Scénario PC vers Mobile
1. **PC**: Ouvrir l'application sur Chrome (localhost:4200)
2. **PC**: Se connecter avec JWT
3. **PC**: Changer le thème en "purple"
4. **Mobile**: Ouvrir l'application sur mobile (localhost:4200)
5. **Mobile**: Se connecter avec même compte
6. **Vérifier**: Le thème doit être "purple" sur mobile

### 6.2 Scénario Simultané
1. **PC**: Changer la taille de police en "18px"
2. **Mobile** (simultanément): Changer le thème en "orange"
3. **Vérifier**: Les deux changements doivent apparaître sur les deux appareils

## 7. Test Offline/Online

### 7.1 Test Mode Offline
1. **Déconnecter** le réseau
2. **Changer** une préférence (ex: thème)
3. **Vérifier**: La préférence est stockée en localStorage
4. **Reconnecter** le réseau
5. **Vérifier**: La synchronisation automatique s'effectue

### 7.2 Test Reconnexion WebSocket
1. **Couper** la connexion WebSocket
2. **Attendre** 30 secondes
3. **Vérifier**: Reconnexion automatique avec exponential backoff

## 8. Tests d'Erreurs

### 8.1 Token Expiré
```bash
# Utiliser un token expiré
curl -X GET https://backend-mail-1.onrender.com/api/preferences \
  -H "Authorization: Bearer token_expiré"

# Réponse attendue:
{
  "error": "Token expiré"
}
```

### 8.2 Token Invalide
```bash
# Utiliser un token invalide
curl -X GET https://backend-mail-1.onrender.com/api/preferences \
  -H "Authorization: Bearer token_invalide"

# Réponse attendue:
{
  "error": "Token invalide"
}
```

### 8.3 Accès Non Autorisé
```bash
# Sans token
curl -X GET https://backend-mail-1.onrender.com/api/preferences

# Réponse attendue:
{
  "error": "Token JWT requis"
}
```

## 9. Tests de Performance

### 9.1 Latence WebSocket
```javascript
// Mesurer le temps de réponse
const start = Date.now();
socket.emit('ping');
socket.on('pong', () => {
  const latency = Date.now() - start;
  console.log('Latence:', latency + 'ms');
});
```

### 9.2 Rate Limiting
```bash
# Envoyer 11 requêtes en 1 minute (limite: 10/min)
for i in {1..11}; do
  curl -X POST https://backend-mail-1.onrender.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@test.com", "password": "test"}'
  sleep 1
done

# La 11ème requête doit retourner 429 Too Many Requests
```

## 10. Checklist de Validation

- [ ] Login fonctionne avec mot de passe correct
- [ ] Login échoue avec mot de passe incorrect
- [ ] JWT token généré correctement
- [ ] JWT token valide pendant 24h
- [ ] CORS autorise Vercel et localhost
- [ ] WebSocket se connecte avec JWT
- [ ] WebSocket rejoint la room utilisateur
- [ ] Synchronisation temps réel fonctionne
- [ ] Gestion des conflits fonctionne
- [ ] Dashboard avancé charge les données
- [ ] Mode offline fonctionne
- [ ] Reconnexion automatique fonctionne
- [ ] Rate limiting protège contre abus
- [ ] Erreurs sont gérées proprement

## Bugs Potentiels à Vérifier

1. **Double import** de `from flask_limiter import Limiter` (lignes 21 et 28)
2. **WebSocket sans token** : Vérifier que la connexion est refusée
3. **Versioning** : Vérifier que les versions s'incrémentent correctement
4. **CORS wildcard** : Vérifier que `cors_allowed_origins="*"` n'écrase pas la config CORS
5. **JWT secret** : Vérifier que `JWT_SECRET_KEY` est configuré en production
6. **Database version** : Vérifier que la colonne `version` existe bien dans `user_preferences`
