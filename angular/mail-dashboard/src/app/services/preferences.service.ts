import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, fromEvent, merge } from 'rxjs';
import { map, takeUntil, filter } from 'rxjs/operators';
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

  constructor(private http: HttpClient) {
    this.initWebSocket();
    this.initOnlineStatus();
  }

  /**
   * Initialise la connexion WebSocket pour la synchronisation temps réel
   */
  private initWebSocket(): void {
    const user = this.getCurrentUser();
    if (!user?.id) return;

    this.socket = io(environment.apiUrl, {
      query: { user_id: user.id },
      transports: ['websocket', 'polling']
    });

    // Écouter les mises à jour en temps réel
    this.socket.on('preference_updated', (data: PreferenceUpdate) => {
      console.log('[PREFERENCES] Mise à jour reçue:', data);
      
      if (data.user_id === user.id) {
        this.preferencesSubject.next(data.preferences);
        
        // Mettre à jour localStorage comme cache
        this.saveToLocalStorage(data.preferences, true);
        
        // Appliquer immédiatement les changements UI
        this.applyPreferences(data.preferences);
      }
    });

    this.socket.on('connected', (data: any) => {
      console.log('[WEBSOCKET] Connecté:', data.message);
    });

    this.socket.on('disconnect', () => {
      console.log('[WEBSOCKET] Déconnecté');
    });
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
   * Charge les préférences depuis le backend
   */
  loadPreferences(): Observable<UserPreferences> {
    const user = this.getCurrentUser();
    if (!user?.id) {
      console.error('[PREFERENCES] User ID non trouvé');
      return new Observable();
    }

    return this.http.get<{ preferences: any[] }>(`${this.api}?user_id=${user.id}`, {
      headers: this.headers
    }).pipe(
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
   * Met à jour les préférences (backend + temps réel)
   */
  updatePreferences(preferences: UserPreferences): Observable<any> {
    const user = this.getCurrentUser();
    if (!user?.id) {
      console.error('[PREFERENCES] User ID non trouvé pour la mise à jour');
      return new Observable();
    }

    const updateData = {
      user_id: user.id,
      preferences: preferences
    };

    // Si offline, stocker pour synchronisation plus tard
    if (!this.isOnline) {
      this.pendingUpdates = { ...this.pendingUpdates, ...preferences };
      this.saveToLocalStorage(preferences, false);
      console.log('[OFFLINE] Préférences stockées pour synchronisation:', preferences);
      return new Observable();
    }

    return this.http.post(this.api, updateData, {
      headers: this.headers
    }).pipe(
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

    const colors = themeColors[theme] || themeColors.blue;
    
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
