import { Component, computed, inject, signal } from "@angular/core";
import { CaixasMercariComponent } from "@/components/gom/fila-mercari/caixas-mercari/caixas-mercari.component";
import {
  ConfirmarCompraModalComponent,
  type ConfirmarCompra,
} from "@/components/gom/fila-mercari/confirmar-compra-modal/confirmar-compra-modal.component";
import {
  FilaMercariComponent,
  type StatusChange,
} from "@/components/gom/fila-mercari/fila-mercari.component";
import { ImageLightboxComponent } from "@/components/joiner/minhas-compras/image-lightbox/image-lightbox.component";
import type { SolicitacaoGOM } from "@/lib/gom-types";
import { CegsService } from "@/services/cegs.service";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";

/** Rota "/gom/fila". */
@Component({
  selector: "app-gom-fila-page",
  imports: [
    FilaMercariComponent,
    CaixasMercariComponent,
    ConfirmarCompraModalComponent,
    ImageLightboxComponent,
  ],
  templateUrl: "./gom-fila.page.html",
  styleUrl: "./gom-fila.page.scss",
})
export class GomFilaPage {
  private readonly pedidos = inject(PedidosMercariService);
  protected readonly cegs = inject(CegsService);

  protected readonly solicitacoes = this.pedidos.solicitacoes;
  protected readonly confirmandoId = signal<string | null>(null);
  protected readonly proofPedido = signal<SolicitacaoGOM | null>(null);

  protected readonly confirmandoSol = computed(
    () => this.solicitacoes().find((s) => s.id === this.confirmandoId()) ?? null,
  );
  protected readonly proximaCaixa = computed(
    () => `caixa mercari ${this.cegs.caixasMercari().length + 1}`,
  );

  protected handleStatusChange({ id, novoStatus }: StatusChange): void {
    // Compra confirmada exige proof + caixa → abre o modal
    if (novoStatus === "COMPRADO") {
      this.confirmandoId.set(id);
      return;
    }
    this.pedidos.alterarStatus(id, novoStatus);
  }

  protected handleConfirmarCompra({ id, proofs, cegId }: ConfirmarCompra): void {
    const caixaId = cegId === "NOVA" ? this.cegs.novaCaixaMercari().id : cegId;
    this.pedidos.confirmarCompra(id, proofs, caixaId);
    this.confirmandoId.set(null);
  }
}
