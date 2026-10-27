import {
  CheckCircle2,
  Clock,
  DollarSign,
  ShoppingCart,
  Truck,
  Warehouse,
  type LucideIconData,
} from "lucide-angular";
import {
  MERCARI_STATUS_META,
  etapaMercari,
  type MercariStatus,
  type SolicitacaoGOM,
} from "@/lib/gom-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Pedido Mercari na visão da joiner — derivado da fila da GOM (PedidosMercariService). */
export interface PedidoJoiner {
  id: string;
  /** Caixa mercari (CEG) do pedido; vazio enquanto a compra não é confirmada. */
  cegId: string;
  cegNome: string;
  linkMercari: string;
  valorJpy: number;
  valorBrl: number;
  itens: Record<string, number>;
  formaPagamento: "pix" | "cartao";
  parcelas?: number;
  status: MercariStatus;
  dataSolicitacao: string;
  gomUsername: string;
  rastreio?: string;
  pagamentoConfirmado: boolean;
  envioLiberado: boolean;
  /** Proof da compra enviado pela GOM. */
  imagens?: string[];
  /** Frete internacional + taxas cobrados desta joiner na caixa. */
  cobrancaCaixa?: number;
}

// 🔌 em produção a GOM vem do vínculo da joiner; mock com a GOM única
const GOM_USERNAME = "@knodori_gom";

export function toPedidoJoiner(s: SolicitacaoGOM, cobrancaCaixa?: number): PedidoJoiner {
  return {
    id: s.id,
    cegId: s.cegId ?? "",
    cegNome: s.cegNome ?? "aguardando caixa",
    linkMercari: s.linkMercari,
    valorJpy: s.valorJpy,
    valorBrl: s.valorBrl,
    itens: s.itens,
    formaPagamento: s.formaPagamento,
    parcelas: s.parcelas,
    status: s.status,
    dataSolicitacao: s.dataSolicitacao,
    gomUsername: GOM_USERNAME,
    rastreio: s.rastreio,
    pagamentoConfirmado: etapaMercari(s.status) >= etapaMercari("PAGO"),
    envioLiberado: s.status === "ENVIO_LIBERADO",
    imagens: s.proofs,
    cobrancaCaixa,
  };
}

// ---------------------------------------------------------------------------
// Steps e metadados de status (as 9 etapas da fila agrupadas em 6 passos)
// ---------------------------------------------------------------------------

export const STEPS: { label: string; icon: LucideIconData }[] = [
  { label: "solicitado", icon: Clock },
  { label: "pagamento", icon: DollarSign },
  { label: "comprado", icon: ShoppingCart },
  { label: "warehouse", icon: Warehouse },
  { label: "em trânsito", icon: Truck },
  { label: "chegou", icon: CheckCircle2 },
];

export const STEP_INDEX: Record<MercariStatus, number> = {
  PENDENTE: 0,
  AGUARDANDO_PAGAMENTO: 1,
  PAGO: 1,
  PEDIDO_FEITO: 2,
  COMPRADO: 2,
  NA_WAREHOUSE: 3,
  CAIXA_FECHADA: 4,
  CHEGOU_GOM: 5,
  ENVIO_LIBERADO: 5,
};

export const STATUS_BADGE = Object.fromEntries(
  Object.entries(MERCARI_STATUS_META).map(([k, m]) => [k, m.badge]),
) as Record<MercariStatus, string>;

export const STATUS_LABEL: Record<MercariStatus, string> = {
  ...(Object.fromEntries(
    Object.entries(MERCARI_STATUS_META).map(([k, m]) => [k, m.label]),
  ) as Record<MercariStatus, string>),
  AGUARDANDO_PAGAMENTO: "aguardando PIX",
};

export const BAR_COLOR: Partial<Record<MercariStatus, string>> = {
  PENDENTE: "bg-amber-400",
  AGUARDANDO_PAGAMENTO: "bg-blue-500",
  PAGO: "bg-indigo-500",
  PEDIDO_FEITO: "bg-violet-500",
  COMPRADO: "bg-lime-500",
  NA_WAREHOUSE: "bg-teal-500",
  CAIXA_FECHADA: "bg-sky-500",
  CHEGOU_GOM: "bg-orange-500",
};

export const ITEM_LABELS: Record<string, string> = {
  photocard: "photocard",
  postcard: "postcard",
  adesivo: "adesivo",
  pequeno: "merch peq.",
  pelucia_pequena: "pelúcia",
  album: "álbum",
  grande: "item grande",
};

export const INPUT_CLS =
  "w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

// Endereço e UFs vivem em lib/envios-types (envio nacional)
export { BR_ESTADOS, type Endereco } from "@/lib/envios-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function itensComQuantidade(itens: Record<string, number>): [string, number][] {
  return Object.entries(itens).filter(([, q]) => q > 0);
}
