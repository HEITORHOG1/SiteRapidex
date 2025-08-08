import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryAnalyticsDashboardComponent } from '../../components/category-analytics-dashboard';

/**
 * Category Analytics Page Component
 * Container page for category analytics dashboard
 */
@Component({
  selector: 'app-category-analytics-page',
  standalone: true,
  imports: [
    CommonModule,
    CategoryAnalyticsDashboardComponent
  ],
  template: `
    <div class="analytics-page">
      <app-category-analytics-dashboard></app-category-analytics-dashboard>
    </div>
  `,
  styles: [`
    .analytics-page {
      min-height: 100vh;
      background-color: #f5f5f5;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryAnalyticsPageComponent {}