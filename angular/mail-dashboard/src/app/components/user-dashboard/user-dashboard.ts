import { Component, OnInit, ChangeDetectorRef, ElementRef } from '@angular/core';
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
export class UserDashboard implements OnInit {
  user = { name: '', email: '' };
  stats: Stats | null = null;
  emails: Email[] = [];
  loadingStats = true;
  loadingEmails = true;
  currentTime = new Date();
  activeView: 'dashboard' | 'settings' | 'profile' = 'dashboard';

  // Settings
  settings: UserSettings = {
    name: '', email: '', phone: '', gmail_address: '',
    telegram_chat_id: '', green_api_instance: '', green_api_token: ''
  };
  settingsLoading = false;
  settingsSaved = false;
  settingsError = '';

  // Profile
  profilePhoto = '';
  editName = '';
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

  // QR WhatsApp
  qrLoading = false;
  qrImage = '';
  qrStatus = '';

  // Gmail IMAP
  gmailConnected = false;
  showGmailModal = false;
  appPassword = '';
  gmailTestLoading = false;
  gmailTestSuccess = '';
  gmailTestError = '';

  channels: { name: string; icon: string; active: boolean; color: string; handle: string }[] = [];

  quickActions = [
    { icon: 'refresh', label: 'Actualiser', color: '#1a237e', action: 'refresh' },
    { icon: 'notifications', label: 'Test Notif', color: '#f57c00', action: 'test' },
    { icon: 'settings', label: 'Parametres', color: '#6a1b9a', action: 'settings' },
  ];

  constructor(
    private emailService: EmailService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private el: ElementRef
  ) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (stored) {
      this.user = JSON.parse(stored);
    }

    this.route.queryParams.subscribe(params => {
      if (params['gmail'] === 'connected') {
        this.activeView = 'settings';
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
        this.loadUserSettings();
      }
    });

    setInterval(() => { this.currentTime = new Date(); this.cdr.detectChanges(); }, 1000);

    this.emailService.getStats(this.user.email).subscribe({
      next: (s) => { this.stats = s; this.loadingStats = false; this.cdr.detectChanges(); },
      error: () => { this.loadingStats = false; }
    });

    this.emailService.getEmails(this.user.email).subscribe({
      next: (e) => { this.emails = e.slice(0, 8); this.loadingEmails = false; this.cdr.detectChanges(); },
      error: () => { this.loadingEmails = false; }
    });

    this.loadUserSettings();
    this.profilePhoto = localStorage.getItem('profilePhoto_' + this.user.email) || '';
    this.editName = this.user.name || '';
    const saved = localStorage.getItem('dashTheme_' + this.user.email);
    if (saved) this.applyTheme(saved);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private shiftColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  applyTheme(color: string) {
    this.themeColor = color;
    localStorage.setItem('dashTheme_' + this.user.email, color);
    const host = this.el.nativeElement as HTMLElement;
    host.style.setProperty('--p', color);
    host.style.setProperty('--p-light', this.hexToRgba(color, 0.1));
    host.style.setProperty('--p-medium', this.hexToRgba(color, 0.18));
    host.style.setProperty('--p-dark', this.shiftColor(color, -30));
    host.style.setProperty('--p-shift', this.shiftColor(color, 40));
    this.cdr.detectChanges();
  }

  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.profilePhoto = e.target?.result as string;
      localStorage.setItem('profilePhoto_' + this.user.email, this.profilePhoto);
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

  loadUserSettings() {
    if (!this.user.email) return;
    this.emailService.getUserSettings(this.user.email).subscribe({
      next: (s) => {
        this.settings = s;
        this.refreshChannels();
        this.cdr.detectChanges();
      },
      error: () => {}
    });
    this.emailService.getGmailStatus(this.user.email).subscribe({
      next: (res) => { this.gmailConnected = res.connected; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  testGmailImap() {
    if (!this.settings.gmail_address || !this.appPassword) {
      this.gmailTestError = 'Renseigne ton adresse Gmail et le code';
      return;
    }
    this.gmailTestLoading = true;
    this.gmailTestSuccess = '';
    this.gmailTestError = '';
    this.emailService.testGmailImap(this.settings.gmail_address, this.appPassword).subscribe({
      next: (res) => {
        this.gmailTestLoading = false;
        if (res.success) {
          this.gmailTestSuccess = 'Gmail connecte avec succes !';
          this.emailService.updateUserSettings({
            ...this.settings, email: this.user.email, app_password: this.appPassword
          }).subscribe({ next: () => {
            this.gmailConnected = true;
            this.showGmailModal = false;
            this.appPassword = '';
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
        this.gmailTestError = err.error?.error || 'Erreur de connexion';
        this.cdr.detectChanges();
      }
    });
  }

  refreshChannels() {
    this.channels = [
      {
        name: 'Telegram',
        icon: 'send',
        active: !!this.settings.telegram_chat_id,
        color: '#0088cc',
        handle: this.settings.telegram_chat_id ? `Chat ID: ${this.settings.telegram_chat_id}` : 'Non configure'
      },
      {
        name: 'WhatsApp',
        icon: 'chat',
        active: !!this.settings.green_api_instance,
        color: '#25d366',
        handle: this.settings.phone ? `+${this.settings.phone}` : 'Non configure'
      },
      {
        name: 'Gmail',
        icon: 'email',
        active: !!this.settings.gmail_address,
        color: '#ea4335',
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
        next: (e) => { this.emails = e.slice(0, 8); this.loadingEmails = false; this.cdr.detectChanges(); },
        error: () => { this.loadingEmails = false; }
      });
    }
  }

  saveSettings() {
    this.settingsLoading = true;
    this.settingsSaved = false;
    this.settingsError = '';
    this.emailService.updateUserSettings({ ...this.settings, email: this.user.email }).subscribe({
      next: () => {
        this.settingsLoading = false;
        this.settingsSaved = true;
        this.refreshChannels();
        this.cdr.detectChanges();
        setTimeout(() => { this.settingsSaved = false; this.cdr.detectChanges(); }, 3000);
      },
      error: (err) => {
        this.settingsLoading = false;
        this.settingsError = err.error?.error || 'Erreur lors de la sauvegarde';
        this.cdr.detectChanges();
      }
    });
  }

  getWhatsappQr() {
    if (!this.settings.green_api_instance || !this.settings.green_api_token) {
      this.qrStatus = 'Renseigne d\'abord le Green API Instance ID et le Token, puis sauvegarde.';
      return;
    }
    this.qrLoading = true;
    this.qrImage = '';
    this.qrStatus = '';
    // Sauvegarde d'abord si pas encore fait
    this.emailService.updateUserSettings({ ...this.settings, email: this.user.email }).subscribe({
      next: () => {
        this.emailService.getWhatsappQr(this.user.email).subscribe({
          next: (res) => {
            this.qrLoading = false;
            if (res.type === 'qrCode') {
              this.qrImage = res.message;
              this.qrStatus = '';
            } else if (res.type === 'alreadyLogged') {
              this.qrStatus = 'WhatsApp est deja connecte !';
            } else {
              this.qrStatus = res.message || 'Statut inconnu';
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.qrLoading = false;
            this.qrStatus = err.error?.error || 'Erreur lors de la recuperation du QR code';
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.qrLoading = false;
        this.qrStatus = 'Erreur sauvegarde des parametres';
        this.cdr.detectChanges();
      }
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
