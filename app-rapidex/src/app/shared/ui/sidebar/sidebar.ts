import { Component, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, RouterLinkActive, Router } from "@angular/router";
import { AuthService } from "@core/services/auth.service";

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: "rx-sidebar",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: "./sidebar.html",
  styleUrls: ["./sidebar.scss"]
})
export class SidebarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  isCollapsed = signal(false);
  isMobile = signal(window.innerWidth < 768);

  isAuth = computed(() => this.auth.isAuthenticated());
  displayName = computed(() => this.auth.user()?.nomeUsuario || this.auth.user()?.userName || "Usuário");
  userRole = computed(() => this.auth.roles()[0] || "");

  menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      icon: "📊",
      route: "/dashboard"
    },
    {
      label: "Categorias",
      icon: "📂",
      route: "/categories",
      roles: ["Proprietario", "Admin"]
    },
    {
      label: "Produtos",
      icon: "📦",
      route: "/products",
      roles: ["Proprietario", "Admin"]
    },
    {
      label: "Pedidos",
      icon: "🛒",
      route: "/orders"
    },
    {
      label: "Relatórios",
      icon: "📈",
      route: "/reports",
      roles: ["Proprietario", "Admin"]
    }
  ];

  constructor() {
    // Listen for window resize
    window.addEventListener('resize', () => {
      this.isMobile.set(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        this.isCollapsed.set(false);
      }
    });
  }

  toggleSidebar() {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  closeSidebar() {
    if (this.isMobile()) {
      this.isCollapsed.set(true);
    }
  }

  hasPermission(item: MenuItem): boolean {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    
    const userRoles = this.auth.roles();
    return item.roles.some(role => userRoles.includes(role));
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  getVisibleMenuItems() {
    return this.menuItems.filter(item => this.hasPermission(item));
  }
}