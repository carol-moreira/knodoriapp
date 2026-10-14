import { Component, computed, input, output } from "@angular/core";
import {
  CheckCircle2,
  CreditCard,
  PackageSearch,
  Send,
  TrendingUp,
  Wallet,
  type LucideIconData,
} from "lucide-angular";
import { ITEM_META, type ItemKey, type SolicitacaoGOM } from "@/lib/gom-types";
import { IconDirective } from "@/shared/icon.directive";

// ---------------------------------------------------------------------------
// Derivação financeira (calculada, não hardcoded)
// 🔌 Em produção, receber via GET /api/gom/:id/financeiro
// ---------------------------------------------------------------------------

function calcularResumo(sols: SolicitacaoGOM[]) {
  const comprados = sols.filter((s) => s.status === "COMPRADO");
  const aguardando = sols.filter((s) => s.status === "AGUARDANDO_PAGAMENTO");
  const pendentes = sols.filter((s) => s.status === "PENDENTE");

  const totalCaixa = comprados.reduce((sum, s) => sum + s.valorBrl, 0);
  const aReceber = aguardando.reduce((sum, s) => sum + s.valorBrl, 0);
  const emAnalise = pendentes.reduce((sum, s) => sum + s.valorBrl, 0);

  // Lucro estimado: markup médio de ~12% sobre o volume já confirmado
  // 🔌 Em produção: sum dos acréscimos por item calculados pelo PainelTaxas
  const lucroEstimado = (totalCaixa + aReceber) * 0.12;

  const pipeline = {
    pendente: pendentes.length,
    aguardandoPagamento: aguardando.length,
    comprado: comprados.length,
    total: sols.length,
  };

  return { totalCaixa, aReceber, emAnalise, lucroEstimado, pipeline };
}

type Accent = "emerald" | "blue" | "primary" | "neutral";

const ACCENT_MAP: Record<Accent, { icon: string; badge: string; ring: string }> = {
  emerald: {
    icon: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    ring: "",
  },
  blue: { icon: "text-blue-500", badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200", ring: "" },
  primary: { icon: "text-primary", badge: "bg-primary/10 text-primary", ring: "" },
  neutral: { icon: "text-muted-foreground", badge: "bg-muted text-muted-foreground", ring: "" },
};

interface FinCard {
  icon: LucideIconData;
  label: string;
  value: string;
  sub: string;
  accent: Accent;
  alert: boolean;
}

interface PipelineRow {
  label: string;
  count: number;
  color: string;
  textColor: string;
  bgColor: string;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

@Component({
  selector: "app-resumo-financeiro",
  imports: [IconDirective],
  templateUrl: "./resumo-financeiro.component.html",
  styleUrl: "./resumo-financeiro.component.scss",
})
export class ResumoFinanceiroComponent {
  readonly solicitacoes = input.required<SolicitacaoGOM[]>();
  readonly cegsAbertas = input.required<number>();
  /** Quando false, mostra o selo "Aguardando" no lugar do botão "Liberar". */
  readonly podeLiberar = input(true);
  readonly liberarPagamento = output<string>();

  protected readonly icons = { CheckCircle2, Send };
  protected readonly brl = brl;
  protected readonly fmtDate = fmtDate;

  protected readonly resumo = computed(() => calcularResumo(this.solicitacoes()));
  protected readonly aguardando = computed(() =>
    this.solicitacoes().filter((s) => s.status === "AGUARDANDO_PAGAMENTO"),
  );

  protected readonly cards = computed<FinCard[]>(() => {
    const { totalCaixa, aReceber, lucroEstimado } = this.resumo();
    return [
      {
        icon: Wallet,
        label: "total em caixa",
        value: brl(totalCaixa),
        sub: "pedidos confirmados",
        accent: "emerald",
        alert: false,
      },
      {
        icon: CreditCard,
        label: "a receber",
        value: brl(aReceber),
        sub: "aguardando pagamento",
        accent: "blue",
        alert: aReceber > 0,
      },
      {
        icon: TrendingUp,
        label: "lucro estimado",
        value: brl(lucroEstimado),
        sub: "markup sobre confirmados",
        accent: "primary",
        alert: false,
      },
      {
        icon: PackageSearch,
        label: "CEGs abertas",
        value: String(this.cegsAbertas()),
        sub: "grupos em andamento",
        accent: "neutral",
        alert: false,
      },
    ];
  });

  protected readonly pipelineRows = computed<PipelineRow[]>(() => {
    const p = this.resumo().pipeline;
    return [
      {
        label: "pendentes",
        count: p.pendente,
        color: "bg-amber-400",
        textColor: "text-amber-700",
        bgColor: "bg-amber-50",
      },
      {
        label: "aguardando pagamento",
        count: p.aguardandoPagamento,
        color: "bg-blue-400",
        textColor: "text-blue-700",
        bgColor: "bg-blue-50",
      },
      {
        label: "comprados",
        count: p.comprado,
        color: "bg-emerald-500",
        textColor: "text-emerald-700",
        bgColor: "bg-emerald-50",
      },
    ];
  });

  protected cardClass(card: FinCard): string {
    return `cozy-card flex flex-col gap-2 p-4 ${card.alert ? "border-blue-200 bg-blue-50/20" : ""}`;
  }

  protected cardIconClass(card: FinCard): string {
    return `grid h-8 w-8 place-items-center rounded-xl bg-muted/80 ${ACCENT_MAP[card.accent].icon}`;
  }

  protected pct(count: number): number {
    const total = this.resumo().pipeline.total;
    return total > 0 ? (count / total) * 100 : 0;
  }

  protected resumoItens(s: SolicitacaoGOM): string {
    return (Object.entries(s.itens) as [ItemKey, number][])
      .filter(([, q]) => q > 0)
      .map(([k, q]) => `${q}× ${ITEM_META[k]?.label ?? k}`)
      .join(" · ");
  }
}
