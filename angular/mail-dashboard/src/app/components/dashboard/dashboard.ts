import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EmailService, Stats, UserSettings } from '../../services/email';
import { EmailList } from '../email-list/email-list';
import { Sidebar } from '../sidebar/sidebar';
import { AdvancedDashboardComponent } from '../advanced-dashboard/advanced-dashboard';

type DashboardSection = 'overview' | 'advanced' | 'settings';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatFormFieldModule, MatInputModule, EmailList, Sidebar,
    AdvancedDashboardComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  stats: Stats | null = null;
  loading = true;
  activeSection: DashboardSection = 'overview';

  // Settings
  settings: UserSettings = { name: '', email: '', phone: '', gmail_address: '', telegram_chat_id: '', green_api_instance: '', green_api_token: '' };
  settingsLoading = false;
  settingsSaved = false;
  settingsError = '';

  constructor(private emailService: EmailService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    const email = stored ? JSON.parse(stored).email : '';
    this.emailService.getStats(email).subscribe({
      next: (s) => { this.stats = s; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onSectionChange(section: DashboardSection) {
    this.activeSection = section;
    if (section === 'settings') {
      this.loadSettings();
    }
  }

  loadSettings() {
    const stored = localStorage.getItem('user');
    if (!stored) return;
    const user = JSON.parse(stored);
    this.emailService.getUserSettings(user.email).subscribe({
      next: (s) => { this.settings = s; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  saveSettings() {
    this.settingsLoading = true;
    this.settingsSaved = false;
    this.settingsError = '';
    this.emailService.updateUserSettings(this.settings).subscribe({
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

  goHome() {
    this.router.navigate(['/']);
  }
}
