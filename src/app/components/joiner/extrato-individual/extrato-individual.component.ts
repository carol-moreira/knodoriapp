import { Component } from "@angular/core";
import { CheckCircle2, Clock, CreditCard, Package, TrendingUp, Truck } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { ExtratoSectionComponent } from "./extrato-section/extrato-section.component";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Transacao {
  id: string;
  descricao: string; // resumo dos itens
  valorBrl: number;
  data: string; // ISO date
  formaPagamento: "pix" | "cartao";
  parcelas?: number;
  gomUsername: string;
  rastreio?: string;
}

interface ParcelaPendente {
  id: string;
  descricao: string;
  parcelaAtual: number;
  totalParcelas: number;
  valorParcela: number;
  dataVencimento: string;
}

interface Frete {
  id: string;
  descricao: string;
  valorBrl: number;
  status: "PENDENTE" | "PAGO";
  data: string;
}

// ---------------------------------------------------------------------------
// Mock — 🔌 substituir por HttpClient.get(`/api/joiner/${userId}/extrato`)
// ---------------------------------------------------------------------------

const MOCK_HISTORICO: Transacao[] = [
  {
    id: "trx_01",
    descricao: "1× álbum",
    valorBrl: 248.0,
    data: "2026-04-10",
    formaPagamento: "pix",
    gomUsername: "@knodori_gom",
    rastreio: "JP123456789BR",
  },
  {
    id: "trx_02",
    descricao: "3× photocard · 1× postcard",
    valorBrl: 178.4,
    data: "2026-03-22",
    formaPagamento: "cartao",
    parcelas: 3,
    gomUsername: "@knodori_gom",
  },
  {
    id: "trx_03",
    descricao: "2× postcard · 1× adesivo",
    valorBrl: 89.1,
    data: "2026-02-14",
    formaPagamento: "pix",
    gomUsername: "@knodori_gom",
  },
  {
    id: "trx_04",
    descricao: "1× pelúcia pequena",
    valorBrl: 152.3,
    data: "2026-01-05",
    formaPagamento: "cartao",
    parcelas: 2,
    gomUsername: "@knodori_gom",
  },
];

const MOCK_PARCELAS: ParcelaPendente[] = [
  {
    id: "par_01",
    descricao: "3× photocard · 1× postcard",
    parcelaAtual: 2,
    totalParcelas: 3,
    valorParcela: 59.47,
    dataVencimento: "2026-06-15",
  },
  {
    id: "par_02",
    descricao: "1× pelúcia pequena",
    parcelaAtual: 1,
    totalParcelas: 2,
    valorParcela: 76.15,
    dataVencimento: "2026-06-20",
  },
];

const MOCK_FRETES: Frete[] = [
  {
    id: "frt_01",
    descricao: "CEG Spring Haul — Japão → Brasil",
    valorBrl: 45.0,
    status: "PENDENTE",
    data: "2026-05-30",
  },
  {
    id: "frt_02",
    descricao: "CEG Winter Box — Coreia → Brasil",
    valorBrl: 38.5,
    status: "PAGO",
    data: "2026-03-10",
  },
];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

@Component({
  selector: "app-extrato-individual",
  imports: [IconDirective, ExtratoSectionComponent],
  templateUrl: "./extrato-individual.component.html",
  styleUrl: "./extrato-individual.component.scss",
})
export class ExtratoIndividualComponent {
  protected readonly icons = { CheckCircle2, Clock, CreditCard, Package, TrendingUp, Truck };
  protected readonly brl = brl;

  protected readonly historico = MOCK_HISTORICO;
  protected readonly parcelas = MOCK_PARCELAS;
  protected readonly fretes = MOCK_FRETES;

  protected readonly totalGasto = MOCK_HISTORICO.reduce((s, t) => s + t.valorBrl, 0);
  protected readonly parcelasPend = MOCK_PARCELAS.reduce((s, p) => s + p.valorParcela, 0);
  protected readonly fretesPend = MOCK_FRETES.filter((f) => f.status === "PENDENTE").reduce(
    (s, f) => s + f.valorBrl,
    0,
  );
  protected readonly totalPendente = this.parcelasPend + this.fretesPend;

  protected fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  }
}
