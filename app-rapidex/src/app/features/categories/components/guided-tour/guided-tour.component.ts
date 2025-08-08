import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryHelpService, TourStep } from '../../services/category-help.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-guided-tour',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      *ngIf="isActive()"
      class="tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title">
      
      <!-- Tour Backdrop -->
      <div class="tour-backdrop" (click)="skipTour()"></div>
      
      <!-- Tour Spotlight -->
      <div 
        class="tour-spotlight"
        [style.top.px]="spotlightPosition().top"
        [style.left.px]="spotlightPosition().left"
        [style.width.px]="spotlightPosition().width"
        [style.height.px]="spotlightPosition().height">
      </div>
      
      <!-- Tour Tooltip -->
      <div 
        class="tour-tooltip"
        [class]="'position-' + (currentStep()?.position || 'bottom')"
        [style.top.px]="tooltipPosition().top"
        [style.left.px]="tooltipPosition().left"
        [attr.aria-describedby]="'tour-content'">
        
        <div class="tooltip-arrow"></div>
        
        <div class="tour-header">
          <h3 id="tour-title" class="tour-title">
            {{ currentStep()?.title }}
          </h3>
          <button 
            class="btn-close-tour"
            type="button"
            aria-label="Fechar tour"
            (click)="stopTour()">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        
        <div id="tour-content" class="tour-content">
          <p>{{ currentStep()?.content }}</p>
        </div>
        
        <div class="tour-footer">
          <div class="tour-progress">
            <span class="progress-text">
              {{ currentStepIndex() + 1 }} de {{ totalSteps() }}
            </span>
            <div class="progress-bar">
              <div 
                class="progress-fill"
                [style.width.%]="progressPercentage()">
              </div>
            </div>
          </div>
          
          <div class="tour-actions">
            <button 
              class="btn btn-outline-secondary btn-sm"
              type="button"
              (click)="skipTour()">
              Pular Tour
            </button>
            
            <button 
              *ngIf="currentStepIndex() > 0"
              class="btn btn-outline-primary btn-sm"
              type="button"
              (click)="previousStep()">
              <i class="fas fa-chevron-left" aria-hidden="true"></i>
              Anterior
            </button>
            
            <button 
              *ngIf="currentStepIndex() < totalSteps() - 1"
              class="btn btn-primary btn-sm"
              type="button"
              (click)="nextStep()">
              Próximo
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
            
            <button 
              *ngIf="currentStepIndex() === totalSteps() - 1"
              class="btn btn-success btn-sm"
              type="button"
              (click)="finishTour()">
              <i class="fas fa-check" aria-hidden="true"></i>
              Concluir
            </button>
          </div>
        </div>
      </div>
      
      <!-- Tour Navigation Dots -->
      <div class="tour-navigation">
        <button 
          *ngFor="let step of tourSteps; let i = index"
          class="nav-dot"
          [class.active]="i === currentStepIndex()"
          [class.completed]="i < currentStepIndex()"
          type="button"
          [attr.aria-label]="'Ir para passo ' + (i + 1)"
          (click)="goToStep(i)">
        </button>
      </div>
    </div>
  `,
  styles: [`
    .tour-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1060;
      pointer-events: none;
    }

    .tour-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      pointer-events: all;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .tour-spotlight {
      position: absolute;
      background: transparent;
      border: 3px solid #007bff;
      border-radius: 8px;
      box-shadow: 
        0 0 0 9999px rgba(0, 0, 0, 0.7),
        0 0 20px rgba(0, 123, 255, 0.5),
        inset 0 0 20px rgba(0, 123, 255, 0.2);
      pointer-events: none;
      transition: all 0.3s ease;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 
          0 0 0 9999px rgba(0, 0, 0, 0.7),
          0 0 20px rgba(0, 123, 255, 0.5),
          inset 0 0 20px rgba(0, 123, 255, 0.2);
      }
      50% {
        box-shadow: 
          0 0 0 9999px rgba(0, 0, 0, 0.7),
          0 0 30px rgba(0, 123, 255, 0.8),
          inset 0 0 30px rgba(0, 123, 255, 0.3);
      }
    }

    .tour-tooltip {
      position: absolute;
      background: #fff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
      max-width: 350px;
      min-width: 280px;
      pointer-events: all;
      z-index: 1061;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* Tooltip positioning */
    .position-top {
      transform: translateX(-50%) translateY(-100%);
      margin-top: -1rem;
    }

    .position-bottom {
      transform: translateX(-50%);
      margin-top: 1rem;
    }

    .position-left {
      transform: translateX(-100%) translateY(-50%);
      margin-left: -1rem;
    }

    .position-right {
      transform: translateY(-50%);
      margin-left: 1rem;
    }

    /* Tooltip arrows */
    .tooltip-arrow {
      position: absolute;
      width: 0;
      height: 0;
      border: 8px solid transparent;
    }

    .position-top .tooltip-arrow {
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-top-color: #fff;
      border-bottom: none;
    }

    .position-bottom .tooltip-arrow {
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-bottom-color: #fff;
      border-top: none;
    }

    .position-left .tooltip-arrow {
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      border-left-color: #fff;
      border-right: none;
    }

    .position-right .tooltip-arrow {
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      border-right-color: #fff;
      border-left: none;
    }

    .tour-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1rem 0.5rem;
      border-bottom: 1px solid #dee2e6;
    }

    .tour-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #495057;
    }

    .btn-close-tour {
      background: none;
      border: none;
      color: #6c757d;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      transition: all 0.2s ease;
    }

    .btn-close-tour:hover {
      color: #495057;
      background-color: #f8f9fa;
    }

    .tour-content {
      padding: 1rem;
    }

    .tour-content p {
      margin: 0;
      color: #6c757d;
      line-height: 1.5;
      font-size: 0.9rem;
    }

    .tour-footer {
      padding: 0.75rem 1rem 1rem;
      border-top: 1px solid #dee2e6;
    }

    .tour-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .progress-text {
      font-size: 0.8rem;
      color: #6c757d;
      white-space: nowrap;
    }

    .progress-bar {
      flex: 1;
      height: 4px;
      background: #e9ecef;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #007bff, #0056b3);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .tour-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .tour-actions .btn {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8rem;
      padding: 0.375rem 0.75rem;
    }

    .tour-navigation {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 0.5rem;
      pointer-events: all;
      background: rgba(255, 255, 255, 0.9);
      padding: 0.75rem;
      border-radius: 2rem;
      backdrop-filter: blur(10px);
      box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
    }

    .nav-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid #dee2e6;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .nav-dot:hover {
      border-color: #007bff;
      transform: scale(1.1);
    }

    .nav-dot.active {
      background: #007bff;
      border-color: #007bff;
      transform: scale(1.2);
    }

    .nav-dot.completed {
      background: #28a745;
      border-color: #28a745;
    }

    .nav-dot.completed::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #fff;
      font-size: 8px;
      font-weight: bold;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .tour-tooltip {
        max-width: 300px;
        min-width: 250px;
        margin: 1rem;
      }

      .tour-actions {
        flex-direction: column;
        gap: 0.75rem;
      }

      .tour-actions .btn {
        width: 100%;
        justify-content: center;
      }

      .tour-navigation {
        bottom: 1rem;
        padding: 0.5rem;
      }

      .nav-dot {
        width: 10px;
        height: 10px;
      }
    }

    /* High contrast mode */
    @media (prefers-contrast: high) {
      .tour-tooltip {
        border: 2px solid #000;
      }

      .tour-spotlight {
        border-color: #000;
      }

      .nav-dot {
        border-color: #000;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .tour-tooltip,
      .tour-backdrop {
        animation: none;
      }

      .tour-spotlight {
        animation: none;
        transition: none;
      }

      .progress-fill {
        transition: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuidedTourComponent implements OnInit, OnDestroy {
  private isActive = signal(false);
  private currentStepIndex = signal(0);
  private spotlightPosition = signal({ top: 0, left: 0, width: 0, height: 0 });
  private tooltipPosition = signal({ top: 0, left: 0 });
  private destroy$ = new Subject<void>();

  tourSteps: TourStep[] = [];

  constructor(
    private helpService: CategoryHelpService,
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.helpService.tourActive$
      .pipe(takeUntil(this.destroy$))
      .subscribe(active => {
        this.isActive.set(active);
        if (active) {
          this.startTour();
        } else {
          this.cleanup();
        }
      });

    this.tourSteps = this.helpService.getTourSteps();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  private startTour(): void {
    this.currentStepIndex.set(0);
    this.updateTourStep();
    this.disablePageInteraction();
    this.announceToScreenReader('Tour guiado iniciado. Use as setas do teclado para navegar.');
  }

  private updateTourStep(): void {
    const step = this.currentStep();
    if (!step) return;

    // Find target element
    const targetElement = document.querySelector(step.element) as HTMLElement;
    if (!targetElement) {
      console.warn(`Tour step element not found: ${step.element}`);
      return;
    }

    // Update spotlight position
    this.updateSpotlightPosition(targetElement);
    
    // Update tooltip position
    this.updateTooltipPosition(targetElement, step.position);
    
    // Scroll element into view
    this.scrollToElement(targetElement);
    
    // Execute step action if provided
    if (step.action) {
      step.action();
    }

    // Announce step to screen readers
    this.announceToScreenReader(`Passo ${this.currentStepIndex() + 1}: ${step.title}. ${step.content}`);
  }

  private updateSpotlightPosition(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const padding = 8;
    
    this.spotlightPosition.set({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + (padding * 2),
      height: rect.height + (padding * 2)
    });
  }

  private updateTooltipPosition(element: HTMLElement, position: string): void {
    const rect = element.getBoundingClientRect();
    const tooltipWidth = 350;
    const tooltipHeight = 200; // Approximate
    const offset = 20;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - offset;
        left = rect.left + (rect.width / 2);
        break;
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + (rect.width / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2);
        left = rect.left - tooltipWidth - offset;
        break;
      case 'right':
        top = rect.top + (rect.height / 2);
        left = rect.right + offset;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    if (left < 10) left = 10;
    if (left + tooltipWidth > viewport.width - 10) left = viewport.width - tooltipWidth - 10;
    if (top < 10) top = 10;
    if (top + tooltipHeight > viewport.height - 10) top = viewport.height - tooltipHeight - 10;

    this.tooltipPosition.set({ top, left });
  }

  private scrollToElement(element: HTMLElement): void {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });
  }

  private disablePageInteraction(): void {
    // Add class to body to prevent interaction with page elements
    this.renderer.addClass(document.body, 'tour-active');
    
    // Add keyboard event listeners
    this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
      if (!this.isActive()) return;

      switch (event.key) {
        case 'Escape':
          this.stopTour();
          break;
        case 'ArrowRight':
        case ' ':
          event.preventDefault();
          this.nextStep();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          this.previousStep();
          break;
        case 'Enter':
          event.preventDefault();
          if (this.currentStepIndex() === this.totalSteps() - 1) {
            this.finishTour();
          } else {
            this.nextStep();
          }
          break;
      }
    });
  }

  private cleanup(): void {
    this.renderer.removeClass(document.body, 'tour-active');
  }

  nextStep(): void {
    if (this.currentStepIndex() < this.totalSteps() - 1) {
      this.helpService.nextTourStep();
      this.currentStepIndex.set(this.helpService.getCurrentTourStep());
      this.updateTourStep();
    }
  }

  previousStep(): void {
    if (this.currentStepIndex() > 0) {
      this.helpService.previousTourStep();
      this.currentStepIndex.set(this.helpService.getCurrentTourStep());
      this.updateTourStep();
    }
  }

  goToStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.totalSteps()) {
      this.currentStepIndex.set(stepIndex);
      this.updateTourStep();
    }
  }

  skipTour(): void {
    this.helpService.stopTour();
    this.announceToScreenReader('Tour guiado cancelado.');
  }

  stopTour(): void {
    this.helpService.stopTour();
    this.announceToScreenReader('Tour guiado finalizado.');
  }

  finishTour(): void {
    this.helpService.stopTour();
    this.announceToScreenReader('Tour guiado concluído com sucesso!');
    
    // Show completion message
    this.showCompletionMessage();
  }

  private showCompletionMessage(): void {
    // This could trigger a toast notification or modal
    console.log('Tour completed successfully!');
  }

  currentStep(): TourStep | undefined {
    return this.tourSteps[this.currentStepIndex()];
  }

  totalSteps(): number {
    return this.tourSteps.length;
  }

  progressPercentage(): number {
    return ((this.currentStepIndex() + 1) / this.totalSteps()) * 100;
  }

  private announceToScreenReader(message: string): void {
    const announcement = this.renderer.createElement('div');
    this.renderer.setAttribute(announcement, 'aria-live', 'polite');
    this.renderer.setAttribute(announcement, 'aria-atomic', 'true');
    this.renderer.addClass(announcement, 'sr-only');
    this.renderer.setProperty(announcement, 'textContent', message);
    
    this.renderer.appendChild(document.body, announcement);
    
    setTimeout(() => {
      this.renderer.removeChild(document.body, announcement);
    }, 1000);
  }

  // Expose signals for template
  getIsActive(): boolean {
    return this.isActive();
  }

  getCurrentStepIndex(): number {
    return this.currentStepIndex();
  }

  getSpotlightPosition(): { top: number; left: number; width: number; height: number } {
    return this.spotlightPosition();
  }

  getTooltipPosition(): { top: number; left: number } {
    return this.tooltipPosition();
  }
}