import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingSpinnerComponent } from '../loading/loading';
import { ErrorMessageComponent } from '../error-message/error-message';
import { EstabelecimentoCardComponent } from '../estabelecimento-card/estabelecimento-card';
import { NotificationService } from '../../services/notification.service';
import { Estabelecimento } from '../../../data-access/models/estabelecimento.models';

@Component({
  selector: 'rx-ui-demo',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, ErrorMessageComponent, EstabelecimentoCardComponent],
  template: `
    <div class="ui-demo">
      <h2>UI Components Demo</h2>
      
      <section class="demo-section">
        <h3>Loading Spinners</h3>
        <div class="demo-row">
          <div class="demo-item">
            <h4>Small</h4>
            <rx-loading-spinner size="small" message="Carregando..."></rx-loading-spinner>
          </div>
          <div class="demo-item">
            <h4>Medium</h4>
            <rx-loading-spinner size="medium" message="Processando dados..."></rx-loading-spinner>
          </div>
          <div class="demo-item">
            <h4>Large</h4>
            <rx-loading-spinner size="large" message="Sincronizando..."></rx-loading-spinner>
          </div>
        </div>
      </section>

      <section class="demo-section">
        <h3>Error Messages</h3>
        <div class="demo-column">
          <rx-error-message 
            type="error" 
            message="Erro ao carregar dados. Verifique sua conexão."
            [showRetry]="true"
            [dismissible]="true"
            (retry)="onRetry()"
            (dismiss)="onDismiss()">
          </rx-error-message>
          
          <rx-error-message 
            type="warning" 
            message="Alguns dados podem estar desatualizados."
            [dismissible]="true"
            (dismiss)="onDismiss()">
          </rx-error-message>
          
          <rx-error-message 
            type="info" 
            message="Nova versão disponível. Atualize para obter as últimas funcionalidades."
            [showRetry]="true"
            retryText="Atualizar"
            (retry)="onRetry()">
          </rx-error-message>
        </div>
      </section>

      <section class="demo-section">
        <h3>Estabelecimento Cards</h3>
        <div class="cards-grid">
          <app-estabelecimento-card
            [estabelecimento]="sampleEstabelecimento"
            [isSelected]="false"
            [isLoading]="false"
            (select)="onCardSelect($event)"
            (viewDetails)="onViewDetails($event)">
          </app-estabelecimento-card>
          
          <app-estabelecimento-card
            [estabelecimento]="sampleEstabelecimento2"
            [isSelected]="true"
            [isLoading]="false"
            (select)="onCardSelect($event)"
            (viewDetails)="onViewDetails($event)">
          </app-estabelecimento-card>
          
          <app-estabelecimento-card
            [estabelecimento]="sampleEstabelecimento"
            [isSelected]="false"
            [isLoading]="true"
            (select)="onCardSelect($event)"
            (viewDetails)="onViewDetails($event)">
          </app-estabelecimento-card>
        </div>
      </section>

      <section class="demo-section">
        <h3>Toast Notifications</h3>
        <div class="demo-row">
          <button (click)="showSuccess()" class="demo-button demo-button--success">
            Success Toast
          </button>
          <button (click)="showError()" class="demo-button demo-button--error">
            Error Toast
          </button>
          <button (click)="showWarning()" class="demo-button demo-button--warning">
            Warning Toast
          </button>
          <button (click)="showInfo()" class="demo-button demo-button--info">
            Info Toast
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .ui-demo {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .demo-section {
      margin-bottom: 3rem;
      padding: 1.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: white;
    }

    .demo-section h3 {
      margin-top: 0;
      color: #1e293b;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 0.5rem;
    }

    .demo-row {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .demo-column {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .demo-item {
      flex: 1;
      min-width: 200px;
      padding: 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      text-align: center;
    }

    .demo-item h4 {
      margin-top: 0;
      color: #475569;
    }

    .demo-button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      color: white;
    }

    .demo-button--success {
      background-color: #10b981;
    }

    .demo-button--success:hover {
      background-color: #059669;
    }

    .demo-button--error {
      background-color: #ef4444;
    }

    .demo-button--error:hover {
      background-color: #dc2626;
    }

    .demo-button--warning {
      background-color: #f59e0b;
    }

    .demo-button--warning:hover {
      background-color: #d97706;
    }

    .demo-button--info {
      background-color: #3b82f6;
    }

    .demo-button--info:hover {
      background-color: #2563eb;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 1rem;
    }

    @media (max-width: 768px) {
      .demo-row {
        flex-direction: column;
      }
      
      .ui-demo {
        padding: 1rem;
      }
      
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class UiDemoComponent {
  private notificationService = inject(NotificationService);

  sampleEstabelecimento: Estabelecimento = {
    id: 1,
    usuarioId: 'user-123',
    razaoSocial: 'Restaurante Bom Sabor LTDA',
    nomeFantasia: 'Bom Sabor',
    cnpj: '12345678000195',
    telefone: '11987654321',
    endereco: 'Rua das Flores, 123',
    status: true,
    cep: '01234567',
    numero: '123',
    dataCadastro: '2024-01-01T00:00:00Z',
    latitude: -23.5505,
    longitude: -46.6333,
    raioEntregaKm: 5,
    taxaEntregaFixa: 8.50,
    descricao: 'Restaurante especializado em comida brasileira com pratos tradicionais e ambiente acolhedor.'
  };

  sampleEstabelecimento2: Estabelecimento = {
    id: 2,
    usuarioId: 'user-123',
    razaoSocial: 'Pizzaria Italiana LTDA',
    nomeFantasia: 'Nonna\'s Pizza',
    cnpj: '98765432000156',
    telefone: '1134567890',
    endereco: 'Av. Paulista, 1000',
    status: false,
    cep: '01310100',
    numero: '1000',
    dataCadastro: '2024-02-01T00:00:00Z',
    latitude: -23.5618,
    longitude: -46.6565,
    raioEntregaKm: 8,
    taxaEntregaFixa: 12.00,
    descricao: 'Autêntica pizzaria italiana com receitas tradicionais da família.'
  };

  onRetry(): void {
    console.log('Retry clicked');
    this.notificationService.info('Tentando novamente...');
  }

  onDismiss(): void {
    console.log('Dismiss clicked');
  }

  showSuccess(): void {
    this.notificationService.success('Operação realizada com sucesso!');
  }

  showError(): void {
    this.notificationService.error('Erro ao processar solicitação', {
      action: {
        label: 'Tentar novamente',
        handler: () => {
          this.notificationService.info('Tentando novamente...');
        }
      }
    });
  }

  showWarning(): void {
    this.notificationService.warning('Atenção: alguns dados podem estar desatualizados');
  }

  showInfo(): void {
    this.notificationService.info('Nova funcionalidade disponível!', {
      action: {
        label: 'Ver mais',
        handler: () => {
          this.notificationService.success('Redirecionando...');
        }
      }
    });
  }

  onCardSelect(estabelecimento: Estabelecimento): void {
    console.log('Card selected:', estabelecimento);
    this.notificationService.success(`Estabelecimento "${estabelecimento.nomeFantasia}" selecionado!`);
  }

  onViewDetails(estabelecimento: Estabelecimento): void {
    console.log('View details:', estabelecimento);
    this.notificationService.info(`Visualizando detalhes de "${estabelecimento.nomeFantasia}"`);
  }
}