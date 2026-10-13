import { Component, effect, inject } from "@angular/core";
import { Router } from "@angular/router";
import { dashboardForRole } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";
import { OnboardingScreenComponent } from "@/components/auth/onboarding-screen/onboarding-screen.component";
import { SpinnerComponent } from "@/shared/spinner/spinner.component";

/** Rota "/onboarding". */
@Component({
  selector: "app-onboarding-page",
  imports: [OnboardingScreenComponent, SpinnerComponent],
  templateUrl: "./onboarding.page.html",
  styleUrl: "./onboarding.page.scss",
})
export class OnboardingPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const status = this.auth.status();
      const user = this.auth.user();
      const needsOnboarding = this.auth.needsOnboarding();

      if (status === "loading") return;
      // Não autenticada → login
      if (status === "unauthenticated" || !user) {
        void this.router.navigateByUrl("/login", { replaceUrl: true });
        return;
      }
      // Já completou onboarding → vai para o dashboard
      if (!needsOnboarding) {
        void this.router.navigateByUrl(dashboardForRole(user.role), { replaceUrl: true });
      }
    });
  }

  protected handleComplete(): void {
    const user = this.auth.user();
    if (user) void this.router.navigateByUrl(dashboardForRole(user.role), { replaceUrl: true });
  }
}
