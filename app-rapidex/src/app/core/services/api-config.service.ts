import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ApiEndpoints {
  auth: {
    login: string;
    refreshToken: string;
  };
  estabelecimento: {
    byProprietario: string;
    byId: string;
  };
  categoria: {
    list: string;
    detail: string;
    create: string;
    update: string;
    delete: string;
    validate: string;
    deletionValidation: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  private config = {
    ...environment,
    endpoints: {
      auth: {
        login: '/Auth/login',
        refreshToken: '/Auth/refresh-token'
      },
      estabelecimento: {
        byProprietario: '/Estabelecimento/proprietario/{userId}',
        byId: '/Estabelecimento/{id}'
      },
      categoria: {
        list: '/categorias/estabelecimentos/{estabelecimentoId}/categorias',
        detail: '/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}',
        create: '/categorias/estabelecimentos/{estabelecimentoId}/categorias',
        update: '/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}',
        delete: '/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}',
        validate: '/categorias/estabelecimentos/{estabelecimentoId}/categorias/validate-name',
        deletionValidation: '/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}/validate-deletion'
      }
    } as ApiEndpoints
  };

  /**
   * Gets the full URL for an endpoint path
   */
  getEndpoint(path: string, params?: Record<string, string>): string {
    let endpoint = this.config.apiUrl + path;
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        endpoint = endpoint.replace(`{${key}}`, value);
      });
    }
    
    return endpoint;
  }

  /**
   * Gets a specific endpoint from the configuration
   */
  getConfiguredEndpoint(category: keyof ApiEndpoints, endpoint: string, params?: Record<string, string>): string {
    const path = (this.config.endpoints[category] as any)[endpoint];
    if (!path) {
      throw new Error(`Endpoint ${endpoint} not found in category ${category}`);
    }
    return this.getEndpoint(path, params);
  }

  /**
   * Gets the base API URL
   */
  getBaseUrl(): string {
    return this.config.apiUrl;
  }

  /**
   * Gets all endpoints configuration
   */
  getEndpoints(): ApiEndpoints {
    return this.config.endpoints;
  }

  /**
   * Updates API configuration dynamically
   */
  updateApiConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }
}