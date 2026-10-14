import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  Calculator,
  ChevronRight,
  CreditCard,
  FileText,
  Gem,
  Package,
  ShoppingBag,
  TrendingUp,
  Truck,
  type LucideIconData,
} from "lucide-angular";
import { AuthService } from "@/services/auth.service";
import { IconDirective } from "@/shared/icon.directive";

// ---------------------------------------------------------------------------
// Mock combinado — 🔌 substituir por HttpClient.get(`/api/joiner/${userId}/resumo`)
// ---------------------------------------------------------------------------

type StatusSimples = "PENDENTE" | "AGUARDANDO_PIX" | "PAGO" | "COMPRADO" | "EM_TRANSITO" | "CHEGOU";

interface PedidoResumo {
  id: string;
  status: StatusSimples;
  valorBrl: number;
  descricao: string;
  gomUsername: string;
  rastreio?: string;
}

const MOCK_TODOS: PedidoResumo[] = [
  {
    id: "p1",
    status: "AGUARDANDO_PIX",
    valorBrl: 142.8,
    descricao: "2× photocard · 1× adesivo",
    gomUsername: "@knodori_gom",
  },
  {
    id: "p2",
    status: "PENDENTE",
    valorBrl: 79.5,
    descricao: "3× postcard · 2× adesivo",
    gomUsername: "@knodori_gom",
  },
  {
    id: "p3",
    status: "EM_TRANSITO",
    valorBrl: 248.0,
    descricao: "1× álbum",
    gomUsername: "@knodori_gom",
    rastreio: "JP123456789BR",
  },
  {
    id: "p4",
    status: "PAGO",
    valorBrl: 89.9,
    descricao: "1× photocard · 2× postcard",
    gomUsername: "@knodori_gom",
  },
  {
    id: "p5",
    status: "CHEGOU",
    valorBrl: 315.0,
    descricao: "3× photocard",
    gomUsername: "@knodori_gom",
  },
  {
    id: "p6",
    status: "CHEGOU",
    valorBrl: 178.4,
    descricao: "4× postcard · 2× adesivo",
    gomUsername: "@knodori_gom",
  },
];

const ATIVOS_STATUS: StatusSimples[] = [
  "PENDENTE",
  "AGUARDANDO_PIX",
  "PAGO",
  "COMPRADO",
  "EM_TRANSITO",
];

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

@Component({
  selector: "app-joiner-dashboard",
  imports: [IconDirective, RouterLink],
  templateUrl: "./joiner-dashboard.component.html",
  styleUrl: "./joiner-dashboard.component.scss",
})
export class JoinerDashboardComponent {
  protected readonly auth = inject(AuthService);

  protected readonly icons = { ChevronRight, CreditCard, Gem, Package, Truck };
  protected readonly brl = brl;

  private readonly ativos = MOCK_TODOS.filter((p) => ATIVOS_STATUS.includes(p.status)).length;
  private readonly aguardandoPix = MOCK_TODOS.filter((p) => p.status === "AGUARDANDO_PIX").length;
  private readonly finalizados = MOCK_TODOS.filter((p) => p.status === "CHEGOU").length;
  private readonly totalMovimentado = MOCK_TODOS.reduce((sum, p) => sum + p.valorBrl, 0);

  protected readonly pagamentosAguardando = MOCK_TODOS.filter((p) => p.status === "AGUARDANDO_PIX");
  protected readonly emTransito = MOCK_TODOS.filter((p) => p.status === "EM_TRANSITO");

  protected readonly metricCards: MetricCard[] = [
    {
      icon: ShoppingBag,
      label: "ativos",
      value: String(this.ativos),
      to: "/joiner/compras",
      accent: "primary",
      alert: false,
      small: false,
    },
    {
      icon: CreditCard,
      label: "aguardando PIX",
      value: String(this.aguardandoPix),
      to: "/joiner/compras",
      accent: this.aguardandoPix > 0 ? "blue" : "neutral",
      alert: this.aguardandoPix > 0,
      small: false,
    },
    {
      icon: Package,
      label: "finalizados",
      value: String(this.finalizados),
      to: "/joiner/extrato",
      accent: "emerald",
      alert: false,
      small: false,
    },
    {
      icon: TrendingUp,
      label: "total movimentado",
      value: brl(this.totalMovimentado),
      to: "/joiner/extrato",
      accent: "neutral",
      alert: false,
      small: true,
    },
  ];

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
    { icon: FileText, label: "extrato", desc: "histórico e pendências", to: "/joiner/extrato" },
  ];

  protected metricIconClass(card: MetricCard): string {
    return `grid h-8 w-8 place-items-center rounded-xl bg-muted/60 ${ACCENT[card.accent].icon}`;
  }

  protected metricValueClass(card: MetricCard): string {
    return `font-bold leading-tight ${card.small ? "text-lg" : "text-2xl"}`;
  }
}
