import { Component, computed, inject, signal } from "@angular/core";
import { Calculator } from "lucide-angular";
import {
  ComunicadoModalComponent,
  type ComunicadoConfirm,
} from "@/components/gom/comunicado-modal/comunicado-modal.component";
import { ResumoFinanceiroComponent } from "@/components/gom/resumo-financeiro/resumo-financeiro.component";
import { SimuladorCotacaoComponent } from "@/components/joiner/simulador-cotacao/simulador-cotacao.component";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
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

  private readonly pedidos = inject(PedidosMercariService);
  protected readonly solicitacoes = this.pedidos.solicitacoes;
  protected readonly comunicandoId = signal<string | null>(null);

  protected readonly comunicandoSol = computed(
    () => this.solicitacoes().find((s) => s.id === this.comunicandoId()) ?? null,
  );

  protected handleConfirmar({ id }: ComunicadoConfirm): void {
    this.pedidos.alterarStatus(id, "PAGO");
    this.comunicandoId.set(null);
  }
}
