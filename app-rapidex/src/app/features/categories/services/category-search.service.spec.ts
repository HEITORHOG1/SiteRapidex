import { TestBed } from '@angular/core/testing';
import { CategorySearchService, AdvancedFilters, SearchSuggestion, SearchHistory } from './category-search.service';
import { CategoryStateService } from './category-state.service';
import { Category } from '../models/category.models';

describe('CategorySearchService', () => {
  let service: CategorySearchService;
  let categoryStateService: jasmine.SpyObj<CategoryStateService>;

  const mockCategories: Category[] = [
    {
      id: 1,
      nome: 'Bebidas',
      descricao: 'Categoria de bebidas diversas',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-01'),
      dataAtualizacao: new Date('2024-01-15'),
      produtosCount: 5
    },
    {
      id: 2,
      nome: 'Comidas',
      descricao: 'Categoria de comidas variadas',
      estabelecimentoId: 1,
      ativo: false,
      dataCriacao: new Date('2024-01-02'),
      dataAtualizacao: new Date('2024-01-16'),
      produtosCount: 10
    },
    {
      id: 3,
      nome: 'Sobremesas',
      descricao: 'Doces e sobremesas deliciosas',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-03'),
      dataAtualizacao: new Date('2024-01-17'),
      produtosCount: 3
    }
  ];

  beforeEach(() => {
    const categoryStateSpy = jasmine.createSpyObj('CategoryStateService', [
      'updateFilters'
    ], {
      categories$: jasmine.createSpy().and.returnValue({ subscribe: jasmine.createSpy() })
    });

    TestBed.configureTestingModule({
      providers: [
        CategorySearchService,
        { provide: CategoryStateService, useValue: categoryStateSpy }
      ]
    });

    service = TestBed.inject(CategorySearchService);
    categoryStateService = TestBed.inject(CategoryStateService) as jasmine.SpyObj<CategoryStateService>;

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Search Query Management', () => {
    it('should update search query', () => {
      const query = 'bebidas';
      service.updateSearchQuery(query);

      service.searchQuery$.subscribe(result => {
        expect(result).toBe(query);
      });
    });

    it('should clear search query', () => {
      service.updateSearchQuery('test');
      service.clearSearch();

      service.searchQuery$.subscribe(result => {
        expect(result).toBe('');
      });
    });

    it('should update highlight terms when search query changes', () => {
      const query = 'bebidas doces';
      service.updateSearchQuery(query);

      service.highlightTerms$.subscribe(terms => {
        expect(terms).toEqual(['bebidas', 'doces']);
      });
    });
  });

  describe('Advanced Filters', () => {
    it('should update advanced filters', () => {
      const filters: Partial<AdvancedFilters> = {
        ativo: true,
        sortBy: 'dataCriacao',
        sortOrder: 'desc'
      };

      service.updateAdvancedFilters(filters);

      service.advancedFilters$.subscribe(result => {
        expect(result.ativo).toBe(true);
        expect(result.sortBy).toBe('dataCriacao');
        expect(result.sortOrder).toBe('desc');
      });
    });

    it('should clear filters but keep search query', () => {
      service.updateSearchQuery('test');
      service.updateAdvancedFilters({ ativo: true });
      service.clearFilters();

      service.advancedFilters$.subscribe(result => {
        expect(result.search).toBe('test');
        expect(result.ativo).toBe(null);
        expect(result.sortBy).toBe('nome');
        expect(result.sortOrder).toBe('asc');
      });
    });
  });

  describe('Category Filtering', () => {
    beforeEach(() => {
      // Mock the categories$ observable
      spyOnProperty(categoryStateService, 'categories$', 'get').and.returnValue(
        { subscribe: (callback: any) => callback(mockCategories) } as any
      );
    });

    it('should filter categories by search term', () => {
      service.updateSearchQuery('bebidas');

      service.filteredCategories$.subscribe(result => {
        expect(result.length).toBe(1);
        expect(result[0].nome).toBe('Bebidas');
      });
    });

    it('should filter categories by multiple search terms', () => {
      service.updateSearchQuery('categoria de');

      service.filteredCategories$.subscribe(result => {
        expect(result.length).toBe(2); // Bebidas and Comidas both have "categoria de" in description
      });
    });

    it('should filter categories by active status', () => {
      service.updateAdvancedFilters({ ativo: true });

      service.filteredCategories$.subscribe(result => {
        expect(result.length).toBe(2); // Bebidas and Sobremesas are active
        expect(result.every(c => c.ativo)).toBe(true);
      });
    });

    it('should filter categories by date range', () => {
      const filters: Partial<AdvancedFilters> = {
        dateRange: {
          start: new Date('2024-01-02'),
          end: new Date('2024-01-02'),
          field: 'dataCriacao'
        }
      };

      service.updateAdvancedFilters(filters);

      service.filteredCategories$.subscribe(result => {
        expect(result.length).toBe(1);
        expect(result[0].nome).toBe('Comidas');
      });
    });

    it('should filter categories by product count range', () => {
      service.updateAdvancedFilters({ 
        minProductCount: 5,
        maxProductCount: 10
      });

      service.filteredCategories$.subscribe(result => {
        expect(result.length).toBe(2); // Bebidas (5) and Comidas (10)
        expect(result.every(c => (c.produtosCount || 0) >= 5 && (c.produtosCount || 0) <= 10)).toBe(true);
      });
    });

    it('should sort categories by name ascending', () => {
      service.updateAdvancedFilters({ 
        sortBy: 'nome',
        sortOrder: 'asc'
      });

      service.filteredCategories$.subscribe(result => {
        expect(result[0].nome).toBe('Bebidas');
        expect(result[1].nome).toBe('Comidas');
        expect(result[2].nome).toBe('Sobremesas');
      });
    });

    it('should sort categories by product count descending', () => {
      service.updateAdvancedFilters({ 
        sortBy: 'produtosCount',
        sortOrder: 'desc'
      });

      service.filteredCategories$.subscribe(result => {
        expect(result[0].produtosCount).toBe(10); // Comidas
        expect(result[1].produtosCount).toBe(5);  // Bebidas
        expect(result[2].produtosCount).toBe(3);  // Sobremesas
      });
    });
  });

  describe('Search History', () => {
    it('should add search to history', () => {
      const query = 'bebidas';
      service.performSearch(query).subscribe();

      service.searchHistory$.subscribe(history => {
        expect(history.length).toBe(1);
        expect(history[0].query).toBe(query);
        expect(history[0].resultsCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should update existing search in history', () => {
      const query = 'bebidas';
      
      // Perform search twice
      service.performSearch(query).subscribe();
      service.performSearch(query).subscribe();

      service.searchHistory$.subscribe(history => {
        expect(history.length).toBe(1); // Should not duplicate
        expect(history[0].query).toBe(query);
      });
    });

    it('should limit history size', () => {
      // Add more than MAX_HISTORY_ITEMS searches
      for (let i = 0; i < 25; i++) {
        service.performSearch(`query${i}`).subscribe();
      }

      service.searchHistory$.subscribe(history => {
        expect(history.length).toBeLessThanOrEqual(20); // MAX_HISTORY_ITEMS
      });
    });

    it('should remove item from history', () => {
      const query = 'bebidas';
      service.performSearch(query).subscribe();
      service.removeFromHistory(query);

      service.searchHistory$.subscribe(history => {
        expect(history.find(h => h.query === query)).toBeUndefined();
      });
    });

    it('should clear all history', () => {
      service.performSearch('query1').subscribe();
      service.performSearch('query2').subscribe();
      service.clearSearchHistory();

      service.searchHistory$.subscribe(history => {
        expect(history.length).toBe(0);
      });
    });

    it('should persist history to localStorage', () => {
      const query = 'bebidas';
      service.performSearch(query).subscribe();

      const stored = localStorage.getItem('category-search-history');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(1);
      expect(parsed[0].query).toBe(query);
    });
  });

  describe('Search Suggestions', () => {
    beforeEach(() => {
      // Mock categories for suggestions
      spyOnProperty(categoryStateService, 'categories$', 'get').and.returnValue(
        { subscribe: (callback: any) => callback(mockCategories) } as any
      );
    });

    it('should generate suggestions from category names', () => {
      const query = 'beb';
      
      service.getSearchSuggestions(query).subscribe(suggestions => {
        const categorySuggestions = suggestions.filter(s => s.type === 'category');
        expect(categorySuggestions.length).toBeGreaterThan(0);
        expect(categorySuggestions[0].text).toBe('Bebidas');
      });
    });

    it('should include recent searches in suggestions', () => {
      const query = 'bebidas';
      
      // Add to history first
      service.performSearch(query).subscribe();
      
      service.getSearchSuggestions('beb').subscribe(suggestions => {
        const recentSuggestions = suggestions.filter(s => s.type === 'recent');
        expect(recentSuggestions.length).toBeGreaterThan(0);
        expect(recentSuggestions[0].text).toBe(query);
      });
    });

    it('should return empty suggestions for empty query', () => {
      service.getSearchSuggestions('').subscribe(suggestions => {
        // Should return stored suggestions, not filtered ones
        expect(Array.isArray(suggestions)).toBe(true);
      });
    });

    it('should limit suggestion results', () => {
      const query = 'a'; // Should match many items
      
      service.getSearchSuggestions(query).subscribe(suggestions => {
        expect(suggestions.length).toBeLessThanOrEqual(10); // MAX_SUGGESTIONS
      });
    });
  });

  describe('Text Highlighting', () => {
    it('should highlight single term', () => {
      const text = 'Bebidas geladas';
      const terms = ['bebidas'];
      
      const result = service.highlightText(text, terms);
      expect(result).toContain('<mark class="search-highlight">Bebidas</mark>');
    });

    it('should highlight multiple terms', () => {
      const text = 'Bebidas geladas e quentes';
      const terms = ['bebidas', 'geladas'];
      
      const result = service.highlightText(text, terms);
      expect(result).toContain('<mark class="search-highlight">Bebidas</mark>');
      expect(result).toContain('<mark class="search-highlight">geladas</mark>');
    });

    it('should handle case insensitive highlighting', () => {
      const text = 'BEBIDAS geladas';
      const terms = ['bebidas'];
      
      const result = service.highlightText(text, terms);
      expect(result).toContain('<mark class="search-highlight">BEBIDAS</mark>');
    });

    it('should return original text when no terms provided', () => {
      const text = 'Bebidas geladas';
      
      const result = service.highlightText(text, []);
      expect(result).toBe(text);
    });

    it('should escape regex special characters', () => {
      const text = 'Preço: R$ 10,00';
      const terms = ['R$'];
      
      const result = service.highlightText(text, terms);
      expect(result).toContain('<mark class="search-highlight">R$</mark>');
    });
  });

  describe('Export Functionality', () => {
    let mockLink: jasmine.SpyObj<HTMLAnchorElement>;
    let createElementSpy: jasmine.Spy;
    let createObjectURLSpy: jasmine.Spy;
    let revokeObjectURLSpy: jasmine.Spy;

    beforeEach(() => {
      mockLink = jasmine.createSpyObj('HTMLAnchorElement', ['click'], {
        setAttribute: jasmine.createSpy(),
        style: { visibility: '' }
      });

      createElementSpy = spyOn(document, 'createElement').and.returnValue(mockLink);
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      
      createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('mock-url');
      revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
    });

    it('should export categories to CSV', () => {
      service.exportToCSV(mockCategories, 'test-export');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'mock-url');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', jasmine.stringMatching(/test-export.*\.csv$/));
      expect(mockLink.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('mock-url');
    });

    it('should export categories to JSON', () => {
      service.exportToJSON(mockCategories, 'test-export');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'mock-url');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', jasmine.stringMatching(/test-export.*\.json$/));
      expect(mockLink.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('mock-url');
    });

    it('should generate CSV with correct headers and data', () => {
      const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
        // Read the blob content to verify CSV format
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          expect(content).toContain('ID,Nome,Descrição,Status,Data Criação,Data Atualização,Produtos');
          expect(content).toContain('1,"Bebidas","Categoria de bebidas diversas",Ativo');
        };
        reader.readAsText(blob);
        return 'mock-url';
      });

      service.exportToCSV(mockCategories.slice(0, 1));
      expect(createObjectURLSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      spyOn(localStorage, 'getItem').and.throwError('Storage error');
      
      expect(() => {
        TestBed.inject(CategorySearchService);
      }).not.toThrow();
    });

    it('should handle localStorage save errors gracefully', () => {
      spyOn(localStorage, 'setItem').and.throwError('Storage error');
      
      expect(() => {
        service.performSearch('test').subscribe();
      }).not.toThrow();
    });
  });
});