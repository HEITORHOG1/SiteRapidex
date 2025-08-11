import { Component, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { AuthService } from "@core/services/auth.service";

@Component({
  selector: "rx-header",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./header.html",
  styleUrls: ["./header.scss"]
})
export class HeaderBarComponent {
  private auth = inject(AuthService);
  
  isAuth = computed(() => this.auth.isAuthenticated());
  displayName = computed(() => this.auth.user()?.nomeUsuario || this.auth.user()?.userName || "Usuário");
  role = computed(() => this.auth.roles()[0] || "");
  
  logout() { 
    this.auth.logout(); 
  }
}
