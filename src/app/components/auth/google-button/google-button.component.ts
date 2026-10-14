import { Component, inject, output, signal } from "@angular/core";
import { Loader2 } from "lucide-angular";
import { AuthService } from "@/services/auth.service";
import { IconDirective } from "@/shared/icon.directive";

@Component({
  selector: "app-google-button",
  imports: [IconDirective],
  templateUrl: "./google-button.component.html",
  styleUrl: "./google-button.component.scss",
})
export class GoogleButtonComponent {
  readonly success = output<void>();

  private readonly auth = inject(AuthService);

  protected readonly icons = { Loader2 };
  protected readonly loading = signal(false);
  protected readonly error = signal("");

  protected async handleClick(): Promise<void> {
    this.loading.set(true);
    this.error.set("");
    try {
      await this.auth.signInWithGoogle();
      this.success.emit();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "erro desconhecido.");
    } finally {
      this.loading.set(false);
    }
  }
}
