import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LoadingSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'rx-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading.html',
  styleUrl: './loading.scss'
})
export class LoadingSpinnerComponent {
  @Input() size: LoadingSize = 'medium';
  @Input() message?: string;
  @Input() overlay: boolean = false;
}
