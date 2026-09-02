import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
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
import { Subscription as RxSubscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EmailService, Stats, Email, EmailDetail, UserSettings, AiAnalysis, WaTemplate, CustomRule, SecurityCheckResult, Subscription } from '../../services/email';
import { AuthService } from '../../services/auth';
import { ThemeService } from '../../services/theme.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-dashboard',
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule, MatFormFieldModule, MatInputModule, MatSelectModule
  ],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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
        this.cdr.markForCheck();
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
  gmailCanSend        = false;  // false = token sans scope send → bandeau upgrade
  monitorLastOk       = '';     // horodatage du dernier check réussi

  channels: { name: string; icon: string; active: boolean; color: string; handle: string }[] = [];

  quickActions = [
    { icon: 'refresh',       label: 'Actualiser',      color: '#1a237e', action: 'refresh' },
    { icon: 'psychology',    label: 'Analyse IA',       color: '#059669', action: 'ai'      },
    { icon: 'settings',      label: 'Parametres',       color: '#6a1b9a', action: 'settings'},
  ];

  // Reply
  replyOpen    = false;
  replyText    = '';
  replySending = false;
  replySuccess = '';
  replyError   = '';

  replyTemplates = [
    { label: '👍 OK merci',      text: 'Bonjour,\n\nMerci pour votre message.\n\nCordialement,' },
    { label: '📬 Bien reçu',     text: 'Bonjour,\n\nBien reçu, je reviens vers vous rapidement.\n\nCordialement,' },
    { label: '⏳ En cours',      text: 'Bonjour,\n\nMerci pour votre message. Je traite votre demande et reviens vers vous très prochainement.\n\nCordialement,' },
    { label: '📅 Confirmer RDV', text: 'Bonjour,\n\nJe confirme notre rendez-vous. N\'hésitez pas à me contacter si vous avez des questions.\n\nCordialement,' },
    { label: '🏖️ Absent',        text: 'Bonjour,\n\nJe suis actuellement absent et reviendrai prochainement. Je prendrai en compte votre message à mon retour.\n\nCordialement,' },
    { label: '❌ Refus poli',    text: 'Bonjour,\n\nMerci pour votre message. Après réflexion, je ne suis malheureusement pas en mesure de donner suite à votre demande.\n\nCordialement,' },
  ];

  // Webhook copy
  webhookCopied = false;

  private _clockInterval: any;
  private _syncInterval: any;
  private _themeSub!: RxSubscription;
  private _visibilityHandler!: () => void;

  constructor(
    private emailService: EmailService,
    private authService: AuthService,
    private themeService: ThemeService,
    private pushNotif: PushNotificationService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
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
      this.cdr.markForCheck();
    });

    // Fallback: browser blocked the popup → full-page redirect still works
    this.route.queryParams.subscribe(params => {
      if (params['gmail_connected'] === '1') {
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

    this.ngZone.runOutsideAngular(() => {
      this._clockInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.currentTime = new Date();
          this.cdr.markForCheck();
        });
      }, 60000);
    });

    this.emailService.getStats(this.user.email).subscribe({
      next:  (s) => { this.stats = s; this.loadingStats = false; this.cdr.markForCheck(); },
      error: ()  => { this.loadingStats = false; }
    });

    this.emailService.getEmails(this.user.email, 1, 10).subscribe({
      next: (e) => {
        this.emails = e.emails;
        this.currentPage = 1;
        this.totalPages  = e.pages;
        this.loadingEmails = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingEmails = false; }
    });

    this.editName = this.user.name || '';

    // Apply cached photo immediately
    const cachedPhoto = localStorage.getItem('profilePhoto_' + this.user.email);
    if (cachedPhoto) this.profilePhoto = cachedPhoto;

    // ThemeService.loadAndApply() already called in app.ts (server is source of truth).
    // Here we just load non-theme settings (channels, avatar, gmail status).
    this.loadUserSettings();

    // Auto-sync toutes les 5 min, seulement si l'onglet est visible
    this.ngZone.runOutsideAngular(() => {
      this._syncInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          this.ngZone.run(() => this.loadUserSettings());
        }
      }, 300000);
    });

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
    const url = `${environment.apiUrl}/api/user/settings`;
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

        // Sync nom depuis le serveur (source de vérité inter-appareils)
        if (s.name && s.name !== this.user.name) {
          this.user.name  = s.name;
          this.editName   = s.name;
          const stored    = JSON.parse(localStorage.getItem('user') || '{}');
          stored.name     = s.name;
          localStorage.setItem('user', JSON.stringify(stored));
        }

        // Sync thème — uniquement si ThemeService n'a pas déjà synchro < 5s
        // (évite la race condition : PUT pas encore reçu par le serveur)
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
        this.cdr.markForCheck();
      },
      error: () => { /* keep localStorage values as fallback */ }
    });

    this.loadSubscription();

    this.emailService.getGmailStatus(this.user.email).subscribe({
      next: (res) => {
        this.gmailConnected      = res.connected;
        this.gmailConnectedEmail = res.gmail_email || '';
        this.gmailExpired        = res.expired;
        this.gmailCanSend        = !res.connected || res.can_send;
        this.monitorLastOk       = res.monitor_last_ok ? this._timeAgo(res.monitor_last_ok) : '';
        this.refreshChannels();
        this.cdr.markForCheck();
      },
      error: () => {
        // On error we keep gmailCanSend = false (default), which shows the banner
        // for connected users — safer than assuming send scope is OK.
        this.cdr.markForCheck();
      }
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
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);

    // Upload vers Cloudinary via le backend
    this.avatarUploading = true;
    this.avatarError = '';
    this.emailService.uploadAvatar(file).subscribe({
      next: (res) => {
        this.profilePhoto = res.url;
        this.settings.avatar = res.url;
        localStorage.setItem('profilePhoto_' + this.user.email, res.url);
        this.avatarUploading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.avatarError = 'Erreur upload, réessaie.';
        this.avatarUploading = false;
        this.cdr.markForCheck();
      }
    });
  }

  saveProfile() {
    this.user.name = this.editName;
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    stored.name = this.editName;
    localStorage.setItem('user', JSON.stringify(stored));
    // Ne PAS envoyer les champs thème — ils sont gérés exclusivement par ThemeService
    // sinon les valeurs périmées de this.settings écrasent le thème actuel sur le serveur
    const { theme_color, font_family, theme_mode, theme_secondary, theme_updated_at, ...rest } = this.settings;
    this.emailService.updateUserSettings({ ...rest, email: this.user.email, name: this.editName }).subscribe({
      error: () => { this.profileSaved = false; this.cdr.markForCheck(); }
    });
    this.profileSaved = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.profileSaved = false; this.cdr.markForCheck(); }, 3000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SETTINGS (channels)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Ouvre le modal d'instruction avant de lancer l'OAuth Google. */
  openGmailModal() {
    this.showGmailModal = true;
  }

  /** Lance le flow OAuth Google via popup. */
  connectGmail() {
    this.showGmailModal  = false;
    this.gmailConnecting = true;
    this._openGmailPopup();
  }

  private _openGmailPopup() {
    const url  = this.emailService.getGmailConnectUrl(this.user.email);
    const w    = 520, h = 650;
    const left = Math.round(screen.width  / 2 - w / 2);
    const top  = Math.round(screen.height / 2 - h / 2);
    const popup = window.open(
      url, 'gmail-oauth',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'gmail_oauth') return;
      window.removeEventListener('message', onMessage);
      clearInterval(closedCheck);
      this.gmailConnecting = false;
      if (event.data.success) {
        this.gmailConnected      = true;
        this.gmailConnectedEmail = event.data.gmail_email;
        this.gmailCanSend        = true;
        this.loadUserSettings();
      }
      this.cdr.markForCheck();
    };
    window.addEventListener('message', onMessage);

    const closedCheck = setInterval(() => {
      if (popup?.closed) {
        clearInterval(closedCheck);
        window.removeEventListener('message', onMessage);
        if (this.gmailConnecting) {
          this.gmailConnecting = false;
          this.loadUserSettings();
          this.cdr.markForCheck();
        }
      }
    }, 500);
  }

  /** Déconnecte Gmail et supprime les tokens OAuth. */
  disconnectGmail() {
    this.emailService.disconnectGmail(this.user.email).subscribe({
      next: () => {
        this.gmailConnected      = false;
        this.gmailConnectedEmail = '';
        this.gmailExpired        = false;
        this.refreshChannels();
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      },
      error: () => {
        this.emailDetailLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  closeEmail() {
    this.selectedEmail   = null;
    this.emailDetailBody = '';
    this.replyOpen       = false;
    this.replyText       = '';
    this.replyError      = '';
    this.replySuccess    = '';
    this.securityResult  = null;
    this.securityError   = '';
    this.securityLoading = false;
  }

  openReply() {
    this.replyOpen   = true;
    this.replyText   = '';
    this.replySuccess = '';
    this.replyError  = '';
  }

  closeReply() {
    this.replyOpen = false;
  }

  reconnectGmailForSend() {
    this.gmailConnecting = true;
    this._openGmailPopup();
  }

  private _timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)   return 'il y a quelques secondes';
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return `il y a ${Math.floor(diff / 86400)} j`;
  }

  copyWebhookUrl() {
    navigator.clipboard.writeText(`${environment.apiUrl}/api/whatsapp/webhook`).then(() => {
      this.webhookCopied = true;
      this.cdr.markForCheck();
      setTimeout(() => { this.webhookCopied = false; this.cdr.markForCheck(); }, 2000);
    });
  }

  sendReply() {
    if (!this.selectedEmail || !this.replyText.trim()) return;
    this.replySending = true;
    this.replySuccess = '';
    this.replyError   = '';
    this.emailService.replyEmail(this.user.email, this.selectedEmail.id, this.replyText.trim()).subscribe({
      next: () => {
        this.replySending = false;
        this.replySuccess = 'Réponse envoyée !';
        this.replyText    = '';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.replySuccess = '';
          this.replyOpen    = false;
          this.cdr.markForCheck();
        }, 2500);
      },
      error: (err) => {
        this.replySending = false;
        const errData = err.error || {};
        if (errData.reconnect) {
          // Scope gmail.send manquant → re-auth automatique
          this.replyError = "Mise à jour des permissions Gmail en cours...";
          this.gmailCanSend = false;
          this.cdr.markForCheck();
          setTimeout(() => { this.gmailConnecting = true; this._openGmailPopup(); }, 1500);
          return;
        }
        this.replyError = errData.error || "Erreur lors de l'envoi";
        this.cdr.markForCheck();
      }
    });
  }

  loadAiAnalysis() {
    if (!this.user.email) return;
    this.aiLoading = true;
    this.aiError = '';
    this.emailService.analyzeInbox(this.user.email).subscribe({
      next: (result) => {
        this.aiAnalysis = result;
        this.aiLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg: string = err.error?.error || '';
        // Gmail not connected → show the neutral placeholder, not an error
        if (err.status === 403 || msg.toLowerCase().includes('gmail')) {
          this.aiAnalysis = null;
          this.aiError = '';
        } else {
          this.aiError = msg || 'Analyse IA indisponible';
        }
        this.aiLoading = false;
        this.cdr.markForCheck();
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
          this.cdr.markForCheck();
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
    const { theme_color, font_family, theme_mode, theme_secondary, theme_updated_at, ...channelSettings } = this.settings;
    this.emailService.updateUserSettings({ ...channelSettings, email: this.user.email }).subscribe({
      next: () => {
        this.settingsLoading = false;
        this.settingsSaved   = true;
        this.refreshChannels();
        this.cdr.markForCheck();
        setTimeout(() => { this.settingsSaved = false; this.cdr.markForCheck(); }, 3000);
      },
      error: (err) => {
        this.settingsLoading  = false;
        this.settingsError    = err.error?.error || 'Erreur lors de la sauvegarde';
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      },
      error: () => {
        this.whatsappCheckLoading = false;
        this.whatsappCheckResult  = 'error';
        this.whatsappCheckMessage = 'Erreur lors de la vérification.';
        this.cdr.markForCheck();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATES WHATSAPP
  // ─────────────────────────────────────────────────────────────────────────────

  defaultTemplates: WaTemplate[] = [];
  customTemplates: WaTemplate[]  = [];
  templatesLoading  = false;
  templatesSection  = false;

  // New template form
  newTplName    = '';
  newTplContent = '';
  newTplSaving  = false;
  newTplError   = '';
  newTplSuccess = false;

  // Edit template form
  editTplId: number | null = null;
  editTplName    = '';
  editTplContent = '';
  editTplSaving  = false;
  editTplError   = '';

  loadTemplates() {
    if (this.templatesLoading) return;
    this.templatesLoading = true;
    this.emailService.getTemplates().subscribe({
      next: (res) => {
        this.defaultTemplates = res.defaults;
        this.customTemplates  = res.custom;
        this.templatesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.templatesLoading = false; this.cdr.markForCheck(); }
    });
  }

  openTemplatesSection() {
    this.templatesSection = !this.templatesSection;
    if (this.templatesSection && !this.defaultTemplates.length) {
      this.loadTemplates();
    }
  }

  saveNewTemplate() {
    const name = this.newTplName.trim();
    const content = this.newTplContent.trim();
    if (!name || !content) { this.newTplError = 'Nom et contenu requis.'; return; }
    this.newTplSaving = true;
    this.newTplError = '';
    this.emailService.createTemplate(name, content).subscribe({
      next: (tpl) => {
        this.customTemplates.push(tpl);
        this.newTplName    = '';
        this.newTplContent = '';
        this.newTplSaving  = false;
        this.newTplSuccess = true;
        this.cdr.markForCheck();
        setTimeout(() => { this.newTplSuccess = false; this.cdr.markForCheck(); }, 2500);
      },
      error: (err) => {
        this.newTplSaving = false;
        this.newTplError  = err.error?.error || 'Erreur lors de la création.';
        this.cdr.markForCheck();
      }
    });
  }

  startEditTemplate(tpl: WaTemplate) {
    this.editTplId      = tpl.id;
    this.editTplName    = tpl.name;
    this.editTplContent = tpl.content;
    this.editTplError   = '';
  }

  cancelEditTemplate() {
    this.editTplId = null;
  }

  saveEditTemplate() {
    if (!this.editTplId) return;
    const name = this.editTplName.trim();
    const content = this.editTplContent.trim();
    if (!name || !content) { this.editTplError = 'Nom et contenu requis.'; return; }
    this.editTplSaving = true;
    this.editTplError  = '';
    this.emailService.updateTemplate(this.editTplId, name, content).subscribe({
      next: () => {
        const idx = this.customTemplates.findIndex(t => t.id === this.editTplId);
        if (idx !== -1) {
          this.customTemplates[idx] = { ...this.customTemplates[idx], name, content };
        }
        this.editTplId     = null;
        this.editTplSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.editTplSaving = false;
        this.editTplError  = err.error?.error || 'Erreur mise à jour.';
        this.cdr.markForCheck();
      }
    });
  }

  deleteTemplate(tpl: WaTemplate) {
    if (!tpl.id || !confirm(`Supprimer le template "${tpl.name}" ?`)) return;
    this.emailService.deleteTemplate(tpl.id).subscribe({
      next: () => {
        this.customTemplates = this.customTemplates.filter(t => t.id !== tpl.id);
        this.cdr.markForCheck();
      },
      error: () => {}
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

  // ── Chatbot ────────────────────────────────────────────────────────────────
  chatOpen     = false;
  chatLoading  = false;
  chatInput    = '';
  chatMessages: Array<{ role: 'user' | 'bot'; text: string; typing?: boolean }> = [];
  chatSuggestions = [
    'Comment répondre depuis WhatsApp ?',
    'Mes notifications ne fonctionnent pas',
    'Comment configurer Telegram ?',
    'Explique les commandes WhatsApp',
  ];
  private _twInterval: any = null;

  toggleChat() {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen && this.chatMessages.length === 0) {
      const welcome = { role: 'bot' as const, text: '' };
      this.chatMessages.push(welcome);
      this._typewriteChat(welcome, "Bonjour ! 👋 Je suis ton assistant MailNotifier. Comment puis-je t'aider ?");
    }
    if (this.chatOpen) setTimeout(() => this._scrollChatPanel(), 100);
  }

  async sendChat(text?: string) {
    const message = (text ?? this.chatInput).trim();
    if (!message || this.chatLoading) return;
    this.chatInput = '';
    this.chatMessages.push({ role: 'user', text: message });
    this.chatLoading = true;
    const typing = { role: 'bot' as const, text: '', typing: false };
    this.chatMessages.push(typing);
    this.cdr.markForCheck();
    this._scrollChatPanel();
    const history = this.chatMessages.slice(0, -2).map(m => ({ role: m.role, text: m.text }));
    try {
      const res = await fetch(`${environment.apiUrl}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history })
      });
      if (!res.ok || !res.body) throw new Error('bad response');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            const d = JSON.parse(raw);
            if (d.text) { typing.text += d.text; this.cdr.markForCheck(); this._scrollChatPanel(); }
          } catch {}
        }
      }
    } catch {
      typing.text = "Désolé, une erreur est survenue. Réessaie ! 😅";
      this.cdr.markForCheck();
    } finally {
      this.chatLoading = false;
      this.cdr.markForCheck();
    }
  }

  private _typewriteChat(msg: { text: string }, fullText: string) {
    clearInterval(this._twInterval);
    let i = 0;
    msg.text = '';
    this._twInterval = setInterval(() => {
      msg.text += fullText[i++];
      this.cdr.markForCheck();
      if (i % 5 === 0) this._scrollChatPanel();
      if (i >= fullText.length) clearInterval(this._twInterval);
    }, 14);
  }

  private _scrollChatPanel() {
    const el = document.querySelector('.dash-chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  logout() {
    this.authService.logout().subscribe({ error: () => {} });
    localStorage.clear();
    this.router.navigate(['/'], { replaceUrl: true });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RÈGLES DE TRI PERSONNALISÉES (Phase 2)
  // ─────────────────────────────────────────────────────────────────────────────

  rules: CustomRule[] = [];
  rulesLoading = false;
  newRuleType: 'vip' | 'sender' | 'keyword' = 'vip';
  newRuleValue = '';
  newRuleCategory: 'important' | 'newsletter' | 'normal' = 'important';
  newRuleSaving = false;
  newRuleError  = '';
  newRuleSuccess = false;

  loadRules() {
    if (this.rulesLoading) return;
    this.rulesLoading = true;
    this.emailService.getRules().subscribe({
      next: (res) => {
        this.rules = res.rules;
        this.rulesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.rulesLoading = false; this.cdr.markForCheck(); }
    });
  }

  saveNewRule() {
    const value = this.newRuleValue.trim().toLowerCase();
    if (!value) { this.newRuleError = 'Valeur requise.'; this.cdr.markForCheck(); return; }
    this.newRuleSaving = true;
    this.newRuleError  = '';
    this.emailService.createRule(this.newRuleType, value, this.newRuleCategory).subscribe({
      next: (res) => {
        this.rules.push(res.rule);
        this.newRuleValue   = '';
        this.newRuleSaving  = false;
        this.newRuleSuccess = true;
        this.cdr.markForCheck();
        setTimeout(() => { this.newRuleSuccess = false; this.cdr.markForCheck(); }, 2500);
      },
      error: (err) => {
        this.newRuleSaving = false;
        this.newRuleError  = err.error?.error || 'Erreur lors de la création.';
        this.cdr.markForCheck();
      }
    });
  }

  toggleRule(rule: CustomRule) {
    const prev = rule.active;
    rule.active = !prev;
    this.cdr.markForCheck();
    this.emailService.updateRule(rule.id, { active: rule.active }).subscribe({
      error: () => { rule.active = prev; this.cdr.markForCheck(); }
    });
  }

  deleteRule(rule: CustomRule) {
    if (!confirm(`Supprimer la règle "${rule.value}" ?`)) return;
    this.emailService.deleteRule(rule.id).subscribe({
      next: () => {
        this.rules = this.rules.filter(r => r.id !== rule.id);
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DÉTECTION PHISHING (Phase 2)
  // ─────────────────────────────────────────────────────────────────────────────

  securityResult: SecurityCheckResult | null = null;
  securityLoading = false;
  securityError   = '';

  checkEmailSecurity() {
    if (!this.selectedEmail) return;
    this.securityLoading = true;
    this.securityResult  = null;
    this.securityError   = '';
    this.cdr.markForCheck();
    this.emailService.checkEmailSecurity(this.selectedEmail.id).subscribe({
      next: (res) => {
        this.securityResult  = res;
        this.securityLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.securityError   = err.error?.error || 'Erreur analyse sécurité.';
        this.securityLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ABONNEMENT (Phase 3)
  // ─────────────────────────────────────────────────────────────────────────────

  subscription: Subscription | null = null;

  loadSubscription() {
    this.emailService.getSubscription().subscribe({
      next: (s) => { this.subscription = s; this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  get planLabel(): string {
    const p = this.subscription?.plan || this.settings?.plan || 'free';
    const map: Record<string, string> = { free: 'Gratuit', premium: 'Premium', enterprise: 'Enterprise', test: 'Test' };
    return map[p] || p;
  }

  get planBadgeClass(): string {
    const p = this.subscription?.plan || 'free';
    return `plan-badge-${p}`;
  }

  get daysLeftLabel(): string {
    const d = this.subscription?.days_left;
    if (d === null || d === undefined) return '';
    if (d === 0) return 'Expiré aujourd\'hui';
    return `${d} jour${d > 1 ? 's' : ''} restant${d > 1 ? 's' : ''}`;
  }

  get showExpiryBanner(): boolean {
    if (!this.subscription) return false;
    const d = this.subscription.days_left;
    return this.subscription.plan !== 'free' && d !== null && d <= 7;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2FA TOGGLE
  // ─────────────────────────────────────────────────────────────────────────────

  twoFaToggling        = false;
  twoFaPendingEnabled  = false;
  twoFaPassword        = '';
  twoFaToggleLoading   = false;
  twoFaToggleMsg       = '';
  twoFaToggleError     = '';

  startToggle2fa() {
    this.twoFaPendingEnabled = !this.settings.two_fa_enabled;
    this.twoFaPassword       = '';
    this.twoFaToggleMsg      = '';
    this.twoFaToggleError    = '';
    this.twoFaToggling       = true;
    this.cdr.markForCheck();
  }

  cancelToggle2fa() {
    this.twoFaToggling = false;
    this.cdr.markForCheck();
  }

  confirmToggle2fa() {
    if (!this.twoFaPassword.trim()) {
      this.twoFaToggleError = 'Mot de passe requis.';
      this.cdr.markForCheck();
      return;
    }
    this.twoFaToggleLoading = true;
    this.twoFaToggleError   = '';
    this.authService.toggle2fa(this.twoFaPassword, this.twoFaPendingEnabled).subscribe({
      next: () => {
        this.settings.two_fa_enabled = this.twoFaPendingEnabled;
        this.twoFaToggling           = false;
        this.twoFaToggleLoading      = false;
        this.twoFaToggleMsg          = this.twoFaPendingEnabled
          ? 'Double authentification activée.'
          : 'Double authentification désactivée.';
        this.cdr.markForCheck();
        setTimeout(() => { this.twoFaToggleMsg = ''; this.cdr.markForCheck(); }, 3500);
      },
      error: (err) => {
        this.twoFaToggleLoading = false;
        this.twoFaToggleError   = err.error?.error || 'Mot de passe incorrect.';
        this.cdr.markForCheck();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RGPD — EXPORT & SUPPRESSION DE COMPTE
  // ─────────────────────────────────────────────────────────────────────────────

  exportLoading        = false;
  showDeleteModal      = false;
  deleteConfirmPassword = '';
  deleteLoading        = false;
  deleteError          = '';

  exportUserData() {
    this.exportLoading = true;
    this.cdr.markForCheck();
    this.emailService.exportData().subscribe({
      next: (blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href  = url;
        link.download = `notifymails_export_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.exportLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.exportLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openDeleteModal() {
    this.deleteConfirmPassword = '';
    this.deleteError           = '';
    this.showDeleteModal       = true;
    this.cdr.markForCheck();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.cdr.markForCheck();
  }

  confirmDeleteAccount() {
    if (!this.deleteConfirmPassword.trim()) {
      this.deleteError = 'Mot de passe requis.';
      this.cdr.markForCheck();
      return;
    }
    this.deleteLoading = true;
    this.deleteError   = '';
    this.emailService.deleteAccount(this.deleteConfirmPassword).subscribe({
      next: () => {
        this.authService.logout().subscribe({ error: () => {} });
        localStorage.clear();
        this.router.navigate(['/'], { replaceUrl: true });
      },
      error: (err) => {
        this.deleteLoading = false;
        this.deleteError   = err.error?.error || 'Mot de passe incorrect ou erreur serveur.';
        this.cdr.markForCheck();
      }
    });
  }
}
