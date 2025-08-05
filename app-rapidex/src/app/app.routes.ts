import { Routes } from "@angular/router";
import { authGuard } from "@core/guards/auth.guard";
export const routes: Routes = [
  { path: "", redirectTo: "auth/login", pathMatch: "full" },
  { path: "auth/login", loadComponent: () => import("@features/auth/login/login.component").then(m => m.LoginComponent) },
  { path: "dashboard", canActivate: [authGuard], loadComponent: () => import("@features/dashboard/dashboard.component").then(m => m.DashboardComponent) },
  { path: "**", redirectTo: "auth/login" }
];
