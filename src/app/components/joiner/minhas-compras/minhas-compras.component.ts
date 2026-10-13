import { Component, computed, signal } from "@angular/core";
import { Package } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { MOCK_PEDIDOS, type PedidoJoiner } from "./minhas-compras.model";
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
  protected readonly icons = { Package };

  protected readonly pedidos = signal<PedidoJoiner[]>(MOCK_PEDIDOS);
  protected readonly repassePedido = signal<PedidoJoiner | null>(null);
  protected readonly envioPedido = signal<PedidoJoiner | null>(null);

  protected readonly ativos = computed(() => this.pedidos().filter((p) => p.status !== "CHEGOU"));
}
