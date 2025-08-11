import { Component, Input, OnInit, OnDestroy, ElementRef, Renderer2, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryHelpService, HelpContent } from '../../services/category-help.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-help-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="help-tooltip-trigger"
      [attr.data-help-id]="helpId"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
      (focus)="onFocus()"
      (blur)="onBlur()"
      (click)="onClick()">
      <ng-content></ng-content>
      
      <!-- Help Icon -->
      <button 
        *ngIf="showIcon"
        class="help-icon"
        type="button"
        [attr.aria-label]="'Ajuda: ' + (helpContent?.title || 'Informações adicionais')"
        (click)="toggleTooltip($event)">
        <i class="fas fa-question-circle" aria-hidden="true"></i>
      </button>
    </div>

    <!-- Tooltip Content -->
    <div 
      *ngIf="isVisible() && helpContent"
      class="help-tooltip-content"
      [class]="'position-' + (helpContent.position || 'top')"
      role="tooltip"
      [attr.aria-describedby]="helpId + '-tooltip'"
      [id]="helpId + '-tooltip'">
      
      <div class="tooltip-arrow"></div>
      
      <div class="tooltip-header" *ngIf="helpContent.title">
        <h4 class="tooltip-title">{{ helpContent.title }}</h4>
        <button 
          class="tooltip-close"
          type="button"
          aria-label="Fechar ajuda"
          (click)="hideTooltip()">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
      
      <div class="tooltip-body">
        <p [innerHTML]="helpContent.content"></p>
      </div>
      
      <div class="tooltip-footer" *ngIf="showActions">
        <button 
          class="btn btn-sm btn-outline-primary"
          type="button"
          (click)="showMoreHelp()">
          Mais Ajuda
        </button>
        <button 
          class="btn btn-sm btn-outline-secondary"
          type="button"
          (click)="startTour()">
          Tour Guiado
        </button>
      </div>
    </div>

    <!-- Overlay for click-outside detection -->
    <div 
      *ngIf="isVisible() && helpContent?.trigger === 'click'"
      class="tooltip-overlay"
      (click)="hideTooltip()">
    </div>
  `,
  styles: [`
    .help-tooltip-trigger {
      position: relative;
      display: inline-block;
    }

    .help-icon {
      background: none;
      border: none;
      color: #6c757d;
      font-size: 0.875rem;
      margin-left: 0.25rem;
      padding: 0.125rem;
      cursor: pointer;
      transition: color 0.2s ease;
      border-radius: 50%;
    }

    .help-icon:hover,
    .help-icon:focus {
      color: #007bff;
      background-color: rgba(0, 123, 255, 0.1);
      outline: none;
    }

    .help-tooltip-content {
      position: absolute;
      z-index: 1060;
      background: #fff;
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
      max-width: 300px;
      min-width: 200px;
      font-size: 0.875rem;
      line-height: 1.4;
      animation: tooltipFadeIn 0.2s ease-out;
    }

    @keyframes tooltipFadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* Positioning */
    .position-top {
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 0.5rem;
    }

    .position-bottom {
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 0.5rem;
    }

    .position-left {
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      margin-right: 0.5rem;
    }

    .position-right {
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      margin-left: 0.5rem;
    }

    /* Arrows */
    .tooltip-arrow {
      position: absolute;
      width: 0;
      height: 0;
      border: 0.5rem solid transparent;
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

    .tooltip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem 0.5rem;
      border-bottom: 1px solid #dee2e6;
    }

    .tooltip-title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: #495057;
    }

    .tooltip-close {
      background: none;
      border: none;
      color: #6c757d;
      font-size: 0.75rem;
      padding: 0.125rem;
      cursor: pointer;
      border-radius: 0.25rem;
    }

    .tooltip-close:hover {
      color: #495057;
      background-color: #f8f9fa;
    }

    .tooltip-body {
      padding: 0.75rem 1rem;
    }

    .tooltip-body p {
      margin: 0;
      color: #6c757d;
    }

    .tooltip-footer {
      padding: 0.5rem 1rem 0.75rem;
      border-top: 1px solid #dee2e6;
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .tooltip-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1059;
      background: transparent;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .help-tooltip-content {
        max-width: 280px;
        font-size: 0.8rem;
      }

      .tooltip-footer {
        flex-direction: column;
      }

      .tooltip-footer .btn {
        width: 100%;
      }
    }

    /* High contrast mode */
    @media (prefers-contrast: high) {
      .help-tooltip-content {
        border: 2px solid #000;
        background: #fff;
      }

      .help-icon {
        border: 1px solid #000;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .help-tooltip-content {
        animation: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpTooltipComponent implements OnInit, OnDestroy {
  @Input() helpId!: string;
  @Input() showIcon = true;
  @Input() showActions = false;
  @Input() trigger: 'hover' | 'click' | 'focus' = 'hover';
  @Input() delay = 500; // Delay in milliseconds before showing tooltip

  helpContent: HelpContent | undefined;
  protected isVisible = signal(false);
  private destroy$ = new Subject<void>();
  private showTimeout: any;
  private hideTimeout: any;

  constructor(
    private helpService: CategoryHelpService,
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.helpContent = this.helpService.getHelpContent(this.helpId);
    
    if (this.helpContent) {
      // Override trigger if specified in help content
      if (this.helpContent.trigger) {
        this.trigger = this.helpContent.trigger;
      }

      // Set up accessibility attributes
      this.setupAccessibility();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearTimeouts();
  }

  private setupAccessibility(): void {
    const element = this.elementRef.nativeElement;
    
    // Add aria-describedby if not already present
    if (!element.getAttribute('aria-describedby')) {
      this.renderer.setAttribute(element, 'aria-describedby', `${this.helpId}-tooltip`);
    }

    // Add role if not already present
    if (!element.getAttribute('role')) {
      this.renderer.setAttribute(element, 'role', 'button');
    }
  }

  onMouseEnter(): void {
    if (this.trigger === 'hover') {
      this.scheduleShow();
    }
  }

  onMouseLeave(): void {
    if (this.trigger === 'hover') {
      this.scheduleHide();
    }
  }

  onFocus(): void {
    if (this.trigger === 'focus') {
      this.scheduleShow();
    }
  }

  onBlur(): void {
    if (this.trigger === 'focus') {
      this.scheduleHide();
    }
  }

  onClick(): void {
    if (this.trigger === 'click') {
      this.toggleTooltip();
    }
  }

  toggleTooltip(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (this.isVisible()) {
      this.hideTooltip();
    } else {
      this.showTooltip();
    }
  }

  private scheduleShow(): void {
    this.clearTimeouts();
    this.showTimeout = setTimeout(() => {
      this.showTooltip();
    }, this.delay);
  }

  private scheduleHide(): void {
    this.clearTimeouts();
    this.hideTimeout = setTimeout(() => {
      this.hideTooltip();
    }, 100); // Small delay to prevent flickering
  }

  showTooltip(): void {
    this.clearTimeouts();
    this.isVisible.set(true);
    this.helpService.showTooltip(this.helpId);

    // Announce to screen readers
    this.announceToScreenReader(`Ajuda disponível: ${this.helpContent?.title || 'Informações adicionais'}`);
  }

  hideTooltip(): void {
    this.clearTimeouts();
    this.isVisible.set(false);
    this.helpService.hideTooltip();
  }

  private clearTimeouts(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  showMoreHelp(): void {
    this.helpService.showHelpModal();
    this.hideTooltip();
  }

  startTour(): void {
    this.helpService.startTour();
    this.hideTooltip();
  }

  private announceToScreenReader(message: string): void {
    // Create a temporary element for screen reader announcement
    const announcement = this.renderer.createElement('div');
    this.renderer.setAttribute(announcement, 'aria-live', 'polite');
    this.renderer.setAttribute(announcement, 'aria-atomic', 'true');
    this.renderer.addClass(announcement, 'sr-only');
    this.renderer.setProperty(announcement, 'textContent', message);
    
    this.renderer.appendChild(document.body, announcement);
    
    // Remove after announcement
    setTimeout(() => {
      this.renderer.removeChild(document.body, announcement);
    }, 1000);
  }

  // Expose isVisible for template
  getIsVisible(): boolean {
    return this.isVisible();
  }
}