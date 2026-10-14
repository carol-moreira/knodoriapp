import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { AlertCircle, CheckCircle2, PackageCheck, Send, UserCheck, X } from "lucide-angular";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { RepassesService } from "@/services/repasses.service";
import {
  INPUT_CLS,
  ITEM_LABELS,
  brl,
  itensComQuantidade,
  type PedidoJoiner,
} from "../minhas-compras.model";

@Component({
  selector: "app-solicitar-repasse-modal",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./solicitar-repasse-modal.component.html",
  styleUrl: "./solicitar-repasse-modal.component.scss",
})
export class SolicitarRepasseModalComponent {
  readonly open = input.required<boolean>();
  /** Pedidos (claims) da joiner logada. */
  readonly pedidos = input.required<PedidoJoiner[]>();
  /** Pedido pré-selecionado ao abrir pelo card. */
  readonly pedidoInicial = input<PedidoJoiner | null>(null);
  readonly closed = output<void>();

  private readonly repasses = inject(RepassesService);

  protected readonly icons = { AlertCircle, CheckCircle2, PackageCheck, Send, UserCheck, X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly brl = brl;
  protected readonly val = inputValue;

  protected readonly cegId = signal("");
  protected readonly pedidoId = signal("");
  protected readonly codigo = signal("");
  protected readonly pagamentoOk = signal(false);
  protected readonly obs = signal("");
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly erro = signal("");

  /** CEGs em que a joiner tem claim. */
  protected readonly cegs = computed(() => {
    const map = new Map<string, string>();
    for (const p of this.pedidos()) map.set(p.cegId, p.cegNome);
    return [...map].map(([id, nome]) => ({ id, nome }));
  });

  protected readonly itensDaCeg = computed(() =>
    this.pedidos().filter((p) => p.cegId === this.cegId()),
  );

  protected readonly pedidoSelecionado = computed(
    () => this.pedidos().find((p) => p.id === this.pedidoId()) ?? null,
  );

  protected readonly destinatario = computed(() =>
    this.codigo().trim() ? this.repasses.buscarCadastro(this.codigo()) : null,
  );

  protected readonly codigoInvalido = computed(
    () => this.codigo().trim().length >= 4 && !this.destinatario(),
  );

  protected readonly podeEnviar = computed(
    () =>
      !!this.pedidoSelecionado() &&
      !!this.destinatario() &&
      this.pagamentoOk() &&
      !this.sending() &&
      !this.sent(),
  );

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const inicial = this.pedidoInicial();
      this.cegId.set(inicial?.cegId ?? "");
      this.pedidoId.set(inicial && this.motivoBloqueio(inicial) === null ? inicial.id : "");
      this.codigo.set("");
      this.pagamentoOk.set(false);
      this.obs.set("");
      this.erro.set("");
      this.sent.set(false);
    });
  }

  protected resumoItens(p: PedidoJoiner): string {
    return itensComQuantidade(p.itens)
      .map(([k, q]) => `${q}× ${ITEM_LABELS[k] ?? k}`)
      .join(" · ");
  }

  /** null = pode repassar; caso contrário, o motivo exibido na opção. */
  protected motivoBloqueio(p: PedidoJoiner): string | null {
    if (!p.pagamentoConfirmado) return "aguardando pagamento";
    if (this.repasses.pendentePorPedido().has(p.id)) return "repasse em análise";
    return null;
  }

  protected onCegChange(e: Event): void {
    this.cegId.set(inputValue(e));
    this.pedidoId.set("");
  }

  protected onOpenChange(open: boolean): void {
    if (!open && !this.sending()) this.closed.emit();
  }

  protected async handleConfirm(): Promise<void> {
    const pedido = this.pedidoSelecionado();
    const destinatario = this.destinatario();
    if (!pedido || !destinatario || !this.pagamentoOk()) return;
    this.sending.set(true);
    this.erro.set("");
    try {
      await this.repasses.solicitar({
        cegId: pedido.cegId,
        cegNome: pedido.cegNome,
        pedidoId: pedido.id,
        itemDescricao: this.resumoItens(pedido),
        valorBrl: pedido.valorBrl,
        destinatario,
        observacao: this.obs().trim() || undefined,
      });
      this.sent.set(true);
      setTimeout(() => {
        this.sent.set(false);
        this.closed.emit();
      }, 1000);
    } catch (err) {
      this.erro.set(err instanceof Error ? err.message : "erro ao solicitar repasse.");
    } finally {
      this.sending.set(false);
    }
  }
}
