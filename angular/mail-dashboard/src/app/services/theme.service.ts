import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { EmailService } from './email';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  mode:      'light' | 'dark';
  primary:   string;   // hex — drives --p + --color-primary
  secondary: string;   // hex — drives --color-secondary (user-configurable)
  font:      string;   // font-family name
  updatedAt: number;   // unix ms — used for conflict detection (last-write-wins)
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ThemeConfig = {
  mode:      'light',
  primary:   '#1a237e',
  secondary: '#7c3aed',
  font:      'Inter',
  updatedAt: 0,
};

const FONT_URLS: Record<string, string> = {
  'Inter':         'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'Poppins':       'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  'Raleway':       'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&display=swap',
  'Nunito':        'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap',
  'Montserrat':    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
  'DM Sans':       'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap',
  'Outfit':        'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap',
  'Space Grotesk': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
};

// localStorage key — namespaced per user
const storageKey = (email: string) => `dashTheme2_${email}`;

// How long (ms) after a successful server sync before we allow another re-apply
const SYNC_DEBOUNCE_MS = 5_000;

// CSS transition duration when toggling mode (matches CSS)
const MODE_TRANSITION_MS = 280;

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ThemeService {

  // ── Committed state (saved to localStorage + server) ──────────────────────
  private readonly _committed$ = new BehaviorSubject<ThemeConfig>({ ...DEFAULT_CONFIG });

  // ── Preview state (CSS-only, not saved anywhere) ───────────────────────────
  // null = no active preview
  private _previewConfig: ThemeConfig | null = null;

  // ── Sync state ─────────────────────────────────────────────────────────────
  private _lastServerSyncMs = 0;
  private _currentEmail     = '';

  // ── Cross-tab sync ─────────────────────────────────────────────────────────
  // StorageEvent fires in all tabs EXCEPT the one that wrote to localStorage
  // → zero-network cross-tab sync
  private readonly _storageHandler = (e: StorageEvent) => {
    if (!this._currentEmail) return;
    if (e.key !== storageKey(this._currentEmail) || !e.newValue) return;
    try {
      const incoming = this._parseStorage(e.newValue);
      // Only apply if the incoming config is newer than what we have
      if (incoming.updatedAt >= this._committed$.value.updatedAt) {
        this._applyCSS(incoming);
        this._committed$.next(incoming);
        // Do NOT call _saveToStorage — this tab didn't make the change
      }
    } catch { /* malformed JSON */ }
  };

  constructor(private emailService: EmailService) {
    // Register cross-tab listener once at service construction
    window.addEventListener('storage', this._storageHandler);
  }

  // ── Public observables ────────────────────────────────────────────────────

  readonly config$    = this._committed$.asObservable();
  readonly mode$      = this._committed$.pipe(map(c => c.mode));
  readonly primary$   = this._committed$.pipe(map(c => c.primary));
  readonly secondary$ = this._committed$.pipe(map(c => c.secondary));
  readonly font$      = this._committed$.pipe(map(c => c.font));

  get currentConfig(): ThemeConfig { return this._committed$.value; }

  /**
   * True if a server sync completed less than SYNC_DEBOUNCE_MS ago.
   * Used by the dashboard to skip redundant getUserSettings() theme re-applies.
   */
  get isRecentlySynced(): boolean {
    return Date.now() - this._lastServerSyncMs < SYNC_DEBOUNCE_MS;
  }

  // ── Boot sequence ─────────────────────────────────────────────────────────

  /**
   * Called once at app startup (app.ts → ngOnInit).
   *
   * Step 1 — localStorage  : apply instantly, 0 ms perceived latency
   * Step 2 — server (async): apply only if server data is NEWER
   *           → prevents a 30 s background sync from overwriting
   *             a color the user is actively dragging
   */
  loadAndApply(email: string): void {
    if (!email) return;
    this._currentEmail = email;

    // Step 1 — instant cache
    const cached = this._readFromStorage(email);
    this._applyCSS(cached);
    this._committed$.next(cached);

    // Step 2 — server (source of truth)
    this._fetchAndApply(email);
  }

  // ── Public mutation API ───────────────────────────────────────────────────

  /**
   * Change primary color.
   * saveToServer=false → preview-only (CSS applied, nothing persisted).
   */
  applyColor(email: string, primary: string, saveToServer = true): void {
    const now = Date.now();
    const next: ThemeConfig = { ...this._committed$.value, primary, updatedAt: now };
    this._applyCSS(next);
    if (saveToServer) {
      this._commit(email, next);
      this.emailService.savePreferences(email, { theme_color: primary })
        .subscribe({ error: e => console.error('[ThemeService] primary save:', e) });
    }
    // During drag preview: only CSS applied — localStorage NOT written,
    // preventing garbage values from reaching the anti-FOUC script.
  }

  /** Change secondary color. saveToServer=false → preview-only. */
  applySecondary(email: string, secondary: string, saveToServer = true): void {
    const now = Date.now();
    const next: ThemeConfig = { ...this._committed$.value, secondary, updatedAt: now };
    this._applyCSS(next);
    if (saveToServer) {
      this._commit(email, next);
      this.emailService.savePreferences(email, { theme_secondary: secondary })
        .subscribe({ error: e => console.error('[ThemeService] secondary save:', e) });
    }
  }

  /** Change font — always persisted immediately (no drag involved). */
  applyFont(email: string, font: string, saveToServer = true): void {
    const now = Date.now();
    const next: ThemeConfig = { ...this._committed$.value, font, updatedAt: now };
    this._applyCSS(next);
    this._commit(email, next);
    if (saveToServer) {
      this.emailService.savePreferences(email, { font_family: font })
        .subscribe({ error: e => console.error('[ThemeService] font save:', e) });
    }
  }

  /** Toggle light ↔ dark with smooth CSS transition. */
  toggleMode(email: string): void {
    const newMode: 'light' | 'dark' = this._committed$.value.mode === 'light' ? 'dark' : 'light';
    const now = Date.now();
    const next: ThemeConfig = { ...this._committed$.value, mode: newMode, updatedAt: now };

    // Briefly add transition class → smooth color change → remove
    this._withModeTransition(() => this._applyCSS(next));
    this._commit(email, next);
    this.emailService.savePreferences(email, { theme_mode: newMode })
      .subscribe({ error: e => console.error('[ThemeService] mode save:', e) });
  }

  /**
   * Apply a partial config received from the server — no server round-trip.
   * Skips apply if local state is already newer (anti-race guard).
   */
  applyServerConfig(email: string, partial: Partial<ThemeConfig>): void {
    const serverTs = partial.updatedAt ?? 0;
    const localTs  = this._committed$.value.updatedAt;

    // Local is newer → user made a change after the server data was fetched → keep local
    if (serverTs > 0 && serverTs < localTs) return;

    const next: ThemeConfig = { ...this._committed$.value, ...partial };
    this._applyCSS(next);
    this._committed$.next(next);
    this._saveToStorage(email, next);
  }

  // ── Live preview API (CSS-only, never persisted) ──────────────────────────

  /**
   * Instantly show a color without committing — hover/inspect use case.
   * Call cancelPreview() to revert, or applyColor() to commit.
   */
  previewColor(primary: string): void {
    this._previewConfig = { ...this._committed$.value, primary };
    this._applyCSS(this._previewConfig);
  }

  previewSecondary(secondary: string): void {
    this._previewConfig = { ...this._committed$.value, secondary };
    this._applyCSS(this._previewConfig);
  }

  previewMode(mode: 'light' | 'dark'): void {
    this._previewConfig = { ...this._committed$.value, mode };
    this._applyCSS(this._previewConfig);
  }

  /** Revert to the committed (saved) config — discard preview. */
  cancelPreview(): void {
    if (this._previewConfig) {
      this._applyCSS(this._committed$.value);
      this._previewConfig = null;
    }
  }

  /** Persist the currently previewed config. */
  commitPreview(email: string): void {
    if (!this._previewConfig) return;
    const preview = { ...this._previewConfig, updatedAt: Date.now() };
    this._previewConfig = null;

    const prefs: Record<string, string> = {};
    const committed = this._committed$.value;
    if (preview.primary   !== committed.primary)   prefs['theme_color']     = preview.primary;
    if (preview.secondary !== committed.secondary) prefs['theme_secondary'] = preview.secondary;
    if (preview.mode      !== committed.mode)      prefs['theme_mode']      = preview.mode;

    this._commit(email, preview);
    if (Object.keys(prefs).length > 0) {
      this.emailService.savePreferences(email, prefs)
        .subscribe({ error: e => console.error('[ThemeService] commit preview:', e) });
    }
  }

  /** True if a preview is currently active. */
  get isPreviewing(): boolean { return this._previewConfig !== null; }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  /** Call this when the root component destroys (very rarely needed). */
  destroy(): void {
    window.removeEventListener('storage', this._storageHandler);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _fetchAndApply(email: string): void {
    this.emailService.getUserSettings(email).subscribe({
      next: (s) => {
        this._lastServerSyncMs = Date.now();

        const serverTs = s.theme_updated_at
          ? new Date(s.theme_updated_at).getTime()
          : 0;
        const localTs = this._committed$.value.updatedAt;

        // Server is authoritative only if its data is at least as recent as local.
        // This prevents a delayed server response from reverting a change the
        // user JUST made (race: user changes at t=0, server responds with t=-30s data).
        if (serverTs < localTs && localTs > 0) return;

        const config: ThemeConfig = {
          mode:      s.theme_mode === 'dark' ? 'dark' : 'light',
          primary:   s.theme_color     || DEFAULT_CONFIG.primary,
          secondary: s.theme_secondary || DEFAULT_CONFIG.secondary,
          font:      s.font_family     || DEFAULT_CONFIG.font,
          updatedAt: serverTs || Date.now(),
        };
        this._applyCSS(config);
        this._committed$.next(config);
        this._saveToStorage(email, config);
      },
      error: () => {
        this._lastServerSyncMs = Date.now(); // reset so next sync can proceed
      }
    });
  }

  /**
   * Commit a config: update BehaviorSubject + localStorage.
   * localStorage write triggers StorageEvent in other tabs → instant cross-tab sync.
   */
  private _commit(email: string, config: ThemeConfig): void {
    this._committed$.next(config);
    this._saveToStorage(email, config);
  }

  /** Apply all CSS custom properties to :root — single DOM write batch. */
  private _applyCSS(config: ThemeConfig): void {
    const root = document.documentElement;
    const p    = config.primary;
    const s    = config.secondary;

    // Batch: setAttribute + style.setProperty run synchronously in one micro-task.
    // The browser batches them into a single style recalc before the next frame.
    root.setAttribute('data-theme', config.mode);

    root.style.setProperty('--p',                     p);
    root.style.setProperty('--p-light',               this._rgba(p, 0.10));
    root.style.setProperty('--p-medium',              this._rgba(p, 0.18));
    root.style.setProperty('--p-dark',                this._shift(p, -30));
    root.style.setProperty('--p-shift',               this._shift(p, +40));
    root.style.setProperty('--color-primary',         p);
    root.style.setProperty('--color-secondary',       s);
    root.style.setProperty('--color-secondary-light', this._rgba(s, 0.12));
    root.style.setProperty('--color-accent',          this._rgba(p, 0.18));

    this._loadFontLink(config.font);
    root.style.setProperty('--dash-font', `'${config.font}', sans-serif`);
  }

  /**
   * Applies a callback while `html.theme-transitioning` is set.
   * Only elements that listen to that class get transitions — much cheaper
   * than a blanket `* { transition }` which re-transitions every DOM node.
   */
  private _withModeTransition(fn: () => void): void {
    document.documentElement.classList.add('theme-transitioning');
    fn();
    setTimeout(
      () => document.documentElement.classList.remove('theme-transitioning'),
      MODE_TRANSITION_MS
    );
  }

  // ── Storage helpers ───────────────────────────────────────────────────────

  private _readFromStorage(email: string): ThemeConfig {
    try {
      const raw = localStorage.getItem(storageKey(email));
      if (raw) return this._parseStorage(raw);

      // Legacy key fallback (pre-ThemeService format)
      const primary = localStorage.getItem('dashTheme_' + email) || DEFAULT_CONFIG.primary;
      const font    = localStorage.getItem('dashFont_'  + email) || DEFAULT_CONFIG.font;
      return { ...DEFAULT_CONFIG, primary, font };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  private _parseStorage(raw: string): ThemeConfig {
    const p = JSON.parse(raw) as Partial<ThemeConfig>;
    return {
      mode:      p.mode === 'dark' ? 'dark' : 'light',
      primary:   p.primary   || DEFAULT_CONFIG.primary,
      secondary: p.secondary || DEFAULT_CONFIG.secondary,
      font:      p.font      || DEFAULT_CONFIG.font,
      updatedAt: p.updatedAt || 0,
    };
  }

  private _saveToStorage(email: string, config: ThemeConfig): void {
    try {
      localStorage.setItem(storageKey(email), JSON.stringify(config));
      // Keep legacy keys in sync — read by the anti-FOUC inline script in index.html
      localStorage.setItem('dashTheme_' + email, config.primary);
      localStorage.setItem('dashFont_'  + email, config.font);
    } catch { /* quota exceeded or private mode */ }
  }

  // ── CSS helpers ───────────────────────────────────────────────────────────

  private _loadFontLink(fontName: string): void {
    const url = FONT_URLS[fontName];
    if (!url) return;
    const id = 'gfont-' + fontName.replace(/\s/g, '-');
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet'; link.href = url;
      document.head.appendChild(link);
    }
  }

  private _rgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private _shift(hex: string, amount: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
    const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
    const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }
}
