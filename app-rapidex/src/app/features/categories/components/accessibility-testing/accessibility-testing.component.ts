import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryAccessibilityTestingService, AccessibilityTestResult } from '../../services/category-accessibility-testing.service';
import { CategoryAccessibilityService } from '../../services/category-accessibility.service';

@Component({
  selector: 'app-accessibility-testing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="accessibility-testing" [attr.aria-hidden]="!showTesting()">
      <!-- Testing Controls -->
      <div class="testing-controls">
        <h3>Testes de Acessibilidade</h3>
        <div class="control-buttons">
          <button 
            class="btn btn--primary"
            (click)="runTests()"
            [disabled]="testing()"
            type="button">
            {{ testing() ? 'Testando...' : 'Executar Testes' }}
          </button>
          
          <button 
            class="btn btn--secondary"
            (click)="toggleHighContrast()"
            type="button">
            {{ isHighContrast() ? 'Desativar' : 'Ativar' }} Alto Contraste
          </button>
          
          <button 
            class="btn btn--secondary"
            (click)="toggleReducedMotion()"
            type="button">
            {{ isReducedMotion() ? 'Desativar' : 'Ativar' }} Movimento Reduzido
          </button>
          
          <button 
            class="btn btn--ghost"
            (click)="toggleTesting()"
            type="button">
            {{ showTesting() ? 'Ocultar' : 'Mostrar' }} Testes
          </button>
        </div>
      </div>

      <!-- Test Results -->
      <div *ngIf="testResult()" class="test-results">
        <div class="results-header">
          <h4>Resultados dos Testes</h4>
          <div class="score-badge" [class]="getScoreClass()">
            Score: {{ testResult()!.score }}/100
          </div>
          <div class="status-badge" [class]="getStatusClass()">
            {{ testResult()!.passed ? 'APROVADO' : 'REPROVADO' }}
          </div>
        </div>

        <!-- Violations -->
        <div *ngIf="testResult()!.violations.length > 0" class="violations-section">
          <h5>Violações ({{ testResult()!.violations.length }})</h5>
          <div class="violation-list">
            <div 
              *ngFor="let violation of testResult()!.violations; trackBy: trackByViolation"
              class="violation-item"
              [class]="'violation-' + violation.impact">
              <div class="violation-header">
                <span class="violation-rule">{{ violation.rule }}</span>
                <span class="violation-impact">{{ violation.impact }}</span>
              </div>
              <div class="violation-description">{{ violation.description }}</div>
              <div class="violation-element">Elemento: {{ violation.element }}</div>
              <div class="violation-help">Solução: {{ violation.help }}</div>
            </div>
          </div>
        </div>

        <!-- Warnings -->
        <div *ngIf="testResult()!.warnings.length > 0" class="warnings-section">
          <h5>Avisos ({{ testResult()!.warnings.length }})</h5>
          <div class="warning-list">
            <div 
              *ngFor="let warning of testResult()!.warnings; trackBy: trackByWarning"
              class="warning-item">
              <div class="warning-header">
                <span class="warning-rule">{{ warning.rule }}</span>
              </div>
              <div class="warning-description">{{ warning.description }}</div>
              <div class="warning-element">Elemento: {{ warning.element }}</div>
              <div class="warning-suggestion">Sugestão: {{ warning.suggestion }}</div>
            </div>
          </div>
        </div>

        <!-- Export Options -->
        <div class="export-options">
          <button 
            class="btn btn--secondary"
            (click)="exportReport()"
            type="button">
            Exportar Relatório
          </button>
          
          <button 
            class="btn btn--secondary"
            (click)="copyToClipboard()"
            type="button">
            Copiar para Clipboard
          </button>
        </div>
      </div>

      <!-- Accessibility Settings -->
      <div class="accessibility-settings">
        <h4>Configurações de Acessibilidade</h4>
        <div class="settings-grid">
          <label class="setting-item">
            <input 
              type="checkbox" 
              [checked]="isHighContrast()"
              (change)="toggleHighContrast()">
            <span>Alto Contraste</span>
          </label>
          
          <label class="setting-item">
            <input 
              type="checkbox" 
              [checked]="isReducedMotion()"
              (change)="toggleReducedMotion()">
            <span>Movimento Reduzido</span>
          </label>
          
          <label class="setting-item">
            <input 
              type="checkbox" 
              [checked]="isScreenReaderEnabled()"
              (change)="toggleScreenReader()">
            <span>Leitor de Tela Simulado</span>
          </label>
          
          <label class="setting-item">
            <input 
              type="checkbox" 
              [checked]="isKeyboardNavEnabled()"
              (change)="toggleKeyboardNav()">
            <span>Navegação por Teclado</span>
          </label>
        </div>
      </div>

      <!-- Quick Tests -->
      <div class="quick-tests">
        <h4>Testes Rápidos</h4>
        <div class="quick-test-buttons">
          <button 
            class="btn btn--small"
            (click)="testKeyboardNavigation()"
            type="button">
            Testar Navegação
          </button>
          
          <button 
            class="btn btn--small"
            (click)="testFocusManagement()"
            type="button">
            Testar Foco
          </button>
          
          <button 
            class="btn btn--small"
            (click)="testScreenReader()"
            type="button">
            Testar Leitor de Tela
          </button>
          
          <button 
            class="btn btn--small"
            (click)="testColorContrast()"
            type="button">
            Testar Contraste
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .accessibility-testing {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      background: white;
      border: 2px solid #007bff;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      font-size: 14px;
    }

    .testing-controls {
      margin-bottom: 16px;
    }

    .testing-controls h3 {
      margin: 0 0 12px 0;
      color: #007bff;
    }

    .control-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .btn {
      padding: 6px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 12px;
    }

    .btn--primary {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .btn--secondary {
      background: #6c757d;
      color: white;
      border-color: #6c757d;
    }

    .btn--ghost {
      background: transparent;
      color: #007bff;
      border-color: #007bff;
    }

    .btn--small {
      padding: 4px 8px;
      font-size: 11px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .results-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .score-badge, .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }

    .score-excellent { background: #28a745; color: white; }
    .score-good { background: #ffc107; color: black; }
    .score-poor { background: #dc3545; color: white; }

    .status-passed { background: #28a745; color: white; }
    .status-failed { background: #dc3545; color: white; }

    .violations-section, .warnings-section {
      margin-bottom: 16px;
    }

    .violation-item, .warning-item {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 8px;
    }

    .violation-critical { border-color: #dc3545; background: #f8d7da; }
    .violation-serious { border-color: #fd7e14; background: #fff3cd; }
    .violation-moderate { border-color: #ffc107; background: #fff3cd; }
    .violation-minor { border-color: #17a2b8; background: #d1ecf1; }

    .violation-header, .warning-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .violation-impact {
      text-transform: uppercase;
      font-size: 10px;
      padding: 2px 4px;
      border-radius: 2px;
      background: rgba(0, 0, 0, 0.1);
    }

    .violation-description, .warning-description,
    .violation-element, .warning-element,
    .violation-help, .warning-suggestion {
      font-size: 11px;
      margin-bottom: 2px;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .setting-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }

    .quick-test-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .accessibility-settings, .quick-tests {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }

    .accessibility-settings h4, .quick-tests h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
    }

    .export-options {
      margin-top: 12px;
      display: flex;
      gap: 8px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessibilityTestingComponent implements OnInit {
  private testingService = inject(CategoryAccessibilityTestingService);
  private accessibilityService = inject(CategoryAccessibilityService);

  // Component state
  showTesting = signal(false);
  testing = signal(false);
  testResult = signal<AccessibilityTestResult | null>(null);

  // Accessibility settings
  isHighContrast = signal(false);
  isReducedMotion = signal(false);
  isScreenReaderEnabled = signal(false);
  isKeyboardNavEnabled = signal(true);

  ngOnInit(): void {
    // Load current accessibility settings
    this.accessibilityService.accessibilitySettings$.subscribe(settings => {
      this.isHighContrast.set(settings.highContrast);
      this.isReducedMotion.set(settings.reducedMotion);
      this.isScreenReaderEnabled.set(settings.screenReaderEnabled);
      this.isKeyboardNavEnabled.set(settings.keyboardNavigationEnabled);
    });

    // Show testing panel in development mode
    if (this.isDevelopmentMode()) {
      this.showTesting.set(true);
    }
  }

  async runTests(): Promise<void> {
    this.testing.set(true);
    
    try {
      const result = await this.testingService.runAccessibilityTests();
      this.testResult.set(result);
      
      // Also run axe tests if available
      const axeResult = await this.testingService.runAxeTests();
      if (axeResult) {
        console.log('Axe accessibility results:', axeResult);
      }
      
      this.accessibilityService.announceAction(
        'tests_completed',
        undefined,
        `Testes de acessibilidade concluídos. Score: ${result.score}/100`
      );
    } catch (error) {
      console.error('Accessibility testing failed:', error);
      this.accessibilityService.announceError('Falha nos testes de acessibilidade', 'Erro interno');
    } finally {
      this.testing.set(false);
    }
  }

  toggleHighContrast(): void {
    const newValue = !this.isHighContrast();
    this.accessibilityService.updateSettings({ highContrast: newValue });
    this.accessibilityService.announceAction(
      'setting_changed',
      undefined,
      `Alto contraste ${newValue ? 'ativado' : 'desativado'}`
    );
  }

  toggleReducedMotion(): void {
    const newValue = !this.isReducedMotion();
    this.accessibilityService.updateSettings({ reducedMotion: newValue });
    this.accessibilityService.announceAction(
      'setting_changed',
      undefined,
      `Movimento reduzido ${newValue ? 'ativado' : 'desativado'}`
    );
  }

  toggleScreenReader(): void {
    const newValue = !this.isScreenReaderEnabled();
    this.accessibilityService.updateSettings({ screenReaderEnabled: newValue });
    this.accessibilityService.announceAction(
      'setting_changed',
      undefined,
      `Leitor de tela simulado ${newValue ? 'ativado' : 'desativado'}`
    );
  }

  toggleKeyboardNav(): void {
    const newValue = !this.isKeyboardNavEnabled();
    this.accessibilityService.updateSettings({ keyboardNavigationEnabled: newValue });
    this.accessibilityService.announceAction(
      'setting_changed',
      undefined,
      `Navegação por teclado ${newValue ? 'ativada' : 'desativada'}`
    );
  }

  toggleTesting(): void {
    this.showTesting.set(!this.showTesting());
  }

  exportReport(): void {
    const result = this.testResult();
    if (!result) return;

    const report = this.testingService.generateAccessibilityReport(result);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    this.accessibilityService.announceAction('report_exported', undefined, 'Relatório de acessibilidade exportado');
  }

  async copyToClipboard(): Promise<void> {
    const result = this.testResult();
    if (!result) return;

    const report = this.testingService.generateAccessibilityReport(result);
    
    try {
      await navigator.clipboard.writeText(report);
      this.accessibilityService.announceAction('report_copied', undefined, 'Relatório copiado para clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.accessibilityService.announceError('Falha ao copiar relatório', 'Erro de clipboard');
    }
  }

  // Quick test methods
  testKeyboardNavigation(): void {
    this.accessibilityService.announceAction('test_keyboard', undefined, 'Testando navegação por teclado');
    
    // Highlight all focusable elements
    const focusableElements = document.querySelectorAll(
      'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.outline = '3px solid #ff0000';
      htmlElement.style.outlineOffset = '2px';
      
      setTimeout(() => {
        htmlElement.style.outline = '';
        htmlElement.style.outlineOffset = '';
      }, 3000);
    });
    
    console.log(`Found ${focusableElements.length} focusable elements`);
  }

  testFocusManagement(): void {
    this.accessibilityService.announceAction('test_focus', undefined, 'Testando gerenciamento de foco');
    
    // Test focus trap in modals
    const modals = document.querySelectorAll('[role="dialog"], .modal');
    modals.forEach(modal => {
      const modalElement = modal as HTMLElement;
      modalElement.style.border = '3px solid #00ff00';
      
      setTimeout(() => {
        modalElement.style.border = '';
      }, 3000);
    });
    
    console.log(`Found ${modals.length} modal elements`);
  }

  testScreenReader(): void {
    this.accessibilityService.announceAction('test_screen_reader', undefined, 'Testando compatibilidade com leitor de tela');
    
    // Test ARIA labels and live regions
    const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-live]');
    ariaElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
      
      setTimeout(() => {
        htmlElement.style.backgroundColor = '';
      }, 3000);
    });
    
    console.log(`Found ${ariaElements.length} ARIA elements`);
  }

  testColorContrast(): void {
    this.accessibilityService.announceAction('test_contrast', undefined, 'Testando contraste de cores');
    
    // Temporarily apply high contrast to test
    document.body.classList.add('high-contrast');
    
    setTimeout(() => {
      document.body.classList.remove('high-contrast');
    }, 3000);
  }

  // Helper methods
  getScoreClass(): string {
    const score = this.testResult()?.score || 0;
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    return 'score-poor';
  }

  getStatusClass(): string {
    return this.testResult()?.passed ? 'status-passed' : 'status-failed';
  }

  trackByViolation(index: number, violation: any): string {
    return `${violation.rule}-${violation.element}`;
  }

  trackByWarning(index: number, warning: any): string {
    return `${warning.rule}-${warning.element}`;
  }

  private isDevelopmentMode(): boolean {
    return !!(window as any).ng && (window as any).ng.getContext;
  }
}