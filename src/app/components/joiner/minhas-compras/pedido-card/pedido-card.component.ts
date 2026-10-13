import { Component, computed, input, output, signal } from "@angular/core";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Home,
  Images,
  PackageCheck,
  Truck,
  ZoomIn,
} from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
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
  imports: [IconDirective, ImageLightboxComponent],
  templateUrl: "./pedido-card.component.html",
  styleUrl: "./pedido-card.component.scss",
})
export class PedidoCardComponent {
  readonly pedido = input.required<PedidoJoiner>();
  readonly solicitarRepasse = output<void>();
  readonly solicitarEnvio = output<void>();

  protected readonly icons = {
    AlertCircle,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Home,
    Images,
    PackageCheck,
    Truck,
    ZoomIn,
  };
  protected readonly steps = STEPS;
  protected readonly ITEM_LABELS = ITEM_LABELS;
  protected readonly STATUS_BADGE = STATUS_BADGE;
  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly brl = brl;
  protected readonly fmtDate = fmtDate;

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
    return `cozy-card overflow-hidden ${this.pedido().status === "AGUARDANDO_PIX" ? "border-blue-200/60" : ""}`;
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
