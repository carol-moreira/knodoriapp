import { Component, effect, inject } from "@angular/core";
import { Router } from "@angular/router";
import { dashboardForRole } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";
import { SpinnerComponent } from "@/shared/spinner/spinner.component";

/** Rota "/" — redireciona conforme a sessão. */
@Component({
  selector: "app-root-redirect-page",
  imports: [SpinnerComponent],
  templateUrl: "./root-redirect.page.html",
  styleUrl: "./root-redirect.page.scss",
})
export class RootRedirectPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const status = this.auth.status();
      const user = this.auth.user();
      const needsOnboarding = this.auth.needsOnboarding();

      if (status === "loading") return;

      if (status === "unauthenticated" || !user) {
        void this.router.navigateByUrl("/login", { replaceUrl: true });
        return;
      }

      if (needsOnboarding) {
        void this.router.navigateByUrl("/onboarding", { replaceUrl: true });
        return;
      }

      void this.router.navigateByUrl(dashboardForRole(user.role), { replaceUrl: true });
    });
  }
}
