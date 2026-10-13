import { Component, computed, effect, input, output, signal } from "@angular/core";
import { CheckCircle2, PackageCheck, Send, X } from "lucide-angular";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
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
  readonly pedido = input.required<PedidoJoiner | null>();
  readonly closed = output<void>();

  protected readonly icons = { CheckCircle2, PackageCheck, Send, X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly brl = brl;
  protected readonly val = inputValue;

  protected readonly obs = signal("");
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);

  protected readonly resumoItens = computed(() => {
    const pedido = this.pedido();
    return pedido
      ? itensComQuantidade(pedido.itens)
          .map(([k, q]) => `${q}× ${ITEM_LABELS[k] ?? k}`)
          .join(", ")
      : "";
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.obs.set("");
        this.sent.set(false);
      }
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open && !this.sending()) this.closed.emit();
  }

  protected async handleConfirm(): Promise<void> {
    if (!this.pedido()) return;
    this.sending.set(true);
    // 🔌 await fetch(`/api/joiner/${userId}/repasse`, { method: "POST", ... })
    await new Promise((r) => setTimeout(r, 700));
    this.sending.set(false);
    this.sent.set(true);
    setTimeout(() => {
      this.sent.set(false);
      this.closed.emit();
    }, 1000);
  }
}
