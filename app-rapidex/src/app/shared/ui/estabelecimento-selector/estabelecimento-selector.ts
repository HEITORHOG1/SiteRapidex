import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
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
  @Output() retry = new EventEmitter<void>();

  onEstabelecimentoSelect(estabelecimento: Estabelecimento): void {
    this.estabelecimentoSelected.emit(estabelecimento);
  }

  onViewDetails(estabelecimento: Estabelecimento): void {
    this.viewDetails.emit(estabelecimento);
  }

  onRetry(): void {
    this.retry.emit();
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