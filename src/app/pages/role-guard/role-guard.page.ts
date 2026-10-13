import { Component, computed, effect, inject, input } from "@angular/core";
import { Router, RouterOutlet } from "@angular/router";
import { dashboardForRole, type UserRole } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";
import { SpinnerComponent } from "@/shared/spinner/spinner.component";

/**
 * Layout de rota protegido por role (antes: AdminGuard / GomGuard / JoinerGuard).
 * Reage à sessão em tempo real: se a usuária sair ou o role mudar, redireciona.
 * O role exigido vem de `data.role` da rota (via withComponentInputBinding).
 */
@Component({
  selector: "app-role-guard-page",
  imports: [RouterOutlet, SpinnerComponent],
  templateUrl: "./role-guard.page.html",
  styleUrl: "./role-guard.page.scss",
})
export class RoleGuardPage {
  readonly role = input.required<UserRole>();

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly allowed = computed(() => this.auth.user()?.role === this.role());

  constructor() {
    effect(() => {
      const status = this.auth.status();
      const user = this.auth.user();
      const needsOnboarding = this.auth.needsOnboarding();
      const role = this.role();

      if (status === "loading") return;
      if (!user) {
        void this.router.navigateByUrl("/login", { replaceUrl: true });
        return;
      }
      if (needsOnboarding) {
        void this.router.navigateByUrl("/onboarding", { replaceUrl: true });
        return;
      }
      if (user.role !== role) {
        void this.router.navigateByUrl(dashboardForRole(user.role), { replaceUrl: true });
      }
    });
  }
}
