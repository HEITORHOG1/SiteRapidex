import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, BehaviorSubject } from 'rxjs';

import { AdvancedSearchComponent } from './advanced-search.component';
import { CategorySearchService, AdvancedFilters, SearchSuggestion, SearchHistory } from '../../services/category-search.service';
import { Category } from '../../models/category.models';

describe('AdvancedSearchComponent', () => {
  let component: AdvancedSearchComponent;
  let fixture: ComponentFixture<AdvancedSearchComponent>;
  let categorySearchService: jasmine.SpyObj<CategorySearchService>;

  const mockCategories: Category[] = [
    {
      id: 1,
      nome: 'Bebidas',
      descricao: 'Categoria de bebidas',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-01'),
      dataAtualizacao: new Date('2024-01-15'),
      produtosCount: 5
    },
    {
      id: 2,
      nome: 'Comidas',
      descricao: 'Categoria de comidas',
      estabelecimentoId: 1,
      ativo: false,
      dataCriacao: new Date('2024-01-02'),
      dataAtualizacao: new Date('2024-01-16'),
      produtosCount: 10
    }
  ];

  const mockSuggestions: SearchSuggestion[] = [
    { text: 'bebidas', type: 'recent', count: 3 },
    { text: 'Bebidas', type: 'category' },
    { text: 'comidas', type: 'popular', count: 5 }
  ];

  const mockHistory: SearchHistory[] = [
    {
      query: 'bebidas',
      timestamp: new Date('2024-01-01T10:00:00'),
      resultsCount: 1
    },
    {
      query: 'comidas',
      timestamp: new Date('2024-01-01T11:00:00'),
      resultsCount: 1
    }
  ];

  beforeEach(async () => {
    const searchServiceSpy = jasmine.createSpyObj('CategorySearchService', [
      'updateSearchQuery',
      'updateAdvancedFilters',
      'performSearch',
      'getSearchSuggestions',
      'removeFromHistory',
      'clearSearch',
      'clearFilters',
      'clearSearchHistory',
      'highlightText',
      'exportToCSV',
      'exportToJSON'
    ], {
      searchQuery$: of(''),
      searchSuggestions$: of(mockSuggestions),
      searchHistory$: of(mockHistory),
      highlightTerms$: of([]),
      filteredCategories$: of(mockCategories),
      advancedFilters$: of({
        search: '',
        ativo: null,
        dateRange: null,
        sortBy: 'nome',
        sortOrder: 'asc'
      } as AdvancedFilters)
    });

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        AdvancedSearchComponent
      ],
      providers: [
        { provide: CategorySearchService, useValue: searchServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdvancedSearchComponent);
    component = fixture.componentInstance;
    categorySearchService = TestBed.inject(CategorySearchService) as jasmine.SpyObj<CategorySearchService>;

    // Setup return values for service methods
    categorySearchService.performSearch.and.returnValue(of(mockCategories));
    categorySearchService.getSearchSuggestions.and.returnValue(of(mockSuggestions));
    categorySearchService.highlightText.and.returnValue('highlighted text');

    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize forms correctly', () => {
      expect(component.searchForm).toBeDefined();
      expect(component.advancedFiltersForm).toBeDefined();
      expect(component.searchForm.get('query')?.value).toBe('');
      expect(component.advancedFiltersForm.get('ativo')?.value).toBe(null);
    });

    it('should setup form subscriptions', () => {
      expect(categorySearchService.updateSearchQuery).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('should update search query when typing', () => {
      const searchInput = fixture.debugElement.nativeElement.querySelector('#advanced-search-input');
      searchInput.value = 'bebidas';
      searchInput.dispatchEvent(new Event('input'));
      
      fixture.detectChanges();
      
      expect(categorySearchService.updateSearchQuery).toHaveBeenCalledWith('bebidas');
    });

    it('should show suggestions when search input is focused', () => {
      component.onSearchFocus();
      expect(component.isSearchFocused()).toBe(true);
    });

    it('should hide suggestions when search input is blurred', (done) => {
      component.onSearchFocus();
      component.onSearchBlur();
      
      setTimeout(() => {
        expect(component.isSearchFocused()).toBe(false);
        done();
      }, 250);
    });

    it('should perform search when form is submitted', () => {
      component.searchForm.patchValue({ query: 'bebidas' });
      component.performSearch();
      
      expect(categorySearchService.performSearch).toHaveBeenCalledWith('bebidas');
    });

    it('should clear search when clear button is clicked', () => {
      component.clearSearch();
      
      expect(categorySearchService.clearSearch).toHaveBeenCalled();
      expect(component.searchForm.get('query')?.value).toBe('');
    });
  });

  describe('Suggestions and History', () => {
    it('should select suggestion and update search', () => {
      const suggestion = mockSuggestions[0];
      component.selectSuggestion(suggestion);
      
      expect(component.searchForm.get('query')?.value).toBe(suggestion.text);
      expect(categorySearchService.performSearch).toHaveBeenCalledWith(suggestion.text);
    });

    it('should select history item and update search', () => {
      const historyItem = mockHistory[0];
      component.selectHistoryItem(historyItem.query);
      
      expect(component.searchForm.get('query')?.value).toBe(historyItem.query);
      expect(categorySearchService.performSearch).toHaveBeenCalledWith(historyItem.query);
    });

    it('should remove history item', () => {
      const event = new Event('click');
      spyOn(event, 'stopPropagation');
      
      component.removeHistoryItem('bebidas', event);
      
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(categorySearchService.removeFromHistory).toHaveBeenCalledWith('bebidas');
    });

    it('should clear search history', () => {
      component.clearSearchHistory();
      expect(categorySearchService.clearSearchHistory).toHaveBeenCalled();
    });

    it('should get correct suggestion icon', () => {
      expect(component.getSuggestionIcon('recent')).toBe('🕒');
      expect(component.getSuggestionIcon('popular')).toBe('🔥');
      expect(component.getSuggestionIcon('category')).toBe('📁');
      expect(component.getSuggestionIcon('unknown')).toBe('🔍');
    });

    it('should get correct suggestion label', () => {
      expect(component.getSuggestionLabel('recent')).toBe('Busca recente');
      expect(component.getSuggestionLabel('popular')).toBe('Busca popular');
      expect(component.getSuggestionLabel('category')).toBe('Categoria');
      expect(component.getSuggestionLabel('unknown')).toBe('Sugestão');
    });
  });

  describe('Advanced Filters', () => {
    it('should toggle advanced filters panel', () => {
      expect(component.showAdvanced()).toBe(false);
      
      component.toggleAdvancedFilters();
      expect(component.showAdvanced()).toBe(true);
      
      component.toggleAdvancedFilters();
      expect(component.showAdvanced()).toBe(false);
    });

    it('should update advanced filters when form changes', () => {
      component.advancedFiltersForm.patchValue({
        ativo: true,
        sortBy: 'dataCriacao',
        sortOrder: 'desc'
      });
      
      fixture.detectChanges();
      
      expect(categorySearchService.updateAdvancedFilters).toHaveBeenCalledWith(
        jasmine.objectContaining({
          ativo: true,
          sortBy: 'dataCriacao',
          sortOrder: 'desc'
        })
      );
    });

    it('should clear all filters', () => {
      component.advancedFiltersForm.patchValue({
        ativo: true,
        sortBy: 'dataCriacao'
      });
      
      component.clearAllFilters();
      
      expect(component.advancedFiltersForm.get('ativo')?.value).toBe(null);
      expect(component.advancedFiltersForm.get('sortBy')?.value).toBe('nome');
      expect(categorySearchService.clearFilters).toHaveBeenCalled();
    });

    it('should detect active filters', () => {
      expect(component.hasActiveFilters()).toBe(false);
      
      component.advancedFiltersForm.patchValue({ ativo: true });
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should handle date range filters', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      component.advancedFiltersForm.patchValue({
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        dateRangeField: 'dataCriacao'
      });
      
      fixture.detectChanges();
      
      expect(categorySearchService.updateAdvancedFilters).toHaveBeenCalledWith(
        jasmine.objectContaining({
          dateRange: {
            start: new Date(startDate),
            end: new Date(endDate),
            field: 'dataCriacao'
          }
        })
      );
    });

    it('should handle product count filters', () => {
      component.advancedFiltersForm.patchValue({
        minProductCount: 5,
        maxProductCount: 20
      });
      
      fixture.detectChanges();
      
      expect(categorySearchService.updateAdvancedFilters).toHaveBeenCalledWith(
        jasmine.objectContaining({
          minProductCount: 5,
          maxProductCount: 20
        })
      );
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      component.categories = mockCategories;
    });

    it('should export to CSV', () => {
      component.exportToCSV();
      
      expect(categorySearchService.exportToCSV).toHaveBeenCalledWith(mockCategories);
    });

    it('should export to JSON', () => {
      component.exportToJSON();
      
      expect(categorySearchService.exportToJSON).toHaveBeenCalledWith(mockCategories);
    });

    it('should emit export event', () => {
      spyOn(component.export, 'emit');
      
      component.exportToCSV();
      
      expect(component.export.emit).toHaveBeenCalledWith({
        format: 'csv',
        categories: mockCategories
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should focus search on Ctrl+K', () => {
      const searchInput = fixture.debugElement.nativeElement.querySelector('#advanced-search-input');
      spyOn(searchInput, 'focus');
      
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      spyOn(event, 'preventDefault');
      
      document.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle search input keydown events', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      spyOn(event, 'preventDefault');
      
      component.onSearchKeydown(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should hide suggestions on Escape', () => {
      component.showSuggestions.set(true);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onSearchKeydown(event);
      
      expect(component.showSuggestions()).toBe(false);
    });

    it('should perform search on Enter when no suggestions shown', () => {
      component.showSuggestions.set(false);
      component.showHistory.set(false);
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onSearchKeydown(event);
      
      expect(categorySearchService.performSearch).toHaveBeenCalled();
    });
  });

  describe('Text Highlighting', () => {
    it('should highlight text using service', () => {
      const text = 'Bebidas geladas';
      const result = component.highlightText(text);
      
      expect(categorySearchService.highlightText).toHaveBeenCalledWith(text);
      expect(result).toBe('highlighted text');
    });
  });

  describe('Utility Methods', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = component.formatDate(date);
      
      expect(result).toBe('15/01/2024');
    });

    it('should format time correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = component.formatTime(date);
      
      expect(result).toBe('10:30');
    });

    it('should track suggestions correctly', () => {
      const suggestion = mockSuggestions[0];
      const result = component.trackBySuggestion(0, suggestion);
      
      expect(result).toBe(`${suggestion.type}-${suggestion.text}`);
    });

    it('should track history correctly', () => {
      const historyItem = mockHistory[0];
      const result = component.trackByHistory(0, historyItem);
      
      expect(result).toBe(`${historyItem.query}-${historyItem.timestamp}`);
    });
  });

  describe('Form Synchronization', () => {
    it('should update forms from external filter changes', () => {
      const filters: AdvancedFilters = {
        search: 'test query',
        ativo: true,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
          field: 'dataCriacao'
        },
        sortBy: 'dataCriacao',
        sortOrder: 'desc'
      };

      // Simulate external filter change
      const filtersSubject = new BehaviorSubject(filters);
      (categorySearchService as any).advancedFilters$ = filtersSubject.asObservable();
      
      component.ngOnInit();
      
      expect(component.searchForm.get('query')?.value).toBe('test query');
      expect(component.advancedFiltersForm.get('ativo')?.value).toBe(true);
      expect(component.advancedFiltersForm.get('sortBy')?.value).toBe('dataCriacao');
      expect(component.advancedFiltersForm.get('sortOrder')?.value).toBe('desc');
    });
  });

  describe('Component Inputs', () => {
    it('should use custom placeholder', () => {
      component.placeholder = 'Custom placeholder';
      fixture.detectChanges();
      
      const searchInput = fixture.debugElement.nativeElement.querySelector('#advanced-search-input');
      expect(searchInput.placeholder).toBe('Custom placeholder');
    });

    it('should hide advanced filters when showAdvancedFilters is false', () => {
      component.showAdvancedFilters = false;
      fixture.detectChanges();
      
      const filtersToggle = fixture.debugElement.nativeElement.querySelector('[aria-label="Filtros avançados"]');
      expect(filtersToggle).toBeFalsy();
    });

    it('should hide export options when showExportOptions is false', () => {
      component.showExportOptions = false;
      fixture.detectChanges();
      
      const exportButtons = fixture.debugElement.nativeElement.querySelectorAll('.search-export-group button');
      expect(exportButtons.length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const searchInput = fixture.debugElement.nativeElement.querySelector('#advanced-search-input');
      
      expect(searchInput.getAttribute('aria-describedby')).toBe('search-help');
      expect(searchInput.getAttribute('autocomplete')).toBe('off');
      expect(searchInput.getAttribute('spellcheck')).toBe('false');
    });

    it('should update aria-expanded when suggestions are shown', () => {
      const searchInput = fixture.debugElement.nativeElement.querySelector('#advanced-search-input');
      
      component.showSuggestions.set(true);
      fixture.detectChanges();
      
      expect(searchInput.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have proper role attributes for dropdowns', () => {
      component.showSuggestions.set(true);
      fixture.detectChanges();
      
      const suggestionsDropdown = fixture.debugElement.nativeElement.querySelector('#search-suggestions');
      expect(suggestionsDropdown?.getAttribute('role')).toBe('listbox');
    });
  });
});