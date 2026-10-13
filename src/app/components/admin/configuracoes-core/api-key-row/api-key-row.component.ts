import { Component, computed, input, output, signal } from "@angular/core";
import { CheckCircle2, Copy, Eye, EyeOff, RefreshCw } from "lucide-angular";
import type { ApiKey } from "@/lib/admin-types";
import { IconDirective } from "@/shared/icon.directive";
import { fmtDatetime } from "../configuracoes.utils";

/** Linha de chave de API (mascarar, revelar, copiar, regenerar). */
@Component({
  selector: "app-api-key-row",
  imports: [IconDirective],
  templateUrl: "./api-key-row.component.html",
  styleUrl: "./api-key-row.component.scss",
})
export class ApiKeyRowComponent {
  readonly apiKey = input.required<ApiKey>();
  readonly regenerate = output<void>();

  protected readonly icons = { CheckCircle2, Copy, Eye, EyeOff, RefreshCw };
  protected readonly fmtDatetime = fmtDatetime;

  protected readonly visible = signal(false);
  protected readonly copied = signal(false);

  protected readonly exibida = computed(() => {
    const valor = this.apiKey().valor;
    const mascarada = valor.slice(0, 8) + "•".repeat(16) + valor.slice(-4);
    return this.visible() ? valor : mascarada;
  });

  protected handleCopy(): void {
    void navigator.clipboard.writeText(this.apiKey().valor);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
