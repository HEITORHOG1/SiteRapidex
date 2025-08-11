import { Routes } from "@angular/router";
import { ShellComponent } from "./layouts/shell";

export const routes: Routes = [
  { 
    path: "", 
    redirectTo: "dashboard", 
    pathMatch: "full" 
  },
  {
    path: "",
    component: ShellComponent,
    children: [
      { 
        path: "auth", 
        loadChildren: () => import("@features/auth/auth.routes").then(m => m.authRoutes)
      },
      { 
        path: "dashboard", 
        loadChildren: () => import("@features/dashboard/dashboard.routes").then(m => m.dashboardRoutes)
      },
      { 
        path: "categories", 
        loadChildren: () => import("@features/categories/categories.routes").then(m => m.CATEGORY_ROUTES)
      }
    ]
  },
  { 
    path: "**", 
    redirectTo: "dashboard" 
  }
];
