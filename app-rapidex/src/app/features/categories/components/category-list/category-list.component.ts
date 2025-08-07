import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest, startWith } from 'rxjs';

import { CategoryStateService } from '../../services/category-state.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { CategoryCardComponent } from '../category-card/category-card.component';
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
    CategoryCardComponent
  ],
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryListComponent implements OnInit, OnDestroy {
  private categoryState = inject(CategoryStateService);
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

  // Reactive state from services
  categories$ = this.categoryState.filteredCategories$;
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

  clearSearch(): void {
    this.searchControl.setValue('');
    this.focusSearchInput();
  }

  clearAllFilters(): void {
    this.searchControl.setValue('');
    this.statusFilterControl.setValue(null);
    this.sortByControl.setValue('nome');
    this.sortOrderControl.setValue('asc');
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

    const confirmMessage = `Tem certeza que deseja excluir ${selectedIds.length} categoria(s) selecionada(s)?`;
    if (confirm(confirmMessage)) {
      // TODO: Implement bulk delete
      console.log('Bulk delete:', selectedIds);
      this.clearSelection();
    }
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
    this.deleteCategory.emit(category);
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