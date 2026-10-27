import { Component, computed, inject, input, linkedSignal, signal } from "@angular/core";
import { CheckCircle2, Hourglass, Package, Receipt, Star, Truck, X } from "lucide-angular";
import type { EnvioNacional } from "@/lib/envios-types";
import { EnviosService } from "@/services/envios.service";
import { ComprovanteService } from "@/shared/comprovante/comprovante.service";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { inputValue } from "@/shared/dom";
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
  private readonly comprovantes = inject(ComprovanteService);

  protected readonly icons = { CheckCircle2, Hourglass, Package, Receipt, Star, Truck, X };
  protected readonly estrelas = [1, 2, 3, 4, 5];
  protected readonly val = inputValue;

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
  /** Feedback sendo escrito, por envio. */
  protected readonly notas = signal<Partial<Record<string, number>>>({});
  protected readonly textos = signal<Partial<Record<string, string>>>({});
  protected readonly erros = signal<Partial<Record<string, string>>>({});

  protected readonly lista = computed(() =>
    this.envios
      .meus()
      // Entregue sem feedback continua "em andamento" (falta a avaliação dela)
      .filter((e) => (this.aba() === "ATIVOS") === (e.status !== "FEEDBACK_FEITO")),
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

  /** Paga o frete: o comprovante é obrigatório. */
  protected async pagarFrete(e: EnvioNacional): Promise<void> {
    const r = await this.comprovantes.pedir({
      titulo: "pagar frete do envio",
      mensagem: "faça o pix para a GOM e anexe o comprovante — ela confere e posta o pacote.",
      valor: e.frete,
    });
    if (!r?.comprovante) return;
    const erro = this.envios.pagarFrete(e.id, r.comprovante);
    this.erros.update((x) => ({ ...x, [e.id]: erro ?? undefined }));
    if (!erro) this.aviso.set("comprovante enviado! a GOM confere e te avisa quando postar.");
  }

  protected enviarFeedback(e: EnvioNacional): void {
    const erro = this.envios.darFeedback(e.id, this.notas()[e.id] ?? 0, this.textos()[e.id] ?? "");
    this.erros.update((x) => ({ ...x, [e.id]: erro ?? undefined }));
    if (!erro) this.aviso.set("obrigada pelo feedback! 💖");
  }

  protected setNota(id: string, nota: number): void {
    this.notas.update((n) => ({ ...n, [id]: nota }));
  }

  protected setTexto(id: string, e: Event): void {
    this.textos.update((t) => ({ ...t, [id]: inputValue(e) }));
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
