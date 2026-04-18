import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EmailService } from './email';

/**
 * Service de préférences utilisateur.
 *
 * Architecture :
 *   Source de vérité  → Backend (GET /api/user/settings)
 *   Cache rapide      → localStorage (clé dashTheme_<email>, dashFont_<email>)
 *   Fallback offline  → localStorage uniquement
 *
 * Ce service centralise l'application du thème et de la police pour que
 * tous les composants (user-dashboard, admin-dashboard, app.ts) utilisent
 * exactement la même logique.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {

  private _theme$ = new BehaviorSubject<string>('#1a237e');
  private _font$  = new BehaviorSubject<string>('Inter');

  /** Observable du thème courant (couleur hex) */
  readonly theme$ = this._theme$.asObservable();

  /** Observable de la police courante */
  readonly font$  = this._font$.asObservable();

  constructor(private emailService: EmailService) {}

  // ─── API publique ─────────────────────────────────────────────────────────

  /**
   * Charge les préférences depuis le serveur et les applique.
   * Doit être appelé une fois au démarrage (app.ts) et après chaque login.
   */
  loadAndApply(email: string): void {
    if (!email) return;

    // Appliquer le cache localStorage immédiatement (0ms latence perçue)
    this._applyFromLocalStorage(email);

    // Charger depuis le serveur — le serveur GAGNE toujours
    this.emailService.getUserSettings(email).subscribe({
      next: (s) => {
        if (s.theme_color) this.applyTheme(email, s.theme_color, false);
        if (s.font_family)  this.applyFont(email, s.font_family,  false);
      },
      error: () => {
        // Offline : le cache localStorage reste actif
      }
    });
  }

  /**
   * Change le thème, l'applique en CSS et le sauvegarde en backend.
   * @param saveToServer  false si on applique seulement (ex : réponse serveur)
   */
  applyTheme(email: string, color: string, saveToServer = true): void {
    this._applyThemeCSS(color);
    this._theme$.next(color);
    localStorage.setItem('dashTheme_' + email, color);

    if (saveToServer) {
      this.emailService.savePreferences(email, { theme_color: color }).subscribe({
        error: (e) => console.error('[PreferencesService] theme save error:', e)
      });
    }
  }

  /**
   * Change la police, l'applique en CSS et la sauvegarde en backend.
   */
  applyFont(email: string, fontName: string, saveToServer = true): void {
    this._applyFontCSS(fontName);
    this._font$.next(fontName);
    localStorage.setItem('dashFont_' + email, fontName);

    if (saveToServer) {
      this.emailService.savePreferences(email, { font_family: fontName }).subscribe({
        error: (e) => console.error('[PreferencesService] font save error:', e)
      });
    }
  }

  // ─── Implémentation CSS ───────────────────────────────────────────────────

  private _applyFromLocalStorage(email: string): void {
    const cachedTheme = localStorage.getItem('dashTheme_' + email);
    const cachedFont  = localStorage.getItem('dashFont_'  + email);
    if (cachedTheme) this._applyThemeCSS(cachedTheme);
    if (cachedFont)  this._applyFontCSS(cachedFont);
  }

  private _applyThemeCSS(color: string): void {
    const root = document.documentElement;
    root.style.setProperty('--p',        color);
    root.style.setProperty('--p-light',  this._hexToRgba(color, 0.10));
    root.style.setProperty('--p-medium', this._hexToRgba(color, 0.18));
    root.style.setProperty('--p-dark',   this._shiftColor(color, -30));
    root.style.setProperty('--p-shift',  this._shiftColor(color, +40));
  }

  private _applyFontCSS(fontName: string): void {
    document.documentElement.style.setProperty('--dash-font', `'${fontName}', sans-serif`);
  }

  private _hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private _shiftColor(hex: string, amount: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
    const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
    const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }
}
