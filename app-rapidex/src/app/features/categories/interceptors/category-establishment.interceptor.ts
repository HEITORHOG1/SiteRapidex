import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { ApiError, ErrorCodes } from '../../../data-access/models/auth.models';

/**
 * Interceptor to validate establishment context for category API requests
 * Ensures that category operations are performed within a valid establishment context
 */
export const categoryEstablishmentInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept category API requests
  if (!isCategoryApiRequest(req.url)) {
    return next(req);
  }

  const estabelecimentoService = inject(EstabelecimentoService);
  
  // Extract establishment ID from URL
  const estabelecimentoId = extractEstablishmentIdFromUrl(req.url);
  
  if (!estabelecimentoId) {
    console.error('Category API request without establishment ID:', req.url);
    return throwError(() => createEstablishmentValidationError('ID do estabelecimento não encontrado na URL'));
  }

  // Get currently selected establishment
  const selectedEstabelecimento = estabelecimentoService.getSelectedEstabelecimento();
  
  if (!selectedEstabelecimento) {
    console.error('No establishment selected for category operation');
    return throwError(() => createEstablishmentValidationError('Nenhum estabelecimento selecionado'));
  }

  // Validate that the establishment ID in the URL matches the selected establishment
  if (selectedEstabelecimento.id.toString() !== estabelecimentoId) {
    console.error('Establishment ID mismatch:', {
      urlEstablishmentId: estabelecimentoId,
      selectedEstablishmentId: selectedEstabelecimento.id
    });
    return throwError(() => createEstablishmentValidationError('Acesso negado: estabelecimento não autorizado'));
  }

  // Add establishment validation headers for additional security
  const modifiedReq = req.clone({
    setHeaders: {
      'X-Establishment-Id': estabelecimentoId,
      'X-Establishment-Name': selectedEstabelecimento.nomeFantasia
    }
  });

  return next(modifiedReq);
};

/**
 * Checks if the request is for category API endpoints
 */
function isCategoryApiRequest(url: string): boolean {
  return url.includes('/api/categorias/estabelecimentos/');
}

/**
 * Extracts establishment ID from category API URL
 * Expected format: /api/categorias/estabelecimentos/{estabelecimentoId}/categorias
 */
function extractEstablishmentIdFromUrl(url: string): string | null {
  const regex = /\/api\/categorias\/estabelecimentos\/(\d+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Creates an establishment validation error
 */
function createEstablishmentValidationError(message: string): ApiError {
  return {
    code: ErrorCodes.UNAUTHORIZED,
    message,
    details: {
      type: 'ESTABLISHMENT_VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    },
    timestamp: new Date()
  };
}