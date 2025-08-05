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

  @Output() select = new EventEmitter<Estabelecimento>();
  @Output() viewDetails = new EventEmitter<Estabelecimento>();

  onCardClick(): void {
    if (!this.isLoading) {
      this.select.emit(this.estabelecimento);
    }
  }

  onViewDetails(event: Event): void {
    event.stopPropagation();
    if (!this.isLoading) {
      this.viewDetails.emit(this.estabelecimento);
    }
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