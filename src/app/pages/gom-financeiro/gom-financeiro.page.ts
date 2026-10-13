import { Component, computed, signal } from "@angular/core";
import { Calculator } from "lucide-angular";
import {
  ComunicadoModalComponent,
  type ComunicadoConfirm,
} from "@/components/gom/comunicado-modal/comunicado-modal.component";
import { ResumoFinanceiroComponent } from "@/components/gom/resumo-financeiro/resumo-financeiro.component";
import { SimuladorCotacaoComponent } from "@/components/joiner/simulador-cotacao/simulador-cotacao.component";
import { MOCK_SOLICITACOES, type SolicitacaoGOM } from "@/lib/gom-types";
import { IconDirective } from "@/shared/icon.directive";

/** Rota "/gom/financeiro". */
@Component({
  selector: "app-gom-financeiro-page",
  imports: [
    IconDirective,
    ResumoFinanceiroComponent,
    ComunicadoModalComponent,
    SimuladorCotacaoComponent,
  ],
  templateUrl: "./gom-financeiro.page.html",
  styleUrl: "./gom-financeiro.page.scss",
})
export class GomFinanceiroPage {
  protected readonly icons = { Calculator };

  // 🔌 substituir por HttpClient.get(`/api/gom/${gomId}/solicitacoes`)
  protected readonly solicitacoes = signal<SolicitacaoGOM[]>(MOCK_SOLICITACOES);
  protected readonly comunicandoId = signal<string | null>(null);

  protected readonly comunicandoSol = computed(
    () => this.solicitacoes().find((s) => s.id === this.comunicandoId()) ?? null,
  );

  protected handleConfirmar({ id }: ComunicadoConfirm): void {
    // 🔌 await fetch(`/api/gom/${gomId}/solicitacoes/${id}`, { method: "PATCH", body: JSON.stringify({ status: "COMPRADO" }) })
    this.solicitacoes.update((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "COMPRADO" as const } : s)),
    );
    this.comunicandoId.set(null);
  }
}
