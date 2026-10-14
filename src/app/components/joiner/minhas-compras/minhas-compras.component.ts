import { Component, computed, inject, signal } from "@angular/core";
import { Package, PackageCheck } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { AuthService } from "@/services/auth.service";
import { CegsService } from "@/services/cegs.service";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { toPedidoJoiner, type PedidoJoiner } from "./minhas-compras.model";
import { PedidoCardComponent } from "./pedido-card/pedido-card.component";
import { SolicitarEnvioModalComponent } from "./solicitar-envio-modal/solicitar-envio-modal.component";
import { SolicitarRepasseModalComponent } from "./solicitar-repasse-modal/solicitar-repasse-modal.component";

@Component({
  selector: "app-minhas-compras",
  imports: [
    IconDirective,
    PedidoCardComponent,
    SolicitarRepasseModalComponent,
    SolicitarEnvioModalComponent,
  ],
  templateUrl: "./minhas-compras.component.html",
  styleUrl: "./minhas-compras.component.scss",
})
export class MinhasComprasComponent {
  private readonly auth = inject(AuthService);
  private readonly cegs = inject(CegsService);
  private readonly fila = inject(PedidosMercariService);

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
  protected readonly envioPedido = signal<PedidoJoiner | null>(null);

  protected readonly ativos = this.pedidos;

  protected abrirRepasse(pedido: PedidoJoiner | null): void {
    this.repassePedido.set(pedido);
    this.repasseOpen.set(true);
  }

  protected fecharRepasse(): void {
    this.repasseOpen.set(false);
    this.repassePedido.set(null);
  }
}
