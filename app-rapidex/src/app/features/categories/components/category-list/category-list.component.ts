import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest, startWith, take } from 'rxjs';

import { CategoryStateService } from '../../services/category-state.service';
import { CategorySearchService, AdvancedFilters } from '../../services/category-search.service';
import { CategoryDeletionService } from '../../services/category-deletion.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { CategoryCardComponent } from '../category-card/category-card.component';
import { AdvancedSearchComponent } from '../advanced-search/advanced-search.component';
import { CategoryDeletionModalComponent, DeletionModalResult } from '../category-deletion-modal/category-deletion-modal.component';
import { BulkDeletionModalComponent, BulkDeletionModalResult } from '../bulk-deletion-modal/bulk-deletion-modal.component';
import { UndoNotificationComponent } from '../undo-notification/undo-notification.component';
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
    AdvancedSearchComponent,
    CategoryDeletionModalComponent,
    BulkDeletionModalComponent,
    UndoNotificationComponent
  ],
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryListComponent implements OnInit, OnDestroy {
  private categoryState = inject(CategoryStateService);
  private categorySearch = inject(CategorySearchService);
  private categoryDeletionService = inject(CategoryDeletionService);
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

  ngOnInit(): void {
    this.initializeComponent();
    this.setupFormSubscriptions();
    this.setupKeyboardNavigation();
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

  private loadInitialData(): void {
    // Load categories when establishment is selected
    this.selectedEstablishment$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(establishment => {
      if (establishment) {
        this.categoryState.setEstablishmentContext(establishment.id);
        this.categoryState.loadCategories(establishment.id).subscribe();
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
      this.announceToScreenReader(`Modo de visualização alterado para ${mode === 'grid' ? 'grade' : 'lista'}`);
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
          // TODO: Implement select all for current page
        }
        break;
      case 'Escape':
        this.clearSelection();
        break;
    }
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
    // Create a temporary element for screen reader announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
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
}