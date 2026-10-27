import { Component, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { Package, PackageCheck } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { AuthService } from "@/services/auth.service";
import { CegsService } from "@/services/cegs.service";
import { EnviosService } from "@/services/envios.service";
import { rotuloEtapa } from "@/lib/envios-types";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { toPedidoJoiner, type PedidoJoiner } from "./minhas-compras.model";
import { PedidoCardComponent } from "./pedido-card/pedido-card.component";
import { SolicitarRepasseModalComponent } from "./solicitar-repasse-modal/solicitar-repasse-modal.component";

@Component({
  selector: "app-minhas-compras",
  imports: [IconDirective, PedidoCardComponent, SolicitarRepasseModalComponent],
  templateUrl: "./minhas-compras.component.html",
  styleUrl: "./minhas-compras.component.scss",
})
export class MinhasComprasComponent {
  private readonly auth = inject(AuthService);
  private readonly cegs = inject(CegsService);
  private readonly fila = inject(PedidosMercariService);
  private readonly router = inject(Router);
  private readonly envios = inject(EnviosService);

  protected readonly icons = { Package, PackageCheck };

  /** Pedidos da joiner logada na fila Mercari da GOM (um repasse confirmado muda a dona). */
  protected readonly pedidos = computed<PedidoJoiner[]>(() => {
    const userId = this.auth.user()?.id;
    if (!userId) return [];
    return this.fila
      .solicitacoes()
      .filter((s) => s.joinerId === userId)
      .map((s) => {
        const cobranca = s.cegId ? this.cegs.porId(s.cegId)?.cobranca : undefined;
        return toPedidoJoiner(s, cobranca?.porJoiner[userId]);
      });
  });
  protected readonly repasseOpen = signal(false);
  protected readonly repassePedido = signal<PedidoJoiner | null>(null);

  protected readonly ativos = this.pedidos;

  /** Etapa do envio nacional do pedido, se já foi pedido. */
  protected envioEtapa(pedidoId: string): string | null {
    const envio = this.envios.envioDoItem(pedidoId);
    return envio ? rotuloEtapa(envio.status, envio.modalidade) : null;
  }

  /** Envio nacional: abre a página de envios já com o pedido selecionado. */
  protected solicitarEnvio(pedido: PedidoJoiner): void {
    void this.router.navigate(["/joiner/envios"], { queryParams: { pedido: pedido.id } });
  }

  protected abrirRepasse(pedido: PedidoJoiner | null): void {
    this.repassePedido.set(pedido);
    this.repasseOpen.set(true);
  }

  protected fecharRepasse(): void {
    this.repasseOpen.set(false);
    this.repassePedido.set(null);
  }
}
