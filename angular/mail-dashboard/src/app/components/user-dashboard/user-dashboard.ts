import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EmailService, Stats, Email, UserSettings } from '../../services/email';

@Component({
  selector: 'app-user-dashboard',
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule, MatFormFieldModule, MatInputModule
  ],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.scss'
})
export class UserDashboard implements OnInit, OnDestroy {

  user = { name: '', email: '' };
  stats: Stats | null = null;
  emails: Email[] = [];
  loadingStats  = true;
  loadingEmails = true;
  currentTime   = new Date();
  activeView: 'dashboard' | 'settings' | 'profile' = 'dashboard';

  // Settings
  settings: UserSettings = {
    name: '', email: '', phone: '', gmail_address: '',
    telegram_chat_id: '', green_api_instance: '', green_api_token: ''
  };
  settingsLoading = false;
  settingsSaved   = false;
  settingsError   = '';

  // Profile
  profilePhoto = '';
  editName     = '';
  profileSaved = false;

  // Theme
  themeColor = '#1a237e';
  palette = [
    { name: 'Marine',   color: '#1a237e' },
    { name: 'Indigo',   color: '#4f46e5' },
    { name: 'Violet',   color: '#7c3aed' },
    { name: 'Rose',     color: '#e11d48' },
    { name: 'Orange',   color: '#ea580c' },
    { name: 'Vert',     color: '#059669' },
    { name: 'Cyan',     color: '#0284c7' },
    { name: 'Ardoise',  color: '#475569' },
    { name: 'Corail',   color: '#db2777' },
    { name: 'Dore',     color: '#d97706' },
    { name: 'Noir',     color: '#111827' },
    { name: 'Bordeaux', color: '#9f1239' },
  ];

  // Font
  currentFont = 'Inter';
  fonts = [
    { name: 'Inter',         url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
    { name: 'Poppins',       url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap' },
    { name: 'Raleway',       url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&display=swap' },
    { name: 'Nunito',        url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap' },
    { name: 'Montserrat',    url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap' },
    { name: 'DM Sans',       url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap' },
    { name: 'Outfit',        url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap' },
    { name: 'Space Grotesk', url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  ];

  // Debounce (only for color picker drag — swatch click saves immediately)
  private _pickerDebounce: any = null;
  // Track pending unsaved color (for beforeunload flush)
  private _pendingTheme: string | null = null;
  private _pendingFont:  string | null = null;

  // QR WhatsApp
  qrLoading = false;
  qrImage   = '';
  qrStatus  = '';

  // Gmail IMAP
  gmailConnected    = false;
  showGmailModal    = false;
  appPassword       = '';
  gmailTestLoading  = false;
  gmailTestSuccess  = '';
  gmailTestError    = '';

  channels: { name: string; icon: string; active: boolean; color: string; handle: string }[] = [];

  quickActions = [
    { icon: 'refresh',       label: 'Actualiser',      color: '#1a237e', action: 'refresh' },
    { icon: 'notifications', label: 'Test Notif',       color: '#f57c00', action: 'test'    },
    { icon: 'settings',      label: 'Parametres',       color: '#6a1b9a', action: 'settings'},
  ];

  private _clockInterval: any;
  private _syncInterval: any;

  constructor(
    private emailService: EmailService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private el: ElementRef
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────────

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (stored) this.user = JSON.parse(stored);

    this.route.queryParams.subscribe(params => {
      if (params['gmail'] === 'connected') {
        this.activeView = 'settings';
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
        this.loadUserSettings();
      }
    });

    this._clockInterval = setInterval(() => {
      this.currentTime = new Date();
      this.cdr.detectChanges();
    }, 1000);

    this.emailService.getStats(this.user.email).subscribe({
      next:  (s) => { this.stats = s; this.loadingStats = false; this.cdr.detectChanges(); },
      error: ()  => { this.loadingStats = false; }
    });

    this.emailService.getEmails(this.user.email).subscribe({
      next:  (e) => { this.emails = e.slice(0, 8); this.loadingEmails = false; this.cdr.detectChanges(); },
      error: ()  => { this.loadingEmails = false; }
    });

    this.editName = this.user.name || '';

    // 1. Apply localStorage as instant visual cache (0ms perceived latency)
    const cachedTheme = localStorage.getItem('dashTheme_' + this.user.email);
    const cachedFont  = localStorage.getItem('dashFont_'  + this.user.email);
    const cachedPhoto = localStorage.getItem('profilePhoto_' + this.user.email);
    if (cachedTheme) this._applyThemeCSS(cachedTheme);
    if (cachedFont)  this._applyFontCSS(cachedFont);
    if (cachedPhoto) this.profilePhoto = cachedPhoto;

    // 2. Load from server — SERVER IS ALWAYS THE SOURCE OF TRUTH
    //    Server values will OVERWRITE any localStorage values above
    this.loadUserSettings();

    // 3. Sync automatique toutes les 30 secondes pour garantir la synchronisation PC/mobile
    this._syncInterval = setInterval(() => {
      this.loadUserSettings();
    }, 30000);
  }

  ngOnDestroy() {
    clearInterval(this._clockInterval);
    clearInterval(this._syncInterval);
    // Flush any pending debounced saves before component destroys
    this._flushPending();
  }

  // If user closes tab / navigates away, flush pending saves via sendBeacon
  @HostListener('window:beforeunload')
  onBeforeUnload() {
    this._flushPending();
  }

  private _flushPending() {
    if (this._pendingTheme || this._pendingFont) {
      clearTimeout(this._pickerDebounce);
      const payload: any = { email: this.user.email };
      if (this._pendingTheme) payload.theme_color = this._pendingTheme;
      if (this._pendingFont)  payload.font_family  = this._pendingFont;
      // sendBeacon survives page close — fires even when window is unloading
      const url = `https://backend-mail-1.onrender.com/api/user/settings`;
      navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      this._pendingTheme = null;
      this._pendingFont  = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // THEME — 2 public methods for 2 use cases
  // ─────────────────────────────────────────────────────────────────────────────

  /** Called by swatch click → immediate visual + immediate server save */
  applyTheme(color: string) {
    this._applyThemeCSS(color);
    localStorage.setItem('dashTheme_' + this.user.email, color);
    // Cancel any pending debounced save (swatch wins)
    clearTimeout(this._pickerDebounce);
    this._pendingTheme = null;
    // Save immediately — user made a definitive choice
    this.emailService.savePreferences(this.user.email, { theme_color: color })
      .subscribe({ 
        next: () => {
          // Forcer le rechargement pour garantir la synchronisation entre appareils
          setTimeout(() => this.loadUserSettings(), 500);
        },
        error: (e) => console.error('[theme save]', e) 
      });
  }

  /** Called by color picker (input) → instant visual, debounced server save */
  applyThemePreview(color: string) {
    this._applyThemeCSS(color);
    localStorage.setItem('dashTheme_' + this.user.email, color);
    this._pendingTheme = color;
    clearTimeout(this._pickerDebounce);
    this._pickerDebounce = setTimeout(() => {
      this.emailService.savePreferences(this.user.email, { theme_color: color })
        .subscribe({ error: (e) => console.error('[theme save]', e) });
      this._pendingTheme = null;
    }, 800);
  }

  /** Called by color picker (change) = user released → save immediately */
  saveThemeFinal(color: string) {
    clearTimeout(this._pickerDebounce);
    this._pendingTheme = null;
    this._applyThemeCSS(color);
    localStorage.setItem('dashTheme_' + this.user.email, color);
    this.emailService.savePreferences(this.user.email, { theme_color: color })
      .subscribe({ 
        next: () => {
          // Forcer le rechargement pour garantir la synchronisation entre appareils
          setTimeout(() => this.loadUserSettings(), 500);
        },
        error: (e) => console.error('[theme save final]', e) 
      });
  }

  /** Pure CSS application — no server call, no localStorage write */
  private _applyThemeCSS(color: string) {
    this.themeColor = color;
    const light  = this._hexToRgba(color, 0.10);
    const medium = this._hexToRgba(color, 0.18);
    const dark   = this._shiftColor(color, -30);
    const shift  = this._shiftColor(color, +40);
    // Apply GLOBALLY on :root so ALL components see the theme
    const root = document.documentElement;
    root.style.setProperty('--p',        color);
    root.style.setProperty('--p-light',  light);
    root.style.setProperty('--p-medium', medium);
    root.style.setProperty('--p-dark',   dark);
    root.style.setProperty('--p-shift',  shift);
    // Also on host element (overrides :host SCSS default)
    const host = this.el.nativeElement as HTMLElement;
    host.style.setProperty('--p',        color);
    host.style.setProperty('--p-light',  light);
    host.style.setProperty('--p-medium', medium);
    host.style.setProperty('--p-dark',   dark);
    host.style.setProperty('--p-shift',  shift);
    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FONT
  // ─────────────────────────────────────────────────────────────────────────────

  applyFont(fontName: string) {
    this._applyFontCSS(fontName);
    localStorage.setItem('dashFont_' + this.user.email, fontName);
    this._pendingFont = null;
    this.emailService.savePreferences(this.user.email, { font_family: fontName })
      .subscribe({ error: (e) => console.error('[font save]', e) });
  }

  private _applyFontCSS(fontName: string) {
    this.currentFont = fontName;
    const font = this.fonts.find(f => f.name === fontName);
    if (font) {
      const id = 'gfont-' + fontName.replace(/\s/g, '-');
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id; link.rel = 'stylesheet'; link.href = font.url;
        document.head.appendChild(link);
      }
    }
    const val = `'${fontName}', sans-serif`;
    document.documentElement.style.setProperty('--dash-font', val);
    (this.el.nativeElement as HTMLElement).style.setProperty('--dash-font', val);
    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SETTINGS LOAD — server is the single source of truth
  // ─────────────────────────────────────────────────────────────────────────────

  loadUserSettings() {
    if (!this.user.email) return;
    this.emailService.getUserSettings(this.user.email).subscribe({
      next: (s) => {
        this.settings = s;

        // ✅ SERVER ALWAYS WINS — overwrite localStorage cache
        if (s.theme_color) {
          this._applyThemeCSS(s.theme_color);
          localStorage.setItem('dashTheme_' + this.user.email, s.theme_color);
        }
        if (s.font_family) {
          this._applyFontCSS(s.font_family);
          localStorage.setItem('dashFont_' + this.user.email, s.font_family);
        }
        if (s.avatar) {
          this.profilePhoto = s.avatar;
          localStorage.setItem('profilePhoto_' + this.user.email, s.avatar);
        }

        this.refreshChannels();
        this.cdr.detectChanges();
      },
      error: () => { /* keep localStorage values as fallback */ }
    });

    this.emailService.getGmailStatus(this.user.email).subscribe({
      next:  (res) => { this.gmailConnected = res.connected; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROFILE PHOTO
  // ─────────────────────────────────────────────────────────────────────────────

  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const compressed = await this._compressImage(e.target?.result as string);
      this.profilePhoto = compressed;
      localStorage.setItem('profilePhoto_' + this.user.email, compressed);
      this.emailService.savePreferences(this.user.email, { avatar: compressed })
        .subscribe({ error: (err) => console.error('[avatar save]', err) });
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  saveProfile() {
    this.user.name = this.editName;
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    stored.name = this.editName;
    localStorage.setItem('user', JSON.stringify(stored));
    this.emailService.updateUserSettings({ ...this.settings, email: this.user.email, name: this.editName }).subscribe();
    this.profileSaved = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.profileSaved = false; this.cdr.detectChanges(); }, 3000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SETTINGS (channels)
  // ─────────────────────────────────────────────────────────────────────────────

  testGmailImap() {
    if (!this.settings.gmail_address || !this.appPassword) {
      this.gmailTestError = 'Renseigne ton adresse Gmail et le code';
      return;
    }
    this.gmailTestLoading = true;
    this.gmailTestSuccess = '';
    this.gmailTestError   = '';
    this.emailService.testGmailImap(this.settings.gmail_address, this.appPassword).subscribe({
      next: (res) => {
        this.gmailTestLoading = false;
        if (res.success) {
          this.gmailTestSuccess = 'Gmail connecte avec succes !';
          this.emailService.updateUserSettings({
            ...this.settings, email: this.user.email, app_password: this.appPassword
          }).subscribe({ next: () => {
            this.gmailConnected   = true;
            this.showGmailModal   = false;
            this.appPassword      = '';
            this.refreshChannels();
            this.cdr.detectChanges();
          }});
        } else {
          this.gmailTestError = res.error || 'Code incorrect';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.gmailTestLoading = false;
        this.gmailTestError   = err.error?.error || 'Erreur de connexion';
        this.cdr.detectChanges();
      }
    });
  }

  refreshChannels() {
    this.channels = [
      {
        name:   'Telegram',
        icon:   'send',
        active: !!this.settings.telegram_chat_id,
        color:  '#0088cc',
        handle: this.settings.telegram_chat_id ? `Chat ID: ${this.settings.telegram_chat_id}` : 'Non configure'
      },
      {
        name:   'WhatsApp',
        icon:   'chat',
        active: !!this.settings.green_api_instance,
        color:  '#25d366',
        handle: this.settings.phone ? `+${this.settings.phone}` : 'Non configure'
      },
      {
        name:   'Gmail',
        icon:   'email',
        active: !!this.settings.gmail_address,
        color:  '#ea4335',
        handle: this.settings.gmail_address || 'Non configure'
      },
    ];
  }

  runAction(action: string) {
    if (action === 'settings') {
      this.activeView = 'settings';
    } else if (action === 'refresh') {
      this.loadingEmails = true;
      this.emailService.getEmails(this.user.email).subscribe({
        next:  (e) => { this.emails = e.slice(0, 8); this.loadingEmails = false; this.cdr.detectChanges(); },
        error: ()  => { this.loadingEmails = false; }
      });
    }
  }

  saveSettings() {
    this.settingsLoading = true;
    this.settingsSaved   = false;
    this.settingsError   = '';
    this.emailService.updateUserSettings({ ...this.settings, email: this.user.email }).subscribe({
      next: () => {
        this.settingsLoading = false;
        this.settingsSaved   = true;
        this.refreshChannels();
        this.cdr.detectChanges();
        setTimeout(() => { this.settingsSaved = false; this.cdr.detectChanges(); }, 3000);
      },
      error: (err) => {
        this.settingsLoading  = false;
        this.settingsError    = err.error?.error || 'Erreur lors de la sauvegarde';
        this.cdr.detectChanges();
      }
    });
  }

  getWhatsappQr() {
    if (!this.settings.green_api_instance || !this.settings.green_api_token) {
      this.qrStatus = "Renseigne d'abord le Green API Instance ID et le Token, puis sauvegarde.";
      return;
    }
    this.qrLoading = true;
    this.qrImage   = '';
    this.qrStatus  = '';
    this.emailService.updateUserSettings({ ...this.settings, email: this.user.email }).subscribe({
      next: () => {
        this.emailService.getWhatsappQr(this.user.email).subscribe({
          next: (res) => {
            this.qrLoading = false;
            if      (res.type === 'qrCode')       this.qrImage  = res.message;
            else if (res.type === 'alreadyLogged') this.qrStatus = 'WhatsApp est deja connecte !';
            else                                   this.qrStatus = res.message || 'Statut inconnu';
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.qrLoading = false;
            this.qrStatus  = err.error?.error || 'Erreur lors de la recuperation du QR code';
            this.cdr.detectChanges();
          }
        });
      },
      error: () => { this.qrLoading = false; this.qrStatus = 'Erreur sauvegarde des parametres'; this.cdr.detectChanges(); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private _hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private _shiftColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  private _compressImage(dataUrl: string, maxSize = 180): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio  = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = dataUrl;
    });
  }

  getSenderName(sender: string): string {
    const match = sender.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '').trim() : sender.split('@')[0];
  }

  getSenderInitial(sender: string): string {
    return this.getSenderName(sender).charAt(0).toUpperCase();
  }

  getAvatarColor(sender: string): string {
    const colors = ['#1a237e','#0288d1','#2e7d32','#f57c00','#6a1b9a','#c62828','#00695c'];
    return colors[sender.charCodeAt(0) % colors.length];
  }

  getUnreadCount(): number {
    return this.emails.filter(e => e.unread).length;
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/']);
  }
}
