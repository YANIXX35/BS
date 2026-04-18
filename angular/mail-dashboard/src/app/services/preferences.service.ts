import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, fromEvent, merge, timer, interval } from 'rxjs';
import { map, takeUntil, filter, retry, switchMap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export interface UserPreferences {
  theme?: string;
  fontSize?: string;
  language?: string;
  notifications?: boolean;
  [key: string]: any;
}

export interface PreferenceUpdate {
  user_id: string;
  preferences: UserPreferences;
  version?: number;
  updated_at?: string;
}

interface ThemeColors {
  primary: string;
  secondary: string;
}

interface ThemeColorMap {
  [themeName: string]: ThemeColors;
}

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private api = `${environment.apiUrl}/api/preferences`;
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  
  // WebSocket pour synchronisation temps réel
  private socket: Socket | null = null;
  
  // BehaviorSubject pour réactivité immédiate
  private preferencesSubject = new BehaviorSubject<UserPreferences>({});
  public preferences$ = this.preferencesSubject.asObservable();
  
  // État de connexion
  private isOnline = navigator.onLine;
  private pendingUpdates: UserPreferences = {};
  
  // JWT token et versioning
  private jwtToken: string | null = null;
  private currentVersion: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // 1 seconde
  private keepAliveInterval: any = null;

  constructor(private http: HttpClient) {
    this.loadToken();
    this.initWebSocket();
    this.initOnlineStatus();
    this.initKeepAlive();
  }

  /**
   * Charge le token JWT depuis localStorage
   */
  private loadToken(): void {
    try {
      const stored = localStorage.getItem('auth_token');
      this.jwtToken = stored;
    } catch (error) {
      console.error('[PREFERENCES] Erreur chargement token:', error);
    }
  }

  /**
   * Sauvegarde le token JWT dans localStorage
   */
  private saveToken(token: string): void {
    try {
      localStorage.setItem('auth_token', token);
      this.jwtToken = token;
    } catch (error) {
      console.error('[PREFERENCES] Erreur sauvegarde token:', error);
    }
  }

  /**
   * Initialise le système de keep-alive WebSocket
   */
  private initKeepAlive(): void {
    // Envoyer un ping toutes les 30 secondes
    this.keepAliveInterval = interval(30000).subscribe(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('keep_alive');
      }
    });
  }

  /**
   * Initialise la connexion WebSocket pour la synchronisation temps réel
   */
  private initWebSocket(): void {
    if (!this.jwtToken) {
      console.log('[WEBSOCKET] Pas de token JWT, connexion WebSocket annulée');
      return;
    }

    this.socket = io(environment.apiUrl, {
      query: { token: this.jwtToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay
    });

    this.setupWebSocketListeners();
  }

  /**
   * Configure les écouteurs WebSocket
   */
  private setupWebSocketListeners(): void {
    if (!this.socket) return;

    // Écouter les mises à jour en temps réel
    this.socket.on('preference_updated', (data: PreferenceUpdate) => {
      console.log('[PREFERENCES] Mise à jour reçue:', data);
      
      // Mettre à jour la version courante
      if (data.version) {
        this.currentVersion = data.version;
      }
      
      // Mettre à jour le BehaviorSubject
      this.preferencesSubject.next(data.preferences);
      
      // Mettre à jour localStorage comme cache
      this.saveToLocalStorage(data.preferences, true);
      
      // Appliquer immédiatement les changements UI
      this.applyPreferences(data.preferences);
    });

    this.socket.on('connected', (data: any) => {
      console.log('[WEBSOCKET] Connecté:', data.message);
      this.reconnectAttempts = 0; // Réinitialiser les tentatives de reconnexion
      
      // Rejoindre la room utilisateur
      const user = this.getCurrentUser();
      if (user?.id && this.socket) {
        this.socket.emit('join_user_room', {
          user_id: user.id,
          token: this.jwtToken
        });
      }
    });

    this.socket.on('error', (error: any) => {
      console.error('[WEBSOCKET] Erreur:', error);
      this.handleWebSocketError(error);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[WEBSOCKET] Déconnecté:', reason);
      if (reason === 'io server disconnect') {
        // Le serveur a déconnecté, on essaye de se reconnecter
        this.attemptReconnect();
      }
    });

    this.socket.on('pong', (data: any) => {
      console.log('[WEBSOCKET] Pong reçu:', data.timestamp);
    });

    this.socket.on('keep_alive_response', (data: any) => {
      console.log('[WEBSOCKET] Keep-alive response:', data.timestamp);
    });
  }

  /**
   * Gère les erreurs WebSocket et tente de se reconnecter
   */
  private handleWebSocketError(error: any): void {
    console.error('[WEBSOCKET] Erreur de connexion:', error);
    
    if (error.message === 'Token expiré') {
      this.refreshToken();
    } else if (error.message === 'Token invalide') {
      this.logout();
    } else {
      this.attemptReconnect();
    }
  }

  /**
   * Tente de se reconnecter au WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WEBSOCKET] Nombre maximum de tentatives de reconnexion atteint');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`[WEBSOCKET] Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms`);
    
    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * Rafraîchit le token JWT
   */
  private refreshToken(): void {
    // Implémenter la logique de rafraîchissement du token
    console.log('[PREFERENCES] Token expiré, nécessite une reconnexion');
    this.logout();
  }

  /**
   * Déconnecte l'utilisateur
   */
  private logout(): void {
    this.jwtToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    console.log('[PREFERENCES] Utilisateur déconnecté');
  }

  /**
   * Initialise l'écoute du statut online/offline
   */
  private initOnlineStatus(): void {
    fromEvent(window, 'online').subscribe(() => {
      this.isOnline = true;
      this.syncPendingUpdates();
    });

    fromEvent(window, 'offline').subscribe(() => {
      this.isOnline = false;
      console.log('[OFFLINE] Mode hors ligne activé');
    });
  }

  /**
   * Charge les préférences depuis le backend avec JWT
   */
  loadPreferences(): Observable<UserPreferences> {
    if (!this.jwtToken) {
      console.error('[PREFERENCES] Token JWT non trouvé');
      return new Observable();
    }

    const headers = this.headers.set('Authorization', `Bearer ${this.jwtToken}`);

    return this.http.get<{ preferences: any[] }>(this.api, { headers }).pipe(
      map(response => {
        const preferences: UserPreferences = {};
        response.preferences.forEach(pref => {
          preferences[pref.key] = pref.value;
        });
        
        // Mettre à jour le BehaviorSubject
        this.preferencesSubject.next(preferences);
        
        // Sauvegarder en localStorage comme cache
        this.saveToLocalStorage(preferences, true);
        
        console.log('[PREFERENCES] Préférences chargées:', preferences);
        return preferences;
      })
    );
  }

  /**
   * Met à jour les préférences (backend + temps réel) avec JWT et versioning
   */
  updatePreferences(preferences: UserPreferences): Observable<any> {
    if (!this.jwtToken) {
      console.error('[PREFERENCES] Token JWT non trouvé pour la mise à jour');
      return new Observable();
    }

    const headers = this.headers.set('Authorization', `Bearer ${this.jwtToken}`);
    const updateData = {
      preferences: preferences,
      version: this.currentVersion
    };

    // Si offline, stocker pour synchronisation plus tard
    if (!this.isOnline) {
      this.pendingUpdates = { ...this.pendingUpdates, ...preferences };
      this.saveToLocalStorage(preferences, false);
      console.log('[OFFLINE] Préférences stockées pour synchronisation:', preferences);
      return new Observable();
    }

    return this.http.post(this.api, updateData, { headers }).pipe(
      map(response => {
        console.log('[PREFERENCES] Mise à jour envoyée:', preferences);
        
        // Mettre à jour le BehaviorSubject immédiatement
        this.preferencesSubject.next(preferences);
        
        // Mettre à jour localStorage comme cache
        this.saveToLocalStorage(preferences, true);
        
        // Appliquer les changements UI
        this.applyPreferences(preferences);
        
        return response;
      })
    );
  }

  /**
   * Authentifie l'utilisateur et génère un token JWT
   */
  authenticate(email: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/token`, {
      email: email,
      password: password
    }, { headers: this.headers }).pipe(
      map((response: any) => {
        this.saveToken(response.token);
        localStorage.setItem('user', JSON.stringify({
          id: response.user_id,
          email: response.email
        }));
        
        // Réinitialiser la connexion WebSocket
        this.initWebSocket();
        
        return response;
      })
    );
  }

  /**
   * Met à jour une préférence spécifique
   */
  updatePreference(key: string, value: any): Observable<any> {
    const currentPreferences = this.preferencesSubject.value;
    const updatedPreferences = { ...currentPreferences, [key]: value };
    
    return this.updatePreferences(updatedPreferences);
  }

  /**
   * Récupère une préférence spécifique
   */
  getPreference(key: string): any {
    return this.preferencesSubject.value[key] || this.getLocalPreference(key);
  }

  /**
   * Sauvegarde dans localStorage (cache ou mode offline)
   */
  private saveToLocalStorage(preferences: UserPreferences, isSynced: boolean = false): void {
    try {
      localStorage.setItem('user_preferences', JSON.stringify(preferences));
      localStorage.setItem('preferences_synced', isSynced.toString());
    } catch (error) {
      console.error('[PREFERENCES] Erreur localStorage:', error);
    }
  }

  /**
   * Charge depuis localStorage (fallback)
   */
  private loadFromLocalStorage(): UserPreferences {
    try {
      const stored = localStorage.getItem('user_preferences');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[PREFERENCES] Erreur lecture localStorage:', error);
      return {};
    }
  }

  /**
   * Récupère une préférence spécifique depuis localStorage
   */
  private getLocalPreference(key: string): any {
    const preferences = this.loadFromLocalStorage();
    return preferences[key];
  }

  /**
   * Applique les préférences à l'UI
   */
  private applyPreferences(preferences: UserPreferences): void {
    // Appliquer le thème
    if (preferences.theme) {
      document.documentElement.setAttribute('data-theme', preferences.theme);
      this.applyThemeColors(preferences.theme);
    }

    // Appliquer la taille de police
    if (preferences.fontSize) {
      document.documentElement.style.setProperty('--font-size', preferences.fontSize);
    }

    // Appliquer la langue
    if (preferences.language) {
      // Logique pour changer la langue
      console.log('[PREFERENCES] Langue changée vers:', preferences.language);
    }
  }

  /**
   * Applique les couleurs du thème
   */
  private applyThemeColors(theme: string): void {
    const themeColors: ThemeColorMap = {
      blue: { primary: '#1a237e', secondary: '#3949ab' },
      green: { primary: '#2e7d32', secondary: '#388e3c' },
      purple: { primary: '#7b1fa2', secondary: '#8e24aa' },
      orange: { primary: '#f57c00', secondary: '#fb8c00' }
    };

    const colors = themeColors[theme] || themeColors['blue'];
    
    document.documentElement.style.setProperty('--primary-color', colors.primary);
    document.documentElement.style.setProperty('--secondary-color', colors.secondary);
  }

  /**
   * Synchronise les mises à jour en attente (quand on repasse online)
   */
  private syncPendingUpdates(): void {
    if (Object.keys(this.pendingUpdates).length > 0) {
      console.log('[ONLINE] Synchronisation des mises à jour en attente:', this.pendingUpdates);
      this.updatePreferences(this.pendingUpdates);
      this.pendingUpdates = {};
    }
  }

  /**
   * Récupère l'utilisateur courant
   */
  private getCurrentUser(): any {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[PREFERENCES] Erreur récupération user:', error);
      return null;
    }
  }

  /**
   * Nettoie la connexion WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Vérifie si les préférences sont synchronisées
   */
  isPreferencesSynced(): boolean {
    try {
      return localStorage.getItem('preferences_synced') === 'true';
    } catch {
      return false;
    }
  }
}
