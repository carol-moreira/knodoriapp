import { Component, computed, inject, signal } from "@angular/core";
import {
  ComunicadoModalComponent,
  type ComunicadoConfirm,
} from "@/components/gom/comunicado-modal/comunicado-modal.component";
import { ResumoFinanceiroComponent } from "@/components/gom/resumo-financeiro/resumo-financeiro.component";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";

/** Rota "/gom/financeiro". */
@Component({
  selector: "app-gom-financeiro-page",
  imports: [ResumoFinanceiroComponent, ComunicadoModalComponent],
  templateUrl: "./gom-financeiro.page.html",
  styleUrl: "./gom-financeiro.page.scss",
})
export class GomFinanceiroPage {
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
