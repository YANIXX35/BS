import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (stored) this.admin = JSON.parse(stored);
    this.loadAll();
    this.loadAdminGmailStatus();
  }

  loadAdminGmailStatus() {
    if (!this.admin.email) return;
    this.emailService.getUserSettings(this.admin.email).subscribe({
      next: (s) => { this.adminSettings = s; this.cdr.detectChanges(); },
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
