import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { EmailService, Status } from '../../services/email';

export type Section = 'overview' | 'inbox' | 'settings' | 'advanced';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, MatListModule, MatIconModule, MatDividerModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit {
  @Input() activeSection: Section = 'overview';
  @Output() sectionChange = new EventEmitter<Section>();

  status: Status | null = null;

  constructor(private emailService: EmailService) {}

  ngOnInit() {
    this.emailService.getStatus().subscribe({
      next: (s) => this.status = s,
      error: () => this.status = null
    });
  }

  navigate(section: Section) {
    this.sectionChange.emit(section);
  }
}
