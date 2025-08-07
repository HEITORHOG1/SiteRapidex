import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith, combineLatest } from 'rxjs';

import { CategorySearchService, AdvancedFilters, SearchSuggestion } from '../../services/category-search.service';
import { Category } from '../../models/category.models';

@Component({
  selector: 'app-advanced-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './advanced-search.component.html',
  styleUrls: ['./advanced-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdvancedSearchComponent implements OnInit, OnDestroy {
  private searchService = inject(CategorySearchService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @Input() placeholder: string = 'Buscar categorias...';
  @Input() showAdvancedFilters: boolean = true;
  @Input() showExportOptions: boolean = true;
  @Input() categories: Category[] = [];

  @Output() search = new EventEmitter<string>();
  @Output() filtersChange = new EventEmitter<AdvancedFilters>();
  @Output() export = new EventEmitter<{ format: 'csv' | 'json'; categories: Category[] }>();

  // Form controls
  searchForm!: FormGroup;
  advancedFiltersForm!: FormGroup;

  // Component state
  showAdvanced = signal(false);
  showSuggestions = signal(false);
  showHistory = signal(false);
  isSearchFocused = signal(false);

  // Reactive state
  searchQuery$ = this.searchService.searchQuery$;
  searchSuggestions$ = this.searchService.searchSuggestions$;
  searchHistory$ = this.searchService.searchHistory$;
  highlightTerms$ = this.searchService.highlightTerms$;
  filteredCategories$ = this.searchService.filteredCategories$;

  // Computed properties
  hasActiveFilters = computed(() => {
    const form = this.advancedFiltersForm;
    if (!form) return false;
    
    return form.get('ativo')?.value !== null ||
           form.get('dateRangeStart')?.value ||
           form.get('dateRangeEnd')?.value ||
           form.get('minProductCount')?.value !== null ||
           form.get('maxProductCount')?.value !== null ||
           form.get('sortBy')?.value !== 'nome' ||
           form.get('sortOrder')?.value !== 'asc';
  });

  ngOnInit(): void {
    this.initializeForms();
    this.setupFormSubscriptions();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Main search form
    this.searchForm = this.fb.group({
      query: ['']
    });

    // Advanced filters form
    this.advancedFiltersForm = this.fb.group({
      ativo: [null],
      dateRangeStart: [null],
      dateRangeEnd: [null],
      dateRangeField: ['dataCriacao'],
      sortBy: ['nome'],
      sortOrder: ['asc'],
      minProductCount: [null],
      maxProductCount: [null]
    });
  }

  private setupFormSubscriptions(): void {
    // Search query subscription with debounce
    this.searchForm.get('query')?.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchService.updateSearchQuery(query || '');
      this.search.emit(query || '');
      this.updateSuggestions(query || '');
    });

    // Advanced filters subscription
    this.advancedFiltersForm.valueChanges.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(formValue => {
      const filters: AdvancedFilters = {
        search: this.searchForm.get('query')?.value || '',
        ativo: formValue.ativo,
        dateRange: (formValue.dateRangeStart || formValue.dateRangeEnd) ? {
          start: formValue.dateRangeStart ? new Date(formValue.dateRangeStart) : null,
          end: formValue.dateRangeEnd ? new Date(formValue.dateRangeEnd) : null,
          field: formValue.dateRangeField
        } : null,
        sortBy: formValue.sortBy,
        sortOrder: formValue.sortOrder,
        minProductCount: formValue.minProductCount,
        maxProductCount: formValue.maxProductCount
      };

      this.searchService.updateAdvancedFilters(filters);
      this.filtersChange.emit(filters);
    });

    // Listen to external filter changes
    this.searchService.advancedFilters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      this.updateFormsFromFilters(filters);
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
  }

  private handleGlobalKeydown(event: KeyboardEvent): void {
    // Ctrl/Cmd + K to focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.focusSearch();
    }

    // Escape to close suggestions/history
    if (event.key === 'Escape') {
      this.hideSuggestions();
      this.hideHistory();
    }
  }

  // Search methods
  onSearchFocus(): void {
    this.isSearchFocused.set(true);
    const query = this.searchForm.get('query')?.value || '';
    if (query) {
      this.showSuggestions.set(true);
    } else {
      this.showHistory.set(true);
    }
  }

  onSearchBlur(): void {
    this.isSearchFocused.set(false);
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => {
      if (!this.isSearchFocused()) {
        this.hideSuggestions();
        this.hideHistory();
      }
    }, 200);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value;
    
    if (query) {
      this.showSuggestions.set(true);
      this.showHistory.set(false);
    } else {
      this.showSuggestions.set(false);
      this.showHistory.set(true);
    }
  }

  selectSuggestion(suggestion: SearchSuggestion): void {
    this.searchForm.patchValue({ query: suggestion.text });
    this.hideSuggestions();
    this.hideHistory();
    this.performSearch(suggestion.text);
  }

  selectHistoryItem(query: string): void {
    this.searchForm.patchValue({ query });
    this.hideSuggestions();
    this.hideHistory();
    this.performSearch(query);
  }

  removeHistoryItem(query: string, event: Event): void {
    event.stopPropagation();
    this.searchService.removeFromHistory(query);
  }

  clearSearch(): void {
    this.searchForm.patchValue({ query: '' });
    this.searchService.clearSearch();
    this.hideSuggestions();
    this.hideHistory();
    this.focusSearch();
  }

  performSearch(query?: string): void {
    const searchQuery = query || this.searchForm.get('query')?.value || '';
    this.searchService.performSearch(searchQuery).subscribe();
  }

  private updateSuggestions(query: string): void {
    if (query && this.isSearchFocused()) {
      this.searchService.getSearchSuggestions(query).subscribe();
      this.showSuggestions.set(true);
      this.showHistory.set(false);
    }
  }

  private focusSearch(): void {
    const searchInput = document.querySelector('#advanced-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }

  private hideSuggestions(): void {
    this.showSuggestions.set(false);
  }

  private hideHistory(): void {
    this.showHistory.set(false);
  }

  // Advanced filters methods
  toggleAdvancedFilters(): void {
    this.showAdvanced.update(show => !show);
  }

  clearAllFilters(): void {
    this.advancedFiltersForm.reset({
      ativo: null,
      dateRangeStart: null,
      dateRangeEnd: null,
      dateRangeField: 'dataCriacao',
      sortBy: 'nome',
      sortOrder: 'asc',
      minProductCount: null,
      maxProductCount: null
    });
    this.searchService.clearFilters();
  }

  clearSearchHistory(): void {
    this.searchService.clearSearchHistory();
  }

  private updateFormsFromFilters(filters: AdvancedFilters): void {
    // Update search form
    if (filters.search !== this.searchForm.get('query')?.value) {
      this.searchForm.patchValue({ query: filters.search }, { emitEvent: false });
    }

    // Update advanced filters form
    this.advancedFiltersForm.patchValue({
      ativo: filters.ativo,
      dateRangeStart: filters.dateRange?.start ? 
        filters.dateRange.start.toISOString().split('T')[0] : null,
      dateRangeEnd: filters.dateRange?.end ? 
        filters.dateRange.end.toISOString().split('T')[0] : null,
      dateRangeField: filters.dateRange?.field || 'dataCriacao',
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      minProductCount: filters.minProductCount,
      maxProductCount: filters.maxProductCount
    }, { emitEvent: false });
  }

  // Export methods
  exportToCSV(): void {
    this.filteredCategories$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(categories => {
      this.searchService.exportToCSV(categories);
      this.export.emit({ format: 'csv', categories });
    });
  }

  exportToJSON(): void {
    this.filteredCategories$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(categories => {
      this.searchService.exportToJSON(categories);
      this.export.emit({ format: 'json', categories });
    });
  }

  // Utility methods
  highlightText(text: string): string {
    return this.searchService.highlightText(text);
  }

  getSuggestionIcon(type: string): string {
    switch (type) {
      case 'recent': return '🕒';
      case 'popular': return '🔥';
      case 'category': return '📁';
      default: return '🔍';
    }
  }

  getSuggestionLabel(type: string): string {
    switch (type) {
      case 'recent': return 'Busca recente';
      case 'popular': return 'Busca popular';
      case 'category': return 'Categoria';
      default: return 'Sugestão';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('pt-BR');
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // Accessibility methods
  onSearchKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusFirstSuggestion();
        break;
      case 'Escape':
        this.hideSuggestions();
        this.hideHistory();
        break;
      case 'Enter':
        if (!this.showSuggestions() && !this.showHistory()) {
          this.performSearch();
        }
        break;
    }
  }

  private focusFirstSuggestion(): void {
    const firstSuggestion = document.querySelector('.search-suggestion') as HTMLElement;
    if (firstSuggestion) {
      firstSuggestion.focus();
    }
  }

  // Template helper methods
  trackBySuggestion(index: number, suggestion: SearchSuggestion): string {
    return `${suggestion.type}-${suggestion.text}`;
  }

  trackByHistory(index: number, item: any): string {
    return `${item.query}-${item.timestamp}`;
  }
}