import { Component, computed, inject, output, signal } from "@angular/core";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-angular";
import { getPasswordStrength, isValidEmail } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { inputCls, labelCls } from "../auth-form.styles";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const REQUIREMENTS = [
  { label: "8+ caracteres", test: (p: string) => p.length >= 8 },
  { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Número", test: (p: string) => /[0-9]/.test(p) },
  { label: "Caractere especial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_COLORS = [
  "bg-red-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-emerald-500",
];

@Component({
  selector: "app-register-form",
  imports: [IconDirective],
  templateUrl: "./register-form.component.html",
  styleUrl: "./register-form.component.scss",
})
export class RegisterFormComponent {
  readonly success = output<void>();

  private readonly auth = inject(AuthService);

  protected readonly icons = { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 };
  protected readonly labelCls = labelCls;
  protected readonly inputCls = inputCls;
  protected readonly val = inputValue;
  protected readonly strengthColors = STRENGTH_COLORS;
  protected readonly bars = [0, 1, 2, 3];

  protected readonly email = signal("");
  protected readonly password = signal("");
  protected readonly confirm = signal("");
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal("");

  protected readonly touched = signal({ email: false, password: false, confirm: false });

  protected readonly strength = computed(() => getPasswordStrength(this.password()));
  protected readonly requirements = computed(() =>
    REQUIREMENTS.map(({ label, test }) => ({ label, ok: test(this.password()) })),
  );

  protected readonly emailError = computed(() =>
    this.touched().email && !isValidEmail(this.email()) ? "E-mail inválido." : "",
  );
  protected readonly passwordError = computed(() =>
    this.touched().password && this.password().length < 8 ? "Mínimo de 8 caracteres." : "",
  );
  protected readonly confirmError = computed(() =>
    this.touched().confirm && this.confirm() !== this.password() ? "As senhas não coincidem." : "",
  );

  protected readonly canSubmit = computed(
    () =>
      isValidEmail(this.email()) &&
      this.password().length >= 8 &&
      this.confirm() === this.password() &&
      !this.loading(),
  );

  protected touch(field: "email" | "password" | "confirm"): void {
    this.touched.update((t) => ({ ...t, [field]: true }));
  }

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.touched.set({ email: true, password: true, confirm: true });
    if (!this.canSubmit()) return;

    this.loading.set(true);
    this.error.set("");
    try {
      await this.auth.signUpWithEmail(this.email(), this.password());
      this.success.emit();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      this.loading.set(false);
    }
  }
}
