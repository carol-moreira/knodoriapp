import { Component, computed, input } from "@angular/core";
import { Activity, ShoppingBag, TrendingUp, type LucideIconData } from "lucide-angular";
import { MOCK_CHART_DATA, type ChartPoint } from "@/lib/admin-types";
import { IconDirective } from "@/shared/icon.directive";

// ---------------------------------------------------------------------------
// Métricas globais
//
// Os gráficos (faturamento em área, vendas em barras e tráfego em linha) foram
// removidos na migração para Angular — a decisão sobre a nova biblioteca de
// gráficos ficou pendente. Os KPIs abaixo continuam usando a mesma série histórica.
// ---------------------------------------------------------------------------

type KpiColor = "cherry" | "blue" | "emerald";

interface Kpi {
  icon: LucideIconData;
  label: string;
  value: string;
  trend: number;
  color: KpiColor;
}

const ICON_CLS: Record<KpiColor, string> = {
  cherry: "text-primary",
  blue: "text-blue-500",
  emerald: "text-lime-500",
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(current?: number, previous?: number): number {
  if (!previous || !current) return 0;
  return ((current - previous) / previous) * 100;
}

@Component({
  selector: "app-metricas-globais",
  imports: [IconDirective],
  templateUrl: "./metricas-globais.component.html",
  styleUrl: "./metricas-globais.component.scss",
})
export class MetricasGlobaisComponent {
  readonly data = input<ChartPoint[]>(MOCK_CHART_DATA);

  protected readonly kpis = computed<Kpi[]>(() => {
    const data = this.data();
    const totalFaturamento = data.reduce((s, d) => s + d.faturamento, 0);
    const totalVendas = data.reduce((s, d) => s + d.vendas, 0);
    const totalSolicits = data.reduce((s, d) => s + d.solicitacoes, 0);

    // Variação: último vs penúltimo mês
    const tendFat = pct(data.at(-1)?.faturamento, data.at(-2)?.faturamento);
    const tendVend = pct(data.at(-1)?.vendas, data.at(-2)?.vendas);
    const tendSol = pct(data.at(-1)?.solicitacoes, data.at(-2)?.solicitacoes);

    return [
      {
        icon: TrendingUp,
        label: "faturamento global",
        value: brl(totalFaturamento),
        trend: tendFat,
        color: "cherry",
      },
      {
        icon: ShoppingBag,
        label: "volume de vendas",
        value: `${totalVendas} pedidos`,
        trend: tendVend,
        color: "blue",
      },
      {
        icon: Activity,
        label: "tráfego total",
        value: `${totalSolicits} solicit.`,
        trend: tendSol,
        color: "emerald",
      },
    ];
  });

  protected iconClass(kpi: Kpi): string {
    return `grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted/60 ${ICON_CLS[kpi.color]}`;
  }

  protected trendClass(kpi: Kpi): string {
    return `text-[10px] font-semibold ${kpi.trend >= 0 ? "text-lime-600" : "text-red-500"}`;
  }

  protected trendText(kpi: Kpi): string {
    return `${kpi.trend >= 0 ? "▲" : "▼"} ${Math.abs(kpi.trend).toFixed(1)}% vs. mês anterior`;
  }
}
