import { Component, OnInit, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService, AdminUser, Payment, AdminStats } from '../../services/admin';
import { EmailService, Email, Stats, UserSettings } from '../../services/email';

export type Section = 'overview' | 'users' | 'emails' | 'user-emails' | 'payments' | 'settings';

interface NavItem {
  id: Section;
  icon: string;
  label: string;
}

// Extended user type with new fields from the API
interface AdminUserDetail extends AdminUser {
  phone?: string;
  gmail_address?: string;
  telegram_chat_id?: string;
  green_api_instance?: string;
  gmail_connected?: boolean;
  monitor_active?: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatChipsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDialogModule, MatDividerModule, MatTooltipModule,
    MatProgressBarModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard implements OnInit {
  activeSection: Section = 'overview';
  admin = { name: '', email: '' };
  mobileMenuOpen = false;

  stats: AdminStats | null = null;
  gmailStats: Stats | null = null;
  users: AdminUserDetail[] = [];
  payments: Payment[] = [];
  emails: Email[] = [];

  loading = { stats: true, users: true, payments: true, emails: true };

  // Gmail IMAP (admin settings)
  adminSettings: UserSettings = {
    name: '', email: '', phone: '', gmail_address: '',
    telegram_chat_id: '', green_api_instance: '', green_api_token: ''
  };
  gmailConnected = false;
  showGmailModal = false;
  appPassword = '';
  gmailTestLoading = false;
  gmailTestSuccess = '';
  gmailTestError = '';
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
    { name: 'Marine',    color: '#1a237e' },
    { name: 'Indigo',    color: '#4f46e5' },
    { name: 'Violet',    color: '#7c3aed' },
    { name: 'Rose',      color: '#e11d48' },
    { name: 'Orange',    color: '#ea580c' },
    { name: 'Vert',      color: '#059669' },
    { name: 'Cyan',      color: '#0284c7' },
    { name: 'Ardoise',   color: '#475569' },
    { name: 'Corail',    color: '#db2777' },
    { name: 'Dore',      color: '#d97706' },
    { name: 'Noir',      color: '#111827' },
    { name: 'Bordeaux',  color: '#9f1239' },
  ];

  // Font
  currentFont = 'Inter';
  fonts = [
    { name: 'Inter',         label: 'Inter',         url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
    { name: 'Poppins',       label: 'Poppins',        url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap' },
    { name: 'Raleway',       label: 'Raleway',        url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&display=swap' },
    { name: 'Nunito',        label: 'Nunito',         url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap' },
    { name: 'Montserrat',    label: 'Montserrat',     url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap' },
    { name: 'DM Sans',       label: 'DM Sans',        url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap' },
    { name: 'Outfit',        label: 'Outfit',         url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap' },
    { name: 'Space Grotesk', label: 'Space Grotesk',  url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  ];

  // Detail panel
  selectedUser: AdminUserDetail | null = null;

  // Search
  globalSearch = '';
  userSearch = '';

  // CRUD User modal
  showUserModal = false;
  editingUser: Partial<AdminUserDetail> & { password?: string } = {};
  isEditMode = false;

  // CRUD Payment modal
  showPaymentModal = false;
  newPayment: any = { user_id: '', plan: 'premium', amount: 9.99, status: 'paid' };

  // Mails par utilisateur
  selectedUserEmail = '';
  userEmails: Email[] = [];
  loadingUserEmails = false;

  navItems: NavItem[] = [
    { id: 'overview',    icon: 'dashboard',     label: 'Vue generale' },
    { id: 'emails',      icon: 'email',         label: 'Mes mails' },
    { id: 'user-emails', icon: 'manage_search', label: 'Mails utilisateurs' },
    { id: 'users',       icon: 'people',        label: 'Utilisateurs' },
    { id: 'payments',    icon: 'payment',       label: 'Paiements' },
  ];

  planOptions = [
    { value: 'free',       label: 'Gratuit',    price: 0 },
    { value: 'premium',    label: 'Premium',    price: 9.99 },
    { value: 'enterprise', label: 'Enterprise', price: 29.99 },
  ];

  constructor(
    private adminService: AdminService,
    private emailService: EmailService,
    private router: Router,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private el: ElementRef
  ) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (stored) this.admin = JSON.parse(stored);
    this.loadAll();
    this.loadAdminGmailStatus();
    this.profilePhoto = localStorage.getItem('profilePhoto_' + this.admin.email) || '';
    this.editName = this.admin.name || '';
    const savedTheme = localStorage.getItem('dashTheme_admin_' + this.admin.email);
    if (savedTheme) this.applyTheme(savedTheme);
    const savedFont = localStorage.getItem('dashFont_admin_' + this.admin.email);
    if (savedFont) this.applyFont(savedFont);
  }

  // ── PROFILE ──
  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.profilePhoto = e.target?.result as string;
      localStorage.setItem('profilePhoto_' + this.admin.email, this.profilePhoto);
      // Sync to backend so photo works across all devices
      this.emailService.updateUserSettings({
        ...this.adminSettings, email: this.admin.email, avatar: this.profilePhoto
      }).subscribe();
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  saveAdminProfile() {
    this.admin.name = this.editName;
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    stored.name = this.editName;
    localStorage.setItem('user', JSON.stringify(stored));
    this.profileSaved = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.profileSaved = false; this.cdr.detectChanges(); }, 3000);
  }

  // ── THEME ──
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
    localStorage.setItem('dashTheme_admin_' + this.admin.email, color);
    const host = this.el.nativeElement as HTMLElement;
    host.style.setProperty('--p', color);
    host.style.setProperty('--p-light', this.hexToRgba(color, 0.1));
    host.style.setProperty('--p-medium', this.hexToRgba(color, 0.18));
    host.style.setProperty('--p-dark', this.shiftColor(color, -30));
    host.style.setProperty('--p-shift', this.shiftColor(color, 40));
    this.cdr.detectChanges();
  }

  // ── FONT ──
  applyFont(fontName: string) {
    this.currentFont = fontName;
    localStorage.setItem('dashFont_admin_' + this.admin.email, fontName);
    const font = this.fonts.find(f => f.name === fontName);
    if (font) {
      const id = 'gfont-admin-' + fontName.replace(/\s/g, '-');
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id; link.rel = 'stylesheet'; link.href = font.url;
        document.head.appendChild(link);
      }
    }
    (this.el.nativeElement as HTMLElement).style.setProperty('--dash-font', `'${fontName}', sans-serif`);
    this.cdr.detectChanges();
  }

  loadAdminGmailStatus() {
    if (!this.admin.email) return;
    this.emailService.getUserSettings(this.admin.email).subscribe({
      next: (s) => {
        this.adminSettings = s;
        // Avatar from server takes priority over localStorage
        if (s.avatar) {
          this.profilePhoto = s.avatar;
          localStorage.setItem('profilePhoto_' + this.admin.email, s.avatar);
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
    this.emailService.getGmailStatus(this.admin.email).subscribe({
      next: (res) => { this.gmailConnected = res.connected; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  testGmailImap() {
    if (!this.adminSettings.gmail_address || !this.appPassword) {
      this.gmailTestError = 'Renseigne ton adresse Gmail et le code';
      return;
    }
    this.gmailTestLoading = true;
    this.gmailTestSuccess = '';
    this.gmailTestError = '';
    this.emailService.testGmailImap(this.adminSettings.gmail_address, this.appPassword).subscribe({
      next: (res) => {
        this.gmailTestLoading = false;
        if (res.success) {
          this.gmailTestSuccess = 'Gmail connecte avec succes !';
          this.emailService.updateUserSettings({
            ...this.adminSettings, email: this.admin.email, app_password: this.appPassword
          }).subscribe({ next: () => {
            this.gmailConnected = true;
            this.showGmailModal = false;
            this.appPassword = '';
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

  saveAdminSettings() {
    this.settingsLoading = true;
    this.settingsSaved = false;
    this.settingsError = '';
    this.emailService.updateUserSettings({ ...this.adminSettings, email: this.admin.email }).subscribe({
      next: () => {
        this.settingsLoading = false;
        this.settingsSaved = true;
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

  loadAll() {
    this.adminService.getStats().subscribe({
      next: s => { this.stats = s; this.loading.stats = false; this.cdr.detectChanges(); },
      error: () => this.loading.stats = false
    });
    this.adminService.getUsers().subscribe({
      next: u => { this.users = u as AdminUserDetail[]; this.loading.users = false; this.cdr.detectChanges(); },
      error: () => this.loading.users = false
    });
    this.adminService.getPayments().subscribe({
      next: p => { this.payments = p; this.loading.payments = false; this.cdr.detectChanges(); },
      error: () => this.loading.payments = false
    });
    this.emailService.getStats(this.admin.email).subscribe({
      next: s => { this.gmailStats = s; this.cdr.detectChanges(); }
    });
    this.emailService.getEmails(this.admin.email).subscribe({
      next: e => { this.emails = e; this.loading.emails = false; this.cdr.detectChanges(); },
      error: () => this.loading.emails = false
    });
  }

  setSection(s: Section) {
    this.activeSection = s;
    this.selectedUser = null;
    this.mobileMenuOpen = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  selectUser(u: AdminUserDetail | null) {
    this.selectedUser = this.selectedUser?.id === u?.id ? null : u;
  }

  loadUserEmails() {
    if (!this.selectedUserEmail) return;
    this.loadingUserEmails = true;
    this.userEmails = [];
    this.emailService.getEmails(this.selectedUserEmail).subscribe({
      next: (e) => { this.userEmails = e; this.loadingUserEmails = false; this.cdr.detectChanges(); },
      error: () => { this.loadingUserEmails = false; this.cdr.detectChanges(); }
    });
  }

  // ── USERS CRUD ──
  get filteredUsers(): AdminUserDetail[] {
    const q = (this.userSearch || this.globalSearch).toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  openCreateUser() {
    this.editingUser = { role: 'user', plan: 'free', is_verified: 1, password: '123456' };
    this.isEditMode = false;
    this.showUserModal = true;
  }

  openEditUser(user: AdminUserDetail) {
    this.editingUser = { ...user };
    this.isEditMode = true;
    this.showUserModal = true;
  }

  saveUser() {
    if (this.isEditMode && this.editingUser.id) {
      this.adminService.updateUser(this.editingUser.id, this.editingUser).subscribe({
        next: () => { this.snack.open('Utilisateur mis a jour', '', { duration: 2000 }); this.showUserModal = false; this.loadAll(); },
        error: () => this.snack.open('Erreur', '', { duration: 2000 })
      });
    } else {
      this.adminService.createUser(this.editingUser).subscribe({
        next: () => { this.snack.open('Utilisateur cree', '', { duration: 2000 }); this.showUserModal = false; this.loadAll(); },
        error: (e) => this.snack.open(e.error?.error || 'Erreur', '', { duration: 3000 })
      });
    }
  }

  deleteUser(id: number) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    this.adminService.deleteUser(id).subscribe({
      next: () => { this.snack.open('Supprime', '', { duration: 2000 }); this.selectedUser = null; this.loadAll(); }
    });
  }

  // ── PAYMENTS CRUD ──
  openCreatePayment() {
    this.newPayment = { user_id: '', plan: 'premium', amount: 9.99, status: 'paid' };
    this.showPaymentModal = true;
  }

  savePayment() {
    this.adminService.createPayment(this.newPayment).subscribe({
      next: () => { this.snack.open('Paiement enregistre', '', { duration: 2000 }); this.showPaymentModal = false; this.loadAll(); },
      error: () => this.snack.open('Erreur', '', { duration: 2000 })
    });
  }

  deletePayment(id: number) {
    if (!confirm('Supprimer ce paiement ?')) return;
    this.adminService.deletePayment(id).subscribe({
      next: () => { this.snack.open('Supprime', '', { duration: 2000 }); this.loadAll(); }
    });
  }

  getTotalRevenue(): number {
    return this.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  }

  getSenderName(s: string): string {
    const m = s.match(/^(.+?)\s*</);
    return m ? m[1].replace(/"/g, '').trim() : s.split('@')[0];
  }

  getSenderInitial(s: string): string {
    return this.getSenderName(s).charAt(0).toUpperCase();
  }

  getAvatarColor(s: string): string {
    const c = ['#1a237e', '#0288d1', '#2e7d32', '#f57c00', '#6a1b9a', '#c62828'];
    return c[s.charCodeAt(0) % c.length];
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/']);
  }
}
