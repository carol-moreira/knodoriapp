/**
 * Tipos canônicos da visão GOM.
 * Usados pelos 4 componentes do painel e derivados direto do que a API retornará.
 * Toda query deve filtrar por gomId — o escopo é sempre o da GOM logada.
 */

import type { Autoria } from "./autoria";
import type { Comprovante } from "./comprovante";

// ---------------------------------------------------------------------------
// Solicitação Mercari (perspectiva da GOM)
// ---------------------------------------------------------------------------

/**
 * Etapas de um pedido Mercari, na ordem do fluxo:
 *  fila → pagamento → GOM compra com a proxy → compra confirmada (proof) → warehouse
 *  → caixa fechada (fretes/taxas cobrados) → caixa chegou na GOM → envio nacional liberado.
 * As 3 últimas são controladas pela caixa (CEG "caixa mercari N"), não pedido a pedido.
 */
export type MercariStatus =
  | "PENDENTE"
  | "AGUARDANDO_PAGAMENTO"
  | "PAGO"
  | "PEDIDO_FEITO"
  | "COMPRADO"
  | "NA_WAREHOUSE"
  | "CAIXA_FECHADA"
  | "CHEGOU_GOM"
  | "ENVIO_LIBERADO";

export const MERCARI_ETAPAS: MercariStatus[] = [
  "PENDENTE",
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "PEDIDO_FEITO",
  "COMPRADO",
  "NA_WAREHOUSE",
  "CAIXA_FECHADA",
  "CHEGOU_GOM",
  "ENVIO_LIBERADO",
];

/** Etapas alteradas pedido a pedido (as demais vêm das ações da caixa). */
export const MERCARI_ETAPAS_PEDIDO: MercariStatus[] = MERCARI_ETAPAS.slice(0, 6);

export const MERCARI_STATUS_META: Record<MercariStatus, { label: string; badge: string }> = {
  PENDENTE: { label: "na fila", badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  AGUARDANDO_PAGAMENTO: {
    label: "aguard. pgto",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  },
  PAGO: { label: "pago", badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" },
  PEDIDO_FEITO: {
    label: "pedido feito",
    badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  },
  COMPRADO: {
    label: "compra confirmada",
    badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200",
  },
  NA_WAREHOUSE: {
    label: "na warehouse",
    badge: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  },
  CAIXA_FECHADA: {
    label: "caixa fechada",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  },
  CHEGOU_GOM: {
    label: "chegou na GOM",
    badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  },
  ENVIO_LIBERADO: {
    label: "envio liberado",
    badge: "bg-primary/10 text-primary ring-1 ring-primary/30",
  },
};

/** Posição da etapa no fluxo (para comparações "já passou de…"). */
export function etapaMercari(status: MercariStatus): number {
  return MERCARI_ETAPAS.indexOf(status);
}

export interface SolicitacaoGOM {
  id: string;
  joinerId: string;
  joinerNome: string;
  joinerUsername: string;
  linkMercari: string;
  itens: Record<string, number>;
  valorJpy: number;
  valorBrl: number;
  formaPagamento: "pix" | "cartao";
  parcelas: number;
  status: MercariStatus;
  dataSolicitacao: string;
  rastreio?: string;
  /** Caixa mercari (CEG) para a qual o pedido foi direcionado ao confirmar a compra. */
  cegId?: string;
  cegNome?: string;
  /** Imagens de proof da compra anexadas pela GOM. */
  proofs?: string[];
  /** Comprovantes do pagamento do item (da joiner ou anexados pela GOM ao marcar "pago"). */
  comprovantes?: Comprovante[];
  /** Última alteração (etapa, compra confirmada, caixa…) e quem fez. */
  atualizadoPor?: Autoria;
}

// ---------------------------------------------------------------------------
// Resumo por Joiner (para Gestão de Joiners)
// ---------------------------------------------------------------------------

export type StatusConta = "EM_DIA" | "PENDENTE" | "INADIMPLENTE";

export interface JoinerResumo {
  id: string;
  nome: string;
  username: string;
  avatarUrl?: string;
  /** WhatsApp da joiner, com DDD (usado nas cobranças). */
  telefone?: string;
  pedidosTotais: number;
  pedidosAtivos: number;
  valorTotalComprado: number;
  fretesPendentes: number;
  valorFretesPendentes: number;
  statusConta: StatusConta;
  ultimoPedido?: string; // ISO date
}

export interface HistoricoPedido {
  id: string;
  descricao: string; // resumo dos itens
  valorBrl: number;
  status: MercariStatus;
  dataSolicitacao: string;
  formaPagamento: "pix" | "cartao";
  parcelas: number;
}

// ---------------------------------------------------------------------------
// Configuração de taxas da GOM (fonte de verdade para o simulador das joiners)
// ---------------------------------------------------------------------------

export interface ConfigTaxasGOM {
  // Câmbio / conversão
  spreadWise: number; // % aplicado sobre a taxa (ex: 2.5 = 2,5%)
  taxaIdrBrl: number; // taxa comercial IDR → BRL (ex: 0.000286)
  fatorIdrJpy: number; // fator JPY → IDR (ex: 123)
  acrescimoBaseJpy: number; // acréscimo fixo em JPY antes da conversão (ex: 200)
  // Markup por tipo de item (BRL por unidade — oculto para a Joiner)
  markupItens: Record<ItemKey, number>;
}

export type ItemKey =
  "photocard" | "postcard" | "adesivo" | "pequeno" | "pelucia_pequena" | "album" | "grande";

export const ITEM_META: Record<ItemKey, { label: string; emoji: string }> = {
  photocard: { label: "photocard", emoji: "🃏" },
  postcard: { label: "postcard", emoji: "📮" },
  adesivo: { label: "adesivo (cartela)", emoji: "✨" },
  pequeno: { label: "item peq. (outros merchs)", emoji: "📦" },
  pelucia_pequena: { label: "pelúcia pequena", emoji: "🧸" },
  album: { label: "álbum", emoji: "💿" },
  grande: { label: "item grande (>15cm)", emoji: "🎁" },
};

export const CONFIG_TAXAS_DEFAULT: ConfigTaxasGOM = {
  spreadWise: 2.5,
  taxaIdrBrl: 0.000286,
  fatorIdrJpy: 123,
  acrescimoBaseJpy: 200,
  markupItens: {
    photocard: 2.5,
    postcard: 2.5,
    adesivo: 2.5,
    pequeno: 8.0,
    pelucia_pequena: 10.0,
    album: 15.0,
    grande: 25.0,
  },
};

// ---------------------------------------------------------------------------
// Mock de dados (escopo da GOM logada)
// 🔌 Substituir por HttpClient.get(`/api/gom/${gomId}/...`) em um service
// ---------------------------------------------------------------------------

export const MOCK_SOLICITACOES: SolicitacaoGOM[] = [
  {
    id: "req_01",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    linkMercari: "https://jp.mercari.com/item/m112233",
    itens: { photocard: 2, adesivo: 1 },
    valorJpy: 2_200,
    valorBrl: 95.3,
    formaPagamento: "pix",
    parcelas: 1,
    status: "PENDENTE",
    dataSolicitacao: "2026-06-05",
  },
  {
    id: "req_02",
    joinerId: "j2",
    joinerNome: "Ana Reis",
    joinerUsername: "@bunbun",
    linkMercari: "https://jp.mercari.com/item/m445566",
    itens: { album: 1, photocard: 1 },
    valorJpy: 4_200,
    valorBrl: 186.5,
    formaPagamento: "cartao",
    parcelas: 3,
    status: "AGUARDANDO_PAGAMENTO",
    dataSolicitacao: "2026-05-28",
  },
  {
    id: "req_03",
    joinerId: "j3",
    joinerNome: "Marina Souza",
    joinerUsername: "@cherrymari",
    linkMercari: "https://jp.mercari.com/item/m778899",
    itens: { grande: 1 },
    valorJpy: 6_500,
    valorBrl: 301.0,
    formaPagamento: "cartao",
    parcelas: 1,
    status: "NA_WAREHOUSE",
    dataSolicitacao: "2026-05-20",
    rastreio: "JP123456789BR",
    cegId: "ceg_cx1",
    cegNome: "caixa mercari 3",
    proofs: ["https://picsum.photos/seed/proof-req03/400/400"],
  },
  {
    id: "req_04",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    linkMercari: "https://jp.mercari.com/item/m334455",
    itens: { pelucia_pequena: 1 },
    valorJpy: 3_500,
    valorBrl: 152.4,
    formaPagamento: "pix",
    parcelas: 1,
    status: "COMPRADO",
    dataSolicitacao: "2026-06-06",
    cegId: "ceg_cx1",
    cegNome: "caixa mercari 3",
    proofs: ["https://picsum.photos/seed/proof-req04/400/400"],
  },
  {
    id: "req_05",
    joinerId: "j4",
    joinerNome: "Lara Kim",
    joinerUsername: "@larakim",
    linkMercari: "https://jp.mercari.com/item/m667788",
    itens: { photocard: 5 },
    valorJpy: 4_500,
    valorBrl: 198.6,
    formaPagamento: "cartao",
    parcelas: 2,
    status: "AGUARDANDO_PAGAMENTO",
    dataSolicitacao: "2026-06-03",
  },
  {
    id: "req_06",
    joinerId: "j2",
    joinerNome: "Ana Reis",
    joinerUsername: "@bunbun",
    linkMercari: "https://jp.mercari.com/item/m998877",
    itens: { postcard: 4, adesivo: 2 },
    valorJpy: 1_800,
    valorBrl: 79.2,
    formaPagamento: "pix",
    parcelas: 1,
    status: "COMPRADO",
    dataSolicitacao: "2026-05-15",
    cegId: "ceg_cx1",
    cegNome: "caixa mercari 3",
    proofs: ["https://picsum.photos/seed/proof-req06/400/400"],
  },

  // ── Pedidos da joiner de teste (Bia, "j1") — um em cada etapa do fluxo ──
  {
    id: "req_07",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    linkMercari: "https://jp.mercari.com/item/m201301",
    itens: { photocard: 3 },
    valorJpy: 2_700,
    valorBrl: 118.9,
    formaPagamento: "pix",
    parcelas: 1,
    status: "AGUARDANDO_PAGAMENTO",
    dataSolicitacao: "2026-06-09",
  },
  {
    id: "req_08",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    linkMercari: "https://jp.mercari.com/item/m201302",
    itens: { album: 1 },
    valorJpy: 3_900,
    valorBrl: 172.3,
    formaPagamento: "cartao",
    parcelas: 2,
    status: "PAGO",
    dataSolicitacao: "2026-06-07",
  },
  {
    id: "req_09",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    linkMercari: "https://jp.mercari.com/item/m201303",
    itens: { postcard: 2, pequeno: 1 },
    valorJpy: 2_400,
    valorBrl: 108.7,
    formaPagamento: "pix",
    parcelas: 1,
    status: "PEDIDO_FEITO",
    dataSolicitacao: "2026-06-04",
  },
  {
    id: "req_10",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    linkMercari: "https://jp.mercari.com/item/m201304",
    itens: { photocard: 2, adesivo: 1 },
    valorJpy: 2_100,
    valorBrl: 93.4,
    formaPagamento: "pix",
    parcelas: 1,
    status: "NA_WAREHOUSE",
    dataSolicitacao: "2026-05-22",
    cegId: "ceg_cx1",
    cegNome: "caixa mercari 3",
    proofs: [
      "https://picsum.photos/seed/proof-req10a/400/400",
      "https://picsum.photos/seed/proof-req10b/400/400",
    ],
  },
  {
    id: "req_11",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    linkMercari: "https://jp.mercari.com/item/m201305",
    itens: { pelucia_pequena: 1, photocard: 1 },
    valorJpy: 4_300,
    valorBrl: 189.6,
    formaPagamento: "cartao",
    parcelas: 3,
    status: "CAIXA_FECHADA",
    dataSolicitacao: "2026-05-02",
    cegId: "ceg_cx_mai",
    cegNome: "caixa mercari 2",
    proofs: ["https://picsum.photos/seed/proof-req11/400/400"],
  },
  {
    id: "req_12",
    joinerId: "j3",
    joinerNome: "Marina Souza",
    joinerUsername: "@cherrymari",
    linkMercari: "https://jp.mercari.com/item/m201306",
    itens: { album: 1, postcard: 2 },
    valorJpy: 4_800,
    valorBrl: 211.2,
    formaPagamento: "pix",
    parcelas: 1,
    status: "CAIXA_FECHADA",
    dataSolicitacao: "2026-05-05",
    cegId: "ceg_cx_mai",
    cegNome: "caixa mercari 2",
    proofs: ["https://picsum.photos/seed/proof-req12/400/400"],
  },
  {
    id: "req_13",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    linkMercari: "https://jp.mercari.com/item/m201307",
    itens: { photocard: 4 },
    valorJpy: 3_200,
    valorBrl: 141.5,
    formaPagamento: "pix",
    parcelas: 1,
    status: "ENVIO_LIBERADO",
    dataSolicitacao: "2026-04-08",
    rastreio: "JP908172635BR",
    cegId: "ceg_cx_abr",
    cegNome: "caixa mercari 1",
    proofs: ["https://picsum.photos/seed/proof-req13/400/400"],
  },
  {
    id: "req_14",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    linkMercari: "https://jp.mercari.com/item/m201308",
    itens: { grande: 1 },
    valorJpy: 5_900,
    valorBrl: 262.0,
    formaPagamento: "cartao",
    parcelas: 4,
    status: "ENVIO_LIBERADO",
    dataSolicitacao: "2026-04-12",
    cegId: "ceg_cx_abr",
    cegNome: "caixa mercari 1",
    proofs: ["https://picsum.photos/seed/proof-req14/400/400"],
  },
  {
    id: "req_15",
    joinerId: "j2",
    joinerNome: "Ana Reis",
    joinerUsername: "@bunbun",
    linkMercari: "https://jp.mercari.com/item/m201309",
    itens: { adesivo: 3, postcard: 1 },
    valorJpy: 1_600,
    valorBrl: 72.8,
    formaPagamento: "pix",
    parcelas: 1,
    status: "ENVIO_LIBERADO",
    dataSolicitacao: "2026-04-10",
    cegId: "ceg_cx_abr",
    cegNome: "caixa mercari 1",
    proofs: ["https://picsum.photos/seed/proof-req15/400/400"],
  },
];

export const MOCK_JOINERS: JoinerResumo[] = [
  {
    id: "j1",
    nome: "Bia Costa",
    username: "@miniheart",
    telefone: "(11) 98765-4321",
    pedidosTotais: 5,
    pedidosAtivos: 2,
    valorTotalComprado: 640.5,
    fretesPendentes: 1,
    valorFretesPendentes: 45.0,
    statusConta: "EM_DIA",
    ultimoPedido: "2026-06-06",
  },
  {
    id: "j2",
    nome: "Ana Reis",
    username: "@bunbun",
    telefone: "(21) 99123-4567",
    pedidosTotais: 4,
    pedidosAtivos: 1,
    valorTotalComprado: 421.2,
    fretesPendentes: 0,
    valorFretesPendentes: 0,
    statusConta: "PENDENTE",
    ultimoPedido: "2026-06-03",
  },
  {
    id: "j3",
    nome: "Marina Souza",
    username: "@cherrymari",
    telefone: "(31) 98888-1122",
    pedidosTotais: 8,
    pedidosAtivos: 0,
    valorTotalComprado: 1_248.0,
    fretesPendentes: 2,
    valorFretesPendentes: 90.0,
    statusConta: "INADIMPLENTE",
    ultimoPedido: "2026-05-20",
  },
  {
    id: "j4",
    nome: "Lara Kim",
    username: "@larakim",
    pedidosTotais: 2,
    pedidosAtivos: 1,
    valorTotalComprado: 198.6,
    fretesPendentes: 0,
    valorFretesPendentes: 0,
    statusConta: "EM_DIA",
    ultimoPedido: "2026-06-05",
  },
];

export const MOCK_HISTORICO: Record<string, HistoricoPedido[]> = {
  j1: [
    {
      id: "req_01",
      descricao: "2x photocard · 1x adesivo",
      valorBrl: 95.3,
      status: "PENDENTE",
      dataSolicitacao: "2026-06-05",
      formaPagamento: "pix",
      parcelas: 1,
    },
    {
      id: "req_04",
      descricao: "1x pelúcia pequena",
      valorBrl: 152.4,
      status: "PENDENTE",
      dataSolicitacao: "2026-06-06",
      formaPagamento: "pix",
      parcelas: 1,
    },
    {
      id: "old_01",
      descricao: "3x photocard",
      valorBrl: 130.2,
      status: "COMPRADO",
      dataSolicitacao: "2026-04-10",
      formaPagamento: "pix",
      parcelas: 1,
    },
    {
      id: "old_02",
      descricao: "1x álbum",
      valorBrl: 215.8,
      status: "COMPRADO",
      dataSolicitacao: "2026-03-22",
      formaPagamento: "cartao",
      parcelas: 2,
    },
    {
      id: "old_03",
      descricao: "2x postcard",
      valorBrl: 46.8,
      status: "COMPRADO",
      dataSolicitacao: "2026-02-14",
      formaPagamento: "pix",
      parcelas: 1,
    },
  ],
  j2: [
    {
      id: "req_02",
      descricao: "1x álbum · 1x photocard",
      valorBrl: 186.5,
      status: "AGUARDANDO_PAGAMENTO",
      dataSolicitacao: "2026-05-28",
      formaPagamento: "cartao",
      parcelas: 3,
    },
    {
      id: "req_06",
      descricao: "4x postcard · 2x adesivo",
      valorBrl: 79.2,
      status: "COMPRADO",
      dataSolicitacao: "2026-05-15",
      formaPagamento: "pix",
      parcelas: 1,
    },
    {
      id: "old_04",
      descricao: "1x álbum",
      valorBrl: 215.8,
      status: "COMPRADO",
      dataSolicitacao: "2026-04-02",
      formaPagamento: "cartao",
      parcelas: 2,
    },
  ],
  j3: [
    {
      id: "req_03",
      descricao: "1x item grande",
      valorBrl: 301.0,
      status: "COMPRADO",
      dataSolicitacao: "2026-05-20",
      formaPagamento: "cartao",
      parcelas: 1,
    },
  ],
  j4: [
    {
      id: "req_05",
      descricao: "5x photocard",
      valorBrl: 198.6,
      status: "AGUARDANDO_PAGAMENTO",
      dataSolicitacao: "2026-06-03",
      formaPagamento: "cartao",
      parcelas: 2,
    },
  ],
};
