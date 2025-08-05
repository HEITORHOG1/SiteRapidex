import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, throwError, tap } from 'rxjs';
import { Estabelecimento } from '@data-access/models/estabelecimento.models';
import { EstabelecimentoApi } from '@data-access/api/estabelecimento.api';

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

  // Loading states
  private loadingEstabelecimentosSubject = new BehaviorSubject<boolean>(false);
  public readonly loadingEstabelecimentos$ = this.loadingEstabelecimentosSubject.asObservable();

  /**
   * Carrega estabelecimentos e atualiza o estado
   */
  loadEstabelecimentosForProprietario(proprietarioId: string): Observable<Estabelecimento[]> {
    this.loadingEstabelecimentosSubject.next(true);
    
    return this.api.getEstabelecimentosByProprietario(proprietarioId).pipe(
      tap(estabelecimentos => {
        this.estabelecimentosSubject.next(estabelecimentos);
        this.loadingEstabelecimentosSubject.next(false);
        
        // Se não há estabelecimento selecionado e existe pelo menos um, seleciona o primeiro
        if (!this.selectedEstabelecimentoSubject.value && estabelecimentos.length > 0) {
          this.selectEstabelecimento(estabelecimentos[0]);
        }
      }),
      catchError(error => {
        this.loadingEstabelecimentosSubject.next(false);
        console.error('Erro ao carregar estabelecimentos:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Busca um estabelecimento específico por ID
   */
  getEstabelecimentoById(id: string): Observable<Estabelecimento> {
    return this.api.getEstabelecimentoById(id);
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
}