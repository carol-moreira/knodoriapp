import {
  CheckCircle2,
  Clock,
  DollarSign,
  ShoppingCart,
  Truck,
  type LucideIconData,
} from "lucide-angular";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PedidoStatus =
  "PENDENTE" | "AGUARDANDO_PIX" | "PAGO" | "COMPRADO" | "EM_TRANSITO" | "CHEGOU";

export interface PedidoJoiner {
  id: string;
  cegNome: string;
  linkMercari: string;
  valorJpy: number;
  valorBrl: number;
  itens: Record<string, number>;
  formaPagamento: "pix" | "cartao";
  parcelas?: number;
  status: PedidoStatus;
  dataSolicitacao: string;
  gomUsername: string;
  rastreio?: string;
  pagamentoConfirmado: boolean;
  envioLiberado: boolean;
  /** Fotos enviadas pela GOM (prévia do anúncio ou foto real do item recebido) */
  imagens?: string[];
}

// ---------------------------------------------------------------------------
// Mock — 🔌 substituir por HttpClient.get(`/api/joiner/${userId}/pedidos/ativos`)
// ---------------------------------------------------------------------------

export const MOCK_PEDIDOS: PedidoJoiner[] = [
  {
    id: "ped_01",
    cegNome: "Cherry Haul Jun/26",
    linkMercari: "https://jp.mercari.com/item/m112233",
    valorJpy: 3_200,
    valorBrl: 142.8,
    itens: { photocard: 2, adesivo: 1 },
    formaPagamento: "pix",
    status: "AGUARDANDO_PIX",
    dataSolicitacao: "2026-05-28",
    gomUsername: "@knodori_gom",
    pagamentoConfirmado: false,
    envioLiberado: false,
    // Prévia do anúncio Mercari enviada pela GOM
    imagens: [
      "https://picsum.photos/seed/pc-preview-a/400/400",
      "https://picsum.photos/seed/pc-preview-b/400/400",
    ],
  },
  {
    id: "ped_02",
    cegNome: "Spring Box Ktown4u",
    linkMercari: "https://jp.mercari.com/item/m445566",
    valorJpy: 1_800,
    valorBrl: 79.5,
    itens: { postcard: 3, adesivo: 2 },
    formaPagamento: "pix",
    status: "PENDENTE",
    dataSolicitacao: "2026-06-02",
    gomUsername: "@knodori_gom",
    pagamentoConfirmado: false,
    envioLiberado: false,
    // Sem fotos ainda — item ainda não foi comprado
  },
  {
    id: "ped_03",
    cegNome: "Winter Box Coreia",
    linkMercari: "https://jp.mercari.com/item/m778899",
    valorJpy: 5_500,
    valorBrl: 248.0,
    itens: { album: 1 },
    formaPagamento: "cartao",
    parcelas: 2,
    status: "EM_TRANSITO",
    dataSolicitacao: "2026-04-10",
    gomUsername: "@knodori_gom",
    rastreio: "JP123456789BR",
    pagamentoConfirmado: true,
    envioLiberado: true,
    // Fotos reais do álbum recebido pela GOM antes do envio
    imagens: [
      "https://picsum.photos/seed/album-w1/400/400",
      "https://picsum.photos/seed/album-w2/400/400",
      "https://picsum.photos/seed/album-w3/400/400",
      "https://picsum.photos/seed/album-w4/400/400",
    ],
  },
  {
    id: "ped_04",
    cegNome: "Cherry Haul Jun/26",
    linkMercari: "https://jp.mercari.com/item/m334455",
    valorJpy: 2_100,
    valorBrl: 89.9,
    itens: { photocard: 1, postcard: 2 },
    formaPagamento: "pix",
    status: "PAGO",
    dataSolicitacao: "2026-06-05",
    gomUsername: "@knodori_gom",
    pagamentoConfirmado: true,
    envioLiberado: false,
    // Fotos dos photocards recebidos pela GOM
    imagens: [
      "https://picsum.photos/seed/pc-ch-a/400/400",
      "https://picsum.photos/seed/pc-ch-b/400/400",
      "https://picsum.photos/seed/pc-ch-c/400/400",
    ],
  },
];

// ---------------------------------------------------------------------------
// Steps e metadados de status
// ---------------------------------------------------------------------------

export const STEPS: { key: PedidoStatus; label: string; icon: LucideIconData }[] = [
  { key: "PENDENTE", label: "solicitado", icon: Clock },
  { key: "AGUARDANDO_PIX", label: "aguard. PIX", icon: DollarSign },
  { key: "PAGO", label: "pago", icon: CheckCircle2 },
  { key: "COMPRADO", label: "comprado", icon: ShoppingCart },
  { key: "EM_TRANSITO", label: "em trânsito", icon: Truck },
];

export const STEP_INDEX: Record<PedidoStatus, number> = {
  PENDENTE: 0,
  AGUARDANDO_PIX: 1,
  PAGO: 2,
  COMPRADO: 3,
  EM_TRANSITO: 4,
  CHEGOU: 5,
};

export const STATUS_BADGE: Record<PedidoStatus, string> = {
  PENDENTE: "bg-amber-50  text-amber-700  ring-1 ring-amber-200",
  AGUARDANDO_PIX: "bg-blue-50   text-blue-700   ring-1 ring-blue-200",
  PAGO: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  COMPRADO: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  EM_TRANSITO: "bg-sky-50    text-sky-700    ring-1 ring-sky-200",
  CHEGOU: "bg-lime-50 text-lime-700 ring-1 ring-lime-200",
};

export const STATUS_LABEL: Record<PedidoStatus, string> = {
  PENDENTE: "pendente",
  AGUARDANDO_PIX: "aguardando PIX",
  PAGO: "pago",
  COMPRADO: "comprado",
  EM_TRANSITO: "em trânsito",
  CHEGOU: "entregue",
};

export const BAR_COLOR: Partial<Record<PedidoStatus, string>> = {
  PENDENTE: "bg-amber-400",
  AGUARDANDO_PIX: "bg-blue-500",
  PAGO: "bg-violet-500",
  COMPRADO: "bg-orange-500",
  EM_TRANSITO: "bg-sky-500",
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

export const BR_ESTADOS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export interface Endereco {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

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
