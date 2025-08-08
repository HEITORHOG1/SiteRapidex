import { Injectable, inject } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderEnabled: boolean;
  keyboardNavigationEnabled: boolean;
}

export interface FocusableElement {
  element: HTMLElement;
  tabIndex: number;
  ariaLabel?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryAccessibilityService {
  private liveAnnouncer = inject(LiveAnnouncer);
  
  private accessibilitySettings = new BehaviorSubject<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    screenReaderEnabled: false,
    keyboardNavigationEnabled: true
  });

  public accessibilitySettings$ = this.accessibilitySettings.asObservable();

  constructor() {
    this.detectAccessibilityPreferences();
  }

  /**
   * Announce actions to screen readers
   */
  announceAction(action: string, categoryName?: string, details?: string): void {
    const message = this.buildActionMessage(action, categoryName, details);
    this.liveAnnouncer.announce(message, 'polite');
  }

  /**
   * Announce urgent/error messages
   */
  announceError(error: string, context?: string): void {
    const message = context ? `${context}: ${error}` : error;
    this.liveAnnouncer.announce(message, 'assertive');
  }

  /**
   * Announce loading states
   */
  announceLoading(isLoading: boolean, context: string): void {
    const message = isLoading 
      ? `Carregando ${context}...` 
      : `${context} carregado com sucesso`;
    this.liveAnnouncer.announce(message, 'polite');
  }

  /**
   * Get ARIA label for category actions
   */
  getCategoryActionLabel(action: string, categoryName: string): string {
    const actionLabels = {
      edit: `Editar categoria ${categoryName}`,
      delete: `Excluir categoria ${categoryName}`,
      view: `Visualizar detalhes da categoria ${categoryName}`,
      create: 'Criar nova categoria',
      save: `Salvar categoria ${categoryName}`,
      cancel: 'Cancelar operação'
    };

    return actionLabels[action] || `${action} categoria ${categoryName}`;
  }

  /**
   * Get ARIA description for form fields
   */
  getFieldDescription(fieldName: string): string {
    const descriptions = {
      nome: 'Nome da categoria. Obrigatório, entre 2 e 100 caracteres.',
      descricao: 'Descrição da categoria. Opcional, máximo 500 caracteres.',
      ativo: 'Status da categoria. Marque para manter a categoria ativa.'
    };

    return descriptions[fieldName] || '';
  }

  /**
   * Get validation error message for screen readers
   */
  getValidationErrorMessage(fieldName: string, error: any): string {
    const field = this.getFieldDisplayName(fieldName);
    
    if (error.required) {
      return `${field} é obrigatório`;
    }
    if (error.minlength) {
      return `${field} deve ter pelo menos ${error.minlength.requiredLength} caracteres`;
    }
    if (error.maxlength) {
      return `${field} deve ter no máximo ${error.maxlength.requiredLength} caracteres`;
    }
    if (error.pattern) {
      return `${field} contém caracteres inválidos`;
    }
    if (error.duplicate) {
      return `${field} já existe neste estabelecimento`;
    }

    return `${field} contém erro de validação`;
  }

  /**
   * Manage focus for modals and forms
   */
  manageFocus(container: HTMLElement, action: 'open' | 'close', previousFocus?: HTMLElement): void {
    if (action === 'open') {
      this.trapFocus(container);
      this.focusFirstElement(container);
    } else {
      this.restoreFocus(previousFocus);
    }
  }

  /**
   * Setup keyboard navigation for a container
   */
  setupKeyboardNavigation(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    
    container.addEventListener('keydown', (event) => {
      this.handleKeyboardNavigation(event, focusableElements);
    });
  }

  /**
   * Update accessibility settings
   */
  updateSettings(settings: Partial<AccessibilitySettings>): void {
    const currentSettings = this.accessibilitySettings.value;
    const newSettings = { ...currentSettings, ...settings };
    this.accessibilitySettings.next(newSettings);
    this.applyAccessibilitySettings(newSettings);
  }

  /**
   * Check if high contrast mode is enabled
   */
  isHighContrastEnabled(): boolean {
    return this.accessibilitySettings.value.highContrast;
  }

  /**
   * Check if reduced motion is preferred
   */
  isReducedMotionPreferred(): boolean {
    return this.accessibilitySettings.value.reducedMotion;
  }

  /**
   * Generate unique IDs for ARIA relationships
   */
  generateAriaId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildActionMessage(action: string, categoryName?: string, details?: string): string {
    const actionMessages = {
      created: `Categoria ${categoryName} criada com sucesso`,
      updated: `Categoria ${categoryName} atualizada com sucesso`,
      deleted: `Categoria ${categoryName} excluída com sucesso`,
      loaded: `Lista de categorias carregada`,
      filtered: `Categorias filtradas`,
      searched: `Busca realizada`,
      error: `Erro ao processar categoria ${categoryName}`,
      validation_error: `Erro de validação no formulário`
    };

    let message = actionMessages[action] || `Ação ${action} realizada`;
    
    if (details) {
      message += `. ${details}`;
    }

    return message;
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames = {
      nome: 'Nome',
      descricao: 'Descrição',
      ativo: 'Status'
    };

    return displayNames[fieldName] || fieldName;
  }

  private detectAccessibilityPreferences(): void {
    // Detect high contrast
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    // Detect reduced motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Detect screen reader (basic detection)
    const screenReaderEnabled = navigator.userAgent.includes('NVDA') || 
                               navigator.userAgent.includes('JAWS') || 
                               navigator.userAgent.includes('VoiceOver');

    this.updateSettings({
      highContrast,
      reducedMotion,
      screenReaderEnabled
    });
  }

  private applyAccessibilitySettings(settings: AccessibilitySettings): void {
    const body = document.body;
    
    // Apply high contrast
    if (settings.highContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }

    // Apply reduced motion
    if (settings.reducedMotion) {
      body.classList.add('reduced-motion');
    } else {
      body.classList.remove('reduced-motion');
    }
  }

  private trapFocus(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0].element;
    const lastElement = focusableElements[focusableElements.length - 1].element;

    container.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  }

  private focusFirstElement(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].element.focus();
    }
  }

  private restoreFocus(element?: HTMLElement): void {
    if (element && element.focus) {
      element.focus();
    }
  }

  private getFocusableElements(container: HTMLElement): FocusableElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];

    const elements = container.querySelectorAll(focusableSelectors.join(', '));
    
    return Array.from(elements).map((element, index) => ({
      element: element as HTMLElement,
      tabIndex: index,
      ariaLabel: element.getAttribute('aria-label') || undefined
    }));
  }

  private handleKeyboardNavigation(event: KeyboardEvent, focusableElements: FocusableElement[]): void {
    const currentIndex = focusableElements.findIndex(
      item => item.element === document.activeElement
    );

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % focusableElements.length;
        focusableElements[nextIndex].element.focus();
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
        focusableElements[prevIndex].element.focus();
        break;

      case 'Home':
        event.preventDefault();
        focusableElements[0].element.focus();
        break;

      case 'End':
        event.preventDefault();
        focusableElements[focusableElements.length - 1].element.focus();
        break;
    }
  }
}