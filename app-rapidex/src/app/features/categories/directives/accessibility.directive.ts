import { Directive, ElementRef, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CategoryAccessibilityService } from '../services/category-accessibility.service';

@Directive({
  selector: '[appAriaAnnounce]',
  standalone: true
})
export class AriaAnnounceDirective implements OnInit {
  @Input() appAriaAnnounce: string = '';
  @Input() announceType: 'polite' | 'assertive' = 'polite';

  private accessibilityService = inject(CategoryAccessibilityService);

  ngOnInit(): void {
    if (this.appAriaAnnounce) {
      this.accessibilityService.announceAction(this.appAriaAnnounce);
    }
  }
}

@Directive({
  selector: '[appFocusTrap]',
  standalone: true
})
export class FocusTrapDirective implements OnInit, OnDestroy {
  @Input() appFocusTrap: boolean = true;

  private elementRef = inject(ElementRef);
  private accessibilityService = inject(CategoryAccessibilityService);
  private previousFocus?: HTMLElement;

  ngOnInit(): void {
    if (this.appFocusTrap) {
      this.previousFocus = document.activeElement as HTMLElement;
      this.accessibilityService.manageFocus(this.elementRef.nativeElement, 'open');
    }
  }

  ngOnDestroy(): void {
    if (this.appFocusTrap) {
      this.accessibilityService.manageFocus(
        this.elementRef.nativeElement, 
        'close', 
        this.previousFocus
      );
    }
  }
}

@Directive({
  selector: '[appKeyboardNav]',
  standalone: true
})
export class KeyboardNavigationDirective implements OnInit {
  @Input() appKeyboardNav: boolean = true;

  private elementRef = inject(ElementRef);
  private accessibilityService = inject(CategoryAccessibilityService);

  ngOnInit(): void {
    if (this.appKeyboardNav) {
      this.accessibilityService.setupKeyboardNavigation(this.elementRef.nativeElement);
    }
  }
}

@Directive({
  selector: '[appAriaDescribedBy]',
  standalone: true
})
export class AriaDescribedByDirective implements OnInit {
  @Input() appAriaDescribedBy: string = '';
  @Input() fieldName: string = '';

  private elementRef = inject(ElementRef);
  private accessibilityService = inject(CategoryAccessibilityService);

  ngOnInit(): void {
    const element = this.elementRef.nativeElement;
    
    if (this.fieldName) {
      const description = this.accessibilityService.getFieldDescription(this.fieldName);
      if (description) {
        const descriptionId = this.accessibilityService.generateAriaId('desc');
        
        // Create description element
        const descElement = document.createElement('div');
        descElement.id = descriptionId;
        descElement.className = 'sr-only';
        descElement.textContent = description;
        
        // Insert after the input element
        element.parentNode?.insertBefore(descElement, element.nextSibling);
        
        // Set aria-describedby
        element.setAttribute('aria-describedby', descriptionId);
      }
    } else if (this.appAriaDescribedBy) {
      element.setAttribute('aria-describedby', this.appAriaDescribedBy);
    }
  }
}

@Directive({
  selector: '[appHighContrast]',
  standalone: true
})
export class HighContrastDirective implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private accessibilityService = inject(CategoryAccessibilityService);
  private subscription?: any;

  ngOnInit(): void {
    this.subscription = this.accessibilityService.accessibilitySettings$.subscribe(settings => {
      const element = this.elementRef.nativeElement;
      
      if (settings.highContrast) {
        element.classList.add('high-contrast');
      } else {
        element.classList.remove('high-contrast');
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}