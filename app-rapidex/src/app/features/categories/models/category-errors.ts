import { ApiError, ErrorCodes } from '../../../data-access/models/auth.models';

/**
 * Base class for category-specific errors
 */
export class CategoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'CategoryError';
  }

  /**
   * Converts CategoryError to ApiError format
   */
  toApiError(): ApiError {
    return {
      code: this.mapToErrorCode(),
      message: this.message,
      details: this.details,
      timestamp: new Date()
    };
  }

  private mapToErrorCode(): ErrorCodes {
    switch (this.statusCode) {
      case 400:
      case 422:
        return ErrorCodes.VALIDATION_ERROR;
      case 401:
      case 403:
        return ErrorCodes.UNAUTHORIZED;
      case 0:
        return ErrorCodes.NETWORK_ERROR;
      default:
        return ErrorCodes.SERVER_ERROR;
    }
  }
}

/**
 * Error thrown when a category is not found
 */
export class CategoryNotFoundError extends CategoryError {
  constructor(categoryId: number, estabelecimentoId?: number) {
    const message = estabelecimentoId 
      ? `Categoria com ID ${categoryId} não encontrada no estabelecimento ${estabelecimentoId}`
      : `Categoria com ID ${categoryId} não encontrada`;
    
    super(message, 'CATEGORY_NOT_FOUND', 404, {
      categoryId,
      estabelecimentoId
    });
  }
}

/**
 * Error thrown when access to a category is denied
 */
export class CategoryAccessDeniedError extends CategoryError {
  constructor(categoryId?: number, estabelecimentoId?: number) {
    const message = categoryId 
      ? `Acesso negado à categoria ${categoryId}`
      : 'Acesso negado à categoria';
    
    super(message, 'CATEGORY_ACCESS_DENIED', 403, {
      categoryId,
      estabelecimentoId
    });
  }
}

/**
 * Error thrown when category validation fails
 */
export class CategoryValidationError extends CategoryError {
  constructor(field: string, message: string, value?: any) {
    super(`Erro de validação no campo ${field}: ${message}`, 'CATEGORY_VALIDATION_ERROR', 400, {
      field,
      value,
      validationMessage: message
    });
  }
}

/**
 * Error thrown when trying to create a category with duplicate name
 */
export class CategoryDuplicateNameError extends CategoryError {
  constructor(nome: string, estabelecimentoId: number) {
    super(
      `Já existe uma categoria com o nome "${nome}" neste estabelecimento`,
      'CATEGORY_DUPLICATE_NAME',
      409,
      {
        nome,
        estabelecimentoId
      }
    );
  }
}

/**
 * Error thrown when trying to delete a category that has associated products
 */
export class CategoryHasProductsError extends CategoryError {
  constructor(categoryId: number, productCount: number) {
    super(
      `Não é possível excluir a categoria pois ela possui ${productCount} produto(s) associado(s)`,
      'CATEGORY_HAS_PRODUCTS',
      409,
      {
        categoryId,
        productCount
      }
    );
  }
}

/**
 * Error thrown when establishment context is invalid
 */
export class CategoryEstablishmentContextError extends CategoryError {
  constructor(message: string = 'Contexto de estabelecimento inválido para operação de categoria') {
    super(message, 'CATEGORY_ESTABLISHMENT_CONTEXT_ERROR', 403);
  }
}

/**
 * Error thrown when category data sanitization fails
 */
export class CategorySanitizationError extends CategoryError {
  constructor(field: string, originalValue: string) {
    super(
      `Dados inválidos detectados no campo ${field}. Por favor, remova caracteres especiais ou scripts`,
      'CATEGORY_SANITIZATION_ERROR',
      400,
      {
        field,
        originalValue: originalValue.substring(0, 100) // Limit for security
      }
    );
  }
}

/**
 * Error thrown when category operation times out
 */
export class CategoryTimeoutError extends CategoryError {
  constructor(operation: string) {
    super(
      `Operação de categoria "${operation}" expirou. Tente novamente`,
      'CATEGORY_TIMEOUT_ERROR',
      408,
      {
        operation
      }
    );
  }
}

/**
 * Error thrown when category service is unavailable
 */
export class CategoryServiceUnavailableError extends CategoryError {
  constructor() {
    super(
      'Serviço de categorias temporariamente indisponível. Tente novamente em alguns minutos',
      'CATEGORY_SERVICE_UNAVAILABLE',
      503
    );
  }
}

/**
 * Utility class for creating category errors from HTTP responses
 */
export class CategoryErrorFactory {
  /**
   * Creates appropriate CategoryError from HTTP error response
   */
  static fromHttpError(error: any, defaultMessage: string = 'Erro na operação de categoria'): CategoryError {
    const status = error.status || 500;
    const errorBody = error.error || {};
    
    switch (status) {
      case 400:
        if (errorBody.field) {
          return new CategoryValidationError(errorBody.field, errorBody.message || defaultMessage, errorBody.value);
        }
        return new CategoryValidationError('unknown', errorBody.message || defaultMessage);
      
      case 401:
      case 403:
        return new CategoryAccessDeniedError(errorBody.categoryId, errorBody.estabelecimentoId);
      
      case 404:
        return new CategoryNotFoundError(errorBody.categoryId || 0, errorBody.estabelecimentoId);
      
      case 409:
        if (errorBody.code === 'DUPLICATE_NAME') {
          return new CategoryDuplicateNameError(errorBody.nome || '', errorBody.estabelecimentoId || 0);
        }
        if (errorBody.code === 'HAS_PRODUCTS') {
          return new CategoryHasProductsError(errorBody.categoryId || 0, errorBody.productCount || 0);
        }
        return new CategoryValidationError('conflict', errorBody.message || 'Conflito na operação');
      
      case 408:
        return new CategoryTimeoutError(errorBody.operation || 'unknown');
      
      case 503:
        return new CategoryServiceUnavailableError();
      
      case 0:
        return new CategoryError('Erro de conexão. Verifique sua internet', 'NETWORK_ERROR', 0);
      
      default:
        return new CategoryError(errorBody.message || defaultMessage, 'UNKNOWN_ERROR', status, errorBody);
    }
  }

  /**
   * Creates validation error for specific field
   */
  static createValidationError(field: string, message: string, value?: any): CategoryValidationError {
    return new CategoryValidationError(field, message, value);
  }

  /**
   * Creates establishment context error
   */
  static createEstablishmentContextError(message?: string): CategoryEstablishmentContextError {
    return new CategoryEstablishmentContextError(message);
  }
}