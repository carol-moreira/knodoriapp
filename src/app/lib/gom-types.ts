/**
 * Tipos canônicos da visão GOM.
 * Usados pelos 4 componentes do painel e derivados direto do que a API retornará.
 * Toda query deve filtrar por gomId — o escopo é sempre o da GOM logada.
 */

// ---------------------------------------------------------------------------
// Solicitação Mercari (perspectiva da GOM)
// ---------------------------------------------------------------------------

export type MercariStatus = "PENDENTE" | "AGUARDANDO_PAGAMENTO" | "COMPRADO";

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
    status: "COMPRADO",
    dataSolicitacao: "2026-05-20",
    rastreio: "JP123456789BR",
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
    status: "PENDENTE",
    dataSolicitacao: "2026-06-06",
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
  },
];

export const MOCK_JOINERS: JoinerResumo[] = [
  {
    id: "j1",
    nome: "Bia Costa",
    username: "@miniheart",
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
