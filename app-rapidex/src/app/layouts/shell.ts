import { Component, inject } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderBarComponent } from '@shared/ui/header/header';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, NgIf, RouterOutlet, HeaderBarComponent],
  templateUrl: './shell.html',
  styleUrls: ['./shell.scss']
})
export class ShellComponent {
  private router = inject(Router);
  isLoginPage(): boolean {
    return this.router.url.startsWith('/auth/login');
  }
}
