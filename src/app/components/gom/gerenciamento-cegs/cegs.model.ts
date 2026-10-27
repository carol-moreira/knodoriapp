import type { Autoria } from "@/lib/autoria";
import type { Comprovante } from "@/lib/comprovante";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CegStatus = "ABERTA" | "EM_COMPRA" | "TRANSITO" | "CHEGOU_BR" | "FINALIZADA";
export type Moeda = "KRW" | "JPY" | "USD" | "IDR";

export interface CegGOM {
  id: string;
  /** Comunidade dona da CEG — as joiners dela veem a CEG na vitrine. */
  comunidadeId: string;
  nome: string;
  loja: string;
  prazo: string;
  status: CegStatus;
  qtdJoiners: number;
  qtdItens: number;
  moeda: Moeda;
  /** Caixa mercari: CEG que agrupa os pedidos Mercari confirmados. */
  tipo?: "CAIXA_MERCARI";
  /** Frete internacional + taxas cobrados das joiners da caixa (após o fechamento). */
  cobranca?: CobrancaCaixa;
  /** Última alteração feita por alguém da equipe (criação, edição, status). */
  atualizadoPor?: Autoria;
}

export interface CobrancaCaixa {
  freteTotal: number;
  taxaPorJoiner: number;
  /** joinerId → valor cobrado (frete rateado + taxa). */
  porJoiner: Record<string, number>;
  data: string; // ISO
  /** Joiners que já pagaram o frete + taxas desta caixa. */
  pagoPor?: string[];
  /** joinerId → comprovantes do pagamento do frete + taxas. */
  comprovantes?: Record<string, Comprovante[]>;
  /** Quem lançou a cobrança. */
  por?: Autoria;
}

export interface Repasse {
  id: string;
  joinerNome: string;
  joinerUsername: string;
  valorTotal: number;
  valorPago: number;
  status: "PENDENTE" | "PARCIAL" | "PAGO";
  dataVencimento: string;
  /** Um comprovante por pagamento registrado. */
  comprovantes?: Comprovante[];
  /** Quem registrou o último pagamento. */
  atualizadoPor?: Autoria;
}

// ---------------------------------------------------------------------------
// Mocks — 🔌 substituir por chamadas HttpClient em um service
// ---------------------------------------------------------------------------

export const MOCK_CEGS: CegGOM[] = [
  {
    id: "ceg_cx1",
    comunidadeId: "com_01",
    nome: "caixa mercari 3",
    loja: "Mercari",
    prazo: "2026-06-30",
    status: "ABERTA",
    qtdJoiners: 3,
    qtdItens: 11,
    moeda: "JPY",
    tipo: "CAIXA_MERCARI",
  },
  {
    id: "ceg_cx_mai",
    comunidadeId: "com_01",
    nome: "caixa mercari 2",
    loja: "Mercari",
    prazo: "2026-05-31",
    status: "TRANSITO",
    qtdJoiners: 2,
    qtdItens: 5,
    moeda: "JPY",
    tipo: "CAIXA_MERCARI",
    cobranca: {
      freteTotal: 96,
      taxaPorJoiner: 12,
      porJoiner: { j1: 60, j3: 60 },
      data: "2026-06-04T15:00:00Z",
    },
  },
  {
    id: "ceg_cx_abr",
    comunidadeId: "com_01",
    nome: "caixa mercari 1",
    loja: "Mercari",
    prazo: "2026-04-30",
    status: "FINALIZADA",
    qtdJoiners: 2,
    qtdItens: 9,
    moeda: "JPY",
    tipo: "CAIXA_MERCARI",
    cobranca: {
      freteTotal: 84,
      taxaPorJoiner: 10,
      porJoiner: { j1: 52, j2: 52 },
      data: "2026-05-06T13:00:00Z",
      pagoPor: ["j1", "j2"],
    },
  },
  {
    id: "ceg_01",
    comunidadeId: "com_01",
    nome: "Cherry Haul Jun/26",
    loja: "Mercari",
    prazo: "2026-06-20",
    status: "ABERTA",
    qtdJoiners: 4,
    qtdItens: 9,
    moeda: "JPY",
  },
  {
    id: "ceg_02",
    comunidadeId: "com_01",
    nome: "Spring Box Ktown4u",
    loja: "Ktown4u",
    prazo: "2026-07-05",
    status: "EM_COMPRA",
    qtdJoiners: 6,
    qtdItens: 12,
    moeda: "KRW",
  },
  {
    id: "ceg_03",
    comunidadeId: "com_01",
    nome: "WTS Álbuns Dopamine",
    loja: "Mercari",
    prazo: "2026-07-15",
    status: "ABERTA",
    qtdJoiners: 2,
    qtdItens: 3,
    moeda: "JPY",
  },
  {
    id: "ceg_04",
    comunidadeId: "com_01",
    nome: "Winter Box Coreia",
    loja: "Weverse",
    prazo: "2026-08-01",
    status: "TRANSITO",
    qtdJoiners: 8,
    qtdItens: 24,
    moeda: "KRW",
  },
  {
    id: "ceg_05",
    comunidadeId: "com_01",
    nome: "Idol Power CEG",
    loja: "YesAsia",
    prazo: "2026-05-10",
    status: "FINALIZADA",
    qtdJoiners: 5,
    qtdItens: 10,
    moeda: "USD",
  },
];

export const MOCK_REPASSES: Record<string, Repasse[]> = {
  ceg_01: [
    {
      id: "r1",
      joinerNome: "Bia Costa",
      joinerUsername: "@miniheart",
      valorTotal: 95.3,
      valorPago: 0,
      status: "PENDENTE",
      dataVencimento: "2026-06-20",
    },
    {
      id: "r2",
      joinerNome: "Ana Reis",
      joinerUsername: "@bunbun",
      valorTotal: 186.5,
      valorPago: 186.5,
      status: "PAGO",
      dataVencimento: "2026-06-20",
    },
    {
      id: "r3",
      joinerNome: "Lara Kim",
      joinerUsername: "@larakim",
      valorTotal: 198.6,
      valorPago: 100.0,
      status: "PARCIAL",
      dataVencimento: "2026-06-20",
    },
    {
      id: "r4",
      joinerNome: "Marina Souza",
      joinerUsername: "@cherrymari",
      valorTotal: 301.0,
      valorPago: 301.0,
      status: "PAGO",
      dataVencimento: "2026-06-20",
    },
  ],
  ceg_02: [
    {
      id: "r5",
      joinerNome: "Marina Souza",
      joinerUsername: "@cherrymari",
      valorTotal: 301.0,
      valorPago: 150.0,
      status: "PARCIAL",
      dataVencimento: "2026-07-05",
    },
    {
      id: "r6",
      joinerNome: "Lara Kim",
      joinerUsername: "@larakim",
      valorTotal: 198.6,
      valorPago: 0,
      status: "PENDENTE",
      dataVencimento: "2026-07-05",
    },
    {
      id: "r7",
      joinerNome: "Bia Costa",
      joinerUsername: "@miniheart",
      valorTotal: 95.3,
      valorPago: 95.3,
      status: "PAGO",
      dataVencimento: "2026-07-05",
    },
  ],
  ceg_03: [
    {
      id: "r8",
      joinerNome: "Bia Costa",
      joinerUsername: "@miniheart",
      valorTotal: 152.4,
      valorPago: 152.4,
      status: "PAGO",
      dataVencimento: "2026-07-15",
    },
    {
      id: "r9",
      joinerNome: "Ana Reis",
      joinerUsername: "@bunbun",
      valorTotal: 79.2,
      valorPago: 0,
      status: "PENDENTE",
      dataVencimento: "2026-07-15",
    },
  ],
  ceg_04: [],
  ceg_cx1: [],
  ceg_05: [
    {
      id: "r10",
      joinerNome: "Bia Costa",
      joinerUsername: "@miniheart",
      valorTotal: 112.0,
      valorPago: 112.0,
      status: "PAGO",
      dataVencimento: "2026-05-10",
    },
    {
      id: "r11",
      joinerNome: "Ana Reis",
      joinerUsername: "@bunbun",
      valorTotal: 243.0,
      valorPago: 243.0,
      status: "PAGO",
      dataVencimento: "2026-05-10",
    },
    {
      id: "r12",
      joinerNome: "Lara Kim",
      joinerUsername: "@larakim",
      valorTotal: 198.6,
      valorPago: 198.6,
      status: "PAGO",
      dataVencimento: "2026-05-10",
    },
  ],
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CEG_STATUS_META: Record<CegStatus, { label: string; badge: string; step: number }> = {
  ABERTA: {
    label: "aberta",
    badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200",
    step: 1,
  },
  EM_COMPRA: {
    label: "em compra",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    step: 2,
  },
  TRANSITO: { label: "em trânsito", badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200", step: 3 },
  CHEGOU_BR: {
    label: "chegou BR",
    badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    step: 4,
  },
  FINALIZADA: { label: "finalizada", badge: "bg-muted text-muted-foreground", step: 5 },
};

export const REPASSE_META = {
  PENDENTE: { label: "pendente", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  PARCIAL: { label: "parcial", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  PAGO: { label: "pago", cls: "bg-lime-50 text-lime-700 ring-1 ring-lime-200" },
};

export const LOJAS = ["Mercari", "Ktown4u", "Weverse", "YesAsia", "Outra"];
export const MOEDAS: Moeda[] = ["JPY", "KRW", "USD", "IDR"];
export const FILTROS: { label: string; value: CegStatus | "TODAS" }[] = [
  { label: "todas", value: "TODAS" },
  { label: "aberta", value: "ABERTA" },
  { label: "em compra", value: "EM_COMPRA" },
  { label: "em trânsito", value: "TRANSITO" },
  { label: "chegou BR", value: "CHEGOU_BR" },
  { label: "finalizada", value: "FINALIZADA" },
];

export const INPUT_CLS =
  "w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}
