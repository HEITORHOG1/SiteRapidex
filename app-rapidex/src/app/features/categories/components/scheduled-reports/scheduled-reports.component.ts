import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, takeUntil } from 'rxjs';

import { CategoryAnalyticsService } from '../../services/category-analytics.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { ScheduledReportConfig } from '../../models/category-analytics.models';

/**
 * Scheduled Reports Component
 * Manages scheduled analytics reports
 */
@Component({
  selector: 'app-scheduled-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDialogModule,
    MatTableModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './scheduled-reports.component.html',
  styleUrls: ['./scheduled-reports.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScheduledReportsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly analyticsService = inject(CategoryAnalyticsService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly dialog = inject(MatDialog);

  // Signals
  scheduledReports = signal<ScheduledReportConfig[]>([]);
  loading = signal<boolean>(false);
  selectedEstablishment = signal<number | null>(null);

  // Form
  reportForm: FormGroup;
  editingReport: ScheduledReportConfig | null = null;

  // Table columns
  displayedColumns: string[] = ['frequency', 'time', 'recipients', 'enabled', 'actions'];

  // Options
  frequencyOptions = [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' }
  ];

  daysOfWeek = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' }
  ];

  constructor() {
    this.reportForm = this.fb.group({
      frequency: ['weekly', Validators.required],
      dayOfWeek: [1],
      dayOfMonth: [1, [Validators.min(1), Validators.max(31)]],
      time: ['09:00', Validators.required],
      recipients: ['', Validators.required],
      enabled: [true]
    });
  }

  ngOnInit(): void {
    this.setupSubscriptions();
    this.loadScheduledReports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup reactive subscriptions
   */
  private setupSubscriptions(): void {
    // Subscribe to establishment changes
    this.estabelecimentoService.selectedEstabelecimento$
      .pipe(takeUntil(this.destroy$))
      .subscribe(establishment => {
        if (establishment?.id) {
          this.selectedEstablishment.set(establishment.id);
          this.loadScheduledReports();
        }
      });

    // Subscribe to frequency changes to show/hide day fields
    this.reportForm.get('frequency')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(frequency => {
        const dayOfWeekControl = this.reportForm.get('dayOfWeek');
        const dayOfMonthControl = this.reportForm.get('dayOfMonth');

        if (frequency === 'weekly') {
          dayOfWeekControl?.setValidators([Validators.required]);
          dayOfMonthControl?.clearValidators();
        } else if (frequency === 'monthly') {
          dayOfMonthControl?.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
          dayOfWeekControl?.clearValidators();
        } else {
          dayOfWeekControl?.clearValidators();
          dayOfMonthControl?.clearValidators();
        }

        dayOfWeekControl?.updateValueAndValidity();
        dayOfMonthControl?.updateValueAndValidity();
      });
  }

  /**
   * Load scheduled reports
   */
  private loadScheduledReports(): void {
    const establishmentId = this.selectedEstablishment();
    if (!establishmentId) return;

    this.loading.set(true);

    this.analyticsService.getScheduledReports(establishmentId).subscribe({
      next: (reports) => {
        this.scheduledReports.set(reports);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading scheduled reports:', error);
        this.loading.set(false);
        // Set mock data for development
        this.scheduledReports.set(this.getMockScheduledReports());
      }
    });
  }

  /**
   * Save scheduled report
   */
  onSaveReport(): void {
    if (!this.reportForm.valid) return;

    const establishmentId = this.selectedEstablishment();
    if (!establishmentId) return;

    const formValue = this.reportForm.value;
    const recipients = formValue.recipients.split(',').map((email: string) => email.trim());

    const config: ScheduledReportConfig = {
      frequency: formValue.frequency,
      dayOfWeek: formValue.frequency === 'weekly' ? formValue.dayOfWeek : undefined,
      dayOfMonth: formValue.frequency === 'monthly' ? formValue.dayOfMonth : undefined,
      time: formValue.time,
      recipients,
      enabled: formValue.enabled
    };

    if (this.editingReport) {
      // Update existing report
      this.analyticsService.updateScheduledReport(establishmentId, 'temp-id', config).subscribe({
        next: () => {
          this.loadScheduledReports();
          this.resetForm();
        },
        error: (error) => {
          console.error('Error updating scheduled report:', error);
        }
      });
    } else {
      // Create new report
      this.analyticsService.scheduleReport(establishmentId, config).subscribe({
        next: () => {
          this.loadScheduledReports();
          this.resetForm();
        },
        error: (error) => {
          console.error('Error creating scheduled report:', error);
        }
      });
    }
  }

  /**
   * Edit scheduled report
   */
  onEditReport(report: ScheduledReportConfig): void {
    this.editingReport = report;
    
    this.reportForm.patchValue({
      frequency: report.frequency,
      dayOfWeek: report.dayOfWeek || 1,
      dayOfMonth: report.dayOfMonth || 1,
      time: report.time,
      recipients: report.recipients.join(', '),
      enabled: report.enabled
    });
  }

  /**
   * Delete scheduled report
   */
  onDeleteReport(report: ScheduledReportConfig): void {
    const establishmentId = this.selectedEstablishment();
    if (!establishmentId) return;

    if (confirm('Tem certeza que deseja excluir este relatório agendado?')) {
      this.analyticsService.deleteScheduledReport(establishmentId, 'temp-id').subscribe({
        next: () => {
          this.loadScheduledReports();
        },
        error: (error) => {
          console.error('Error deleting scheduled report:', error);
        }
      });
    }
  }

  /**
   * Toggle report enabled status
   */
  onToggleReport(report: ScheduledReportConfig): void {
    const establishmentId = this.selectedEstablishment();
    if (!establishmentId) return;

    const updatedConfig = { ...report, enabled: !report.enabled };

    this.analyticsService.updateScheduledReport(establishmentId, 'temp-id', updatedConfig).subscribe({
      next: () => {
        this.loadScheduledReports();
      },
      error: (error) => {
        console.error('Error toggling scheduled report:', error);
      }
    });
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.editingReport = null;
    this.reportForm.reset({
      frequency: 'weekly',
      dayOfWeek: 1,
      dayOfMonth: 1,
      time: '09:00',
      recipients: '',
      enabled: true
    });
  }

  /**
   * Get frequency label
   */
  getFrequencyLabel(frequency: string): string {
    const option = this.frequencyOptions.find(opt => opt.value === frequency);
    return option?.label || frequency;
  }

  /**
   * Get day of week label
   */
  getDayOfWeekLabel(dayOfWeek: number): string {
    const day = this.daysOfWeek.find(d => d.value === dayOfWeek);
    return day?.label || '';
  }

  /**
   * Get schedule description
   */
  getScheduleDescription(report: ScheduledReportConfig): string {
    let description = this.getFrequencyLabel(report.frequency);
    
    if (report.frequency === 'weekly' && report.dayOfWeek !== undefined) {
      description += ` - ${this.getDayOfWeekLabel(report.dayOfWeek)}`;
    } else if (report.frequency === 'monthly' && report.dayOfMonth) {
      description += ` - Dia ${report.dayOfMonth}`;
    }
    
    description += ` às ${report.time}`;
    
    return description;
  }

  /**
   * Get mock scheduled reports for development
   */
  private getMockScheduledReports(): ScheduledReportConfig[] {
    return [
      {
        frequency: 'weekly',
        dayOfWeek: 1,
        time: '09:00',
        recipients: ['admin@example.com', 'manager@example.com'],
        enabled: true
      },
      {
        frequency: 'monthly',
        dayOfMonth: 1,
        time: '08:00',
        recipients: ['director@example.com'],
        enabled: false
      }
    ];
  }
}