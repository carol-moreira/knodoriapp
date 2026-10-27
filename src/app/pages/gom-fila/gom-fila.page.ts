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
import type { Comprovante } from "@/lib/comprovante";
import type { SolicitacaoGOM } from "@/lib/gom-types";
import { CegsService } from "@/services/cegs.service";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { ComprovanteService } from "@/shared/comprovante/comprovante.service";

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
  private readonly comprovantes = inject(ComprovanteService);
  protected readonly cegs = inject(CegsService);

  protected readonly solicitacoes = this.pedidos.solicitacoes;
  protected readonly confirmandoId = signal<string | null>(null);
  protected readonly proofPedido = signal<SolicitacaoGOM | null>(null);
  /** Comprovante anexado ao pular o pagamento direto para "compra confirmada". */
  private comprovanteDaCompra: Comprovante | undefined;

  protected readonly confirmandoSol = computed(
    () => this.solicitacoes().find((s) => s.id === this.confirmandoId()) ?? null,
  );
  protected readonly proximaCaixa = computed(
    () => `caixa mercari ${this.cegs.caixasMercari().length + 1}`,
  );

  protected async handleStatusChange({ id, novoStatus }: StatusChange): Promise<void> {
    const atual = this.solicitacoes().find((s) => s.id === id);
    if (!atual) return;
    // Passar por "pago" exige o comprovante (o da joiner, para conferir, ou um anexado agora)
    let comprovante: Comprovante | undefined;
    if (this.pedidos.cruzaPagamento(atual.status, novoStatus)) {
      const r = await this.comprovantes.pedir({
        titulo: `pagamento de ${atual.joinerUsername}`,
        mensagem: atual.comprovantes?.length
          ? "confira o comprovante que a joiner enviou antes de marcar como pago."
          : "anexe o comprovante do pagamento que você recebeu.",
        valor: atual.valorBrl,
        existentes: atual.comprovantes,
        confirmar: "confirmar pagamento",
      });
      if (!r) return;
      comprovante = r.comprovante;
    }
    // Compra confirmada exige proof + caixa → abre o modal
    if (novoStatus === "COMPRADO") {
      this.comprovanteDaCompra = comprovante;
      this.confirmandoId.set(id);
      return;
    }
    this.pedidos.alterarStatus(id, novoStatus, comprovante);
  }

  protected handleConfirmarCompra({ id, proofs, cegId }: ConfirmarCompra): void {
    const caixaId = cegId === "NOVA" ? this.cegs.novaCaixaMercari().id : cegId;
    this.pedidos.confirmarCompra(id, proofs, caixaId, this.comprovanteDaCompra);
    this.fecharCompra();
  }

  protected fecharCompra(): void {
    this.comprovanteDaCompra = undefined;
    this.confirmandoId.set(null);
  }
}
