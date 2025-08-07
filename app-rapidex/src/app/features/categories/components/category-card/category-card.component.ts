import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../models/category.models';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-card.component.html',
  styleUrls: ['./category-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryCardComponent {
  @Input() category!: Category;
  @Input() isLoading: boolean = false;
  @Input() tabIndex: number = 0;
  @Input() showActions: boolean = true;

  @Output() edit = new EventEmitter<Category>();
  @Output() delete = new EventEmitter<Category>();
  @Output() viewDetails = new EventEmitter<Category>();
  @Output() focus = new EventEmitter<void>();

  isFocused = signal(false);

  onCardClick(): void {
    if (!this.isLoading) {
      this.viewDetails.emit(this.category);
    }
  }

  onCardFocus(): void {
    this.isFocused.set(true);
    this.focus.emit();
  }

  onCardBlur(): void {
    this.isFocused.set(false);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.isLoading) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.onCardClick();
        break;
      case 'e':
      case 'E':
        if (event.ctrlKey || event.metaKey) return; // Allow browser shortcuts
        event.preventDefault();
        this.onEdit(event);
        break;
      case 'Delete':
      case 'Backspace':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.onDelete(event);
        }
        break;
    }
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    if (!this.isLoading && this.showActions) {
      this.edit.emit(this.category);
    }
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    if (!this.isLoading && this.showActions) {
      this.delete.emit(this.category);
    }
  }

  onViewDetails(event: Event): void {
    event.stopPropagation();
    if (!this.isLoading) {
      this.viewDetails.emit(this.category);
    }
  }

  getAriaLabel(): string {
    if (this.isLoading) {
      return 'Carregando categoria...';
    }

    const status = this.getStatusText();
    const parts = [
      `Categoria ${this.category.nome}`,
      `Status: ${status}`,
    ];

    if (this.category.descricao) {
      parts.push(`Descrição: ${this.category.descricao}`);
    }

    if (this.category.produtosCount !== undefined) {
      const produtoText = this.category.produtosCount === 1 ? 'produto' : 'produtos';
      parts.push(`${this.category.produtosCount} ${produtoText}`);
    }

    parts.push('Pressione Enter ou Espaço para ver detalhes');
    
    if (this.showActions) {
      parts.push('E para editar, Ctrl+Delete para excluir');
    }

    return parts.join(', ');
  }

  getAriaDescribedBy(): string {
    const ids = [
      `info-${this.category.id}`,
      `meta-${this.category.id}`
    ];

    if (this.category.descricao) {
      ids.push(`desc-${this.category.id}`);
    }

    return ids.join(' ');
  }

  getStatusText(): string {
    return this.category?.ativo ? 'Ativa' : 'Inativa';
  }

  getStatusClass(): string {
    return this.category?.ativo ? 'status--active' : 'status--inactive';
  }

  formatDate(date: Date): string {
    if (!date) return '';
    
    const now = new Date();
    const categoryDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - categoryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Hoje';
    } else if (diffDays === 2) {
      return 'Ontem';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} dias atrás`;
    } else {
      return categoryDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  getProdutoCountText(): string {
    if (this.category.produtosCount === undefined) return '';
    
    if (this.category.produtosCount === 0) {
      return 'Nenhum produto';
    } else if (this.category.produtosCount === 1) {
      return '1 produto';
    } else {
      return `${this.category.produtosCount} produtos`;
    }
  }

  /**
   * TrackBy function for performance optimization when used in lists
   */
  static trackByCategory(index: number, category: Category): number {
    return category.id;
  }
}