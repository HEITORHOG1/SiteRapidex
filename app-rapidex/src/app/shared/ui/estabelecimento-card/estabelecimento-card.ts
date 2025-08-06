import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Estabelecimento } from '../../../data-access/models/estabelecimento.models';

@Component({
  selector: 'app-estabelecimento-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estabelecimento-card.html',
  styleUrls: ['./estabelecimento-card.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EstabelecimentoCardComponent {
  @Input() estabelecimento!: Estabelecimento;
  @Input() isSelected: boolean = false;
  @Input() isLoading: boolean = false;
  @Input() tabIndex: number = 0;

  @Output() select = new EventEmitter<Estabelecimento>();
  @Output() viewDetails = new EventEmitter<Estabelecimento>();
  @Output() focus = new EventEmitter<void>();

  isFocused: boolean = false;

  onCardClick(): void {
    if (!this.isLoading) {
      this.select.emit(this.estabelecimento);
    }
  }

  onCardFocus(): void {
    this.isFocused = true;
    this.focus.emit();
  }

  onCardBlur(): void {
    this.isFocused = false;
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.isLoading) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.onCardClick();
        break;
      case 'd':
      case 'D':
        if (event.ctrlKey || event.metaKey) return; // Allow browser shortcuts
        event.preventDefault();
        this.onViewDetails(event);
        break;
    }
  }

  onViewDetails(event: Event): void {
    event.stopPropagation();
    if (!this.isLoading) {
      this.viewDetails.emit(this.estabelecimento);
    }
  }

  getAriaLabel(): string {
    if (this.isLoading) {
      return 'Carregando estabelecimento...';
    }

    const status = this.getStatusText();
    const parts = [
      `Estabelecimento ${this.estabelecimento.nomeFantasia}`,
      `Status: ${status}`,
      `Endereço: ${this.formatAddress()}`,
    ];

    if (this.estabelecimento.telefone) {
      parts.push(`Telefone: ${this.formatPhone()}`);
    }

    if (this.isSelected) {
      parts.push('Selecionado');
    }

    parts.push('Pressione Enter ou Espaço para selecionar, D para ver detalhes');

    return parts.join(', ');
  }

  getAriaDescribedBy(): string {
    const ids = [
      `info-${this.estabelecimento.id}`,
      `details-${this.estabelecimento.id}`,
      `meta-${this.estabelecimento.id}`
    ];

    if (this.estabelecimento.descricao) {
      ids.push(`desc-${this.estabelecimento.id}`);
    }

    return ids.join(' ');
  }

  getStatusText(): string {
    return this.estabelecimento?.status ? 'Ativo' : 'Inativo';
  }

  getStatusClass(): string {
    return this.estabelecimento?.status ? 'status--active' : 'status--inactive';
  }

  formatAddress(): string {
    if (!this.estabelecimento) return '';
    
    const { endereco, numero, cep } = this.estabelecimento;
    return `${endereco}, ${numero} - CEP: ${cep}`;
  }

  formatPhone(): string {
    if (!this.estabelecimento?.telefone) return '';
    
    const phone = this.estabelecimento.telefone.replace(/\D/g, '');
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    } else if (phone.length === 10) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    }
    return this.estabelecimento.telefone;
  }

  formatCnpj(): string {
    if (!this.estabelecimento?.cnpj) return '';
    
    const cnpj = this.estabelecimento.cnpj.replace(/\D/g, '');
    if (cnpj.length === 14) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
    }
    return this.estabelecimento.cnpj;
  }
}