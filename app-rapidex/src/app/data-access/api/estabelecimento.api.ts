import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Estabelecimento, EstabelecimentoListParams } from '../models/estabelecimento.models';

@Injectable({
  providedIn: 'root'
})
export class EstabelecimentoService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/Estabelecimento`;
  
  // Estado reativo para o estabelecimento selecionado
  private selectedEstabelecimentoSubject = new BehaviorSubject<Estabelecimento | null>(null);
  public readonly selectedEstabelecimento$ = this.selectedEstabelecimentoSubject.asObservable();
  
  // Lista de estabelecimentos do proprietário
  private estabelecimentosSubject = new BehaviorSubject<Estabelecimento[]>([]);
  public readonly estabelecimentos$ = this.estabelecimentosSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Busca todos os estabelecimentos de um proprietário
   */
  getEstabelecimentosByProprietario(proprietarioId: string): Observable<Estabelecimento[]> {
    const url = `${this.apiUrl}/proprietario/${proprietarioId}`;
    
    return this.http.get<Estabelecimento[]>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Busca um estabelecimento específico por ID
   */
  getEstabelecimentoById(id: number): Observable<Estabelecimento> {
    const url = `${this.apiUrl}/${id}`;
    
    return this.http.get<Estabelecimento>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Carrega estabelecimentos e atualiza o estado
   */
  loadEstabelecimentosForProprietario(proprietarioId: string): Observable<Estabelecimento[]> {
    return new Observable(observer => {
      this.getEstabelecimentosByProprietario(proprietarioId).subscribe({
        next: (estabelecimentos) => {
          this.estabelecimentosSubject.next(estabelecimentos);
          
          // Se não há estabelecimento selecionado e existe pelo menos um, seleciona o primeiro
          if (!this.selectedEstabelecimentoSubject.value && estabelecimentos.length > 0) {
            this.selectEstabelecimento(estabelecimentos[0]);
          }
          
          observer.next(estabelecimentos);
          observer.complete();
        },
        error: (error) => {
          console.error('Erro ao carregar estabelecimentos:', error);
          observer.error(error);
        }
      });
    });
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
    localStorage.removeItem('selectedEstabelecimento');
  }

  /**
   * Obtém headers de autorização
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': '*/*',
      'Content-Type': 'application/json'
    });
  }

  /**
   * Trata erros de requisição
   */
  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'Erro desconhecido';
    
    if (error.error instanceof ErrorEvent) {
      // Erro do lado do cliente
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Erro do lado do servidor
      switch (error.status) {
        case 401:
          errorMessage = 'Não autorizado. Faça login novamente.';
          break;
        case 403:
          errorMessage = 'Acesso negado.';
          break;
        case 404:
          errorMessage = 'Estabelecimentos não encontrados.';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor.';
          break;
        default:
          errorMessage = `Erro ${error.status}: ${error.message}`;
      }
    }

    console.error('EstabelecimentoService Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  };
}
