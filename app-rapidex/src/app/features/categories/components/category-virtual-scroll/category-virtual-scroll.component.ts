import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy, 
  OnInit, 
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { Category } from '../../models/category.models';
import { CategoryCardComponent } from '../category-card/category-card.component';
import { CategoryPerformanceMetricsService } from '../../services/category-performance-metrics.service';

export interface VirtualScrollConfig {
  itemSize: number;
  bufferSize: number;
  enableDynamicSizing: boolean;
  minBufferPx: number;
  maxBufferPx: number;
}

@Component({
  selector: 'app-category-virtual-scroll',
  standalone: true,
  imports: [CommonModule, ScrollingModule, CategoryCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="virtual-scroll-container" [class.loading]="loading()">
      <div class="virtual-scroll-header" *ngIf="showHeader">
        <span class="item-count">{{ totalItems() }} categorias</span>
        <span class="visible-range" *ngIf="visibleRange()">
          Exibindo {{ visibleRange()!.start + 1 }}-{{ visibleRange()!.end }} de {{ totalItems() }}
        </span>
      </div>

      <cdk-virtual-scroll-viewport 
        #viewport
        class="virtual-scroll-viewport"
        [itemSize]="config.itemSize"
        [minBufferPx]="config.minBufferPx"
        [maxBufferPx]="config.maxBufferPx"
        (scrolledIndexChange)="onScrolledIndexChange($event)"
        [style.height.px]="viewportHeight">
        
        <div 
          *cdkVirtualFor="let category of categories; 
                          let i = index; 
                          trackBy: trackByCategory;
                          templateCacheSize: bufferSize"
          class="virtual-scroll-item"
          [attr.data-index]="i">
          
          <app-category-card
            [category]="category"
            (edit)="onEdit($event)"
            (delete)="onDelete($event)"
            (viewDetails)="onView($event)">
          </app-category-card>
        </div>

        <!-- Loading placeholder for dynamic loading -->
        <div *ngIf="loading()" class="loading-placeholder">
          <div class="loading-spinner"></div>
          <span>Carregando categorias...</span>
        </div>

        <!-- Empty state -->
        <div *ngIf="!loading() && categories.length === 0" class="empty-state">
          <div class="empty-icon">📂</div>
          <h3>Nenhuma categoria encontrada</h3>
          <p>Crie sua primeira categoria para começar a organizar seus produtos.</p>
        </div>
      </cdk-virtual-scroll-viewport>

      <!-- Performance indicator -->
      <div class="performance-indicator" *ngIf="showPerformanceInfo">
        <small>
          Renderizados: {{ renderedItems() }} | 
          Tempo de scroll: {{ scrollPerformance() }}ms |
          Memória: {{ memoryUsage() }}MB
        </small>
      </div>
    </div>
  `,
  styles: [`
    .virtual-scroll-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
    }

    .virtual-scroll-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--surface-color);
      border-bottom: 1px solid var(--border-color);
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .virtual-scroll-viewport {
      flex: 1;
      background: var(--background-color);
    }

    .virtual-scroll-item {
      padding: 0.5rem;
      border-bottom: 1px solid var(--border-light);
    }

    .loading-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid var(--border-color);
      border-top: 2px solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .performance-indicator {
      position: absolute;
      bottom: 0.5rem;
      right: 0.5rem;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-family: monospace;
      font-size: 0.75rem;
      pointer-events: none;
    }

    .loading {
      opacity: 0.7;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .virtual-scroll-header {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
      }

      .virtual-scroll-item {
        padding: 0.25rem;
      }
    }
  `]
})
export class CategoryVirtualScrollComponent implements OnInit, OnDestroy {
  @ViewChild('viewport', { static: true }) viewport!: CdkVirtualScrollViewport;

  @Input() categories: Category[] = [];
  @Input() loading = signal(false);
  @Input() viewportHeight = 600;
  @Input() showHeader = true;
  @Input() showPerformanceInfo = false;
  @Input() config: VirtualScrollConfig = {
    itemSize: 120,
    bufferSize: 20,
    enableDynamicSizing: false,
    minBufferPx: 200,
    maxBufferPx: 400
  };

  @Output() edit = new EventEmitter<Category>();
  @Output() delete = new EventEmitter<Category>();
  @Output() view = new EventEmitter<Category>();
  @Output() scrolledIndexChange = new EventEmitter<number>();
  @Output() loadMore = new EventEmitter<void>();

  // Computed signals
  totalItems = computed(() => this.categories.length);
  visibleRange = signal<{start: number, end: number} | null>(null);
  renderedItems = signal(0);
  scrollPerformance = signal(0);
  memoryUsage = signal(0);

  private scrollStartTime = 0;
  private performanceInterval?: number;
  private resizeObserver?: ResizeObserver;

  get bufferSize(): number {
    return this.config.bufferSize;
  }

  constructor(
    private elementRef: ElementRef,
    private performanceMetrics: CategoryPerformanceMetricsService
  ) {}

  ngOnInit(): void {
    this.initializePerformanceMonitoring();
    this.setupResizeObserver();
    this.measureInitialRender();
  }

  ngOnDestroy(): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  onScrolledIndexChange(index: number): void {
    this.scrolledIndexChange.emit(index);
    this.updateVisibleRange();
    this.measureScrollPerformance();
    
    // Load more items if near the end
    if (index > this.categories.length - 10) {
      this.loadMore.emit();
    }
  }

  onEdit(category: Category): void {
    this.edit.emit(category);
  }

  onDelete(category: Category): void {
    this.delete.emit(category);
  }

  onView(category: Category): void {
    this.view.emit(category);
  }

  trackByCategory(index: number, category: Category): number {
    return category.id;
  }

  /**
   * Scroll to specific category
   */
  scrollToCategory(categoryId: number): void {
    const index = this.categories.findIndex(cat => cat.id === categoryId);
    if (index >= 0) {
      this.viewport.scrollToIndex(index, 'smooth');
    }
  }

  /**
   * Scroll to top
   */
  scrollToTop(): void {
    this.viewport.scrollToIndex(0, 'smooth');
  }

  /**
   * Get current scroll position
   */
  getScrollPosition(): number {
    return this.viewport.measureScrollOffset();
  }

  /**
   * Set scroll position
   */
  setScrollPosition(offset: number): void {
    this.viewport.scrollToOffset(offset);
  }

  private initializePerformanceMonitoring(): void {
    this.performanceInterval = window.setInterval(() => {
      this.updatePerformanceMetrics();
    }, 1000);
  }

  private setupResizeObserver(): void {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.viewport.checkViewportSize();
      });
      
      this.resizeObserver.observe(this.elementRef.nativeElement);
    }
  }

  private measureInitialRender(): void {
    const startTime = performance.now();
    
    setTimeout(() => {
      const renderTime = performance.now() - startTime;
      this.performanceMetrics.recordMetric(
        'virtual_scroll_initial_render',
        renderTime,
        'render',
        { 
          itemCount: this.categories.length,
          viewportHeight: this.viewportHeight
        }
      );
    }, 0);
  }

  private updateVisibleRange(): void {
    if (this.viewport) {
      const range = this.viewport.getRenderedRange();
      this.visibleRange.set({
        start: range.start,
        end: range.end
      });
      this.renderedItems.set(range.end - range.start);
    }
  }

  private measureScrollPerformance(): void {
    if (this.scrollStartTime === 0) {
      this.scrollStartTime = performance.now();
      return;
    }

    const scrollTime = performance.now() - this.scrollStartTime;
    this.scrollPerformance.set(Math.round(scrollTime));
    
    this.performanceMetrics.recordMetric(
      'virtual_scroll_performance',
      scrollTime,
      'interaction',
      {
        renderedItems: this.renderedItems(),
        totalItems: this.totalItems()
      }
    );

    this.scrollStartTime = 0;
  }

  private updatePerformanceMetrics(): void {
    // Update memory usage if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const memoryMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
      this.memoryUsage.set(memoryMB);
    }
  }
}