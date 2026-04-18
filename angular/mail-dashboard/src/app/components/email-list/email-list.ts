import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmailService, Email } from '../../services/email';

@Component({
  selector: 'app-email-list',
  imports: [CommonModule, MatCardModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule],
  templateUrl: './email-list.html',
  styleUrl: './email-list.scss'
})
export class EmailList implements OnInit {
  emails: Email[] = [];
  loading = true;
  error = false;

  constructor(private emailService: EmailService) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    const email = stored ? JSON.parse(stored).email : '';
    this.emailService.getEmails(email).subscribe({
      next: (data) => { this.emails = data.emails; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  getSenderName(sender: string): string {
    const match = sender.match(/^(.+?)\s*</);
    return match ? match[1].trim() : sender;
  }

  getSenderInitial(sender: string): string {
    return this.getSenderName(sender).charAt(0).toUpperCase();
  }
}
