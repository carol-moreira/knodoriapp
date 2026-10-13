import { Component, computed, inject, output, signal } from "@angular/core";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-angular";
import { isValidEmail } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { inputCls, labelCls } from "../auth-form.styles";

@Component({
  selector: "app-login-form",
  imports: [IconDirective],
  templateUrl: "./login-form.component.html",
  styleUrl: "./login-form.component.scss",
})
export class LoginFormComponent {
  readonly success = output<void>();

  private readonly auth = inject(AuthService);

  protected readonly icons = { AlertCircle, Eye, EyeOff, Loader2 };
  protected readonly labelCls = labelCls;
  protected readonly inputCls = inputCls;
  protected readonly val = inputValue;

  protected readonly email = signal("");
  protected readonly password = signal("");
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal("");

  // Erros de validação por campo
  protected readonly touched = signal({ email: false, password: false });
  protected readonly emailError = computed(() =>
    this.touched().email && !isValidEmail(this.email()) ? "E-mail inválido." : "",
  );
  protected readonly passwordError = computed(() =>
    this.touched().password && this.password().length < 8 ? "Mínimo de 8 caracteres." : "",
  );

  protected readonly canSubmit = computed(
    () => isValidEmail(this.email()) && this.password().length >= 8 && !this.loading(),
  );

  protected touch(field: "email" | "password"): void {
    this.touched.update((t) => ({ ...t, [field]: true }));
  }

  protected forgotPassword(): void {
    // 🔌 Implementar fluxo de recuperação de senha
    alert("Função de recuperação em breve ♡");
  }

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.touched.set({ email: true, password: true });
    if (!this.canSubmit()) return;

    this.loading.set(true);
    this.error.set("");
    try {
      await this.auth.signInWithEmail(this.email(), this.password());
      this.success.emit();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Erro ao fazer login.");
    } finally {
      this.loading.set(false);
    }
  }
}
