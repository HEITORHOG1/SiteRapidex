import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Category, ProductSummary } from '../../models/category.models';
import { CategoryDetailResponse } from '../../models/category-dto.models';
import { CategoryHttpService } from '../../services/category-http.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-detail.component.html',
  styleUrls: ['./category-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryDetailComponent implements OnInit, OnDestroy {
  @Input() categoryId!: number;
  @Input() showActions: boolean = true;
  @Input() showBreadcrumb: boolean = true;
  @Input() printMode: boolean = false;

  @Output() edit = new EventEmitter<Category>();
  @Output() delete = new EventEmitter<Category>();
  @Output() back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // Signals for reactive state management
  category = signal<Category | null>(null);
  products = signal<ProductSummary[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed values
  isActive = computed(() => this.category()?.ativo ?? false);
  hasProducts = computed(() => this.products().length > 0);
  productCount = computed(() => this.products().length);
  canDelete = computed(() => !this.hasProducts());
  
  // Formatted dates
  createdDate = computed(() => {
    const category = this.category();
    return category ? this.formatDate(category.dataCriacao) : '';
  });
  
  updatedDate = computed(() => {
    const category = this.category();
    return category ? this.formatDate(category.dataAtualizacao) : '';
  });

  constructor(
    private categoryService: CategoryHttpService,
    private estabelecimentoService: EstabelecimentoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.categoryId) {
      this.loadCategoryDetail();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads category detail with related products
   */
  loadCategoryDetail(): void {
    const estabelecimento = this.estabelecimentoService.getSelectedEstabelecimento();
    
    if (!estabelecimento) {
      this.error.set('Nenhum estabelecimento selecionado');
      return;
    }

    const estabelecimentoId = estabelecimento.id;

    this.loading.set(true);
    this.error.set(null);

    this.categoryService.getCategoryDetail(estabelecimentoId, this.categoryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: CategoryDetailResponse) => {
          this.category.set(response.categoria);
          this.products.set(response.produtos || []);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Erro ao carregar detalhes da categoria');
          this.loading.set(false);
        }
      });
  }

  /**
   * Handles edit action
   */
  onEdit(): void {
    const category = this.category();
    if (category && this.showActions) {
      this.edit.emit(category);
    }
  }

  /**
   * Handles delete action
   */
  onDelete(): void {
    const category = this.category();
    if (category && this.showActions && this.canDelete()) {
      this.delete.emit(category);
    }
  }

  /**
   * Handles back navigation
   */
  onBack(): void {
    this.back.emit();
  }

  /**
   * Navigates to category list
   */
  navigateToList(): void {
    this.router.navigate(['/categories/list']);
  }

  /**
   * Navigates to edit page
   */
  navigateToEdit(): void {
    const category = this.category();
    if (category) {
      this.router.navigate(['/categories/edit', category.id]);
    }
  }

  /**
   * Handles retry action for error states
   */
  onRetry(): void {
    this.loadCategoryDetail();
  }

  /**
   * Handles print action
   */
  onPrint(): void {
    window.print();
  }

  /**
   * Formats date for display
   */
  private formatDate(date: Date): string {
    if (!date) return '';
    
    const categoryDate = new Date(date);
    return categoryDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Gets status text for display
   */
  getStatusText(): string {
    return this.isActive() ? 'Ativa' : 'Inativa';
  }

  /**
   * Gets status CSS class
   */
  getStatusClass(): string {
    return this.isActive() ? 'status--active' : 'status--inactive';
  }

  /**
   * Gets product count text
   */
  getProductCountText(): string {
    const count = this.productCount();
    if (count === 0) {
      return 'Nenhum produto cadastrado';
    } else if (count === 1) {
      return '1 produto cadastrado';
    } else {
      return `${count} produtos cadastrados`;
    }
  }

  /**
   * Gets ARIA label for the component
   */
  getAriaLabel(): string {
    const category = this.category();
    if (!category) return 'Carregando detalhes da categoria...';

    const parts = [
      `Detalhes da categoria ${category.nome}`,
      `Status: ${this.getStatusText()}`,
      this.getProductCountText()
    ];

    if (category.descricao) {
      parts.push(`Descrição: ${category.descricao}`);
    }

    return parts.join(', ');
  }

  /**
   * TrackBy function for products list
   */
  trackByProduct(index: number, product: ProductSummary): number {
    return product.id;
  }

  /**
   * Gets current date formatted for print footer
   */
  getCurrentDate(): string {
    return new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}