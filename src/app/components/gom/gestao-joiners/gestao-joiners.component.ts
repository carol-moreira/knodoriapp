import { Component, computed, inject, input, signal } from "@angular/core";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  ShieldAlert,
  ShoppingBag,
  Truck,
  User,
  type LucideIconData,
} from "lucide-angular";
import {
  MERCARI_STATUS_META,
  MOCK_HISTORICO,
  type HistoricoPedido,
  type JoinerResumo,
  type StatusConta,
} from "@/lib/gom-types";
import { STATUS_MODERACAO_META, TIPO_MODERACAO_META } from "@/lib/moderacao-types";
import { AuthService } from "@/services/auth.service";
import { ComunidadeService } from "@/services/comunidade.service";
import { ModeracaoService } from "@/services/moderacao.service";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";
import { IconDirective } from "@/shared/icon.directive";
import { ModeracaoModalComponent } from "./moderacao-modal/moderacao-modal.component";
import { DevedoresComponent } from "./devedores/devedores.component";

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

const PEDIDO_BADGE: Record<string, string> = Object.fromEntries(
  Object.entries(MERCARI_STATUS_META).map(([k, m]) => [k, m.badge]),
);
const PEDIDO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(MERCARI_STATUS_META).map(([k, m]) => [k, m.label]),
);

@Component({
  selector: "app-gestao-joiners",
  imports: [IconDirective, DevedoresComponent, AssinaturaComponent, ModeracaoModalComponent],
  templateUrl: "./gestao-joiners.component.html",
  styleUrl: "./gestao-joiners.component.scss",
})
export class GestaoJoinersComponent {
  readonly joiners = input.required<JoinerResumo[]>();

  private readonly auth = inject(AuthService);
  private readonly comunidade = inject(ComunidadeService);
  protected readonly moderacao = inject(ModeracaoService);

  protected readonly MOD_TIPO = TIPO_MODERACAO_META;
  protected readonly MOD_STATUS = STATUS_MODERACAO_META;

  /** Joiner com o modal de remoção/banimento aberto. */
  protected readonly moderando = signal<JoinerResumo | null>(null);

  private readonly comunidadeId = computed(
    () => this.auth.user()?.comunidadeId ?? this.comunidade.comunidade().id,
  );

  /** Só as joiners que participam da comunidade (remoções aprovadas saem da lista). */
  protected readonly visiveis = computed(() =>
    this.joiners().filter((j) => this.comunidade.participa(j.id, this.comunidadeId())),
  );

  protected solicitacaoDe(joinerId: string) {
    return this.moderacao.ultimaDoJoiner(joinerId, this.comunidadeId());
  }

  protected readonly icons = {
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Package,
    ShieldAlert,
    ShoppingBag,
    Truck,
    User,
  };
  protected readonly CONTA_META = CONTA_META;
  protected readonly PEDIDO_BADGE = PEDIDO_BADGE;
  protected readonly PEDIDO_LABEL = PEDIDO_LABEL;

  protected readonly expandedId = signal<string | null>(null);

  protected readonly totalFretes = computed(() =>
    this.visiveis().reduce((s, j) => s + j.valorFretesPendentes, 0),
  );
  protected readonly inadimplentes = computed(
    () => this.visiveis().filter((j) => j.statusConta === "INADIMPLENTE").length,
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
