import { Component, computed, inject, signal } from "@angular/core";
import { Boxes, CheckCircle2, Lock, Truck, Wallet, Warehouse } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { NumberValueDirective } from "@/shared/number-value.directive";
import { CegsService } from "@/services/cegs.service";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { CEG_STATUS_META, brl, type CegGOM } from "../../gerenciamento-cegs/cegs.model";

/** Etapas da caixa, derivadas do status da CEG + cobrança. */
const ETAPAS_CAIXA = ["aberta", "fechada", "frete cobrado", "chegou na GOM", "envio liberado"];

type Acao = "fechar" | "chegou" | "liberar";

@Component({
  selector: "app-caixas-mercari",
  imports: [IconDirective, NumberValueDirective],
  templateUrl: "./caixas-mercari.component.html",
  styleUrl: "./caixas-mercari.component.scss",
})
export class CaixasMercariComponent {
  private readonly cegsService = inject(CegsService);
  protected readonly pedidos = inject(PedidosMercariService);

  protected readonly icons = { Boxes, CheckCircle2, Lock, Truck, Wallet, Warehouse };
  protected readonly CEG_STATUS_META = CEG_STATUS_META;
  protected readonly etapas = ETAPAS_CAIXA;
  protected readonly brl = brl;

  /** Caixas em andamento primeiro; finalizadas por último. */
  protected readonly caixas = computed(() =>
    [...this.cegsService.caixasMercari()].sort(
      (a, b) => Number(a.status === "FINALIZADA") - Number(b.status === "FINALIZADA"),
    ),
  );

  protected readonly confirmando = signal<{ cegId: string; acao: Acao } | null>(null);
  protected readonly cobrandoId = signal<string | null>(null);
  protected readonly freteTotal = signal(0);
  protected readonly taxaPorJoiner = signal(0);

  protected etapaAtual(c: CegGOM): number {
    switch (c.status) {
      case "ABERTA":
        return 0;
      case "TRANSITO":
        return c.cobranca ? 2 : 1;
      case "CHEGOU_BR":
        return 3;
      case "FINALIZADA":
        return 4;
      default:
        return 0;
    }
  }

  protected totalCaixa(cegId: string): number {
    return this.pedidos.pedidosDaCaixa(cegId).reduce((t, s) => t + s.valorBrl, 0);
  }

  protected pedirConfirmacao(cegId: string, acao: Acao): void {
    this.confirmando.set({ cegId, acao });
  }

  protected estaConfirmando(cegId: string, acao: Acao): boolean {
    const c = this.confirmando();
    return c?.cegId === cegId && c.acao === acao;
  }

  protected executar(cegId: string, acao: Acao): void {
    if (acao === "fechar") this.pedidos.fecharCaixa(cegId);
    if (acao === "chegou") this.pedidos.caixaChegou(cegId);
    if (acao === "liberar") this.pedidos.liberarEnvio(cegId);
    this.confirmando.set(null);
  }

  protected abrirCobranca(cegId: string): void {
    this.cobrandoId.set(cegId);
    this.freteTotal.set(0);
    this.taxaPorJoiner.set(0);
  }

  /** Prévia do valor por joiner: frete rateado igualmente + taxa. */
  protected previaPorJoiner(cegId: string): number {
    const n = this.pedidos.joinersDaCaixa(cegId).length || 1;
    return this.freteTotal() / n + this.taxaPorJoiner();
  }

  protected cobrar(cegId: string): void {
    const frete = this.freteTotal();
    const taxa = this.taxaPorJoiner();
    if (frete <= 0 && taxa <= 0) return;
    this.pedidos.cobrarFreteTaxas(cegId, frete, taxa);
    this.cobrandoId.set(null);
  }
}
