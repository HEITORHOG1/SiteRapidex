import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ErrorType = 'error' | 'warning' | 'info';

@Component({
  selector: 'rx-error-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-message.html',
  styleUrl: './error-message.scss'
})
export class ErrorMessageComponent {
  @Input() message: string = '';
  @Input() type: ErrorType = 'error';
  @Input() showRetry: boolean = false; // Deprecated for always-online app
  @Input() retryText: string = 'Recarregar página';
  @Input() dismissible: boolean = false;
  
  @Output() retry = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();

  onRetry(): void {
    // Always-online app: suggest page reload for network issues
    if (this.message.includes('conexão') || this.message.includes('internet')) {
      window.location.reload();
    } else {
      this.retry.emit();
    }
  }

  onDismiss(): void {
    this.dismiss.emit();
  }

  get iconPath(): string {
    switch (this.type) {
      case 'error':
        return 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z';
      case 'warning':
        return 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z';
      case 'info':
        return 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z';
      default:
        return '';
    }
  }
}