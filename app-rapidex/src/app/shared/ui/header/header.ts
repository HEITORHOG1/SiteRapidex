import { Component, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { AuthService } from "@core/services/auth.service";

@Component({
  selector: "rx-header",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <header class="topbar">
    <a routerLink="/">Rapidex</a>
    <nav>
      <a routerLink="/dashboard">Dashboard</a>
      <a routerLink="/auth/login" *ngIf="!isAuth()">Login</a>
      <span *ngIf="isAuth()">{{ displayName() }} ({{ role() }})</span>
      <button *ngIf="isAuth()" (click)="logout()">Sair</button>
    </nav>
  </header>
  `,
  styles: [`.topbar{display:flex;justify-content:space-between;padding:8px 16px;border-bottom:1px solid #ddd}`]
})
export class HeaderBarComponent {
  private auth = inject(AuthService);
  isAuth = () => this.auth.isAuthenticated();
  displayName = computed(() => this.auth.user()?.nomeUsuario || this.auth.user()?.userName || "Usuário");
  role = () => (this.auth.roles()[0] || "");
  logout(){ this.auth.logout(); }
}
