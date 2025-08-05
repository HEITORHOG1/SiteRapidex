import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, throwError, tap, retry, timer, finalize, of } from 'rxjs';
import { Estabelecimento } from '@data-access/models/estabelecimento.models';
import { EstabelecimentoApi } from '@data-access/api/estabelecimento.api';
import { ApiError, ErrorCodes, LoadingState, ErrorState } from '@data-access/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class EstabelecimentoService {
  private api = inject(EstabelecimentoApi);
  
  // Estado reativo para o estabelecimento selecionado
  private selectedEstabelecimentoSubject = new BehaviorSubject<Estabelecimento | null>(null);
  public readonly selectedEstabelecimento$ = this.selectedEstabelecimentoSubject.asObservable();
  
  // Lista de estabelecimentos do proprietário
  private estabelecimentosSubject = new BehaviorSubject<Estabelecimento[]>([]);
  public readonly estabelecimentos$ = this.estabelecimentosSubject.asObservable();

  // Enhanced loading states
  private loadingStateSubject = new BehaviorSubject<LoadingState>({ isLoading: false });
  public readonly loadingState$ = this.loadingStateSubject.asObservable();

  // Enhanced error states
  private errorStateSubject = new BehaviorSubject<ErrorState>({ hasError: false });
  public readonly errorState$ = this.errorStateSubject.asObservable();

  // Individual loading states for specific operations
  private loadingEstabelecimentosSubject = new BehaviorSubject<boolean>(false);
  public readonly loadingEstabelecimentos$ = this.loadingEstabelecimentosSubject.asObservable();

  private loadingEstabelecimentoByIdSubject = new BehaviorSubject<boolean>(false);
  public readonly loadingEstabelecimentoById$ = this.loadingEstabelecimentoByIdSubject.asObservable();

  /**
   * Carrega estabelecimentos e atualiza o estado com retry e error handling
   */
  loadEstabelecimentosForProprietario(proprietarioId: string, retryCount: number = 2): Observable<Estabelecimento[]> {
    this.setLoadingState(true, 'Carregando estabelecimentos...');
    this.clearErrorState();
    this.loadingEstabelecimentosSubject.next(true);
    
    return this.api.getEstabelecimentosByProprietario(proprietarioId).pipe(
      retry({
        count: retryCount,
        delay: (error, retryIndex) => {
          console.warn(`Tentativa ${retryIndex + 1} de carregar estabelecimentos falhou:`, error);
          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.pow(2, retryIndex) * 1000;
          return timer(delay);
        }
      }),
      tap(estabelecimentos => {
        this.estabelecimentosSubject.next(estabelecimentos);
        
        // Se não há estabelecimento selecionado e existe pelo menos um, seleciona o primeiro
        if (!this.selectedEstabelecimentoSubject.value && estabelecimentos.length > 0) {
          this.selectEstabelecimento(estabelecimentos[0]);
        }
        
        this.clearErrorState();
      }),
      catchError(error => {
        const apiError = this.mapToApiError(error, 'Erro ao carregar estabelecimentos');
        this.setErrorState(apiError);
        console.error('Erro ao carregar estabelecimentos após tentativas:', apiError);
        return throwError(() => apiError);
      }),
      finalize(() => {
        this.setLoadingState(false);
        this.loadingEstabelecimentosSubject.next(false);
      })
    );
  }

  /**
   * Busca um estabelecimento específico por ID com retry e error handling
   */
  getEstabelecimentoById(id: string, retryCount: number = 2): Observable<Estabelecimento> {
    this.loadingEstabelecimentoByIdSubject.next(true);
    this.clearErrorState();
    
    return this.api.getEstabelecimentoById(id).pipe(
      retry({
        count: retryCount,
        delay: (error, retryIndex) => {
          console.warn(`Tentativa ${retryIndex + 1} de carregar estabelecimento ${id} falhou:`, error);
          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.pow(2, retryIndex) * 1000;
          return timer(delay);
        }
      }),
      tap(() => {
        this.clearErrorState();
      }),
      catchError(error => {
        const apiError = this.mapToApiError(error, `Erro ao carregar estabelecimento ${id}`);
        this.setErrorState(apiError);
        console.error('Erro ao carregar estabelecimento por ID após tentativas:', apiError);
        return throwError(() => apiError);
      }),
      finalize(() => {
        this.loadingEstabelecimentoByIdSubject.next(false);
      })
    );
  }

  /**
   * Seleciona um estabelecimento específico
   */
  selectEstabelecimento(estabelecimento: Estabelecimento): void {
    this.selectedEstabelecimentoSubject.next(estabelecimento);
    
    // Salva no localStorage para persistir entre sessões
    localStorage.setItem('selectedEstabelecimento', JSON.stringify(estabelecimento));
  }

  /**
   * Obtém o estabelecimento selecionado atualmente
   */
  getSelectedEstabelecimento(): Estabelecimento | null {
    return this.selectedEstabelecimentoSubject.value;
  }

  /**
   * Carrega o estabelecimento selecionado do localStorage
   */
  loadSelectedEstabelecimentoFromStorage(): void {
    const stored = localStorage.getItem('selectedEstabelecimento');
    if (stored) {
      try {
        const estabelecimento = JSON.parse(stored) as Estabelecimento;
        this.selectedEstabelecimentoSubject.next(estabelecimento);
      } catch (error) {
        console.error('Erro ao carregar estabelecimento do localStorage:', error);
        localStorage.removeItem('selectedEstabelecimento');
      }
    }
  }

  /**
   * Limpa o estado dos estabelecimentos (útil no logout)
   */
  clearEstabelecimentos(): void {
    this.estabelecimentosSubject.next([]);
    this.selectedEstabelecimentoSubject.next(null);
    this.loadingEstabelecimentosSubject.next(false);
    this.loadingEstabelecimentoByIdSubject.next(false);
    this.clearLoadingState();
    this.clearErrorState();
    localStorage.removeItem('selectedEstabelecimento');
  }

  /**
   * Obtém a lista atual de estabelecimentos
   */
  getEstabelecimentos(): Estabelecimento[] {
    return this.estabelecimentosSubject.value;
  }

  /**
   * Verifica se está carregando estabelecimentos
   */
  isLoadingEstabelecimentos(): boolean {
    return this.loadingEstabelecimentosSubject.value;
  }

  /**
   * Verifica se está carregando estabelecimento por ID
   */
  isLoadingEstabelecimentoById(): boolean {
    return this.loadingEstabelecimentoByIdSubject.value;
  }

  /**
   * Obtém o estado de loading atual
   */
  getLoadingState(): LoadingState {
    return this.loadingStateSubject.value;
  }

  /**
   * Obtém o estado de erro atual
   */
  getErrorState(): ErrorState {
    return this.errorStateSubject.value;
  }

  /**
   * Retry para carregar estabelecimentos após erro
   */
  retryLoadEstabelecimentos(proprietarioId: string): Observable<Estabelecimento[]> {
    return this.loadEstabelecimentosForProprietario(proprietarioId);
  }

  /**
   * Retry para carregar estabelecimento por ID após erro
   */
  retryGetEstabelecimentoById(id: string): Observable<Estabelecimento> {
    return this.getEstabelecimentoById(id);
  }

  // Private helper methods for state management

  /**
   * Define o estado de loading
   */
  private setLoadingState(isLoading: boolean, message?: string): void {
    this.loadingStateSubject.next({ isLoading, message });
  }

  /**
   * Limpa o estado de loading
   */
  private clearLoadingState(): void {
    this.loadingStateSubject.next({ isLoading: false });
  }

  /**
   * Define o estado de erro
   */
  private setErrorState(error: ApiError): void {
    this.errorStateSubject.next({
      hasError: true,
      message: error.message,
      code: error.code
    });
  }

  /**
   * Limpa o estado de erro
   */
  private clearErrorState(): void {
    this.errorStateSubject.next({ hasError: false });
  }

  /**
   * Mapeia erros HTTP para ApiError
   */
  private mapToApiError(error: any, defaultMessage: string): ApiError {
    // Se já é um ApiError (vindo do interceptor), retorna como está
    if (error.code && error.message && error.timestamp) {
      return error as ApiError;
    }

    // Mapeia outros tipos de erro
    let code: ErrorCodes;
    let message: string;

    if (error.status === 0) {
      code = ErrorCodes.NETWORK_ERROR;
      message = 'Erro de conexão. Verifique sua internet.';
    } else if (error.status === 401 || error.status === 403) {
      code = ErrorCodes.UNAUTHORIZED;
      message = 'Não autorizado. Faça login novamente.';
    } else if (error.status === 400 || error.status === 422) {
      code = ErrorCodes.VALIDATION_ERROR;
      message = error.error?.message || 'Dados inválidos.';
    } else if (error.status >= 500) {
      code = ErrorCodes.SERVER_ERROR;
      message = 'Erro interno do servidor. Tente novamente.';
    } else {
      code = ErrorCodes.SERVER_ERROR;
      message = defaultMessage;
    }

    return {
      code,
      message,
      details: error.error || error,
      timestamp: new Date()
    };
  }
}