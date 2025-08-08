import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject, ViewChild, ElementRef, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest, startWith, take } from 'rxjs';

import { CategoryStateService } from '../../services/category-state.service';
import { CategorySearchService, AdvancedFilters } from '../../services/category-search.service';
import { CategoryDeletionService } from '../../services/category-deletion.service';
import { CategoryAccessibilityService } from '../../services/category-accessibility.service';
import { CategoryPerformanceMetricsService } from '../../services/category-performance-metrics.service';
import { CategoryLazyLoaderService } from '../../services/category-lazy-loader.service';
import { CategoryBundleOptimizerService } from '../../services/category-bundle-optimizer.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { CategoryCardComponent } from '../category-card/category-card.component';
import { CategoryVirtualScrollComponent } from '../category-virtual-scroll/category-virtual-scroll.component';
import { AdvancedSearchComponent } from '../advanced-search/advanced-search.component';
import { CategoryDeletionModalComponent, DeletionModalResult } from '../category-deletion-modal/category-deletion-modal.component';
import { BulkDeletionModalComponent, BulkDeletionModalResult } from '../bulk-deletion-modal/bulk-deletion-modal.component';
import { UndoNotificationComponent } from '../undo-notification/undo-notification.component';
import { OfflineStatusComponent } from '../offline-status/offline-status.component';
import { AriaAnnounceDirective, FocusTrapDirective, KeyboardNavigationDirective, AriaDescribedByDirective, HighContrastDirective } from '../../directives/accessibility.directive';
import { Category, CategoryFilters, PaginationState } from '../../models/category.models';

export type ViewMode = 'grid' | 'list';
export type SortOption = 'nome' | 'dataCriacao' | 'dataAtualizacao';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CategoryCardComponent,
    CategoryVirtualScrollComponent,
    AdvancedSearchComponent,
    CategoryDeletionModalComponent,
    BulkDeletionModalComponent,
    UndoNotificationComponent,
    OfflineStatusComponent,
    AriaAnnounceDirective,
    FocusTrapDirective,
    KeyboardNavigationDirective,
    AriaDescribedByDirective,
    HighContrastDirective
  ],
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss', '../../styles/accessibility.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryListComponent implements OnInit, OnDestroy {
  private categoryState = inject(CategoryStateService);
  private categorySearch = inject(CategorySearchService);
  private categoryDeletionService = inject(CategoryDeletionService);
  private categoryAccessibility = inject(CategoryAccessibilityService);
  private performanceMetrics = inject(CategoryPerformanceMetricsService);
  private lazyLoader = inject(CategoryLazyLoaderService);
  private bundleOptimizer = inject(CategoryBundleOptimizerService);
  private estabelecimentoService = inject(EstabelecimentoService);
  private destroy$ = new Subject<void>();

  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('categoryListContainer', { static: false }) categoryListContainer!: ElementRef<HTMLDivElement>;

  // Output events
  @Output() createCategory = new EventEmitter<void>();
  @Output() editCategory = new EventEmitter<Category>();
  @Output() viewCategoryDetails = new EventEmitter<Category>();
  @Output() deleteCategory = new EventEmitter<Category>();

  // Form controls
  searchControl = new FormControl('');
  statusFilterControl = new FormControl<boolean | null>(null);
  sortByControl = new FormControl<SortOption>('nome');
  sortOrderControl = new FormControl<'asc' | 'desc'>('asc');

  // Component state
  viewMode = signal<ViewMode>('grid');
  selectedCategories = signal<Set<number>>(new Set());
  showBulkActions = computed(() => this.selectedCategories().size > 0);
  isSelectAllMode = signal(false);
  
  // Performance and optimization state
  useVirtualScrolling = signal(false);
  performanceMode = signal<'standard' | 'optimized'>('standard');
  showPerformanceInfo = signal(false);

  // Deletion modal state
  showDeletionModal = signal(false);
  categoryToDelete = signal<Category | null>(null);
  showBulkDeletionModal = signal(false);
  categoriesToBulkDelete = signal<Category[]>([]);

  // Undo notifications
  pendingUndos$ = this.categoryDeletionService.getPendingUndos();

  // Reactive state from services
  categories$ = this.categorySearch.filteredCategories$;
  loading$ = this.categoryState.loading$;
  error$ = this.categoryState.error$;
  pagination$ = this.categoryState.pagination$;
  selectedEstablishment$ = this.estabelecimentoService.selectedEstabelecimento$;

  // Computed properties
  hasCategories$ = this.categoryState.hasCategories$;
  
  // Pagination controls
  currentPage = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);
  totalItems = signal(0);

  // Accessibility
  private focusedCategoryIndex = signal(-1);
  private lastFocusedElement: HTMLElement | null = null;
  private skipLinkId = this.categoryAccessibility.generateAriaId('skip-link');
  private mainContentId = this.categoryAccessibility.generateAriaId('main-content');
  
  // Accessibility settings
  accessibilitySettings$ = this.categoryAccessibility.accessibilitySettings$;

  ngOnInit(): void {
    this.measureComponentLoad();
    this.initializeComponent();
    this.setupFormSubscriptions();
    this.setupKeyboardNavigation();
    this.setupAccessibility();
    this.setupPerformanceMonitoring();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Load view mode from localStorage
    const savedViewMode = localStorage.getItem('category-list-view-mode') as ViewMode;
    if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
      this.viewMode.set(savedViewMode);
    }

    // Load performance preferences
    const performanceMode = localStorage.getItem('category-performance-mode') as 'standard' | 'optimized';
    if (performanceMode) {
      this.performanceMode.set(performanceMode);
    }

    const useVirtualScrolling = localStorage.getItem('category-use-virtual-scrolling') === 'true';
    this.useVirtualScrolling.set(useVirtualScrolling);

    // Enable virtual scrolling for large datasets automatically
    this.totalItems.subscribe(count => {
      if (count > 100 && this.performanceMode() === 'optimized') {
        this.useVirtualScrolling.set(true);
      }
    });

    // Setup pagination subscription
    this.pagination$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(pagination => {
      this.currentPage.set(pagination.currentPage);
      this.totalPages.set(pagination.totalPages);
      this.totalItems.set(pagination.totalItems);
      this.pageSize.set(pagination.pageSize);
    });
  }

  private setupFormSubscriptions(): void {
    // Search subscription with debounce
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.updateFilters({ search: searchTerm || '' });
    });

    // Status filter subscription
    this.statusFilterControl.valueChanges.pipe(
      startWith(null),
      takeUntil(this.destroy$)
    ).subscribe(status => {
      this.updateFilters({ ativo: status });
    });

    // Sort controls subscription
    combineLatest([
      this.sortByControl.valueChanges.pipe(startWith('nome')),
      this.sortOrderControl.valueChanges.pipe(startWith('asc'))
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([sortBy, sortOrder]) => {
      this.updateFilters({ 
        sortBy: sortBy as SortOption, 
        sortOrder: sortOrder as 'asc' | 'desc' 
      });
    });
  }

  private setupKeyboardNavigation(): void {
    // Global keyboard shortcuts
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
  }

  private setupAccessibility(): void {
    // Announce page load
    this.categoryAccessibility.announceAction('loaded', undefined, 'Página de categorias carregada');
    
    // Setup keyboard navigation for the container
    setTimeout(() => {
      if (this.categoryListContainer?.nativeElement) {
        this.categoryAccessibility.setupKeyboardNavigation(this.categoryListContainer.nativeElement);
      }
    });

    // Monitor loading states for announcements
    this.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isLoading => {
      this.categoryAccessibility.announceLoading(isLoading, 'categorias');
    });

    // Monitor error states
    this.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      if (error) {
        this.categoryAccessibility.announceError(error, 'Erro ao carregar categorias');
      }
    });
  }

  private setupPerformanceMonitoring(): void {
    // Monitor bundle size
    this.bundleOptimizer.analyzeBundleSize().then(analysis => {
      console.log('Bundle analysis:', analysis);
    });

    // Preload components based on user behavior
    this.lazyLoader.preloadComponent({
      componentName: 'CategoryAnalyticsDashboard',
      priority: 'medium',
      preloadDelay: 3000,
      loadCondition: () => this.hasAnalyticsAccess()
    });

    // Monitor performance metrics
    this.performanceMetrics.performanceData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      // Auto-enable optimizations if performance is poor
      if (data.listRenderTime > 200 && this.performanceMode() === 'standard') {
        this.enablePerformanceOptimizations();
      }
    });
  }

  private measureComponentLoad(): void {
    this.performanceMetrics.measureComponentLoad('CategoryListComponent');
  }

  private loadInitialData(): void {
    // Load categories when establishment is selected
    this.selectedEstablishment$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(establishment => {
      if (establishment) {
        const startTime = performance.now();
        this.categoryState.setEstablishmentContext(establishment.id);
        this.categoryState.loadCategories(establishment.id).subscribe({
          next: () => {
            this.performanceMetrics.measureApiCall('categories_load', startTime);
          }
        });
      }
    });
  }

  // View mode methods
  toggleViewMode(): void {
    const newMode = this.viewMode() === 'grid' ? 'list' : 'grid';
    this.viewMode.set(newMode);
    localStorage.setItem('category-list-view-mode', newMode);
    
    // Announce view mode change for screen readers
    this.announceToScreenReader(`Modo de visualização alterado para ${newMode === 'grid' ? 'grade' : 'lista'}`);
  }

  setViewMode(mode: ViewMode): void {
    if (mode !== this.viewMode()) {
      this.viewMode.set(mode);
      localStorage.setItem('category-list-view-mode', mode);
      this.categoryAccessibility.announceAction(
        'view_mode_changed', 
        undefined, 
        `Modo de visualização alterado para ${mode === 'grid' ? 'grade' : 'lista'}`
      );
    }
  }

  // Filter and search methods
  private updateFilters(filters: Partial<CategoryFilters>): void {
    this.categoryState.updateFilters(filters);
    this.clearSelection();
  }

  onAdvancedSearch(query: string): void {
    this.categorySearch.updateSearchQuery(query);
    this.clearSelection();
  }

  onAdvancedFiltersChange(filters: AdvancedFilters): void {
    // Update legacy form controls to keep them in sync
    this.searchControl.setValue(filters.search, { emitEvent: false });
    this.statusFilterControl.setValue(filters.ativo, { emitEvent: false });
    this.sortByControl.setValue(filters.sortBy as SortOption, { emitEvent: false });
    this.sortOrderControl.setValue(filters.sortOrder, { emitEvent: false });
    
    this.clearSelection();
  }

  onExportCategories(event: { format: 'csv' | 'json'; categories: Category[] }): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `categorias-${timestamp}`;
    
    if (event.format === 'csv') {
      this.categorySearch.exportToCSV(event.categories, filename);
    } else {
      this.categorySearch.exportToJSON(event.categories, filename);
    }
    
    this.announceToScreenReader(`Exportação ${event.format.toUpperCase()} iniciada com ${event.categories.length} categoria(s)`);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.categorySearch.clearSearch();
    this.focusSearchInput();
  }

  clearAllFilters(): void {
    this.searchControl.setValue('');
    this.statusFilterControl.setValue(null);
    this.sortByControl.setValue('nome');
    this.sortOrderControl.setValue('asc');
    this.categorySearch.clearSearch();
    this.announceToScreenReader('Todos os filtros foram limpos');
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.categoryState.updatePagination({ currentPage: page });
      this.scrollToTop();
      this.announceToScreenReader(`Navegando para página ${page} de ${this.totalPages()}`);
    }
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages());
  }

  goToPreviousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  goToNextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  changePageSize(newSize: number): void {
    this.categoryState.updatePagination({ 
      pageSize: newSize, 
      currentPage: 1 
    });
    this.announceToScreenReader(`Tamanho da página alterado para ${newSize} itens`);
  }

  // Selection methods
  toggleCategorySelection(categoryId: number): void {
    const selected = new Set(this.selectedCategories());
    
    if (selected.has(categoryId)) {
      selected.delete(categoryId);
    } else {
      selected.add(categoryId);
    }
    
    this.selectedCategories.set(selected);
    this.updateSelectAllMode();
  }

  toggleSelectAll(categories: Category[]): void {
    const allSelected = this.areAllCategoriesSelected(categories);
    
    if (allSelected) {
      this.clearSelection();
    } else {
      const allIds = new Set(categories.map(c => c.id));
      this.selectedCategories.set(allIds);
    }
    
    this.updateSelectAllMode();
    this.announceToScreenReader(
      allSelected ? 'Todas as categorias desmarcadas' : 'Todas as categorias selecionadas'
    );
  }

  clearSelection(): void {
    this.selectedCategories.set(new Set());
    this.isSelectAllMode.set(false);
  }

  private updateSelectAllMode(): void {
    // This would need the current categories list to determine if all are selected
    // For now, we'll keep it simple
    this.isSelectAllMode.set(this.selectedCategories().size > 0);
  }

  areAllCategoriesSelected(categories: Category[]): boolean {
    const selected = this.selectedCategories();
    return categories.length > 0 && categories.every(c => selected.has(c.id));
  }

  isCategorySelected(categoryId: number): boolean {
    return this.selectedCategories().has(categoryId);
  }

  // Bulk operations
  bulkDeleteSelected(): void {
    const selectedIds = Array.from(this.selectedCategories());
    if (selectedIds.length === 0) return;

    // Get current categories to find selected ones
    this.categories$.pipe(
      takeUntil(this.destroy$),
      take(1)
    ).subscribe(categories => {
      const selectedCategories = categories.filter(c => selectedIds.includes(c.id));
      this.categoriesToBulkDelete.set(selectedCategories);
      this.showBulkDeletionModal.set(true);
    });
  }

  onBulkDeletionModalResult(result: BulkDeletionModalResult): void {
    this.showBulkDeletionModal.set(false);
    
    if (result.confirmed && result.request) {
      const establishment = this.estabelecimentoService.getSelectedEstabelecimento();
      if (!establishment) return;

      this.categoryDeletionService.deleteBulkCategories(establishment.id, result.request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Refresh the categories list
            this.categoryState.loadCategories(establishment.id).subscribe();
            this.clearSelection();
            this.announceToScreenReader(
              `${response.successfulDeletions} categoria(s) foram processadas com sucesso`
            );
          },
          error: (error) => {
            console.error('Error bulk deleting categories:', error);
          }
        });
    }
    
    this.categoriesToBulkDelete.set([]);
  }

  onCloseBulkDeletionModal(): void {
    this.showBulkDeletionModal.set(false);
    this.categoriesToBulkDelete.set([]);
  }

  // Undo notification methods
  onUndoDeletion(undoToken: string): void {
    this.categoryDeletionService.undoDeletion(undoToken)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Refresh the categories list
          const establishment = this.estabelecimentoService.getSelectedEstabelecimento();
          if (establishment) {
            this.categoryState.loadCategories(establishment.id).subscribe();
          }
        },
        error: (error) => {
          console.error('Error undoing deletion:', error);
        }
      });
  }

  onDismissUndoNotification(undoToken: string): void {
    // The notification will handle its own dismissal
    // This method is here for consistency and future enhancements
  }

  onUndoNotificationExpired(undoToken: string): void {
    // The notification will handle its own expiration
    // This method is here for consistency and future enhancements
  }

  bulkToggleStatus(active: boolean): void {
    const selectedIds = Array.from(this.selectedCategories());
    if (selectedIds.length === 0) return;

    const action = active ? 'ativar' : 'desativar';
    const confirmMessage = `Tem certeza que deseja ${action} ${selectedIds.length} categoria(s) selecionada(s)?`;
    
    if (confirm(confirmMessage)) {
      // TODO: Implement bulk status toggle
      console.log(`Bulk ${action}:`, selectedIds);
      this.clearSelection();
    }
  }

  // Category actions
  onCreateCategory(): void {
    this.createCategory.emit();
  }

  onEditCategory(category: Category): void {
    this.editCategory.emit(category);
  }

  onDeleteCategory(category: Category): void {
    this.categoryToDelete.set(category);
    this.showDeletionModal.set(true);
  }

  onDeletionModalResult(result: DeletionModalResult): void {
    this.showDeletionModal.set(false);
    
    if (result.confirmed && result.request) {
      const establishment = this.estabelecimentoService.getSelectedEstabelecimento();
      if (!establishment) return;

      this.categoryDeletionService.deleteCategory(establishment.id, result.request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Refresh the categories list
            this.categoryState.loadCategories(establishment.id).subscribe();
            this.announceToScreenReader(`Categoria "${this.categoryToDelete()?.nome}" foi processada com sucesso`);
          },
          error: (error) => {
            console.error('Error deleting category:', error);
          }
        });
    }
    
    this.categoryToDelete.set(null);
  }

  onCloseDeletionModal(): void {
    this.showDeletionModal.set(false);
    this.categoryToDelete.set(null);
  }

  onViewCategoryDetails(category: Category): void {
    this.viewCategoryDetails.emit(category);
  }

  // Refresh and retry methods
  refreshCategories(): void {
    const establishment = this.estabelecimentoService.getSelectedEstabelecimento();
    if (establishment) {
      this.categoryState.loadCategories(establishment.id).subscribe();
      this.announceToScreenReader('Lista de categorias atualizada');
    }
  }

  retryLoadCategories(): void {
    this.refreshCategories();
  }

  // Keyboard navigation
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    this.handleKeyboardNavigation(event);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent): void {
    this.handleGlobalKeydown(event);
  }

  private handleKeyboardNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    // Handle category grid/list navigation
    if (target.closest('.category-list__grid')) {
      this.handleCategoryGridNavigation(event);
    }
    
    // Handle pagination navigation
    if (target.closest('.pagination')) {
      this.handlePaginationNavigation(event);
    }
  }

  private handleCategoryGridNavigation(event: KeyboardEvent): void {
    const categoryItems = Array.from(
      this.categoryListContainer.nativeElement.querySelectorAll('.category-list__item')
    ) as HTMLElement[];
    
    const currentIndex = categoryItems.findIndex(item => 
      item.contains(document.activeElement)
    );

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigateToCategory(categoryItems, currentIndex, 'down');
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateToCategory(categoryItems, currentIndex, 'up');
        break;
      case 'ArrowRight':
        if (this.viewMode() === 'grid') {
          event.preventDefault();
          this.navigateToCategory(categoryItems, currentIndex, 'right');
        }
        break;
      case 'ArrowLeft':
        if (this.viewMode() === 'grid') {
          event.preventDefault();
          this.navigateToCategory(categoryItems, currentIndex, 'left');
        }
        break;
      case 'Home':
        event.preventDefault();
        this.navigateToCategory(categoryItems, -1, 'first');
        break;
      case 'End':
        event.preventDefault();
        this.navigateToCategory(categoryItems, -1, 'last');
        break;
    }
  }

  private handlePaginationNavigation(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Home':
        if (event.ctrlKey) {
          event.preventDefault();
          this.goToFirstPage();
        }
        break;
      case 'End':
        if (event.ctrlKey) {
          event.preventDefault();
          this.goToLastPage();
        }
        break;
      case 'PageUp':
        event.preventDefault();
        this.goToPreviousPage();
        break;
      case 'PageDown':
        event.preventDefault();
        this.goToNextPage();
        break;
    }
  }

  private navigateToCategory(
    categoryItems: HTMLElement[], 
    currentIndex: number, 
    direction: 'up' | 'down' | 'left' | 'right' | 'first' | 'last'
  ): void {
    if (categoryItems.length === 0) return;

    let targetIndex = currentIndex;
    const itemsPerRow = this.viewMode() === 'grid' ? this.getItemsPerRow() : 1;

    switch (direction) {
      case 'up':
        targetIndex = Math.max(0, currentIndex - itemsPerRow);
        break;
      case 'down':
        targetIndex = Math.min(categoryItems.length - 1, currentIndex + itemsPerRow);
        break;
      case 'left':
        targetIndex = Math.max(0, currentIndex - 1);
        break;
      case 'right':
        targetIndex = Math.min(categoryItems.length - 1, currentIndex + 1);
        break;
      case 'first':
        targetIndex = 0;
        break;
      case 'last':
        targetIndex = categoryItems.length - 1;
        break;
    }

    const targetItem = categoryItems[targetIndex];
    if (targetItem) {
      const focusableElement = targetItem.querySelector('button, a, [tabindex]') as HTMLElement;
      if (focusableElement) {
        focusableElement.focus();
        this.focusedCategoryIndex.set(targetIndex);
      }
    }
  }

  private getItemsPerRow(): number {
    // Calculate items per row based on container width and item width
    // This is a simplified calculation - in a real app you might want to be more precise
    const containerWidth = this.categoryListContainer?.nativeElement.clientWidth || 1200;
    const itemWidth = 300; // Approximate card width
    return Math.floor(containerWidth / itemWidth) || 1;
  }

  private handleGlobalKeydown(event: KeyboardEvent): void {
    // Only handle if focus is within the component
    if (!this.categoryListContainer?.nativeElement.contains(event.target as Node)) {
      return;
    }

    switch (event.key) {
      case 'f':
      case 'F':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.focusSearchInput();
          this.categoryAccessibility.announceAction('focus_search', undefined, 'Campo de busca focado');
        }
        break;
      case 'r':
      case 'R':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.refreshCategories();
        }
        break;
      case 'n':
      case 'N':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.onCreateCategory();
        }
        break;
      case 'v':
      case 'V':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.toggleViewMode();
        }
        break;
      case 'a':
      case 'A':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.selectAllCurrentPage();
        }
        break;
      case 'Escape':
        this.clearSelection();
        this.categoryAccessibility.announceAction('selection_cleared', undefined, 'Seleção cancelada');
        break;
      case '?':
        if (event.shiftKey) {
          event.preventDefault();
          this.showKeyboardShortcuts();
        }
        break;
    }
  }

  private selectAllCurrentPage(): void {
    this.categories$.pipe(
      takeUntil(this.destroy$),
      take(1)
    ).subscribe(categories => {
      this.toggleSelectAll(categories);
    });
  }

  private showKeyboardShortcuts(): void {
    const shortcuts = [
      'Ctrl+F: Focar no campo de busca',
      'Ctrl+R: Atualizar lista',
      'Ctrl+N: Nova categoria',
      'Ctrl+V: Alternar modo de visualização',
      'Ctrl+A: Selecionar todas',
      'Escape: Cancelar seleção',
      'Setas: Navegar entre categorias',
      'Home/End: Primeira/última categoria',
      'Ctrl+Home/End: Primeira/última página',
      'PageUp/PageDown: Página anterior/próxima'
    ].join('\n');

    this.categoryAccessibility.announceAction(
      'shortcuts_help', 
      undefined, 
      `Atalhos de teclado disponíveis: ${shortcuts}`
    );
  }

  // Utility methods
  private focusSearchInput(): void {
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.focus();
    }
  }

  private scrollToTop(): void {
    if (this.categoryListContainer?.nativeElement) {
      this.categoryListContainer.nativeElement.scrollTop = 0;
    }
  }

  private announceToScreenReader(message: string): void {
    this.categoryAccessibility.announceAction('custom', undefined, message);
  }

  // TrackBy functions for performance
  trackByCategory(index: number, category: Category): number {
    return category.id;
  }

  trackByPageNumber(index: number, page: number): number {
    return page;
  }

  trackByUndoToken(index: number, pendingUndo: any): string {
    return pendingUndo.undoToken;
  }

  // Getters for template
  getViewModeIcon(): string {
    return this.viewMode() === 'grid' ? '📋' : '⊞';
  }

  getViewModeLabel(): string {
    return this.viewMode() === 'grid' ? 'Visualizar como lista' : 'Visualizar como grade';
  }

  getSelectedCountText(): string {
    const count = this.selectedCategories().size;
    return count === 1 ? '1 categoria selecionada' : `${count} categorias selecionadas`;
  }

  getPaginationInfo(): string {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalItems());
    return `Mostrando ${start}-${end} de ${this.totalItems()} categorias`;
  }

  getPageNumbers(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const delta = 2; // Number of pages to show on each side of current page
    
    const range: number[] = [];
    const rangeWithDots: number[] = [];
    
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }
    
    if (current - delta > 2) {
      rangeWithDots.push(1, -1); // -1 represents dots
    } else {
      rangeWithDots.push(1);
    }
    
    rangeWithDots.push(...range);
    
    if (current + delta < total - 1) {
      rangeWithDots.push(-1, total); // -1 represents dots
    } else if (total > 1) {
      rangeWithDots.push(total);
    }
    
    return rangeWithDots;
  }

  // Accessibility helper methods
  getCategoryActionLabel(action: string, categoryName: string): string {
    return this.categoryAccessibility.getCategoryActionLabel(action, categoryName);
  }

  getFieldDescription(fieldName: string): string {
    return this.categoryAccessibility.getFieldDescription(fieldName);
  }

  generateAriaId(prefix: string): string {
    return this.categoryAccessibility.generateAriaId(prefix);
  }

  isHighContrastEnabled(): boolean {
    return this.categoryAccessibility.isHighContrastEnabled();
  }

  isReducedMotionPreferred(): boolean {
    return this.categoryAccessibility.isReducedMotionPreferred();
  }

  // Enhanced announcement methods
  announcePageChange(page: number): void {
    this.categoryAccessibility.announceAction(
      'page_changed',
      undefined,
      `Página ${page} de ${this.totalPages()} carregada`
    );
  }

  announceFilterChange(filterType: string, value: any): void {
    this.categoryAccessibility.announceAction(
      'filter_changed',
      undefined,
      `Filtro ${filterType} aplicado: ${value}`
    );
  }

  announceSelectionChange(): void {
    const count = this.selectedCategories().size;
    if (count === 0) {
      this.categoryAccessibility.announceAction('selection_cleared');
    } else {
      this.categoryAccessibility.announceAction(
        'selection_changed',
        undefined,
        `${count} categoria${count === 1 ? '' : 's'} selecionada${count === 1 ? '' : 's'}`
      );
    }
  }

  // Focus management methods
  manageFocusForModal(action: 'open' | 'close', modalType: string): void {
    const container = document.querySelector(`[data-modal="${modalType}"]`) as HTMLElement;
    if (container) {
      this.categoryAccessibility.manageFocus(
        container,
        action,
        this.lastFocusedElement || undefined
      );
    }
  }

  setLastFocusedElement(element: HTMLElement): void {
    this.lastFocusedElement = element;
  }

  // Skip link functionality
  skipToMainContent(): void {
    const mainContent = document.getElementById(this.mainContentId);
    if (mainContent) {
      mainContent.focus();
      this.categoryAccessibility.announceAction(
        'skip_to_content',
        undefined,
        'Navegado para conteúdo principal'
      );
    }
  }

  // Accessibility testing helpers (for development)
  testAccessibility(): void {
    if (typeof window !== 'undefined' && (window as any).axe) {
      (window as any).axe.run().then((results: any) => {
        console.log('Accessibility test results:', results);
        if (results.violations.length > 0) {
          console.warn('Accessibility violations found:', results.violations);
        }
      });
    }
  }

  // Performance optimization methods
  enablePerformanceOptimizations(): void {
    this.performanceMode.set('optimized');
    this.useVirtualScrolling.set(true);
    localStorage.setItem('category-performance-mode', 'optimized');
    localStorage.setItem('category-use-virtual-scrolling', 'true');
    
    this.announceToScreenReader('Otimizações de performance ativadas');
  }

  disablePerformanceOptimizations(): void {
    this.performanceMode.set('standard');
    this.useVirtualScrolling.set(false);
    localStorage.setItem('category-performance-mode', 'standard');
    localStorage.setItem('category-use-virtual-scrolling', 'false');
    
    this.announceToScreenReader('Otimizações de performance desativadas');
  }

  toggleVirtualScrolling(): void {
    const newValue = !this.useVirtualScrolling();
    this.useVirtualScrolling.set(newValue);
    localStorage.setItem('category-use-virtual-scrolling', newValue.toString());
    
    this.announceToScreenReader(
      `Rolagem virtual ${newValue ? 'ativada' : 'desativada'}`
    );
  }

  togglePerformanceInfo(): void {
    this.showPerformanceInfo.set(!this.showPerformanceInfo());
  }

  // Virtual scroll event handlers
  onVirtualScrollEdit(category: Category): void {
    this.onEditCategory(category);
  }

  onVirtualScrollDelete(category: Category): void {
    this.onDeleteCategory(category);
  }

  onVirtualScrollView(category: Category): void {
    this.onViewCategoryDetails(category);
  }

  onVirtualScrollLoadMore(): void {
    // Load more categories if available
    if (this.currentPage() < this.totalPages()) {
      this.goToNextPage();
    }
  }

  // Performance monitoring methods
  measureListRender(itemCount: number): void {
    this.performanceMetrics.measureListRender(itemCount);
  }

  measureSearchPerformance(): void {
    const endTiming = this.performanceMetrics.startTiming('category_search');
    
    // Simulate search completion
    setTimeout(() => {
      endTiming();
    }, 0);
  }

  getPerformanceData() {
    return this.performanceMetrics.getPerformanceSummary();
  }

  // Bundle optimization methods
  async loadAnalyticsLazily(): Promise<void> {
    try {
      const component = await this.lazyLoader.loadAnalyticsComponent();
      console.log('Analytics component loaded:', component);
    } catch (error) {
      console.error('Failed to load analytics component:', error);
    }
  }

  async loadImportExportLazily(): Promise<void> {
    try {
      const component = await this.lazyLoader.loadImportExportComponent();
      console.log('Import/Export component loaded:', component);
    } catch (error) {
      console.error('Failed to load import/export component:', error);
    }
  }

  // Helper methods
  private hasAnalyticsAccess(): boolean {
    return localStorage.getItem('hasAnalyticsAccess') === 'true';
  }

  shouldUseVirtualScrolling(): boolean {
    return this.useVirtualScrolling() && this.totalItems() > 50;
  }

  getOptimizationRecommendations(): string[] {
    return this.bundleOptimizer.getOptimizationRecommendations();
  }
}