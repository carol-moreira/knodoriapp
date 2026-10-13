import { Component, computed, input, output, signal } from "@angular/core";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  ExternalLink,
  Package,
  Search,
  type LucideIconData,
} from "lucide-angular";
import { ITEM_META, type MercariStatus, type SolicitacaoGOM } from "@/lib/gom-types";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";

// ---------------------------------------------------------------------------
// Config de status
// ---------------------------------------------------------------------------

type StatusFilter = "TODOS" | MercariStatus;

const STATUS_META: Record<
  MercariStatus,
  { label: string; icon: LucideIconData; badge: string; btn: string }
> = {
  PENDENTE: {
    label: "Pendente",
    icon: Clock,
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
    btn: "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60",
  },
  AGUARDANDO_PAGAMENTO: {
    label: "Aguard. Pgto",
    icon: DollarSign,
    badge:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800",
    btn: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60",
  },
  COMPRADO: {
    label: "Comprado",
    icon: CheckCircle2,
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800",
    btn: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
};

const FILTER_TABS: { id: StatusFilter; label: string }[] = [
  { id: "TODOS", label: "Todos" },
  { id: "PENDENTE", label: "Pendentes" },
  { id: "AGUARDANDO_PAGAMENTO", label: "Aguard. Pgto" },
  { id: "COMPRADO", label: "Comprados" },
];

const NEXT_STATUS: Record<MercariStatus, MercariStatus[]> = {
  PENDENTE: ["AGUARDANDO_PAGAMENTO", "COMPRADO"],
  AGUARDANDO_PAGAMENTO: ["PENDENTE", "COMPRADO"],
  COMPRADO: ["PENDENTE"],
};

export interface StatusChange {
  id: string;
  novoStatus: MercariStatus;
}

@Component({
  selector: "app-fila-mercari",
  imports: [IconDirective],
  templateUrl: "./fila-mercari.component.html",
  styleUrl: "./fila-mercari.component.scss",
})
export class FilaMercariComponent {
  readonly solicitacoes = input.required<SolicitacaoGOM[]>();
  readonly statusChange = output<StatusChange>();

  protected readonly icons = { ChevronDown, ChevronUp, ExternalLink, Package, Search };
  protected readonly STATUS_META = STATUS_META;
  protected readonly NEXT_STATUS = NEXT_STATUS;
  protected readonly filterTabs = FILTER_TABS;
  protected readonly val = inputValue;

  protected readonly search = signal("");
  protected readonly filtroStatus = signal<StatusFilter>("TODOS");
  protected readonly expandedId = signal<string | null>(null);

  protected readonly counters = computed<Record<StatusFilter, number>>(() => {
    const sols = this.solicitacoes();
    return {
      TODOS: sols.length,
      PENDENTE: sols.filter((s) => s.status === "PENDENTE").length,
      AGUARDANDO_PAGAMENTO: sols.filter((s) => s.status === "AGUARDANDO_PAGAMENTO").length,
      COMPRADO: sols.filter((s) => s.status === "COMPRADO").length,
    };
  });

  protected readonly filtradas = computed(() => {
    const q = this.search().toLowerCase();
    const filtro = this.filtroStatus();
    return this.solicitacoes().filter((s) => {
      const matchSearch =
        !q || s.joinerNome.toLowerCase().includes(q) || s.joinerUsername.toLowerCase().includes(q);
      const matchStatus = filtro === "TODOS" || s.status === filtro;
      return matchSearch && matchStatus;
    });
  });

  protected readonly rodape = computed(() => {
    const total = this.solicitacoes().length;
    const shown = this.filtradas().length;
    return shown === total
      ? `${total} pedido${total !== 1 ? "s" : ""} no total`
      : `Exibindo ${shown} de ${total} pedidos`;
  });

  protected tabClass(id: StatusFilter): string {
    return `flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
      this.filtroStatus() === id
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-foreground/60 hover:bg-background/60 hover:text-foreground"
    }`;
  }

  protected tabCountClass(id: StatusFilter): string {
    return `min-w-4.5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
      this.filtroStatus() === id ? "bg-white/25 text-inherit" : "bg-muted text-muted-foreground"
    }`;
  }

  protected toggle(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  protected change(id: string, novoStatus: MercariStatus): void {
    this.statusChange.emit({ id, novoStatus });
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
