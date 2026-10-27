import { Component, computed, inject, input, linkedSignal, signal } from "@angular/core";
import { CheckCircle2, Hourglass, Package, Truck, X } from "lucide-angular";
import { EnviosService } from "@/services/envios.service";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { IconDirective } from "@/shared/icon.directive";
import { EnvioCardComponent } from "../envio-card/envio-card.component";
import { SolicitarEnvioModalComponent } from "../solicitar-envio-modal/solicitar-envio-modal.component";

type Aba = "ATIVOS" | "CONCLUIDOS";

/** Rota "/joiner/envios" — itens prontos para envio + os envios nacionais da joiner. */
@Component({
  selector: "app-joiner-envios",
  imports: [IconDirective, EnvioCardComponent, SolicitarEnvioModalComponent],
  templateUrl: "./joiner-envios.component.html",
  styleUrl: "./joiner-envios.component.scss",
})
export class JoinerEnviosComponent {
  /** Query param `?pedido=` — já chega com o pedido selecionado (botão de minhas compras). */
  readonly pedido = input<string | undefined>();

  protected readonly envios = inject(EnviosService);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = { CheckCircle2, Hourglass, Package, Truck, X };

  /** refIds selecionados (por padrão: todos os prontos, ou só o pedido que veio na URL). */
  protected readonly selecionados = linkedSignal<ReadonlySet<string>>(() => {
    const pedido = this.pedido();
    const prontos = this.envios.prontos().map((i) => i.refId);
    return new Set(pedido && prontos.includes(pedido) ? [pedido] : prontos);
  });
  protected readonly itensSelecionados = computed(() =>
    this.envios.prontos().filter((i) => this.selecionados().has(i.refId)),
  );

  protected readonly modalAberto = signal(false);
  protected readonly aba = signal<Aba>("ATIVOS");
  protected readonly aviso = signal("");

  protected readonly lista = computed(() =>
    this.envios
      .meus()
      .filter((e) =>
        this.aba() === "ATIVOS"
          ? !["ENTREGUE", "CANCELADO"].includes(e.status)
          : ["ENTREGUE", "CANCELADO"].includes(e.status),
      ),
  );

  protected alternar(refId: string): void {
    this.selecionados.update((prev) => {
      const next = new Set(prev);
      if (!next.delete(refId)) next.add(refId);
      return next;
    });
  }

  protected onEnviado(): void {
    this.aba.set("ATIVOS");
    this.aviso.set("pedido de envio enviado! a GOM te avisa o frete por aqui e nas notificações.");
  }

  protected async cancelar(id: string): Promise<void> {
    const ok = await this.confirm.confirmar({
      titulo: "cancelar este envio?",
      mensagem: "os itens voltam para “prontos para envio”.",
      confirmar: "cancelar envio",
      cancelar: "voltar",
    });
    if (ok) this.envios.cancelar(id);
  }

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  protected abaClass(a: Aba): string {
    return `shrink-0 rounded-pill px-3.5 py-1.5 text-xs font-medium transition ${
      this.aba() === a
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground hover:text-foreground"
    }`;
  }
}
