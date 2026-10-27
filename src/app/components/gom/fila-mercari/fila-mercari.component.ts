import { Component, computed, input, output, signal } from "@angular/core";
import { ChevronDown, ChevronUp, ExternalLink, Image, Lock, Package, Search } from "lucide-angular";
import {
  ITEM_META,
  MERCARI_ETAPAS_PEDIDO,
  MERCARI_STATUS_META,
  etapaMercari,
  type MercariStatus,
  type SolicitacaoGOM,
} from "@/lib/gom-types";
import { IconDirective } from "@/shared/icon.directive";
import { ComprovanteChipComponent } from "@/shared/comprovante/comprovante-chip.component";
import { inputValue } from "@/shared/dom";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

/** "EM_CAIXA" agrupa as etapas controladas pela caixa (fechada → envio liberado). */
type StatusFilter = "TODOS" | "EM_CAIXA" | MercariStatus;

const FILTER_TABS: { id: StatusFilter; label: string }[] = [
  { id: "TODOS", label: "todos" },
  ...MERCARI_ETAPAS_PEDIDO.map((id) => ({ id, label: MERCARI_STATUS_META[id].label })),
  { id: "EM_CAIXA", label: "caixa fechada+" },
];

export interface StatusChange {
  id: string;
  novoStatus: MercariStatus;
}

@Component({
  selector: "app-fila-mercari",
  imports: [IconDirective, AssinaturaComponent, ComprovanteChipComponent],
  templateUrl: "./fila-mercari.component.html",
  styleUrl: "./fila-mercari.component.scss",
})
export class FilaMercariComponent {
  readonly solicitacoes = input.required<SolicitacaoGOM[]>();
  /** Pedido de mudança de etapa. "COMPRADO" deve abrir a confirmação de compra (proof + caixa). */
  readonly statusChange = output<StatusChange>();
  readonly verProof = output<SolicitacaoGOM>();

  protected readonly icons = { ChevronDown, ChevronUp, ExternalLink, Image, Lock, Package, Search };
  protected readonly STATUS_META = MERCARI_STATUS_META;
  protected readonly etapasPedido = MERCARI_ETAPAS_PEDIDO;
  protected readonly filterTabs = FILTER_TABS;
  protected readonly val = inputValue;

  protected readonly search = signal("");
  protected readonly filtroStatus = signal<StatusFilter>("TODOS");
  protected readonly expandedId = signal<string | null>(null);

  protected readonly counters = computed(() => {
    const counts: Partial<Record<string, number>> = {
      TODOS: this.solicitacoes().length,
      EM_CAIXA: 0,
    };
    for (const s of this.solicitacoes()) {
      const key = this.gerenciadoPelaCaixa(s) ? "EM_CAIXA" : s.status;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  });

  protected readonly filtradas = computed(() => {
    const q = this.search().toLowerCase();
    const filtro = this.filtroStatus();
    return this.solicitacoes().filter((s) => {
      const matchSearch =
        !q ||
        s.joinerNome.toLowerCase().includes(q) ||
        s.joinerUsername.toLowerCase().includes(q) ||
        (s.cegNome ?? "").toLowerCase().includes(q);
      const matchStatus =
        filtro === "TODOS" ||
        (filtro === "EM_CAIXA" ? this.gerenciadoPelaCaixa(s) : s.status === filtro);
      return matchSearch && matchStatus;
    });
  });

  protected readonly rodape = computed(() => {
    const total = this.solicitacoes().length;
    const shown = this.filtradas().length;
    return shown === total
      ? `${total} pedido${total !== 1 ? "s" : ""} no total`
      : `exibindo ${shown} de ${total} pedidos`;
  });

  protected tabClass(id: StatusFilter): string {
    return `flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all ${
      this.filtroStatus() === id
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-foreground/60 hover:bg-background/60 hover:text-foreground"
    }`;
  }

  protected tabCountClass(id: StatusFilter): string {
    return `min-w-4.5 rounded-pill px-1.5 py-0.5 text-center text-[10px] font-bold ${
      this.filtroStatus() === id ? "bg-white/25 text-inherit" : "bg-muted text-muted-foreground"
    }`;
  }

  protected selectClass(s: SolicitacaoGOM): string {
    return `w-full cursor-pointer appearance-none rounded-pill border-0 py-1.5 pl-2.5 pr-6 text-[11px] font-semibold outline-none transition focus:ring-2 focus:ring-primary/30 ${MERCARI_STATUS_META[s.status].badge}`;
  }

  /** Etapas a partir de "caixa fechada" são alteradas pelas ações da caixa. */
  protected gerenciadoPelaCaixa(s: SolicitacaoGOM): boolean {
    return etapaMercari(s.status) > etapaMercari("NA_WAREHOUSE");
  }

  /** Mesmas regras do PedidosMercariService: não volta para antes da compra, warehouse exige caixa. */
  protected opcaoBloqueada(s: SolicitacaoGOM, opcao: MercariStatus): boolean {
    if (opcao === s.status) return false;
    if (s.cegId && etapaMercari(opcao) < etapaMercari("COMPRADO")) return true;
    if (opcao === "COMPRADO" && s.cegId) return true;
    if (opcao === "NA_WAREHOUSE" && !s.cegId) return true;
    return false;
  }

  protected onStatusSelect(s: SolicitacaoGOM, e: Event): void {
    const select = e.target as HTMLSelectElement;
    const novoStatus = select.value as MercariStatus;
    // Controlado: a mudança só aparece quando o estado for atualizado (a compra pode ser cancelada)
    select.value = s.status;
    this.statusChange.emit({ id: s.id, novoStatus });
  }

  protected toggle(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  protected resumoItens(req: SolicitacaoGOM): string {
    return Object.entries(req.itens)
      .filter(([, q]) => q > 0)
      .map(([k, q]) => `${q}× ${ITEM_META[k as keyof typeof ITEM_META]?.label ?? k}`)
      .join(", ");
  }

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  protected jpy(v: number): string {
    return v.toLocaleString("ja-JP");
  }

  protected fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
}
