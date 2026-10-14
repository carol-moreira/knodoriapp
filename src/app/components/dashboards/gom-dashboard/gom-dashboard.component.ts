import { Component, computed, inject, signal } from "@angular/core";
import { AlertCircle, CheckCircle2, Clock, Layers, Package, Users } from "lucide-angular";
import {
  MOCK_JOINERS,
  MOCK_SOLICITACOES,
  type MercariStatus,
  type SolicitacaoGOM,
} from "@/lib/gom-types";
import { AuthService } from "@/services/auth.service";
import { IconDirective } from "@/shared/icon.directive";
import { DashboardSectionComponent } from "./dashboard-section/dashboard-section.component";

// ---------------------------------------------------------------------------
// Tipos e mocks locais
// ---------------------------------------------------------------------------

type CegStatus = "ABERTA" | "EM_COMPRA" | "TRANSITO" | "CHEGOU_BR";

interface CegResumo {
  id: string;
  nome: string;
  loja: string;
  prazo: string;
  status: CegStatus;
  qtdJoiners: number;
  qtdItens: number;
}

// 🔌 substituir por HttpClient.get(`/api/gom/${gomId}/cegs?status=abertas`)
const MOCK_CEGS: CegResumo[] = [
  {
    id: "ceg_01",
    nome: "Cherry Haul Jun/26",
    loja: "Mercari",
    prazo: "2026-06-20",
    status: "ABERTA",
    qtdJoiners: 4,
    qtdItens: 9,
  },
  {
    id: "ceg_02",
    nome: "Spring Box Ktown4u",
    loja: "Ktown4u",
    prazo: "2026-07-05",
    status: "EM_COMPRA",
    qtdJoiners: 6,
    qtdItens: 12,
  },
  {
    id: "ceg_03",
    nome: "WTS Álbuns Dopamine",
    loja: "Mercari",
    prazo: "2026-07-15",
    status: "ABERTA",
    qtdJoiners: 2,
    qtdItens: 3,
  },
];

const CEG_STATUS_META: Record<CegStatus, { label: string; badge: string }> = {
  ABERTA: { label: "aberta", badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200" },
  EM_COMPRA: { label: "em compra", badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  TRANSITO: { label: "em trânsito", badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
  CHEGOU_BR: { label: "chegou BR", badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200" },
};

interface PipelineRow {
  label: string;
  count: number;
  color: string;
  textColor: string;
  alert: boolean;
}

@Component({
  selector: "app-gom-dashboard",
  imports: [IconDirective, DashboardSectionComponent],
  templateUrl: "./gom-dashboard.component.html",
  styleUrl: "./gom-dashboard.component.scss",
})
export class GomDashboardComponent {
  protected readonly auth = inject(AuthService);

  protected readonly icons = { AlertCircle, CheckCircle2, Clock, Layers, Package, Users };
  protected readonly cegs = MOCK_CEGS;
  protected readonly CEG_STATUS_META = CEG_STATUS_META;

  // 🔌 substituir por HttpClient.get(`/api/gom/${gomId}/solicitacoes`)
  protected readonly solicitacoes = signal<SolicitacaoGOM[]>(MOCK_SOLICITACOES);

  // Derivados do estado vivo — atualizam quando statuses mudam
  protected readonly pipeline = computed(() => {
    const sols = this.solicitacoes();
    return {
      pendente: sols.filter((s) => s.status === "PENDENTE").length,
      aguardandoPagamento: sols.filter((s) => s.status === "AGUARDANDO_PAGAMENTO").length,
      comprado: sols.filter((s) => s.status === "COMPRADO").length,
      total: sols.length,
    };
  });

  protected readonly pipelineRows = computed<PipelineRow[]>(() => {
    const p = this.pipeline();
    return [
      {
        label: "pendentes",
        count: p.pendente,
        color: "bg-amber-400",
        textColor: "text-amber-700",
        alert: false,
      },
      {
        label: "aguardando pagamento",
        count: p.aguardandoPagamento,
        color: "bg-blue-500",
        textColor: "text-blue-700",
        alert: p.aguardandoPagamento > 0,
      },
      {
        label: "comprados",
        count: p.comprado,
        color: "bg-lime-500",
        textColor: "text-lime-700",
        alert: false,
      },
    ];
  });

  protected readonly pagamentosALiberar = computed(() =>
    this.solicitacoes().filter((s) => s.status === "AGUARDANDO_PAGAMENTO"),
  );

  // Repasses pendentes: joiners com débito ou frete em aberto
  protected readonly repassesPendentes = MOCK_JOINERS.filter(
    (j) => j.statusConta !== "EM_DIA" || j.fretesPendentes > 0,
  );
  protected readonly algumInadimplente = this.repassesPendentes.some(
    (j) => j.statusConta === "INADIMPLENTE",
  );

  protected handleConfirmarPagamento(id: string): void {
    // 🔌 await fetch(`/api/gom/${gomId}/solicitacoes/${id}`, { method: "PATCH", body: JSON.stringify({ status: "COMPRADO" }) })
    this.solicitacoes.update((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "COMPRADO" as MercariStatus } : s)),
    );
  }

  protected pct(count: number): number {
    const total = this.pipeline().total;
    return total > 0 ? (count / total) * 100 : 0;
  }

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  protected fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
}
