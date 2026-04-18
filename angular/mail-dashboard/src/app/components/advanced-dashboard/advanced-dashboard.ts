import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatGridListModule } from '@angular/material/grid-list';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

declare const Chart: any;

@Component({
  selector: 'app-advanced-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatTabsModule,
    MatGridListModule,
    FormsModule
  ],
  template: `
    <div class="advanced-dashboard">
      <div class="dashboard-header">
        <h1>Tableau de Bord Avancé</h1>
        <p>Analyse détaillée de vos emails et tendances</p>
      </div>

      <!-- Filtres -->
      <mat-card class="filters-card">
        <mat-card-content>
          <h3>Filtres</h3>
          <div class="filters-grid">
            <mat-form-field appearance="outline">
              <mat-label>Période</mat-label>
              <mat-select [(ngModel)]="selectedPeriod" (selectionChange)="onPeriodChange()">
                <mat-option value="7">7 derniers jours</mat-option>
                <mat-option value="30">30 derniers jours</mat-option>
                <mat-option value="90">3 derniers mois</mat-option>
                <mat-option value="365">Dernière année</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Statut</mat-label>
              <mat-select [(ngModel)]="selectedStatus" (selectionChange)="onStatusChange()">
                <mat-option value="all">Tous</mat-option>
                <mat-option value="read">Lus</mat-option>
                <mat-option value="unread">Non lus</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Expéditeur</mat-label>
              <input matInput [(ngModel)]="senderFilter" placeholder="Filtrer par expéditeur">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Date début</mat-label>
              <input matInput [matDatepicker]="startDatePicker" placeholder="Choisir date">
              <mat-datepicker #startDatePicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Date fin</mat-label>
              <input matInput [matDatepicker]="endDatePicker" placeholder="Choisir date">
              <mat-datepicker #endDatePicker></mat-datepicker>
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="applyFilters()">
              <mat-icon>filter_list</mat-icon>
              Appliquer
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Statistiques principales -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon blue">email</mat-icon>
              <div class="stat-info">
                <p class="stat-value">{{ totalEmails }}</p>
                <p class="stat-label">Total Emails</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon orange">mark_email_unread</mat-icon>
              <div class="stat-info">
                <p class="stat-value">{{ unreadEmails }}</p>
                <p class="stat-label">Non Lus</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon green">send</mat-icon>
              <div class="stat-info">
                <p class="stat-value">{{ sentEmails }}</p>
                <p class="stat-label">Envoyés</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon purple">trending_up</mat-icon>
              <div class="stat-info">
                <p class="stat-value">{{ averagePerDay }}</p>
                <p class="stat-label">Moyenne/Jour</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Graphiques -->
      <mat-card class="chart-card">
        <mat-card-content>
          <h3>Évolution des Emails</h3>
          <div class="chart-container">
            <canvas id="emailChart"></canvas>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Répartition par statut -->
      <div class="charts-row">
        <mat-card class="chart-card">
          <mat-card-content>
            <h3>Répartition par Statut</h3>
            <div class="chart-container">
              <canvas id="statusChart"></canvas>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="chart-card">
          <mat-card-content>
            <h3>Top Expéditeurs</h3>
            <div class="chart-container">
              <canvas id="senderChart"></canvas>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Actions d'export -->
      <mat-card class="actions-card">
        <mat-card-content>
          <h3>Actions</h3>
          <div class="actions-grid">
            <button mat-stroked-button (click)="exportCSV()">
              <mat-icon>download</mat-icon>
              Exporter CSV
            </button>
            <button mat-stroked-button (click)="exportPDF()">
              <mat-icon>picture_as_pdf</mat-icon>
              Exporter PDF
            </button>
            <button mat-stroked-button (click)="refreshData()">
              <mat-icon>refresh</mat-icon>
              Actualiser
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .advanced-dashboard {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 32px;
      text-align: center;

      h1 {
        margin: 0 0 8px 0;
        font-size: 32px;
        font-weight: 700;
        color: #1a237e;
      }

      p {
        margin: 0;
        color: #666;
        font-size: 16px;
      }
    }

    .filters-card {
      margin-bottom: 24px;

      h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a237e;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        align-items: end;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;

        .stat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;

          &.blue { color: #1a237e; }
          &.orange { color: #f57c00; }
          &.green { color: #2e7d32; }
          &.purple { color: #7b1fa2; }
        }

        .stat-info {
          .stat-value {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            color: #212121;
          }

          .stat-label {
            margin: 4px 0 0 0;
            font-size: 14px;
            color: #666;
          }
        }
      }
    }

    .charts-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .chart-card {
      h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a237e;
      }

      .chart-container {
        height: 300px;
        position: relative;
      }
    }

    .actions-card {
      h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a237e;
      }

      .actions-grid {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
    }

    @media (max-width: 768px) {
      .advanced-dashboard {
        padding: 16px;
      }

      .filters-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .charts-row {
        grid-template-columns: 1fr;
      }

      .actions-grid {
        flex-direction: column;
      }
    }
  `]
})
export class AdvancedDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Filtres
  selectedPeriod: number = 30;
  selectedStatus: string = 'all';
  senderFilter: string = '';
  startDate: Date | null = null;
  endDate: Date | null = null;

  // Statistiques
  totalEmails: number = 0;
  unreadEmails: number = 0;
  sentEmails: number = 0;
  averagePerDay: number = 0;

  // Graphiques
  emailChart: any;
  statusChart: any;
  senderChart: any;

  ngOnInit() {
    this.initCharts();
    this.loadDashboardData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Détruire les graphiques
    if (this.emailChart) this.emailChart.destroy();
    if (this.statusChart) this.statusChart.destroy();
    if (this.senderChart) this.senderChart.destroy();
  }

  private initCharts() {
    // Graphique d'évolution temporelle
    const ctxEmail = document.getElementById('emailChart') as HTMLCanvasElement;
    this.emailChart = new Chart(ctxEmail, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Emails par jour',
          data: [],
          borderColor: '#1a237e',
          backgroundColor: 'rgba(26, 35, 126, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    // Graphique circulaire statut
    const ctxStatus = document.getElementById('statusChart') as HTMLCanvasElement;
    this.statusChart = new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Lus', 'Non lus'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['#2e7d32', '#f57c00']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });

    // Graphique top expéditeurs
    const ctxSender = document.getElementById('senderChart') as HTMLCanvasElement;
    this.senderChart = new Chart(ctxSender, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Nombre d\'emails',
          data: [],
          backgroundColor: '#7b1fa2'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  private loadDashboardData() {
    // Simuler des données - à remplacer avec vrais appels API
    this.updateChartsWithData(this.generateMockData());
  }

  private generateMockData() {
    const days = this.selectedPeriod;
    const data = [];
    const labels = [];
    let total = 0;
    let unread = 0;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayEmails = Math.floor(Math.random() * 20) + 5;
      const dayUnread = Math.floor(Math.random() * dayEmails);
      
      total += dayEmails;
      unread += dayUnread;
      
      labels.push(date.toLocaleDateString());
      data.push(dayEmails);
    }

    return {
      labels,
      data,
      total,
      unread,
      sent: Math.floor(total * 0.6),
      averagePerDay: Math.round(total / days),
      senders: [
        { name: 'newsletter@exemple.com', count: 45 },
        { name: 'contact@client.com', count: 32 },
        { name: 'service@provider.com', count: 28 },
        { name: 'team@company.com', count: 21 }
      ]
    };
  }

  private updateChartsWithData(mockData: any) {
    // Mettre à jour les statistiques
    this.totalEmails = mockData.total;
    this.unreadEmails = mockData.unread;
    this.sentEmails = mockData.sent;
    this.averagePerDay = mockData.averagePerDay;

    // Mettre à jour le graphique d'évolution
    this.emailChart.data.labels = mockData.labels;
    this.emailChart.data.datasets[0].data = mockData.data;
    this.emailChart.update();

    // Mettre à jour le graphique de statut
    const readCount = mockData.total - mockData.unread;
    this.statusChart.data.datasets[0].data = [readCount, mockData.unread];
    this.statusChart.update();

    // Mettre à jour le graphique des expéditeurs
    const senderLabels = mockData.senders.map((s: any) => s.name);
    const senderCounts = mockData.senders.map((s: any) => s.count);
    this.senderChart.data.labels = senderLabels;
    this.senderChart.data.datasets[0].data = senderCounts;
    this.senderChart.update();
  }

  onPeriodChange() {
    this.loadDashboardData();
  }

  onStatusChange() {
    this.loadDashboardData();
  }

  applyFilters() {
    console.log('Application des filtres:', {
      period: this.selectedPeriod,
      status: this.selectedStatus,
      sender: this.senderFilter,
      startDate: this.startDate,
      endDate: this.endDate
    });
    this.loadDashboardData();
  }

  exportCSV() {
    const data = this.generateMockData();
    let csv = 'Date,Total,Unlus,Envoyés\n';
    
    for (let i = 0; i < data.labels.length; i++) {
      csv += `${data.labels[i]},${data.data[i]},${Math.floor(Math.random() * data.data[i])},${Math.floor(data.data[i] * 0.6)}\n`;
    }
    
    this.downloadFile(csv, 'emails_export.csv', 'text/csv');
  }

  exportPDF() {
    console.log('Export PDF - à implémenter avec jsPDF ou similaire');
    // Pour l'instant, exporter en CSV
    this.exportCSV();
  }

  refreshData() {
    console.log('Actualisation des données...');
    this.loadDashboardData();
  }

  private downloadFile(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
