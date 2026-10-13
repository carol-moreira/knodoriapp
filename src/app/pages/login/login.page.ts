import { Component, effect, inject } from "@angular/core";
import { Router } from "@angular/router";
import { dashboardForRole } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";
import { AuthScreenComponent } from "@/components/auth/auth-screen/auth-screen.component";

/** Rota "/login". */
@Component({
  selector: "app-login-page",
  imports: [AuthScreenComponent],
  templateUrl: "./login.page.html",
  styleUrl: "./login.page.scss",
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // Se já está autenticada, redireciona
    effect(() => {
      const user = this.auth.user();
      if (this.auth.status() !== "authenticated" || !user) return;
      this.goToNext();
    });
  }

  protected handleSuccess(): void {
    if (!this.auth.user()) return;
    this.goToNext();
  }

  private goToNext(): void {
    const user = this.auth.user();
    if (!user) return;
    if (this.auth.needsOnboarding()) {
      void this.router.navigateByUrl("/onboarding", { replaceUrl: true });
    } else {
      void this.router.navigateByUrl(dashboardForRole(user.role), { replaceUrl: true });
    }
  }
}
