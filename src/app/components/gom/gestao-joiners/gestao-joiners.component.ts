import { Component, computed, input, signal } from "@angular/core";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  ShoppingBag,
  Truck,
  User,
  type LucideIconData,
} from "lucide-angular";
import {
  MOCK_HISTORICO,
  type HistoricoPedido,
  type JoinerResumo,
  type StatusConta,
} from "@/lib/gom-types";
import { IconDirective } from "@/shared/icon.directive";

// ---------------------------------------------------------------------------
// Status conta
// ---------------------------------------------------------------------------

const CONTA_META: Record<StatusConta, { label: string; badge: string; icon: LucideIconData }> = {
  EM_DIA: {
    label: "em dia",
    badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200",
    icon: CheckCircle2,
  },
  PENDENTE: {
    label: "pendente",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    icon: Clock,
  },
  INADIMPLENTE: {
    label: "inadimplente",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    icon: AlertCircle,
  },
};

const PEDIDO_BADGE: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  AGUARDANDO_PAGAMENTO: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  COMPRADO: "bg-lime-50 text-lime-700 ring-1 ring-lime-200",
};
const PEDIDO_LABEL: Record<string, string> = {
  PENDENTE: "pendente",
  AGUARDANDO_PAGAMENTO: "aguard. pgto",
  COMPRADO: "comprado",
};

@Component({
  selector: "app-gestao-joiners",
  imports: [IconDirective],
  templateUrl: "./gestao-joiners.component.html",
  styleUrl: "./gestao-joiners.component.scss",
})
export class GestaoJoinersComponent {
  readonly joiners = input.required<JoinerResumo[]>();

  protected readonly icons = {
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Package,
    ShoppingBag,
    Truck,
    User,
  };
  protected readonly CONTA_META = CONTA_META;
  protected readonly PEDIDO_BADGE = PEDIDO_BADGE;
  protected readonly PEDIDO_LABEL = PEDIDO_LABEL;

  protected readonly expandedId = signal<string | null>(null);

  protected readonly totalFretes = computed(() =>
    this.joiners().reduce((s, j) => s + j.valorFretesPendentes, 0),
  );
  protected readonly inadimplentes = computed(
    () => this.joiners().filter((j) => j.statusConta === "INADIMPLENTE").length,
  );

  protected toggle(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  protected historico(joinerId: string): HistoricoPedido[] {
    return MOCK_HISTORICO[joinerId] ?? [];
  }

  protected iniciais(nome: string): string {
    return nome
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  protected fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  }
}
