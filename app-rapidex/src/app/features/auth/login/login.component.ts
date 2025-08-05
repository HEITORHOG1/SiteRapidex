import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "@core/services/auth.service";

@Component({
  selector: "rx-login",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = "";
  password = "";
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (!this.username || !this.password || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl("/dashboard");
      },
      error: (e) => {
        this.loading.set(false);
        const msg = e?.error?.message || e?.error || "Falha no login";
        this.error.set(typeof msg === "string" ? msg : "Falha no login");
      }
    });
  }
}
