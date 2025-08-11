import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Estabelecimento } from '../../../data-access/models/estabelecimento.models';
import { EstabelecimentoCardComponent } from '../estabelecimento-card/estabelecimento-card';
import { LoadingSpinnerComponent } from '../loading/loading';
import { ErrorMessageComponent } from '../error-message/error-message';

@Component({
  selector: 'app-estabelecimento-selector',
  standalone: true,
  imports: [
    CommonModule,
    EstabelecimentoCardComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent
  ],
  templateUrl: './estabelecimento-selector.html',
  styleUrls: ['./estabelecimento-selector.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EstabelecimentoSelectorComponent {
  @Input() estabelecimentos: Estabelecimento[] = [];
  @Input() selectedEstabelecimento: Estabelecimento | null = null;
  @Input() isLoading: boolean = false;
  @Input() error: string | null = null;
  @Input() viewMode: 'grid' | 'list' = 'grid';

  @Output() estabelecimentoSelected = new EventEmitter<Estabelecimento>();
  @Output() viewDetails = new EventEmitter<Estabelecimento>();
  @Output() retry = new EventEmitter<void>(); // Deprecated for always-online app
  @Output() confirmSelection = new EventEmitter<Estabelecimento>();

  private focusedIndex: number = 0;

  onEstabelecimentoSelect(estabelecimento: Estabelecimento): void {
    this.estabelecimentoSelected.emit(estabelecimento);
  }

  onViewDetails(estabelecimento: Estabelecimento): void {
    this.viewDetails.emit(estabelecimento);
  }

  onRetry(): void {
    // Always-online app: suggest page reload for network issues
    if (this.error?.includes('conexão') || this.error?.includes('internet')) {
      window.location.reload();
    } else {
      this.retry.emit();
    }
  }

  onConfirmSelection(): void {
    if (this.selectedEstabelecimento) {
      this.confirmSelection.emit(this.selectedEstabelecimento);
    }
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    // Reset focus when changing view mode
    this.focusedIndex = 0;
  }

  onCardFocus(index: number): void {
    this.focusedIndex = index;
  }

  onGridKeydown(event: KeyboardEvent): void {
    if (!this.hasEstabelecimentos) return;

    const totalItems = this.estabelecimentos.length;
    const colsPerRow = this.getColCount();
    let newIndex = this.focusedIndex;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        newIndex = this.viewMode === 'list' ? this.focusedIndex : Math.min(this.focusedIndex + 1, totalItems - 1);
        break;
      
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = this.viewMode === 'list' ? this.focusedIndex : Math.max(this.focusedIndex - 1, 0);
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        if (this.viewMode === 'list') {
          newIndex = Math.min(this.focusedIndex + 1, totalItems - 1);
        } else {
          newIndex = Math.min(this.focusedIndex + colsPerRow, totalItems - 1);
        }
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        if (this.viewMode === 'list') {
          newIndex = Math.max(this.focusedIndex - 1, 0);
        } else {
          newIndex = Math.max(this.focusedIndex - colsPerRow, 0);
        }
        break;
      
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      
      case 'End':
        event.preventDefault();
        newIndex = totalItems - 1;
        break;
      
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.estabelecimentos[this.focusedIndex]) {
          this.onEstabelecimentoSelect(this.estabelecimentos[this.focusedIndex]);
        }
        break;
    }

    if (newIndex !== this.focusedIndex) {
      this.focusedIndex = newIndex;
      this.focusCard(newIndex);
    }
  }

  private focusCard(index: number): void {
    const cards = document.querySelectorAll('.estabelecimento-selector__card');
    const targetCard = cards[index] as HTMLElement;
    if (targetCard) {
      targetCard.focus();
    }
  }

  getCardTabIndex(index: number): number {
    return index === this.focusedIndex ? 0 : -1;
  }

  getRowCount(): number {
    if (this.viewMode === 'list') {
      return this.estabelecimentos.length;
    }
    const colsPerRow = this.getColCount();
    return Math.ceil(this.estabelecimentos.length / colsPerRow);
  }

  getColCount(): number {
    if (this.viewMode === 'list') {
      return 1;
    }
    // Default grid columns based on responsive design
    // This should match the CSS grid-template-columns
    return 3; // Default for desktop, could be made responsive
  }

  getRowIndex(index: number): number {
    if (this.viewMode === 'list') {
      return index + 1;
    }
    const colsPerRow = this.getColCount();
    return Math.floor(index / colsPerRow) + 1;
  }

  getColIndex(index: number): number {
    if (this.viewMode === 'list') {
      return 1;
    }
    const colsPerRow = this.getColCount();
    return (index % colsPerRow) + 1;
  }

  isSelected(estabelecimento: Estabelecimento): boolean {
    return this.selectedEstabelecimento?.id === estabelecimento.id;
  }

  trackByEstabelecimento(index: number, estabelecimento: Estabelecimento): number {
    return estabelecimento.id;
  }

  get hasEstabelecimentos(): boolean {
    return this.estabelecimentos && this.estabelecimentos.length > 0;
  }

  get showEmptyState(): boolean {
    return !this.isLoading && !this.error && !this.hasEstabelecimentos;
  }

  get showError(): boolean {
    return !this.isLoading && !!this.error;
  }

  get showContent(): boolean {
    return !this.isLoading && !this.error && this.hasEstabelecimentos;
  }
}