import { Component, computed, inject, input, model, signal } from "@angular/core";
import { ArrowRight, CheckCircle2, Repeat2 } from "lucide-angular";
import { ComprovanteChipComponent } from "@/shared/comprovante/comprovante-chip.component";
import { IconDirective } from "@/shared/icon.directive";
import { REPASSE_STATUS_META, type RepasseStatus } from "@/lib/repasse-types";
import { RepassesService } from "@/services/repasses.service";
import { brl, fmtDate, type CegGOM } from "../cegs.model";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";

/** "TODAS" = visão consolidada de todas as CEGs. */
export type FiltroRepasseCeg = string | "TODAS";

@Component({
  selector: "app-fila-repasses",
  imports: [IconDirective, AssinaturaComponent, ComprovanteChipComponent],
  templateUrl: "./fila-repasses.component.html",
  styleUrl: "./fila-repasses.component.scss",
})
export class FilaRepassesComponent {
  readonly cegs = input.required<CegGOM[]>();
  readonly cegFiltro = model<FiltroRepasseCeg>("TODAS");

  protected readonly repasses = inject(RepassesService);

  protected readonly icons = { ArrowRight, CheckCircle2, Repeat2 };
  protected readonly STATUS_META = REPASSE_STATUS_META;
  protected readonly brl = brl;
  protected readonly fmtDate = fmtDate;

  protected readonly statusFiltro = signal<RepasseStatus | "TODOS">("PENDENTE");
  protected readonly confirmandoId = signal<string | null>(null);

  /** CEGs que têm ao menos uma solicitação, com o total pendente de cada uma. */
  protected readonly cegsComRepasse = computed(() => {
    const solicitacoes = this.repasses.solicitacoes();
    return this.cegs()
      .filter((c) => solicitacoes.some((s) => s.cegId === c.id))
      .map((c) => ({ ceg: c, pendentes: this.repasses.pendentesDaCeg(c.id) }));
  });

  protected readonly linhas = computed(() => {
    const ceg = this.cegFiltro();
    const status = this.statusFiltro();
    return this.repasses
      .solicitacoes()
      .filter((s) => ceg === "TODAS" || s.cegId === ceg)
      .filter((s) => status === "TODOS" || s.status === status)
      .sort((a, b) => b.dataSolicitacao.localeCompare(a.dataSolicitacao));
  });

  protected readonly totalPendente = computed(() =>
    this.linhas()
      .filter((s) => s.status === "PENDENTE")
      .reduce((t, s) => t + s.valorBrl, 0),
  );

  protected chipClass(ativo: boolean): string {
    return `flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition ${
      ativo
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground hover:text-foreground"
    }`;
  }

  protected confirmar(id: string): void {
    this.repasses.confirmar(id);
    this.confirmandoId.set(null);
  }
}
