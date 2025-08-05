import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Estabelecimento } from '../models/estabelecimento.models';
import { ApiConfigService } from '../../core/services/api-config.service';

@Injectable({
  providedIn: 'root'
})
export class EstabelecimentoApi {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfigService);

  /**
   * Busca todos os estabelecimentos de um proprietário
   */
  getEstabelecimentosByProprietario(proprietarioId: string): Observable<Estabelecimento[]> {
    const endpoint = this.apiConfig.getConfiguredEndpoint('estabelecimento', 'byProprietario', { userId: proprietarioId });
    return this.http.get<Estabelecimento[]>(endpoint);
  }

  /**
   * Busca um estabelecimento específico por ID
   */
  getEstabelecimentoById(id: string): Observable<Estabelecimento> {
    const endpoint = this.apiConfig.getConfiguredEndpoint('estabelecimento', 'byId', { id });
    return this.http.get<Estabelecimento>(endpoint);
  }

}
