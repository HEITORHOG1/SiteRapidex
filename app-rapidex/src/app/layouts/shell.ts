import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderBarComponent } from '@shared/ui/header/header';
import { SidebarComponent } from '@shared/ui/sidebar/sidebar';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderBarComponent, SidebarComponent],
  templateUrl: './shell.html',
  styleUrls: ['./shell.scss']
})
export class ShellComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  
  isLoginPage = computed(() => this.router.url.startsWith('/auth/login'));
  isAuthenticated = computed(() => this.auth.isAuthenticated());
}
