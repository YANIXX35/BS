import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EmailService, Stats, Email, EmailDetail, UserSettings, AiAnalysis } from '../../services/email';
import { ThemeService } from '../../services/theme.service';
import { PushNotificationService } from '../../services/push-notification.service';

@Component({
  selector: 'app-user-dashboard',
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule, MatFormFieldModule, MatInputModule, MatSelectModule
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
  mobileSidebarOpen = false;

  navigateTo(view: 'dashboard' | 'settings' | 'profile') {
    this.activeView = view;
    this.mobileSidebarOpen = false;
  }

  // Settings
  settings: UserSettings = {
    name: '', email: '', phone: '', gmail_address: '',
    telegram_chat_id: '', green_api_instance: '', green_api_token: '',
    telegram_enabled: true, whatsapp_enabled: true
  };
  settingsLoading = false;
  settingsSaved   = false;
  settingsError   = '';

  // Profile
  profilePhoto = '';
  editName     = '';
  profileSaved = false;

  // Theme — state mirrors ThemeService observables
  themeColor      = '#1a237e';
  secondaryColor  = '#7c3aed';
  darkMode        = false;

  secondaryPalette = [
    { name: 'Violet',   color: '#7c3aed' },
    { name: 'Rose',     color: '#db2777' },
    { name: 'Cyan',     color: '#0891b2' },
    { name: 'Vert',     color: '#059669' },
    { name: 'Orange',   color: '#ea580c' },
    { name: 'Dore',     color: '#d97706' },
    { name: 'Rouge',    color: '#dc2626' },
    { name: 'Fuschia',  color: '#c026d3' },
  ];

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

  // Debounce for color picker drag (swatch clicks save immediately)
  private _pickerDebounce:   any = null;
  private _secondaryDebounce: any = null;
  private _pendingTheme:     string | null = null;
  private _pendingSecondary: string | null = null;

  // Country code selector (WhatsApp)
  countryCodes = [
    { code: '+225', flag: '🇨🇮', name: 'Côte d\'Ivoire' },
    { code: '+221', flag: '🇸🇳', name: 'Sénégal' },
    { code: '+223', flag: '🇲🇱', name: 'Mali' },
    { code: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
    { code: '+233', flag: '🇬🇭', name: 'Ghana' },
    { code: '+234', flag: '🇳🇬', name: 'Nigéria' },
    { code: '+224', flag: '🇬🇳', name: 'Guinée' },
    { code: '+228', flag: '🇹🇬', name: 'Togo' },
  ];
  selectedDialCode = '+225';
  localPhone = '';

  get fullPhone(): string {
    const digits = this.selectedDialCode.replace('+', '');
    return digits + this.localPhone.replace(/\D/g, '');
  }

  private parsePhone() {
    const raw = (this.settings.phone || '').replace(/\D/g, '');
    if (!raw) { this.localPhone = ''; return; }
    const match = this.countryCodes.find(c => raw.startsWith(c.code.replace('+', '')));
    if (match) {
      this.selectedDialCode = match.code;
      this.localPhone = raw.slice(match.code.replace('+', '').length);
    } else {
      this.localPhone = raw;
    }
  }

  // QR WhatsApp
  qrLoading = false;
  qrImage   = '';
  qrStatus  = '';

  // Vérification numéro WhatsApp
  whatsappCheckLoading = false;
  whatsappCheckResult: 'none' | 'ok' | 'error' = 'none';
  whatsappCheckMessage = '';

  // AI analysis
  aiAnalysis: AiAnalysis | null = null;
  aiLoading = false;
  aiError = '';

  // Email reader
  selectedEmail: EmailDetail | null = null;
  emailDetailLoading = false;
  emailDetailBody: SafeHtml = '';

  // Email filter + search + pagination
  activeFilter: 'all' | 'important' | 'newsletter' | 'normal' = 'all';
  searchQuery = '';
  currentPage = 1;
  totalPages  = 1;
  loadingMore = false;

  get filteredEmails(): typeof this.emails {
    let list = this.activeFilter === 'all'
      ? this.emails
      : this.emails.filter(e => e.category === this.activeFilter);
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(e =>
        e.sender.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q)
      );
    }
    return list;
  }

  countByCategory(cat: string): number {
    return this.emails.filter(e => e.category === cat).length;
  }

  clearSearch() {
    this.searchQuery = '';
  }

  loadMoreEmails() {
    if (this.currentPage >= this.totalPages || this.loadingMore) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    this.emailService.getEmails(this.user.email, nextPage, 10).subscribe({
      next: (e) => {
        this.emails = [...this.emails, ...e.emails];
        this.currentPage = nextPage;
        this.totalPages  = e.pages;
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingMore = false; }
    });
  }

  // Gmail OAuth
  gmailConnected      = false;
  gmailConnectedEmail = '';
  gmailExpired        = false;
  gmailConnecting     = false;
  showGmailModal      = false;

  channels: { name: string; icon: string; active: boolean; color: string; handle: string }[] = [];

  quickActions = [
    { icon: 'refresh',       label: 'Actualiser',      color: '#1a237e', action: 'refresh' },
    { icon: 'psychology',    label: 'Analyse IA',       color: '#059669', action: 'ai'      },
    { icon: 'settings',      label: 'Parametres',       color: '#6a1b9a', action: 'settings'},
  ];

  private _clockInterval: any;
  private _syncInterval: any;
  private _themeSub!: Subscription;
  private _visibilityHandler!: () => void;

  constructor(
    private emailService: EmailService,
    private themeService: ThemeService,
    private pushNotif: PushNotificationService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────────

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (stored) this.user = JSON.parse(stored);

    // Initialiser les push notifications FCM
    if (this.user.email) {
      this.pushNotif.init(this.user.email);
    }

    // Sync local state with ThemeService observable
    this._themeSub = this.themeService.config$.subscribe(config => {
      this.themeColor     = config.primary;
      this.secondaryColor = config.secondary;
      this.currentFont    = config.font;
      this.darkMode       = config.mode === 'dark';
      this.cdr.detectChanges();
    });

    this.route.queryParams.subscribe(params => {
      if (params['gmail_connected'] === '1') {
        // Retour du callback OAuth Google
        this.gmailConnected      = true;
        this.gmailConnectedEmail = params['gmail_email'] || '';
        this.gmailConnecting     = false;
        this.activeView          = 'settings';
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
        this.loadUserSettings();
      } else if (params['gmail_error']) {
        this.gmailConnecting = false;
        this.activeView      = 'settings';
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
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

    this.emailService.getEmails(this.user.email, 1, 10).subscribe({
      next: (e) => {
        this.emails = e.emails;
        this.currentPage = 1;
        this.totalPages  = e.pages;
        this.loadingEmails = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingEmails = false; }
    });

    this.loadAiAnalysis();

    this.editName = this.user.name || '';

    // Apply cached photo immediately
    const cachedPhoto = localStorage.getItem('profilePhoto_' + this.user.email);
    if (cachedPhoto) this.profilePhoto = cachedPhoto;

    // ThemeService.loadAndApply() already called in app.ts (server is source of truth).
    // Here we just load non-theme settings (channels, avatar, gmail status).
    this.loadUserSettings();

    // Auto-sync toutes les 30 s pour cohérence multi-appareils
    this._syncInterval = setInterval(() => this.loadUserSettings(), 30000);

    // Page Visibility API — resync immédiat quand l'utilisateur revient sur l'onglet
    // (couvre le cas : changement thème sur mobile → retour sur PC)
    this._visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.themeService.loadAndApply(this.user.email);
        this.loadUserSettings();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  ngOnDestroy() {
    clearInterval(this._clockInterval);
    clearInterval(this._syncInterval);
    this._themeSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this._visibilityHandler);
    this._flushPending();
  }

  @HostListener('window:beforeunload')
  onBeforeUnload() { this._flushPending(); }

  private _flushPending() {
    const hasPrimary   = !!this._pendingTheme;
    const hasSecondary = !!this._pendingSecondary;
    if (!hasPrimary && !hasSecondary) return;

    clearTimeout(this._pickerDebounce);
    clearTimeout(this._secondaryDebounce);
    const url = `https://backend-mail-1.onrender.com/api/user/settings`;
    const payload: Record<string, string> = { email: this.user.email };
    if (hasPrimary)   payload['theme_color']     = this._pendingTheme!;
    if (hasSecondary) payload['theme_secondary']  = this._pendingSecondary!;
    navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    this._pendingTheme     = null;
    this._pendingSecondary = null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // THEME — delegates entirely to ThemeService
  // ─────────────────────────────────────────────────────────────────────────────

  /** Swatch click → immediate apply + immediate server save */
  applyTheme(color: string) {
    clearTimeout(this._pickerDebounce);
    this._pendingTheme = null;
    this.themeService.applyColor(this.user.email, color);
  }

  /** Color picker drag → instant visual preview, debounced save */
  applyThemePreview(color: string) {
    this._pendingTheme = color;
    this.themeService.applyColor(this.user.email, color, false); // no save yet
    clearTimeout(this._pickerDebounce);
    this._pickerDebounce = setTimeout(() => {
      this.themeService.applyColor(this.user.email, color);
      this._pendingTheme = null;
    }, 800);
  }

  /** Color picker release → save immediately */
  saveThemeFinal(color: string) {
    clearTimeout(this._pickerDebounce);
    this._pendingTheme = null;
    this.themeService.applyColor(this.user.email, color);
  }

  /** Color picker drag (secondary) → instant preview, debounced save */
  applySecondaryPreview(color: string) {
    this._pendingSecondary = color;
    this.themeService.applySecondary(this.user.email, color, false);
    clearTimeout(this._secondaryDebounce);
    this._secondaryDebounce = setTimeout(() => {
      this.themeService.applySecondary(this.user.email, color);
      this._pendingSecondary = null;
    }, 800);
  }

  /** Color picker release (secondary) → save immediately */
  saveSecondaryFinal(color: string) {
    clearTimeout(this._secondaryDebounce);
    this._pendingSecondary = null;
    this.themeService.applySecondary(this.user.email, color);
  }

  /** Toggle between light / dark mode */
  toggleDarkMode() {
    this.themeService.toggleMode(this.user.email);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FONT — delegates to ThemeService
  // ─────────────────────────────────────────────────────────────────────────────

  applyFont(fontName: string) {
    this.themeService.applyFont(this.user.email, fontName);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SETTINGS LOAD — server is the single source of truth
  // ─────────────────────────────────────────────────────────────────────────────

  loadUserSettings() {
    if (!this.user.email) return;
    this.emailService.getUserSettings(this.user.email).subscribe({
      next: (s) => {
        this.settings = s;
        if (this.settings.telegram_enabled === undefined) this.settings.telegram_enabled = true;
        if (this.settings.whatsapp_enabled === undefined) this.settings.whatsapp_enabled = true;
        this.parsePhone();

        // Delegate theme to ThemeService — server wins, no round-trip save.
        // Skip if ThemeService already synced < 5 s ago (avoid double-apply
        // when loadAndApply in app.ts and loadUserSettings fire close together).
        if (!this.themeService.isRecentlySynced) {
          const serverTs = s.theme_updated_at
            ? new Date(s.theme_updated_at).getTime()
            : 0;
          this.themeService.applyServerConfig(this.user.email, {
            ...(s.theme_mode === 'dark' || s.theme_mode === 'light'
                ? { mode: s.theme_mode as 'light' | 'dark' }
                : {}),
            ...(s.theme_color     ? { primary:   s.theme_color     } : {}),
            ...(s.theme_secondary ? { secondary: s.theme_secondary } : {}),
            ...(s.font_family     ? { font:      s.font_family     } : {}),
            ...(serverTs          ? { updatedAt: serverTs          } : {}),
          });
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
      next: (res) => {
        this.gmailConnected      = res.connected;
        this.gmailConnectedEmail = res.gmail_email || '';
        this.gmailExpired        = res.expired;
        this.refreshChannels();
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROFILE PHOTO
  // ─────────────────────────────────────────────────────────────────────────────

  avatarUploading = false;
  avatarError     = '';

  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Prévisualisation immédiate en local
    const reader = new FileReader();
    reader.onload = (e) => {
      this.profilePhoto = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    // Upload vers Cloudinary via le backend
    this.avatarUploading = true;
    this.avatarError = '';
    this.emailService.uploadAvatar(file).subscribe({
      next: (res) => {
        this.profilePhoto = res.url;
        localStorage.setItem('profilePhoto_' + this.user.email, res.url);
        this.avatarUploading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.avatarError = 'Erreur upload, réessaie.';
        this.avatarUploading = false;
        this.cdr.detectChanges();
      }
    });
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

  /** Ouvre le modal d'instruction avant la redirection Google. */
  openGmailModal() {
    this.showGmailModal = true;
  }

  /** Lance le flow OAuth Google (redirection navigateur). */
  connectGmail() {
    this.showGmailModal  = false;
    this.gmailConnecting = true;
    this.emailService.connectGmail(this.user.email);
  }

  /** Déconnecte Gmail et supprime les tokens OAuth. */
  disconnectGmail() {
    this.emailService.disconnectGmail(this.user.email).subscribe({
      next: () => {
        this.gmailConnected      = false;
        this.gmailConnectedEmail = '';
        this.gmailExpired        = false;
        this.refreshChannels();
        this.cdr.detectChanges();
      },
      error: () => {}
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
        active: !!this.settings.phone,
        color:  '#25d366',
        handle: this.settings.phone ? `+${this.settings.phone}` : 'Non configure'
      },
      {
        name:   'Gmail',
        icon:   'email',
        active: this.gmailConnected,
        color:  '#ea4335',
        handle: this.gmailConnectedEmail || this.settings.gmail_address || 'Non configure'
      },
    ];
  }

  openEmail(email: Email) {
    this.selectedEmail = { ...email, to: '', body: '', body_type: '', category: email.category ?? 'normal' };
    this.emailDetailLoading = true;
    this.emailDetailBody = '';
    // Mark as read locally
    email.unread = false;
    this.emailService.getEmailDetail(this.user.email, email.id).subscribe({
      next: (detail) => {
        this.selectedEmail = detail;
        this.emailDetailLoading = false;
        if (detail.body_type === 'text/html') {
          this.emailDetailBody = this.sanitizer.bypassSecurityTrustHtml(detail.body);
        } else {
          this.emailDetailBody = detail.body;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.emailDetailLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeEmail() {
    this.selectedEmail = null;
    this.emailDetailBody = '';
  }

  loadAiAnalysis() {
    if (!this.user.email) return;
    this.aiLoading = true;
    this.aiError = '';
    this.emailService.analyzeInbox(this.user.email).subscribe({
      next: (result) => {
        this.aiAnalysis = result;
        this.aiLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.aiError = err.error?.error || 'Analyse IA indisponible';
        this.aiLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  runAction(action: string) {
    if (action === 'settings') {
      this.activeView = 'settings';
    } else if (action === 'refresh') {
      this.loadingEmails = true;
      this.emailService.getEmails(this.user.email, 1, 10).subscribe({
        next: (e) => {
          this.emails = e.emails;
          this.currentPage = 1;
          this.totalPages  = e.pages;
          this.loadingEmails = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loadingEmails = false; }
      });
    } else if (action === 'ai') {
      this.loadAiAnalysis();
    }
  }

  saveSettings() {
    this.settings.phone  = this.fullPhone;
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
    this.qrLoading = true;
    this.qrImage   = '';
    this.qrStatus  = '';
    this.emailService.getWhatsappQr(this.user.email).subscribe({
      next: (res) => {
        this.qrLoading = false;
        if      (res.type === 'qrCode')        this.qrImage  = res.message;
        else if (res.type === 'alreadyLogged') this.qrStatus = 'WhatsApp est deja connecte !';
        else                                   this.qrStatus = res.message || 'Statut inconnu';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.qrLoading = false;
        this.qrStatus  = err.error?.error || 'Erreur WhatsApp indisponible';
        this.cdr.detectChanges();
      }
    });
  }

  verifyWhatsapp() {
    const phone = this.fullPhone.trim();
    if (!phone || !this.localPhone) {
      this.whatsappCheckResult  = 'error';
      this.whatsappCheckMessage = 'Entre ton numéro d\'abord.';
      return;
    }
    this.whatsappCheckLoading = true;
    this.whatsappCheckResult  = 'none';
    this.whatsappCheckMessage = '';
    this.emailService.checkWhatsappNumber(phone).subscribe({
      next: (res) => {
        this.whatsappCheckLoading = false;
        if (res.exists) {
          this.whatsappCheckResult  = 'ok';
          this.whatsappCheckMessage = 'Numéro WhatsApp vérifié !';
        } else {
          this.whatsappCheckResult  = 'error';
          this.whatsappCheckMessage = 'Ce numéro n\'est pas sur WhatsApp.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.whatsappCheckLoading = false;
        this.whatsappCheckResult  = 'error';
        this.whatsappCheckMessage = 'Erreur lors de la vérification.';
        this.cdr.detectChanges();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

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
    localStorage.clear();
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
