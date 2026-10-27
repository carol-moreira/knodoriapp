import { Component, inject, input, linkedSignal } from "@angular/core";
import { Router } from "@angular/router";
import { Percent, Users, type LucideIconData } from "lucide-angular";
import { CONFIG_TAXAS_DEFAULT } from "@/lib/gom-types";
import { IconDirective } from "@/shared/icon.directive";
import { PainelTaxasComponent } from "../painel-taxas/painel-taxas.component";
import { ComunidadeAjustesComponent } from "./comunidade-ajustes/comunidade-ajustes.component";

type Aba = "comunidade" | "taxas";

const ABAS: { value: Aba; label: string; icon: LucideIconData }[] = [
  { value: "comunidade", label: "comunidade & admins", icon: Users },
  { value: "taxas", label: "taxas", icon: Percent },
];

/**
 * Rota "/gom/ajustes" — comunidade (admins) e taxas.
 * Perfil e aparência ficam no modal de configurações de perfil (menu do avatar).
 */
@Component({
  selector: "app-ajustes",
  imports: [IconDirective, PainelTaxasComponent, ComunidadeAjustesComponent],
  templateUrl: "./ajustes.component.html",
  styleUrl: "./ajustes.component.scss",
})
export class AjustesComponent {
  /** Query param `?aba=` — abre direto numa aba (ex.: ?aba=taxas). */
  readonly aba = input<string | undefined>();

  private readonly router = inject(Router);

  protected readonly abas = ABAS;
  // 🔌 GET /api/gom/config-taxas
  protected readonly configTaxas = CONFIG_TAXAS_DEFAULT;

  protected readonly atual = linkedSignal<Aba>(() => {
    const aba = this.aba();
    return ABAS.some((a) => a.value === aba) ? (aba as Aba) : "comunidade";
  });

  protected selecionar(aba: Aba): void {
    this.atual.set(aba);
    void this.router.navigate([], { queryParams: { aba }, replaceUrl: true });
  }

  protected abaClass(aba: Aba): string {
    return `flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-medium transition ${
      this.atual() === aba
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground hover:text-foreground"
    }`;
  }
}
