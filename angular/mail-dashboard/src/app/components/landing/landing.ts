import { Component, ChangeDetectorRef, HostListener, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { PaymentService } from '../../services/payment';
import { EmailService } from '../../services/email';
import { environment } from '../../environments/environment';

type Step = 'form' | 'otp' | 'success';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule,
    MatInputModule, MatFormFieldModule, MatTabsModule, MatProgressSpinnerModule, FormsModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing implements OnInit, AfterViewInit {
  scrolled = false;
  mobileMenuOpen = false;
  statValues = { delay: 0, channels: 0, free: 0 };
  private statsAnimated = false;

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled = window.scrollY > 20;
    if (this.mobileMenuOpen) this.mobileMenuOpen = false;
  }

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }

  // ── Login ──────────────────────────────────────────────────────────────────
  loginEmail = '';
  loginPassword = '';
  loginError = '';
  loginLoading = false;
  loginSuccess = '';

  // ── Register ───────────────────────────────────────────────────────────────
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

  // ── OTP ────────────────────────────────────────────────────────────────────
  otpCode = '';
  otpError = '';
  otpLoading = false;

  // ── Payment ────────────────────────────────────────────────────────────────
  showPayModal = false;
  payPlan: 'test' | 'premium' | 'enterprise' = 'premium';
  paymentEmail = '';
  paymentLoading = false;
  paymentError = '';
  paymentSuccess = false;
  paymentSuccessPlan = '';

  // ── Chatbot ────────────────────────────────────────────────────────────────
  chatOpen     = false;
  chatLoading  = false;
  chatInput    = '';
  chatMessages: Array<{ role: 'user' | 'bot'; text: string; typing?: boolean }> = [];
  chatSuggestions = [
    "C'est quoi MailNotifier ?",
    "Quels sont les tarifs ?",
    "Comment connecter Gmail ?",
    "Telegram ou WhatsApp ?",
  ];
  private _twInterval: any = null;

  // ── Forgot Password ────────────────────────────────────────────────────────
  showForgotModal = false;
  forgotStep: 'email' | 'reset' | 'success' = 'email';
  forgotEmail = '';
  resetCode = '';
  newPassword = '';
  confirmPassword = '';
  forgotError = '';
  forgotLoading = false;

  // ── Content ────────────────────────────────────────────────────────────────
  features = [
    { icon: 'email',     title: 'Surveillance Gmail',     desc: 'Connexion securisee via OAuth2 Google. Chaque nouveau mail est detecte en temps reel.' },
    { icon: 'send',      title: 'Notification Telegram',  desc: "Recois instantanement tes mails sur Telegram avec apercu de l'expediteur et du contenu." },
    { icon: 'chat',      title: 'Notification WhatsApp',  desc: 'Notifications directement sur WhatsApp pour ne jamais rater un message important.' },
    { icon: 'dashboard', title: 'Dashboard en temps reel', desc: 'Interface web claire pour visualiser tes mails, stats et etat des notifications.' },
  ];

  steps = [
    { number: '01', title: 'Connecte ton Gmail',    desc: 'Authentification OAuth2 securisee avec Google' },
    { number: '02', title: 'Configure tes canaux',  desc: 'Active Telegram et/ou WhatsApp en quelques clics' },
    { number: '03', title: 'Recois tes alertes',    desc: 'Chaque nouveau mail t\'est notifie instantanement' },
  ];

  plans = [
    {
      id: 'free',
      name: 'Gratuit',
      price: '0',
      period: 'pour toujours',
      color: 'free',
      features: [
        { label: 'Surveillance Gmail',      ok: true  },
        { label: 'Notifications Telegram',  ok: true  },
        { label: 'Notifications WhatsApp',  ok: false },
        { label: 'Filtres avances',         ok: false },
        { label: 'Support prioritaire',     ok: false },
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '5 000',
      period: 'XOF / mois',
      color: 'premium',
      popular: true,
      features: [
        { label: 'Surveillance Gmail',      ok: true  },
        { label: 'Notifications Telegram',  ok: true  },
        { label: 'Notifications WhatsApp',  ok: true  },
        { label: 'Filtres avances',         ok: true  },
        { label: 'Support prioritaire',     ok: false },
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '15 000',
      period: 'XOF / mois',
      color: 'enterprise',
      features: [
        { label: 'Surveillance Gmail',      ok: true  },
        { label: 'Notifications Telegram',  ok: true  },
        { label: 'Notifications WhatsApp',  ok: true  },
        { label: 'Filtres avances',         ok: true  },
        { label: 'Support prioritaire',     ok: true  },
      ],
    },
  ];

  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
    private emailService: EmailService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Si déjà connecté → rediriger directement vers le dashboard (bouton retour ne doit pas revenir ici)
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.email) {
          const target = u.role === 'admin' ? '/admin' : '/dashboard';
          this.router.navigate([target], { replaceUrl: true });
          return;
        }
      }
    } catch { /* noop */ }

    // Detect return from Genius Pay
    this.route.queryParams.subscribe(params => {
      const status = params['payment_status'];
      const plan   = params['plan'];
      const email  = params['email'];
      const txId   = params['tx_id'] || params['transaction_id'] || params['reference'];

      if (status === 'success') {
        if (txId) {
          this.paymentService.verify(txId, plan, email).subscribe({
            next: (res) => {
              if (res.status === 'paid') {
                this.paymentSuccess = true;
                this.paymentSuccessPlan = plan;
              }
              this.cdr.detectChanges();
            },
            error: () => {
              // Payment URL returned success but verify failed — show generic success
              this.paymentSuccess = true;
              this.paymentSuccessPlan = plan;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.paymentSuccess = true;
          this.paymentSuccessPlan = plan;
        }
        // Clean URL
        this.router.navigate([], { replaceUrl: true, queryParams: {} });
        setTimeout(() => this.scrollTo('pricing'), 400);
      }
    });

    // Pre-fill email if already logged in
    const stored = localStorage.getItem('user');
    if (stored) {
      try { this.paymentEmail = JSON.parse(stored).email || ''; } catch { /* noop */ }
    }
  }

  // ── Payment ────────────────────────────────────────────────────────────────
  openPayModal(plan: 'test' | 'premium' | 'enterprise') {
    this.payPlan = plan;
    this.paymentError = '';
    this.paymentLoading = false;
    this.showPayModal = true;
  }

  pay() {
    if (!this.paymentEmail) {
      this.paymentError = 'Veuillez saisir votre adresse email';
      return;
    }
    this.paymentLoading = true;
    this.paymentError = '';

    this.paymentService.initiate(this.payPlan, this.paymentEmail).subscribe({
      next: (res) => {
        this.paymentLoading = false;
        // Redirect to Genius Pay checkout
        window.location.href = res.payment_url;
      },
      error: (err) => {
        this.paymentLoading = false;
        const detail = err.error?.error || err.error?.message || err.message || '';
        const raw = err.error?.raw ? JSON.stringify(err.error.raw).slice(0, 120) : '';
        this.paymentError = detail + (raw ? ` — ${raw}` : '') || 'Erreur inconnue';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
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
        if (res.token) localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify({ name: res.name, email: res.email, role: res.role }));
        this.cdr.detectChanges();
        const route = res.role === 'admin' ? '/admin' : '/dashboard';
        setTimeout(() => this.router.navigate([route], { replaceUrl: true }), 1000);
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
        this.regError = err.error?.error || "Erreur lors de l'inscription";
        this.cdr.detectChanges();
      }
    });
  }

  onOtpInput() {
    if (this.otpCode.length > 6) this.otpCode = this.otpCode.slice(0, 6);
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
        if (res.token) localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify({ name: res.name, email: this.regEmail }));
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/dashboard'], { replaceUrl: true }), 1500);
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

  // ── Forgot Password Methods ───────────────────────────────────────────────
  showForgotPassword() {
    this.showForgotModal = true;
    this.forgotStep = 'email';
    this.forgotEmail = '';
    this.resetCode = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.forgotError = '';
    this.forgotLoading = false;
  }

  sendResetCode() {
    if (!this.forgotEmail || !this.forgotEmail.includes('@') || !this.forgotEmail.includes('.')) {
      this.forgotError = 'Adresse email invalide (ex: exemple@gmail.com)';
      return;
    }
    
    if (this.forgotEmail.length < 6) {
      this.forgotError = 'Adresse email trop courte';
      return;
    }

    this.forgotLoading = true;
    this.forgotError = '';

    // Utiliser le même endpoint que register pour générer un OTP
    this.authService.requestPasswordReset(this.forgotEmail).subscribe({
      next: () => {
        this.forgotLoading = false;
        this.forgotStep = 'reset';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.forgotLoading = false;
        this.forgotError = err.error?.error || "Erreur lors de l'envoi du code";
        this.cdr.detectChanges();
      }
    });
  }

  resetPassword() {
    if (this.resetCode.length !== 6) {
      this.forgotError = 'Le code doit contenir 6 chiffres';
      return;
    }

    if (this.newPassword.length < 6) {
      this.forgotError = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.forgotError = 'Les mots de passe ne correspondent pas';
      return;
    }

    this.forgotLoading = true;
    this.forgotError = '';

    this.authService.resetPassword(this.forgotEmail, this.resetCode, this.newPassword).subscribe({
      next: () => {
        this.forgotLoading = false;
        this.forgotStep = 'success';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.forgotLoading = false;
        this.forgotError = err.error?.error || 'Erreur lors de la réinitialisation';
        this.cdr.detectChanges();
      }
    });
  }

  ngAfterViewInit() {
    const cardObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('visible');
          cardObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    const statsObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.statsAnimated) {
          this.statsAnimated = true;
          this.animateStats();
          statsObs.disconnect();
        }
      });
    }, { threshold: 0.5 });

    setTimeout(() => {
      document.querySelectorAll('.anim-card').forEach(el => cardObs.observe(el));
      const statsEl = document.querySelector('.hero-stats');
      if (statsEl) statsObs.observe(statsEl);
    }, 150);
  }

  private animateStats() {
    this.animateValue('delay', 30, 1400);
    this.animateValue('channels', 2, 900);
    this.animateValue('free', 100, 1800);
  }

  private animateValue(key: 'delay' | 'channels' | 'free', target: number, duration: number) {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.statValues[key] = Math.round(eased * target);
      this.cdr.detectChanges();
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── Chatbot methods ────────────────────────────────────────────────────────

  toggleChat() {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen && this.chatMessages.length === 0) {
      const welcome = { role: 'bot' as const, text: '' };
      this.chatMessages.push(welcome);
      this._typewrite(welcome, "Bonjour ! 👋 Je suis l'assistant MailNotifier. Pose-moi toutes tes questions !");
    }
    if (this.chatOpen) setTimeout(() => this._scrollChat(), 100);
  }

  async sendChat(text?: string) {
    const message = (text ?? this.chatInput).trim();
    if (!message || this.chatLoading) return;
    this.chatInput = '';
    this.chatMessages.push({ role: 'user', text: message });
    this.chatLoading = true;
    const typing = { role: 'bot' as const, text: '', typing: false };
    this.chatMessages.push(typing);
    this.cdr.detectChanges();
    this._scrollChat();

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
            if (d.text) { typing.text += d.text; this.cdr.detectChanges(); this._scrollChat(); }
          } catch {}
        }
      }
    } catch {
      typing.text = "Désolé, une erreur est survenue. Réessaie ! 😅";
      this.cdr.detectChanges();
    } finally {
      this.chatLoading = false;
      this.cdr.detectChanges();
    }
  }

  private _typewrite(msg: { text: string }, fullText: string) {
    clearInterval(this._twInterval);
    let i = 0;
    msg.text = '';
    this._twInterval = setInterval(() => {
      msg.text += fullText[i++];
      this.cdr.detectChanges();
      if (i % 5 === 0) this._scrollChat();
      if (i >= fullText.length) clearInterval(this._twInterval);
    }, 14);
  }

  private _scrollChat() {
    const el = document.querySelector('.chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
