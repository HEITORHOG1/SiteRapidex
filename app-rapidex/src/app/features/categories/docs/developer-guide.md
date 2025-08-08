# Category Management Developer Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Module Structure](#module-structure)
3. [Core Services](#core-services)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Extending Functionality](#extending-functionality)
7. [Custom Components](#custom-components)
8. [API Integration](#api-integration)
9. [Testing Guidelines](#testing-guidelines)
10. [Performance Optimization](#performance-optimization)
11. [Security Considerations](#security-considerations)
12. [Deployment](#deployment)

## Architecture Overview

The Category Management system follows Angular's best practices with a modular, scalable architecture:

```
┌─────────────────────────────────────────┐
│              Presentation Layer          │
├─────────────────────────────────────────┤
│  Components │ Pages │ Directives │ Pipes │
├─────────────────────────────────────────┤
│              Business Logic Layer        │
├─────────────────────────────────────────┤
│    Services │ Guards │ Interceptors      │
├─────────────────────────────────────────┤
│              Data Access Layer           │
├─────────────────────────────────────────┤
│   HTTP Client │ Cache │ State Management │
└─────────────────────────────────────────┘
```

### Key Principles

- **Separation of Concerns**: Clear separation between presentation, business logic, and data access
- **Dependency Injection**: Leverages Angular's DI system for loose coupling
- **Reactive Programming**: Uses RxJS for asynchronous operations and state management
- **Type Safety**: Full TypeScript implementation with strict typing
- **Testability**: Designed for comprehensive unit and integration testing

## Module Structure

```
src/app/features/categories/
├── components/           # Reusable UI components
│   ├── category-list/
│   ├── category-form/
│   ├── category-card/
│   └── category-detail/
├── pages/               # Route components
│   ├── category-list-page/
│   ├── category-create-page/
│   └── category-edit-page/
├── services/            # Business logic services
│   ├── category-http.service.ts
│   ├── category-state.service.ts
│   ├── category-cache.service.ts
│   └── category-validation.service.ts
├── models/              # TypeScript interfaces and types
│   ├── category.models.ts
│   └── category-dto.models.ts
├── guards/              # Route guards
│   └── category-ownership.guard.ts
├── interceptors/        # HTTP interceptors
│   └── category-security.interceptor.ts
├── validators/          # Custom form validators
│   └── category-form.validators.ts
├── directives/          # Custom directives
│   └── accessibility.directive.ts
├── pipes/               # Custom pipes
├── styles/              # Component-specific styles
├── docs/                # Documentation
└── categories.routes.ts # Routing configuration
```

## Core Services

### CategoryHttpService

Handles all HTTP operations with the backend API.

```typescript
@Injectable({
  providedIn: 'root'
})
export class CategoryHttpService {
  private readonly baseUrl = '/api/categorias/estabelecimentos';

  constructor(private http: HttpClient) {}

  getCategories(estabelecimentoId: number, params?: CategoryListParams): Observable<CategoryListResponse> {
    const url = `${this.baseUrl}/${estabelecimentoId}/categorias`;
    return this.http.get<CategoryListResponse>(url, { params });
  }

  // Additional methods...
}
```

**Extension Points:**
- Add custom HTTP headers
- Implement retry logic
- Add request/response transformations
- Integrate with different backends

### CategoryStateService

Manages application state using RxJS BehaviorSubjects.

```typescript
@Injectable({
  providedIn: 'root'
})
export class CategoryStateService {
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  readonly categories$ = this.categoriesSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  // State management methods...
}
```

**Extension Points:**
- Add new state properties
- Implement complex state transformations
- Add state persistence
- Integrate with NgRx if needed

### CategoryCacheService

Provides intelligent caching with TTL and invalidation strategies.

```typescript
@Injectable({
  providedIn: 'root'
})
export class CategoryCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    // Cache retrieval logic
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Cache storage logic
  }

  // Additional caching methods...
}
```

**Extension Points:**
- Implement different storage backends (localStorage, IndexedDB)
- Add cache warming strategies
- Implement distributed caching
- Add cache analytics

## Component Architecture

### Base Component Pattern

All category components extend a base component for consistency:

```typescript
export abstract class BaseCategoryComponent implements OnInit, OnDestroy {
  protected destroy$ = new Subject<void>();
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected abstract initializeComponent(): void;

  protected handleError(error: any): void {
    this.error.set(this.getErrorMessage(error));
  }

  private getErrorMessage(error: any): string {
    // Error message extraction logic
  }
}
```

### Component Communication

Components communicate through:

1. **Input/Output Properties**: For parent-child communication
2. **Services**: For cross-component state sharing
3. **Router**: For navigation-based communication
4. **Events**: For loosely coupled communication

```typescript
@Component({
  selector: 'app-category-card',
  template: `...`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryCardComponent {
  @Input() category!: Category;
  @Input() showActions = true;
  
  @Output() edit = new EventEmitter<Category>();
  @Output() delete = new EventEmitter<Category>();
  @Output() view = new EventEmitter<Category>();

  onEdit(): void {
    this.edit.emit(this.category);
  }

  // Additional methods...
}
```

## State Management

### State Structure

```typescript
interface CategoryState {
  categories: Category[];
  selectedCategory: Category | null;
  loading: boolean;
  error: string | null;
  filters: CategoryFilters;
  pagination: PaginationState;
}

interface CategoryFilters {
  search: string;
  ativo: boolean | null;
  sortBy: 'nome' | 'dataCriacao' | 'dataAtualizacao';
  sortOrder: 'asc' | 'desc';
}
```

### State Actions

```typescript
// State action methods
export class CategoryStateService {
  loadCategories(estabelecimentoId: number): void {
    this.setLoading(true);
    this.categoryHttp.getCategories(estabelecimentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.categoriesSubject.next(response.categorias);
          this.setLoading(false);
        },
        error: (error) => {
          this.setError(error.message);
          this.setLoading(false);
        }
      });
  }

  addCategory(category: Category): void {
    const currentCategories = this.categoriesSubject.value;
    this.categoriesSubject.next([...currentCategories, category]);
  }

  updateCategory(updatedCategory: Category): void {
    const currentCategories = this.categoriesSubject.value;
    const index = currentCategories.findIndex(c => c.id === updatedCategory.id);
    if (index !== -1) {
      const newCategories = [...currentCategories];
      newCategories[index] = updatedCategory;
      this.categoriesSubject.next(newCategories);
    }
  }

  removeCategory(categoryId: number): void {
    const currentCategories = this.categoriesSubject.value;
    const filteredCategories = currentCategories.filter(c => c.id !== categoryId);
    this.categoriesSubject.next(filteredCategories);
  }
}
```

## Extending Functionality

### Adding New Components

1. **Create Component Structure**
```bash
ng generate component features/categories/components/my-new-component --standalone
```

2. **Implement Component**
```typescript
@Component({
  selector: 'app-my-new-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `...`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyNewComponent extends BaseCategoryComponent {
  protected initializeComponent(): void {
    // Component initialization logic
  }
}
```

3. **Add to Module Exports**
```typescript
// In components/index.ts
export * from './my-new-component/my-new-component.component';
```

### Adding New Services

1. **Create Service**
```typescript
@Injectable({
  providedIn: 'root'
})
export class MyNewCategoryService {
  constructor(
    private categoryHttp: CategoryHttpService,
    private categoryState: CategoryStateService
  ) {}

  // Service methods...
}
```

2. **Register Dependencies**
```typescript
// In app.config.ts or module providers
providers: [
  MyNewCategoryService,
  // Other providers...
]
```

### Adding Custom Validators

```typescript
export class CategoryValidators {
  static uniqueName(categoryService: CategoryHttpService, establishmentId: number, excludeId?: number) {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return categoryService.validateCategoryName(establishmentId, control.value, excludeId).pipe(
        map(isUnique => isUnique ? null : { nameExists: true }),
        catchError(() => of(null))
      );
    };
  }

  static categoryDescription(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    if (value.length > 500) {
      return { maxLength: { actualLength: value.length, maxLength: 500 } };
    }

    return null;
  }
}
```

### Adding Custom Directives

```typescript
@Directive({
  selector: '[appCategoryAccessibility]',
  standalone: true
})
export class CategoryAccessibilityDirective implements OnInit {
  @Input() categoryRole: string = 'button';
  @Input() categoryLabel: string = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.renderer.setAttribute(this.el.nativeElement, 'role', this.categoryRole);
    this.renderer.setAttribute(this.el.nativeElement, 'aria-label', this.categoryLabel);
    this.renderer.setAttribute(this.el.nativeElement, 'tabindex', '0');
  }
}
```

## Custom Components

### Creating Reusable Components

1. **Define Component Interface**
```typescript
export interface CategoryComponentConfig {
  showActions?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  customActions?: CategoryAction[];
}

export interface CategoryAction {
  label: string;
  icon: string;
  handler: (category: Category) => void;
  disabled?: (category: Category) => boolean;
}
```

2. **Implement Configurable Component**
```typescript
@Component({
  selector: 'app-configurable-category-card',
  template: `
    <div class="category-card" [attr.data-category-id]="category.id">
      <div class="category-content">
        <h3>{{ category.nome }}</h3>
        <p>{{ category.descricao }}</p>
      </div>
      
      <div class="category-actions" *ngIf="config.showActions">
        <button 
          *ngFor="let action of availableActions"
          [disabled]="action.disabled?.(category)"
          (click)="action.handler(category)"
          class="action-btn">
          <i [class]="action.icon"></i>
          {{ action.label }}
        </button>
      </div>
    </div>
  `
})
export class ConfigurableCategoryCardComponent {
  @Input() category!: Category;
  @Input() config: CategoryComponentConfig = {};

  get availableActions(): CategoryAction[] {
    const defaultActions: CategoryAction[] = [];
    
    if (this.config.allowEdit) {
      defaultActions.push({
        label: 'Editar',
        icon: 'fas fa-edit',
        handler: (category) => this.onEdit(category)
      });
    }

    if (this.config.allowDelete) {
      defaultActions.push({
        label: 'Excluir',
        icon: 'fas fa-trash',
        handler: (category) => this.onDelete(category),
        disabled: (category) => category.produtosCount > 0
      });
    }

    return [...defaultActions, ...(this.config.customActions || [])];
  }
}
```

### Component Composition

```typescript
@Component({
  selector: 'app-category-management-dashboard',
  template: `
    <div class="dashboard-container">
      <app-category-filters 
        (filtersChange)="onFiltersChange($event)">
      </app-category-filters>
      
      <app-category-list 
        [categories]="filteredCategories$ | async"
        [loading]="loading$ | async"
        (categorySelect)="onCategorySelect($event)">
      </app-category-list>
      
      <app-category-detail 
        *ngIf="selectedCategory$ | async as category"
        [category]="category"
        (categoryUpdate)="onCategoryUpdate($event)">
      </app-category-detail>
    </div>
  `
})
export class CategoryManagementDashboardComponent {
  // Component composition logic
}
```

## API Integration

### HTTP Interceptors

```typescript
@Injectable()
export class CategoryEstablishmentInterceptor implements HttpInterceptor {
  constructor(private establishmentService: EstablishmentService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.includes('/api/categorias/estabelecimentos/')) {
      const establishmentId = this.establishmentService.getSelectedEstablishmentId();
      
      if (!establishmentId) {
        return throwError(() => new Error('No establishment selected'));
      }

      // Validate establishment ID in URL matches selected establishment
      const urlEstablishmentId = this.extractEstablishmentId(req.url);
      if (urlEstablishmentId !== establishmentId) {
        return throwError(() => new Error('Establishment mismatch'));
      }
    }

    return next.handle(req);
  }

  private extractEstablishmentId(url: string): number | null {
    const match = url.match(/\/estabelecimentos\/(\d+)\//);
    return match ? parseInt(match[1], 10) : null;
  }
}
```

### Error Handling

```typescript
@Injectable()
export class CategoryErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const categoryError = this.mapHttpErrorToCategoryError(error);
        return throwError(() => categoryError);
      })
    );
  }

  private mapHttpErrorToCategoryError(error: HttpErrorResponse): CategoryError {
    switch (error.status) {
      case 404:
        return new CategoryNotFoundError(error.error?.categoryId);
      case 403:
        return new CategoryAccessDeniedError();
      case 409:
        return new CategoryConflictError(error.error?.message);
      default:
        return new CategoryError('Erro interno do servidor', 'INTERNAL_ERROR', error.status);
    }
  }
}
```

## Testing Guidelines

### Unit Testing

```typescript
describe('CategoryService', () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;
  let categoryState: jasmine.SpyObj<CategoryStateService>;

  beforeEach(() => {
    const stateSpy = jasmine.createSpyObj('CategoryStateService', ['addCategory', 'updateCategory']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryService,
        { provide: CategoryStateService, useValue: stateSpy }
      ]
    });

    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
    categoryState = TestBed.inject(CategoryStateService) as jasmine.SpyObj<CategoryStateService>;
  });

  it('should create category and update state', () => {
    const establishmentId = 1;
    const request: CreateCategoryRequest = {
      nome: 'Test Category',
      descricao: 'Test Description'
    };
    const mockResponse: Category = {
      id: 1,
      ...request,
      estabelecimentoId,
      ativo: true,
      dataCriacao: new Date(),
      dataAtualizacao: new Date()
    };

    service.createCategory(establishmentId, request).subscribe(category => {
      expect(category).toEqual(mockResponse);
      expect(categoryState.addCategory).toHaveBeenCalledWith(mockResponse);
    });

    const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${establishmentId}/categorias`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });
});
```

### Integration Testing

```typescript
describe('CategoryListComponent Integration', () => {
  let component: CategoryListComponent;
  let fixture: ComponentFixture<CategoryListComponent>;
  let categoryService: CategoryService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryListComponent, HttpClientTestingModule],
      providers: [CategoryService, CategoryStateService]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryListComponent);
    component = fixture.componentInstance;
    categoryService = TestBed.inject(CategoryService);
  });

  it('should display categories when loaded', fakeAsync(() => {
    const mockCategories: Category[] = [
      { id: 1, nome: 'Category 1', descricao: 'Description 1', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() }
    ];

    spyOn(categoryService, 'getCategories').and.returnValue(of({ categorias: mockCategories, total: 1 }));

    component.ngOnInit();
    tick();
    fixture.detectChanges();

    const categoryElements = fixture.debugElement.queryAll(By.css('.category-card'));
    expect(categoryElements.length).toBe(1);
    expect(categoryElements[0].nativeElement.textContent).toContain('Category 1');
  }));
});
```

### E2E Testing

```typescript
// In category-crud.e2e.spec.ts
describe('Category CRUD Operations', () => {
  beforeEach(async () => {
    await page.goto('/categories');
    await page.waitForSelector('[data-testid="category-list"]');
  });

  test('should create, edit, and delete category', async () => {
    // Create category
    await page.click('[data-testid="create-category-btn"]');
    await page.fill('[data-testid="category-name-input"]', 'Test Category');
    await page.fill('[data-testid="category-description-input"]', 'Test Description');
    await page.click('[data-testid="submit-btn"]');
    
    await expect(page.locator('[data-testid="category-list"]')).toContainText('Test Category');

    // Edit category
    await page.click('[data-testid="edit-category-btn"]');
    await page.fill('[data-testid="category-name-input"]', 'Updated Category');
    await page.click('[data-testid="submit-btn"]');
    
    await expect(page.locator('[data-testid="category-list"]')).toContainText('Updated Category');

    // Delete category
    await page.click('[data-testid="delete-category-btn"]');
    await page.click('[data-testid="confirm-delete-btn"]');
    
    await expect(page.locator('[data-testid="category-list"]')).not.toContainText('Updated Category');
  });
});
```

## Performance Optimization

### Lazy Loading

```typescript
// In categories.routes.ts
export const CATEGORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/category-list-page/category-list-page.component')
      .then(m => m.CategoryListPageComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/category-create-page/category-create-page.component')
      .then(m => m.CategoryCreatePageComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/category-edit-page/category-edit-page.component')
      .then(m => m.CategoryEditPageComponent)
  }
];
```

### Virtual Scrolling

```typescript
@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="100" class="category-viewport">
      <app-category-card 
        *cdkVirtualFor="let category of categories; trackBy: trackByCategory"
        [category]="category">
      </app-category-card>
    </cdk-virtual-scroll-viewport>
  `
})
export class VirtualCategoryListComponent {
  @Input() categories: Category[] = [];

  trackByCategory(index: number, category: Category): number {
    return category.id;
  }
}
```

### OnPush Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class OptimizedCategoryComponent {
  @Input() category!: Category;
  
  // Use signals for reactive updates
  private categorySignal = signal<Category | null>(null);
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['category']) {
      this.categorySignal.set(changes['category'].currentValue);
    }
  }
}
```

## Security Considerations

### Input Sanitization

```typescript
@Injectable()
export class CategorySanitizationService {
  sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .substring(0, 500);
  }

  sanitizeCategoryRequest(request: CreateCategoryRequest | UpdateCategoryRequest): typeof request {
    return {
      ...request,
      nome: this.sanitizeInput(request.nome),
      descricao: this.sanitizeInput(request.descricao || '')
    };
  }
}
```

### CSRF Protection

```typescript
@Injectable()
export class CategoryCSRFInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isCategoryMutationRequest(req)) {
      const csrfToken = this.getCSRFToken();
      const csrfReq = req.clone({
        setHeaders: {
          'X-CSRF-Token': csrfToken
        }
      });
      return next.handle(csrfReq);
    }
    return next.handle(req);
  }

  private isCategoryMutationRequest(req: HttpRequest<any>): boolean {
    return req.url.includes('/api/categorias/') && 
           ['POST', 'PUT', 'DELETE'].includes(req.method);
  }

  private getCSRFToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  }
}
```

## Deployment

### Build Configuration

```typescript
// In angular.json
{
  "projects": {
    "app-rapidex": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "optimization": true,
              "outputHashing": "all",
              "sourceMap": false,
              "namedChunks": false,
              "extractLicenses": true,
              "vendorChunk": false,
              "buildOptimizer": true,
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "2mb",
                  "maximumError": "5mb"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "6kb",
                  "maximumError": "10kb"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

### Environment Configuration

```typescript
// In environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.rapidex.com',
  categoryConfig: {
    cacheTimeout: 300000, // 5 minutes
    maxCategoriesPerPage: 50,
    enableOfflineMode: true,
    enableAnalytics: true
  }
};
```

### Service Worker Configuration

```typescript
// In category-sw.js
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/categorias/')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          // Serve from cache
          return response;
        }
        
        // Fetch from network and cache
        return fetch(event.request).then(response => {
          const responseClone = response.clone();
          caches.open('category-cache-v1').then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
  }
});
```

---

This developer guide provides comprehensive information for extending and maintaining the Category Management system. For specific implementation questions, refer to the inline code documentation or contact the development team.