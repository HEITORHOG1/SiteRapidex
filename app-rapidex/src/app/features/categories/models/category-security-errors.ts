/**
 * Category security error codes
 */
export enum CategorySecurityErrorCode {
  ESTABLISHMENT_ACCESS_DENIED = 'ESTABLISHMENT_ACCESS_DENIED',
  CATEGORY_ACCESS_DENIED = 'CATEGORY_ACCESS_DENIED',
  INVALID_ESTABLISHMENT_CONTEXT = 'INVALID_ESTABLISHMENT_CONTEXT',
  USER_NOT_PROPRIETARIO = 'USER_NOT_PROPRIETARIO',
  ESTABLISHMENT_MISMATCH = 'ESTABLISHMENT_MISMATCH',
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  INVALID_CATEGORY_OPERATION = 'INVALID_CATEGORY_OPERATION',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION'
}

/**
 * Global gtag function declaration for analytics
 */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Category security error class
 */
export class CategorySecurityError extends Error {
  public readonly code: CategorySecurityErrorCode;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly userAgent?: string;
  public readonly url?: string;

  constructor(
    message: string,
    code: CategorySecurityErrorCode,
    details?: any
  ) {
    super(message);
    this.name = 'CategorySecurityError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
    this.url = typeof window !== 'undefined' ? window.location.href : undefined;
  }

  /**
   * Convert error to JSON for logging/transmission
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      userAgent: this.userAgent,
      url: this.url,
      stack: this.stack
    };
  }

  /**
   * Create error for establishment access denied
   */
  static establishmentAccessDenied(
    requestedEstablishmentId: string | number,
    selectedEstablishmentId?: string | number
  ): CategorySecurityError {
    return new CategorySecurityError(
      'Acesso negado ao estabelecimento solicitado',
      CategorySecurityErrorCode.ESTABLISHMENT_ACCESS_DENIED,
      { requestedEstablishmentId, selectedEstablishmentId }
    );
  }

  /**
   * Create error for category access denied
   */
  static categoryAccessDenied(
    categoryId: number,
    estabelecimentoId?: number
  ): CategorySecurityError {
    return new CategorySecurityError(
      'Acesso negado à categoria solicitada',
      CategorySecurityErrorCode.CATEGORY_ACCESS_DENIED,
      { categoryId, estabelecimentoId }
    );
  }

  /**
   * Create error for invalid establishment context
   */
  static invalidEstablishmentContext(details?: any): CategorySecurityError {
    return new CategorySecurityError(
      'Contexto de estabelecimento inválido ou ausente',
      CategorySecurityErrorCode.INVALID_ESTABLISHMENT_CONTEXT,
      details
    );
  }

  /**
   * Create error for user not being proprietario
   */
  static userNotProprietario(userId?: string): CategorySecurityError {
    return new CategorySecurityError(
      'Usuário não possui privilégios de proprietário',
      CategorySecurityErrorCode.USER_NOT_PROPRIETARIO,
      { userId }
    );
  }

  /**
   * Create error for establishment mismatch
   */
  static establishmentMismatch(
    expectedId: string | number,
    actualId: string | number
  ): CategorySecurityError {
    return new CategorySecurityError(
      'Estabelecimento na URL não corresponde ao estabelecimento selecionado',
      CategorySecurityErrorCode.ESTABLISHMENT_MISMATCH,
      { expectedId, actualId }
    );
  }

  /**
   * Create error for category not found
   */
  static categoryNotFound(categoryId: number, estabelecimentoId?: number): CategorySecurityError {
    return new CategorySecurityError(
      'Categoria não encontrada',
      CategorySecurityErrorCode.CATEGORY_NOT_FOUND,
      { categoryId, estabelecimentoId }
    );
  }

  /**
   * Create error for invalid category operation
   */
  static invalidCategoryOperation(
    operation: string,
    categoryId?: number,
    reason?: string
  ): CategorySecurityError {
    return new CategorySecurityError(
      `Operação '${operation}' não permitida na categoria${reason ? ': ' + reason : ''}`,
      CategorySecurityErrorCode.INVALID_CATEGORY_OPERATION,
      { operation, categoryId, reason }
    );
  }

  /**
   * Create generic security violation error
   */
  static securityViolation(message: string, details?: any): CategorySecurityError {
    return new CategorySecurityError(
      message,
      CategorySecurityErrorCode.SECURITY_VIOLATION,
      details
    );
  }
}

/**
 * Security violation event for monitoring
 */
export interface SecurityViolationEvent {
  error: CategorySecurityError;
  userId?: string;
  establishmentId?: string | number;
  categoryId?: number;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  url?: string;
  additionalContext?: any;
}

/**
 * Security violation logger interface
 */
export interface CategorySecurityLogger {
  logViolation(event: SecurityViolationEvent): void;
  logAccess(userId: string, action: string, resourceId?: string | number): void;
  logSuccess(userId: string, action: string, resourceId?: string | number): void;
}

/**
 * Default security logger implementation
 */
export class DefaultCategorySecurityLogger implements CategorySecurityLogger {
  logViolation(event: SecurityViolationEvent): void {
    console.error('🚨 Security Violation Detected:', {
      ...event,
      severity: 'HIGH'
    });

    // In production, this would send to a security monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'security_violation', {
        event_category: 'security',
        event_label: event.error.code,
        value: 1
      });
    }
  }

  logAccess(userId: string, action: string, resourceId?: string | number): void {
    console.log('🔒 Security Access Check:', {
      userId,
      action,
      resourceId,
      timestamp: new Date().toISOString()
    });
  }

  logSuccess(userId: string, action: string, resourceId?: string | number): void {
    console.log('✅ Security Access Granted:', {
      userId,
      action,
      resourceId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  isValid: boolean;
  error?: CategorySecurityError;
  warningMessage?: string;
  userId?: string;
  establishmentId?: string | number;
  categoryId?: number;
}

/**
 * Security context for category operations
 */
export interface CategorySecurityContext {
  userId: string;
  userRoles: string[];
  establishmentId: number;
  selectedEstablishment?: any;
  requestedCategoryId?: number;
  operation: string;
  timestamp: Date;
}
