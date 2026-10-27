import { Component, computed, inject, input, output, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Home,
  Images,
  MessageCircle,
  PackageCheck,
  Receipt,
  Truck,
  ZoomIn,
} from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { RepassesService } from "@/services/repasses.service";
import { ComprovanteChipComponent } from "@/shared/comprovante/comprovante-chip.component";
import { ComprovanteService } from "@/shared/comprovante/comprovante.service";
import { ImageLightboxComponent } from "../image-lightbox/image-lightbox.component";
import {
  BAR_COLOR,
  ITEM_LABELS,
  STATUS_BADGE,
  STATUS_LABEL,
  STEPS,
  STEP_INDEX,
  brl,
  fmtDate,
  itensComQuantidade,
  type PedidoJoiner,
} from "../minhas-compras.model";

@Component({
  selector: "app-pedido-card",
  imports: [IconDirective, ImageLightboxComponent, RouterLink, ComprovanteChipComponent],
  templateUrl: "./pedido-card.component.html",
  styleUrl: "./pedido-card.component.scss",
})
export class PedidoCardComponent {
  readonly pedido = input.required<PedidoJoiner>();
  /** Etapa do envio nacional em que o pedido está (null = ainda não pedido). */
  readonly envioEtapa = input<string | null>(null);
  readonly solicitarRepasse = output<void>();
  readonly solicitarEnvio = output<void>();

  protected readonly icons = {
    AlertCircle,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Home,
    Images,
    MessageCircle,
    PackageCheck,
    Receipt,
    Truck,
    ZoomIn,
  };
  protected readonly steps = STEPS;
  protected readonly ITEM_LABELS = ITEM_LABELS;
  protected readonly STATUS_BADGE = STATUS_BADGE;
  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly brl = brl;
  protected readonly fmtDate = fmtDate;

  private readonly repasses = inject(RepassesService);
  private readonly fila = inject(PedidosMercariService);
  private readonly comprovantes = inject(ComprovanteService);

  /** PIX do pedido: anexa o comprovante e a GOM confere. */
  protected async pagarPedido(): Promise<void> {
    const p = this.pedido();
    const r = await this.comprovantes.pedir({
      titulo: "pagar pedido mercari",
      mensagem: `${this.resumoItens()} — faça o pix para a GOM e anexe o comprovante.`,
      valor: p.valorBrl,
    });
    if (r?.comprovante) this.fila.enviarComprovante(p.id, r.comprovante);
  }

  /** Frete internacional + taxas da caixa. */
  protected async pagarCaixa(): Promise<void> {
    const p = this.pedido();
    const r = await this.comprovantes.pedir({
      titulo: `frete + taxas da ${p.cegNome}`,
      mensagem: "faça o pix para a GOM e anexe o comprovante — ela confere e confirma.",
      valor: p.cobrancaCaixa,
    });
    if (r?.comprovante) this.fila.enviarComprovanteCaixa(p.cegId, r.comprovante);
  }
  /** Repasse aguardando confirmação da GOM para este pedido. */
  protected readonly repassePendente = computed(
    () => this.repasses.pendentePorPedido().get(this.pedido().id) ?? null,
  );

  protected readonly detalhesOpen = signal(false);
  protected readonly lightboxIndex = signal<number | null>(null);

  protected readonly currentStep = computed(() =>
    Math.min(STEP_INDEX[this.pedido().status], STEPS.length - 1),
  );
  protected readonly imagens = computed(() => this.pedido().imagens ?? []);
  protected readonly hasImages = computed(() => this.imagens().length > 0);
  protected readonly itens = computed(() => itensComQuantidade(this.pedido().itens));
  protected readonly resumoItens = computed(() =>
    this.itens()
      .map(([key, q]) => `${q}× ${ITEM_LABELS[key] ?? key}`)
      .join(" · "),
  );

  protected cardClass(): string {
    return `cozy-card overflow-hidden ${this.pedido().status === "AGUARDANDO_PAGAMENTO" ? "border-blue-200/60" : ""}`;
  }

  protected barClass(): string {
    return `h-1 w-full ${BAR_COLOR[this.pedido().status] ?? "bg-primary"}`;
  }

  protected itemLabel(key: string): string {
    return ITEM_LABELS[key] ?? key;
  }

  protected jpy(v: number): string {
    return v.toLocaleString("ja-JP");
  }

  // ── StepBar ──────────────────────────────────────────────────────────────
  protected stepCircleClass(i: number): string {
    const current = this.currentStep();
    return `grid h-6 w-6 place-items-center rounded-full border-2 transition-all ${
      i < current
        ? "border-primary bg-primary"
        : i === current
          ? "border-primary bg-primary/10 ring-4 ring-primary/15"
          : "border-border bg-background"
    }`;
  }

  protected stepLabelClass(i: number): string {
    const current = this.currentStep();
    return `text-[9px] font-medium leading-tight text-center whitespace-nowrap ${
      i === current
        ? "font-bold text-primary"
        : i < current
          ? "text-primary/70"
          : "text-muted-foreground"
    }`;
  }

  protected stepLineClass(i: number): string {
    return `mx-1.5 mt-3 h-0.5 flex-1 rounded transition-colors ${
      i < this.currentStep() ? "bg-primary" : "bg-border"
    }`;
  }
}
