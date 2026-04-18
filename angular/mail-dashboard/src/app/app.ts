import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EmailService } from './services/email';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [`:host { display: block; }`]
})
export class App implements OnInit {

  constructor(private emailService: EmailService) {}

  ngOnInit() {
    // Applique le thème utilisateur DÈS le démarrage de l'app,
    // avant même que le dashboard soit chargé.
    // Cela garantit la cohérence PC/mobile dès la première frame.
    this._applyThemeFromServer();
  }

  private _applyThemeFromServer(): void {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return;

      const user = JSON.parse(stored);
      if (!user?.email) return;

      // 1. Appliquer le cache localStorage IMMÉDIATEMENT (0ms de latence perçue)
      const cachedTheme = localStorage.getItem('dashTheme_' + user.email);
      const cachedFont  = localStorage.getItem('dashFont_'  + user.email);
      if (cachedTheme) this._applyThemeCSS(cachedTheme);
      if (cachedFont)  this._applyFontCSS(cachedFont);

      // 2. Charger depuis le serveur — le serveur GAGNE toujours
      this.emailService.getUserSettings(user.email).subscribe({
        next: (s) => {
          if (s.theme_color) {
            this._applyThemeCSS(s.theme_color);
            localStorage.setItem('dashTheme_' + user.email, s.theme_color);
          }
          if (s.font_family) {
            this._applyFontCSS(s.font_family);
            localStorage.setItem('dashFont_' + user.email, s.font_family);
          }
        },
        error: () => {
          // Pas de connexion : le cache localStorage fait office de fallback
        }
      });
    } catch {
      // localStorage inaccessible (mode privé restreint) — pas bloquant
    }
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
