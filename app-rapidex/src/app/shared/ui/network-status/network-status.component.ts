import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NetworkStatusService } from '../../../core/services/network-status.service';

/**
 * Network Status Component for Always-Online Application
 * 
 * Shows a banner when the application is offline, informing users
 * that the app requires internet connection to function properly.
 */
@Component({
  selector: 'rx-network-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      *ngIf="networkStatusService.isOnline$ | async; else offlineBanner"
      class="network-status network-status--online"
      role="status"
      aria-live="polite"
    >
      <!-- Online - no banner needed for always-online app -->
    </div>
    
    <ng-template #offlineBanner>
      <div 
        class="network-status network-status--offline"
        role="alert"
        aria-live="assertive"
      >
        <div class="network-status__content">
          <svg 
            class="network-status__icon" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke-width="1.5" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          
          <div class="network-status__message">
            <strong>Sem conexão com a internet</strong>
            <p>Esta aplicação requer conexão para funcionar. Verifique sua conexão e recarregue a página.</p>
          </div>
          
          <button 
            type="button"
            class="network-status__button"
            (click)="reloadPage()"
            aria-label="Recarregar página"
          >
            <svg 
              class="network-status__button-icon" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke-width="1.5" 
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Recarregar
          </button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .network-status {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      transition: all 0.3s ease-in-out;
    }

    .network-status--offline {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: white;
      padding: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .network-status__content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      max-width: 1200px;
      margin: 0 auto;
      text-align: center;
    }

    .network-status__icon {
      width: 2rem;
      height: 2rem;
      flex-shrink: 0;
    }

    .network-status__message {
      flex: 1;
      min-width: 0;
    }

    .network-status__message strong {
      display: block;
      font-size: 1.1rem;
      margin-bottom: 0.25rem;
    }

    .network-status__message p {
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .network-status__button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.375rem;
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .network-status__button:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.4);
    }

    .network-status__button:focus {
      outline: 2px solid rgba(255, 255, 255, 0.5);
      outline-offset: 2px;
    }

    .network-status__button-icon {
      width: 1rem;
      height: 1rem;
    }

    @media (max-width: 768px) {
      .network-status__content {
        flex-direction: column;
        gap: 0.75rem;
        text-align: center;
      }

      .network-status__message {
        order: 1;
      }

      .network-status__icon {
        order: 0;
        width: 1.5rem;
        height: 1.5rem;
      }

      .network-status__button {
        order: 2;
        align-self: center;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkStatusComponent {
  networkStatusService = inject(NetworkStatusService);

  reloadPage(): void {
    window.location.reload();
  }
}