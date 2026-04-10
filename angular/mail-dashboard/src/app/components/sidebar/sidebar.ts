import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { EmailService, Status } from '../../services/email';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, MatListModule, MatIconModule, MatDividerModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit {
  @Input() activeSection = 'overview';
  @Output() sectionChange = new EventEmitter<string>();

  status: Status | null = null;

  constructor(private emailService: EmailService) {}

  ngOnInit() {
    this.emailService.getStatus().subscribe({
      next: (s) => this.status = s,
      error: () => this.status = null
    });
  }

  navigate(section: string) {
    this.sectionChange.emit(section);
  }
}
