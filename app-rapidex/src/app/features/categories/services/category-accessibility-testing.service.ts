import { Injectable, inject } from '@angular/core';
import { CategoryAccessibilityService } from './category-accessibility.service';

export interface AccessibilityTestResult {
  passed: boolean;
  violations: AccessibilityViolation[];
  warnings: AccessibilityWarning[];
  score: number;
}

export interface AccessibilityViolation {
  rule: string;
  description: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  element: string;
  help: string;
}

export interface AccessibilityWarning {
  rule: string;
  description: string;
  element: string;
  suggestion: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryAccessibilityTestingService {
  private accessibilityService = inject(CategoryAccessibilityService);

  /**
   * Runs comprehensive accessibility tests on category components
   */
  async runAccessibilityTests(container?: HTMLElement): Promise<AccessibilityTestResult> {
    const testContainer = container || document.body;
    const violations: AccessibilityViolation[] = [];
    const warnings: AccessibilityWarning[] = [];

    // Test 1: ARIA labels and descriptions
    this.testAriaLabels(testContainer, violations, warnings);

    // Test 2: Keyboard navigation
    this.testKeyboardNavigation(testContainer, violations, warnings);

    // Test 3: Focus management
    this.testFocusManagement(testContainer, violations, warnings);

    // Test 4: Color contrast
    await this.testColorContrast(testContainer, violations, warnings);

    // Test 5: Screen reader compatibility
    this.testScreenReaderCompatibility(testContainer, violations, warnings);

    // Test 6: Form accessibility
    this.testFormAccessibility(testContainer, violations, warnings);

    // Test 7: Modal accessibility
    this.testModalAccessibility(testContainer, violations, warnings);

    // Calculate score
    const score = this.calculateAccessibilityScore(violations, warnings);

    return {
      passed: violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length === 0,
      violations,
      warnings,
      score
    };
  }

  /**
   * Tests ARIA labels and descriptions
   */
  private testAriaLabels(container: HTMLElement, violations: AccessibilityViolation[], warnings: AccessibilityWarning[]): void {
    // Test buttons without accessible names
    const buttons = container.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const hasAccessibleName = button.getAttribute('aria-label') || 
                               button.getAttribute('aria-labelledby') || 
                               button.textContent?.trim();
      
      if (!hasAccessibleName) {
        violations.push({
          rule: 'button-name',
          description: 'Button must have accessible name',
          impact: 'serious',
          element: `button[${index}]`,
          help: 'Add aria-label, aria-labelledby, or text content to button'
        });
      }
    });

    // Test form inputs without labels
    const inputs = container.querySelectorAll('input, textarea, select');
    inputs.forEach((input, index) => {
      const hasLabel = input.getAttribute('aria-label') || 
                      input.getAttribute('aria-labelledby') || 
                      container.querySelector(`label[for="${input.id}"]`);
      
      if (!hasLabel) {
        violations.push({
          rule: 'label',
          description: 'Form elements must have labels',
          impact: 'critical',
          element: `${input.tagName.toLowerCase()}[${index}]`,
          help: 'Add aria-label, aria-labelledby, or associated label element'
        });
      }
    });

    // Test images without alt text
    const images = container.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.getAttribute('alt') && !img.getAttribute('aria-hidden')) {
        violations.push({
          rule: 'image-alt',
          description: 'Images must have alternative text',
          impact: 'serious',
          element: `img[${index}]`,
          help: 'Add alt attribute or aria-hidden="true" for decorative images'
        });
      }
    });
  }

  /**
   * Tests keyboard navigation
   */
  private testKeyboardNavigation(container: HTMLElement, violations: AccessibilityViolation[], warnings: AccessibilityWarning[]): void {
    // Test focusable elements
    const focusableElements = container.querySelectorAll(
      'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach((element, index) => {
      const computedStyle = window.getComputedStyle(element as HTMLElement);
      
      // Check if element is visible but not focusable
      if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
        const tabIndex = element.getAttribute('tabindex');
        if (tabIndex === '-1' && element.tagName !== 'DIV') {
          warnings.push({
            rule: 'focusable-element',
            description: 'Interactive element may not be keyboard accessible',
            element: `${element.tagName.toLowerCase()}[${index}]`,
            suggestion: 'Ensure element is focusable with keyboard navigation'
          });
        }
      }
    });

    // Test skip links
    const skipLinks = container.querySelectorAll('.skip-link, [href^="#"]');
    if (skipLinks.length === 0) {
      warnings.push({
        rule: 'skip-link',
        description: 'Page should have skip links for keyboard navigation',
        element: 'document',
        suggestion: 'Add skip links to main content areas'
      });
    }
  }

  /**
   * Tests focus management
   */
  private testFocusManagement(container: HTMLElement, violations: AccessibilityViolation[], warnings: AccessibilityWarning[]): void {
    // Test focus indicators
    const focusableElements = container.querySelectorAll(
      'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach((element, index) => {
      const computedStyle = window.getComputedStyle(element as HTMLElement, ':focus');
      const hasVisibleFocus = computedStyle.outline !== 'none' || 
                             computedStyle.boxShadow !== 'none' ||
                             computedStyle.border !== computedStyle.getPropertyValue('border');

      if (!hasVisibleFocus) {
        violations.push({
          rule: 'focus-visible',
          description: 'Focusable elements must have visible focus indicators',
          impact: 'serious',
          element: `${element.tagName.toLowerCase()}[${index}]`,
          help: 'Add :focus styles with visible outline or border'
        });
      }
    });

    // Test modal focus trapping
    const modals = container.querySelectorAll('[role="dialog"], .modal');
    modals.forEach((modal, index) => {
      if (!modal.getAttribute('aria-modal')) {
        violations.push({
          rule: 'aria-modal',
          description: 'Modal dialogs must have aria-modal="true"',
          impact: 'serious',
          element: `modal[${index}]`,
          help: 'Add aria-modal="true" to modal elements'
        });
      }
    });
  }

  /**
   * Tests color contrast
   */
  private async testColorContrast(container: HTMLElement, violations: AccessibilityViolation[], warnings: AccessibilityWarning[]): Promise<void> {
    const textElements = container.querySelectorAll('p, span, div, button, input, textarea, label, a');
    
    for (let i = 0; i < textElements.length; i++) {
      const element = textElements[i] as HTMLElement;
      const computedStyle = window.getComputedStyle(element);
      
      const textColor = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      
      // Skip if no text content
      if (!element.textContent?.trim()) continue;
      
      // Basic contrast check (simplified)
      if (textColor && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = this.calculateContrastRatio(textColor, backgroundColor);
        const fontSize = parseFloat(computedStyle.fontSize);
        const fontWeight = computedStyle.fontWeight;
        
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
        const requiredRatio = isLargeText ? 3 : 4.5;
        
        if (contrast < requiredRatio) {
          violations.push({
            rule: 'color-contrast',
            description: `Text contrast ratio ${contrast.toFixed(2)} is below required ${requiredRatio}`,
            impact: 'serious',
            element: `${element.tagName.toLowerCase()}[${i}]`,
            help: 'Increase color contrast between text and background'
          });
        }
      }
    }
  }

  /**
   * Tests screen reader compatibility
   */
  private testScreenReaderCompatibility(container: HTMLElement, violations: AccessibilityViolation[], warnings: AccessibilityWarning[]): void {
    // Test for proper heading structure
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level > previousLevel + 1) {
        warnings.push({
          rule: 'heading-order',
          description: 'Heading levels should not skip',
          element: `${heading.tagName.toLowerCase()}[${index}]`,
          suggestion: 'Use heading levels in sequential order'
        });
      }
      
      previousLevel = level;
    });

    // Test for live regions
    const liveRegions = container.querySelectorAll('[aria-live]');
    if (liveRegions.length === 0) {
      warnings.push({
        rule: 'live-region',
        description: 'Dynamic content should use live regions',
        element: 'document',
        suggestion: 'Add aria-live regions for dynamic content updates'
      });
    }

    // Test for proper list markup
    const lists = container.querySelectorAll('ul, ol');
    lists.forEach((list, index) => {
      const listItems = list.querySelectorAll('li');
      if (listItems.length === 0) {
        warnings.push({
          rule: 'list-structure',
          description: 'Lists should contain list items',
          element: `${list.tagName.toLowerCase()}[${index}]`,
          suggestion: 'Ensure lists contain proper li elements'
        });
      }
    });
  }

  /**
   * Tests form accessibility
   */
  private testFormAccessibility(container: HTMLElement, violations: AccessibilityViolation[], warnings: AccessibilityWarning[]): void {
    const forms = container.querySelectorAll('form');
    
    forms.forEach((form, formIndex) => {
      // Test required fields
      const requiredFields = form.querySelectorAll('[required], [aria-required="true"]');
      requiredFields.forEach((field, fieldIndex) => {
        if (!field.getAttribute('aria-required') && !field.hasAttribute('required')) {
          warnings.push({
            rule: 'required-field',
            description: 'Required fields should be properly marked',
            element: `form[${formIndex}] ${field.tagName.toLowerCase()}[${fieldIndex}]`,
            suggestion: 'Add aria-required="true" or required attribute'
          });
        }
      });

      // Test error messages
      const errorMessages = form.querySelectorAll('.error, [role="alert"]');
      const invalidFields = form.querySelectorAll('[aria-invalid="true"]');
      
      invalidFields.forEach((field, fieldIndex) => {
        const hasErrorMessage = field.getAttribute('aria-describedby') || 
                               field.parentElement?.querySelector('.error');
        
        if (!hasErrorMessage) {
          violations.push({
            rule: 'error-message',
            description: 'Invalid fields must have associated error messages',
            impact: 'serious',
            element: `form[${formIndex}] ${field.tagName.toLowerCase()}[${fieldIndex}]`,
            help: 'Add aria-describedby pointing to error message'
          });
        }
      });
    });
  }

  /**
   * Tests modal accessibility
   */
  private testModalAccessibility(container: HTMLElement, violations: AccessibilityViolation[], warnings: AccessibilityWarning[]): void {
    const modals = container.querySelectorAll('[role="dialog"], .modal');
    
    modals.forEach((modal, index) => {
      // Test modal labeling
      const hasLabel = modal.getAttribute('aria-label') || modal.getAttribute('aria-labelledby');
      if (!hasLabel) {
        violations.push({
          rule: 'dialog-name',
          description: 'Modal dialogs must have accessible names',
          impact: 'serious',
          element: `modal[${index}]`,
          help: 'Add aria-label or aria-labelledby to modal'
        });
      }

      // Test close button
      const closeButton = modal.querySelector('[aria-label*="close"], [aria-label*="fechar"], .close');
      if (!closeButton) {
        warnings.push({
          rule: 'modal-close',
          description: 'Modals should have accessible close buttons',
          element: `modal[${index}]`,
          suggestion: 'Add close button with proper aria-label'
        });
      }
    });
  }

  /**
   * Calculates accessibility score based on violations and warnings
   */
  private calculateAccessibilityScore(violations: AccessibilityViolation[], warnings: AccessibilityWarning[]): number {
    let score = 100;
    
    violations.forEach(violation => {
      switch (violation.impact) {
        case 'critical':
          score -= 25;
          break;
        case 'serious':
          score -= 15;
          break;
        case 'moderate':
          score -= 10;
          break;
        case 'minor':
          score -= 5;
          break;
      }
    });

    warnings.forEach(() => {
      score -= 2;
    });

    return Math.max(0, score);
  }

  /**
   * Simplified contrast ratio calculation
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    // This is a simplified implementation
    // In a real application, you would use a proper color contrast library
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);
    
    if (!rgb1 || !rgb2) return 21; // Assume good contrast if can't parse
    
    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private parseColor(color: string): { r: number; g: number; b: number } | null {
    // Simplified color parsing - in reality you'd want a more robust parser
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return null;
  }

  private getLuminance(rgb: { r: number; g: number; b: number }): number {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Generates accessibility report
   */
  generateAccessibilityReport(result: AccessibilityTestResult): string {
    const report = [
      '=== RELATÓRIO DE ACESSIBILIDADE ===',
      `Score: ${result.score}/100`,
      `Status: ${result.passed ? 'APROVADO' : 'REPROVADO'}`,
      '',
      `Violações: ${result.violations.length}`,
      `Avisos: ${result.warnings.length}`,
      ''
    ];

    if (result.violations.length > 0) {
      report.push('VIOLAÇÕES:');
      result.violations.forEach((violation, index) => {
        report.push(`${index + 1}. [${violation.impact.toUpperCase()}] ${violation.rule}`);
        report.push(`   Descrição: ${violation.description}`);
        report.push(`   Elemento: ${violation.element}`);
        report.push(`   Solução: ${violation.help}`);
        report.push('');
      });
    }

    if (result.warnings.length > 0) {
      report.push('AVISOS:');
      result.warnings.forEach((warning, index) => {
        report.push(`${index + 1}. ${warning.rule}`);
        report.push(`   Descrição: ${warning.description}`);
        report.push(`   Elemento: ${warning.element}`);
        report.push(`   Sugestão: ${warning.suggestion}`);
        report.push('');
      });
    }

    return report.join('\n');
  }

  /**
   * Runs automated accessibility tests using axe-core if available
   */
  async runAxeTests(container?: HTMLElement): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).axe) {
      try {
        const results = await (window as any).axe.run(container || document);
        return results;
      } catch (error) {
        console.warn('Axe accessibility testing failed:', error);
        return null;
      }
    }
    return null;
  }
}