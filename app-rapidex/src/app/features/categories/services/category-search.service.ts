import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap, tap, startWith } from 'rxjs/operators';
import { CategoryStateService } from './category-state.service';
import { Category } from '../models/category.models';

export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'category';
  count?: number;
}

export interface SearchHistory {
  query: string;
  timestamp: Date;
  resultsCount: number;
}

export interface AdvancedFilters {
  search: string;
  ativo: boolean | null;
  dateRange: {
    start: Date | null;
    end: Date | null;
    field: 'dataCriacao' | 'dataAtualizacao';
  } | null;
  sortBy: 'nome' | 'dataCriacao' | 'dataAtualizacao' | 'produtosCount';
  sortOrder: 'asc' | 'desc';
  minProductCount?: number;
  maxProductCount?: number;
}

/**
 * Advanced search and filtering service for categories
 */
@Injectable({
  providedIn: 'root'
})
export class CategorySearchService {
  private categoryState = inject(CategoryStateService);
  

  private readonly MAX_HISTORY_ITEMS = 20;
  private readonly MAX_SUGGESTIONS = 10;

  // Search state
  private searchQuerySubject = new BehaviorSubject<string>('');
  private advancedFiltersSubject = new BehaviorSubject<AdvancedFilters>({
    search: '',
    ativo: null,
    dateRange: null,
    sortBy: 'nome',
    sortOrder: 'asc'
  });
  private searchHistorySubject = new BehaviorSubject<SearchHistory[]>([]);
  private searchSuggestionsSubject = new BehaviorSubject<SearchSuggestion[]>([]);
  private highlightTermsSubject = new BehaviorSubject<string[]>([]);

  // Public observables
  readonly searchQuery$ = this.searchQuerySubject.asObservable();
  readonly advancedFilters$ = this.advancedFiltersSubject.asObservable();
  readonly searchHistory$ = this.searchHistorySubject.asObservable();
  readonly searchSuggestions$ = this.searchSuggestionsSubject.asObservable();
  readonly highlightTerms$ = this.highlightTermsSubject.asObservable();

  // Debounced search observable
  readonly debouncedSearch$ = this.searchQuerySubject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    tap(query => this.updateHighlightTerms(query))
  );

  // Filtered and sorted categories
  readonly filteredCategories$ = combineLatest([
    this.categoryState.categories$,
    this.advancedFiltersSubject.asObservable()
  ]).pipe(
    map(([categories, filters]) => this.applyAdvancedFilters(categories, filters))
  );

  constructor() {
    this.setupSearchSubscription();
  }

  /**
   * Updates the search query
   */
  updateSearchQuery(query: string): void {
    this.searchQuerySubject.next(query);
    this.updateAdvancedFilters({ search: query });
  }

  /**
   * Updates advanced filters
   */
  updateAdvancedFilters(filters: Partial<AdvancedFilters>): void {
    const currentFilters = this.advancedFiltersSubject.value;
    const newFilters = { ...currentFilters, ...filters };
    this.advancedFiltersSubject.next(newFilters);
  }

  /**
   * Performs a search and adds to history
   */
  performSearch(query: string): Observable<Category[]> {
    if (!query.trim()) {
      return this.categoryState.categories$;
    }

    this.updateSearchQuery(query);
    
    return this.filteredCategories$.pipe(
      tap(results => {
        this.addToSearchHistory(query, results.length);
        this.updateSearchSuggestions(query);
      })
    );
  }

  /**
   * Gets search suggestions based on current query
   */
  getSearchSuggestions(query: string): Observable<SearchSuggestion[]> {
    if (!query.trim()) {
      return this.searchSuggestions$;
    }

    return combineLatest([
      this.searchHistory$,
      this.categoryState.categories$,
      this.searchSuggestions$
    ]).pipe(
      map(([history, categories, suggestions]) => {
        const allSuggestions: SearchSuggestion[] = [];
        const queryLower = query.toLowerCase();

        // Recent searches
        const recentMatches = history
          .filter(h => h.query.toLowerCase().includes(queryLower))
          .slice(0, 3)
          .map(h => ({
            text: h.query,
            type: 'recent' as const,
            count: h.resultsCount
          }));
        allSuggestions.push(...recentMatches);

        // Category name matches
        const categoryMatches = categories
          .filter(c => c.nome.toLowerCase().includes(queryLower))
          .slice(0, 5)
          .map(c => ({
            text: c.nome,
            type: 'category' as const
          }));
        allSuggestions.push(...categoryMatches);

        // Popular suggestions
        const popularMatches = suggestions
          .filter(s => s.text.toLowerCase().includes(queryLower))
          .slice(0, 2);
        allSuggestions.push(...popularMatches);

        // Remove duplicates and limit results
        const uniqueSuggestions = allSuggestions
          .filter((suggestion, index, self) => 
            self.findIndex(s => s.text === suggestion.text) === index
          )
          .slice(0, this.MAX_SUGGESTIONS);

        return uniqueSuggestions;
      })
    );
  }

  /**
   * Clears search query and filters
   */
  clearSearch(): void {
    this.searchQuerySubject.next('');
    this.advancedFiltersSubject.next({
      search: '',
      ativo: null,
      dateRange: null,
      sortBy: 'nome',
      sortOrder: 'asc'
    });
    this.highlightTermsSubject.next([]);
  }

  /**
   * Clears all filters but keeps search query
   */
  clearFilters(): void {
    const currentQuery = this.searchQuerySubject.value;
    this.advancedFiltersSubject.next({
      search: currentQuery,
      ativo: null,
      dateRange: null,
      sortBy: 'nome',
      sortOrder: 'asc'
    });
  }

  /**
   * Clears search history
   */
  clearSearchHistory(): void {
    this.searchHistorySubject.next([]);
  }

  /**
   * Removes a specific item from search history
   */
  removeFromHistory(query: string): void {
    const currentHistory = this.searchHistorySubject.value;
    const updatedHistory = currentHistory.filter(h => h.query !== query);
    this.searchHistorySubject.next(updatedHistory);
  }

  /**
   * Highlights search terms in text
   */
  highlightText(text: string, terms: string[] = []): string {
    const highlightTerms = terms.length > 0 ? terms : this.highlightTermsSubject.value;
    
    if (!highlightTerms.length || !text) {
      return text;
    }

    let highlightedText = text;
    
    highlightTerms.forEach(term => {
      if (term.trim()) {
        const regex = new RegExp(`(${this.escapeRegExp(term)})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
      }
    });

    return highlightedText;
  }

  /**
   * Exports filtered results to CSV
   */
  exportToCSV(categories: Category[], filename: string = 'categorias'): void {
    const headers = ['ID', 'Nome', 'Descrição', 'Status', 'Data Criação', 'Data Atualização', 'Produtos'];
    const csvContent = [
      headers.join(','),
      ...categories.map(category => [
        category.id,
        `"${category.nome.replace(/"/g, '""')}"`,
        `"${category.descricao.replace(/"/g, '""')}"`,
        category.ativo ? 'Ativo' : 'Inativo',
        new Date(category.dataCriacao).toLocaleDateString('pt-BR'),
        new Date(category.dataAtualizacao).toLocaleDateString('pt-BR'),
        category.produtosCount || 0
      ].join(','))
    ].join('\n');

    this.downloadCSV(csvContent, `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Exports filtered results to JSON
   */
  exportToJSON(categories: Category[], filename: string = 'categorias'): void {
    const jsonContent = JSON.stringify(categories, null, 2);
    this.downloadJSON(jsonContent, `${filename}-${new Date().toISOString().split('T')[0]}.json`);
  }

  // Private methods

  private setupSearchSubscription(): void {
    this.debouncedSearch$.subscribe(query => {
      // Update category state filters
      this.categoryState.updateFilters({
        search: query,
        ativo: this.advancedFiltersSubject.value.ativo,
        sortBy: this.advancedFiltersSubject.value.sortBy,
        sortOrder: this.advancedFiltersSubject.value.sortOrder
      });
    });
  }

  private applyAdvancedFilters(categories: Category[], filters: AdvancedFilters): Category[] {
    let filtered = [...categories];

    // Apply search filter
    if (filters.search) {
      const searchTerms = filters.search.toLowerCase().split(' ').filter(term => term.length > 0);
      filtered = filtered.filter(category => {
        const searchableText = `${category.nome} ${category.descricao}`.toLowerCase();
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // Apply active filter
    if (filters.ativo !== null) {
      filtered = filtered.filter(category => category.ativo === filters.ativo);
    }

    // Apply date range filter
    if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
      filtered = filtered.filter(category => {
        const dateField = filters.dateRange!.field;
        const categoryDate = new Date(category[dateField]);
        
        if (filters.dateRange!.start && categoryDate < filters.dateRange!.start) {
          return false;
        }
        if (filters.dateRange!.end && categoryDate > filters.dateRange!.end) {
          return false;
        }
        return true;
      });
    }

    // Apply product count filters
    if (filters.minProductCount !== undefined) {
      filtered = filtered.filter(category => (category.produtosCount || 0) >= filters.minProductCount!);
    }
    if (filters.maxProductCount !== undefined) {
      filtered = filtered.filter(category => (category.produtosCount || 0) <= filters.maxProductCount!);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'nome':
          aValue = a.nome.toLowerCase();
          bValue = b.nome.toLowerCase();
          break;
        case 'dataCriacao':
          aValue = new Date(a.dataCriacao).getTime();
          bValue = new Date(b.dataCriacao).getTime();
          break;
        case 'dataAtualizacao':
          aValue = new Date(a.dataAtualizacao).getTime();
          bValue = new Date(b.dataAtualizacao).getTime();
          break;
        case 'produtosCount':
          aValue = a.produtosCount || 0;
          bValue = b.produtosCount || 0;
          break;
        default:
          aValue = a.nome.toLowerCase();
          bValue = b.nome.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  private updateHighlightTerms(query: string): void {
    const terms = query.split(' ').filter(term => term.trim().length > 0);
    this.highlightTermsSubject.next(terms);
  }

  private addToSearchHistory(query: string, resultsCount: number): void {
    if (!query.trim()) return;

    const currentHistory = this.searchHistorySubject.value;
    const existingIndex = currentHistory.findIndex(h => h.query === query);
    
    const historyItem: SearchHistory = {
      query,
      timestamp: new Date(),
      resultsCount
    };

    let updatedHistory: SearchHistory[];
    
    if (existingIndex >= 0) {
      // Update existing item and move to top
      updatedHistory = [historyItem, ...currentHistory.filter((_, i) => i !== existingIndex)];
    } else {
      // Add new item to top
      updatedHistory = [historyItem, ...currentHistory];
    }

    // Limit history size
    updatedHistory = updatedHistory.slice(0, this.MAX_HISTORY_ITEMS);
    
    this.searchHistorySubject.next(updatedHistory);
  }

  private updateSearchSuggestions(query: string): void {
    const currentSuggestions = this.searchSuggestionsSubject.value;
    const existingSuggestion = currentSuggestions.find(s => s.text === query);
    
    if (existingSuggestion) {
      existingSuggestion.count = (existingSuggestion.count || 0) + 1;
    } else {
      currentSuggestions.push({
        text: query,
        type: 'popular',
        count: 1
      });
    }

    // Sort by count and limit
    const sortedSuggestions = currentSuggestions
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, this.MAX_SUGGESTIONS);

    this.searchSuggestionsSubject.next(sortedSuggestions);
  }



  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, filename);
  }

  private downloadJSON(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    this.downloadBlob(blob, filename);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}