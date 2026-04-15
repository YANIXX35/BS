import { Component, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

type Step = 'form' | 'otp' | 'success';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule,
    MatInputModule, MatFormFieldModule, MatTabsModule, MatProgressSpinnerModule, FormsModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing {
  scrolled = false;

  @HostListener('window:scroll')
  onScroll() { this.scrolled = window.scrollY > 20; }

  // Login
  loginEmail = '';
  loginPassword = '';
  loginError = '';
  loginLoading = false;
  loginSuccess = '';

  // Register
  regName = '';
  regEmail = '';
  regPassword = '';
  regPhone = '';
  regGmail = '';
  regTelegramChatId = '';
  regGreenApiInstance = '';
  regGreenApiToken = '';
  regError = '';
  regLoading = false;
  regStep: Step = 'form';

  // OTP
  otpCode = '';
  otpError = '';
  otpLoading = false;

  features = [
    { icon: 'email', title: 'Surveillance Gmail', desc: 'Connexion securisee via OAuth2 Google. Chaque nouveau mail est detecte en temps reel.' },
    { icon: 'send', title: 'Notification Telegram', desc: 'Recois instantanement tes mails sur Telegram avec apercu de l\'expediteur et du contenu.' },
    { icon: 'chat', title: 'Notification WhatsApp', desc: 'Notifications directement sur WhatsApp pour ne jamais rater un message important.' },
    { icon: 'dashboard', title: 'Dashboard en temps reel', desc: 'Interface web claire pour visualiser tes mails, stats et etat des notifications.' },
  ];

  steps = [
    { number: '01', title: 'Connecte ton Gmail', desc: 'Authentification OAuth2 securisee avec Google' },
    { number: '02', title: 'Configure tes canaux', desc: 'Active Telegram et/ou WhatsApp en quelques clics' },
    { number: '03', title: 'Recois tes alertes', desc: 'Chaque nouveau mail t\'est notifie instantanement' },
  ];

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef, private router: Router) {}

  login() {
    if (!this.loginEmail || !this.loginPassword) {
      this.loginError = 'Veuillez remplir tous les champs';
      return;
    }
    this.loginLoading = true;
    this.loginError = '';
    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: (res) => {
        this.loginLoading = false;
        this.loginSuccess = `Bienvenue ${res.name} !`;
        localStorage.setItem('user', JSON.stringify({ name: res.name, email: res.email, role: res.role }));
        this.cdr.detectChanges();
        const route = res.role === 'admin' ? '/admin' : '/dashboard';
        setTimeout(() => this.router.navigate([route]), 1000);
      },
      error: (err) => {
        this.loginLoading = false;
        this.loginError = err.error?.error || 'Erreur de connexion';
        this.cdr.detectChanges();
      }
    });
  }

  register() {
    if (!this.regName || !this.regEmail || !this.regPassword) {
      this.regError = 'Nom, email et mot de passe requis';
      return;
    }
    this.regLoading = true;
    this.regError = '';
    this.authService.register(
      this.regName, this.regEmail, this.regPassword,
      this.regPhone, this.regGmail || this.regEmail,
      this.regTelegramChatId, this.regGreenApiInstance, this.regGreenApiToken
    ).subscribe({
      next: () => {
        this.regLoading = false;
        this.regStep = 'otp';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.regLoading = false;
        this.regError = err.error?.error || 'Erreur lors de l\'inscription';
        this.cdr.detectChanges();
      }
    });
  }

  onOtpInput() {
    if (this.otpCode.length > 6) {
      this.otpCode = this.otpCode.slice(0, 6);
    }
  }

  verifyOtp() {
    if (this.otpCode.length !== 6) {
      this.otpError = 'Le code doit contenir 6 chiffres';
      return;
    }
    this.otpLoading = true;
    this.otpError = '';
    this.authService.verifyOtp(this.regEmail, this.otpCode).subscribe({
      next: (res) => {
        this.otpLoading = false;
        this.regStep = 'success';
        localStorage.setItem('user', JSON.stringify({ name: res.name, email: this.regEmail }));
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      },
      error: (err) => {
        this.otpLoading = false;
        this.otpError = err.error?.error || 'Code incorrect';
        this.cdr.detectChanges();
      }
    });
  }

  resendOtp() {
    this.otpCode = '';
    this.otpError = '';
    this.register();
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
