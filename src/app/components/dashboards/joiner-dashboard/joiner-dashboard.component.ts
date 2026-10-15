import { Component, computed, effect, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  Calculator,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gem,
  MessageCircle,
  Package,
  ShoppingBag,
  TrendingUp,
  Truck,
  type LucideIconData,
} from "lucide-angular";
import { ITEM_META, type ItemKey, type SolicitacaoGOM } from "@/lib/gom-types";
import { AuthService } from "@/services/auth.service";
import { CegsService } from "@/services/cegs.service";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { IconDirective } from "@/shared/icon.directive";

/** Preferência "esconder valores" da tela inicial, lembrada entre visitas. */
const OCULTAR_VALORES_KEY = "knodori-ocultar-valores";

type Accent = "primary" | "blue" | "emerald" | "neutral";

const ACCENT: Record<Accent, { icon: string }> = {
  primary: { icon: "text-primary" },
  blue: { icon: "text-blue-500" },
  emerald: { icon: "text-lime-500" },
  neutral: { icon: "text-muted-foreground" },
};

interface MetricCard {
  icon: LucideIconData;
  label: string;
  value: string;
  /** Valor em reais — fica escondido enquanto o olho estiver fechado. */
  money: boolean;
  to: string;
  accent: Accent;
  alert: boolean;
  small: boolean;
}

interface ShortcutCard {
  icon: LucideIconData;
  label: string;
  desc: string;
  to: string;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function lerOcultarValores(): boolean {
  try {
    return localStorage.getItem(OCULTAR_VALORES_KEY) !== "0";
  } catch {
    return true;
  }
}

@Component({
  selector: "app-joiner-dashboard",
  imports: [IconDirective, RouterLink],
  templateUrl: "./joiner-dashboard.component.html",
  styleUrl: "./joiner-dashboard.component.scss",
})
export class JoinerDashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly pedidos = inject(PedidosMercariService);
  private readonly cegs = inject(CegsService);

  protected readonly icons = { ChevronRight, CreditCard, Eye, EyeOff, Gem, Package, Truck };

  /** Valores em reais escondidos por padrão; o botão de olho alterna. */
  protected readonly ocultarValores = signal(lerOcultarValores());

  private readonly meusPedidos = computed(() => {
    const userId = this.auth.user()?.id;
    return userId ? this.pedidos.solicitacoes().filter((s) => s.joinerId === userId) : [];
  });

  protected readonly pagamentosAguardando = computed(() =>
    this.meusPedidos().filter((s) => s.status === "AGUARDANDO_PAGAMENTO"),
  );

  /** Caixa saiu da warehouse e ainda não foi liberada para envio nacional. */
  protected readonly emTransito = computed(() =>
    this.meusPedidos().filter((s) => s.status === "CAIXA_FECHADA" || s.status === "CHEGOU_GOM"),
  );

  protected readonly metricCards = computed<MetricCard[]>(() => {
    const pedidos = this.meusPedidos();
    const userId = this.auth.user()?.id ?? "";
    const ativos = pedidos.filter((s) => s.status !== "ENVIO_LIBERADO").length;
    const aguardando = this.pagamentosAguardando().length;
    const finalizados = pedidos.length - ativos;
    // Pedidos + frete/taxas de cada caixa em que a joiner tem itens
    const caixas = new Set(pedidos.map((s) => s.cegId).filter((id): id is string => !!id));
    const fretes = [...caixas].reduce(
      (t, id) => t + (this.cegs.porId(id)?.cobranca?.porJoiner[userId] ?? 0),
      0,
    );
    const total = pedidos.reduce((t, s) => t + s.valorBrl, 0) + fretes;

    return [
      {
        icon: ShoppingBag,
        label: "ativos",
        value: String(ativos),
        money: false,
        to: "/joiner/compras",
        accent: "primary",
        alert: false,
        small: false,
      },
      {
        icon: CreditCard,
        label: "aguardando PIX",
        value: String(aguardando),
        money: false,
        to: "/joiner/compras",
        accent: aguardando > 0 ? "blue" : "neutral",
        alert: aguardando > 0,
        small: false,
      },
      {
        icon: Package,
        label: "finalizados",
        value: String(finalizados),
        money: false,
        to: "/joiner/extrato",
        accent: "emerald",
        alert: false,
        small: false,
      },
      {
        icon: TrendingUp,
        label: "total movimentado",
        value: brl(total),
        money: true,
        to: "/joiner/extrato",
        accent: "neutral",
        alert: false,
        small: true,
      },
    ];
  });

  protected readonly shortcuts: ShortcutCard[] = [
    {
      icon: ShoppingBag,
      label: "minhas compras",
      desc: "pedidos em andamento",
      to: "/joiner/compras",
    },
    {
      icon: Calculator,
      label: "calculadora",
      desc: "simule o valor antes de solicitar",
      to: "/calculadora",
    },
    {
      icon: MessageCircle,
      label: "mensagens",
      desc: "fale com a sua GOM",
      to: "/joiner/mensagens",
    },
    { icon: FileText, label: "extrato", desc: "histórico e pendências", to: "/joiner/extrato" },
  ];

  constructor() {
    effect(() => {
      const ocultar = this.ocultarValores();
      try {
        localStorage.setItem(OCULTAR_VALORES_KEY, ocultar ? "1" : "0");
      } catch {
        // storage indisponível (aba anônima etc.) — só não lembra a preferência
      }
    });
  }

  /** Formata em reais, ou devolve a máscara quando os valores estão escondidos. */
  protected valor(v: number): string {
    return this.ocultarValores() ? "R$ •••••" : brl(v);
  }

  protected cardValue(card: MetricCard): string {
    return card.money && this.ocultarValores() ? "R$ •••••" : card.value;
  }

  protected descricao(s: SolicitacaoGOM): string {
    return Object.entries(s.itens)
      .filter(([, q]) => q > 0)
      .map(([k, q]) => `${q}× ${ITEM_META[k as ItemKey]?.label ?? k}`)
      .join(" · ");
  }

  protected metricIconClass(card: MetricCard): string {
    return `grid h-8 w-8 place-items-center rounded-xl bg-muted/60 ${ACCENT[card.accent].icon}`;
  }

  protected metricValueClass(card: MetricCard): string {
    return `font-bold leading-tight ${card.small ? "text-lg" : "text-2xl"}`;
  }
}
