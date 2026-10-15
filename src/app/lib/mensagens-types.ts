/**
 * Mensagens diretas entre joiner e GOM.
 * Uma conversa por par joiner ↔ GOM; cada mensagem pode (ou não) estar vinculada a um pedido.
 */

import { ITEM_META, type ItemKey } from "./gom-types";

export interface Conversa {
  id: string;
  joinerId: string;
  joinerNome: string;
  joinerUsername: string;
  gomId: string;
  gomUsername: string;
}

export interface Mensagem {
  id: string;
  conversaId: string;
  autorId: string;
  texto: string;
  data: string; // ISO
  /** Pedido Mercari (SolicitacaoGOM.id) sobre o qual é a mensagem. */
  pedidoId?: string;
  /** Imagens anexadas (data URL no mock; 🔌 URL do storage em produção). */
  imagens?: string[];
  /** Lida pelo destinatário. */
  lida: boolean;
}

/** Resumo curto dos itens de um pedido ("2× photocard · 1× adesivo"). */
export function resumoItens(itens: Record<string, number>): string {
  return Object.entries(itens)
    .filter(([, q]) => q > 0)
    .map(([k, q]) => `${q}× ${ITEM_META[k as ItemKey]?.label ?? k}`)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Mock — 🔌 substituir por GET /api/conversas e /api/conversas/:id/mensagens
// ---------------------------------------------------------------------------

// 🔌 em produção a GOM vem do vínculo da joiner; mock com a GOM única (AuthService)
export const GOM_PADRAO = { id: "usr_gom_01", username: "@knodori_gom" };

export const MOCK_CONVERSAS: Conversa[] = [
  {
    id: "conv_j1",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    gomId: GOM_PADRAO.id,
    gomUsername: GOM_PADRAO.username,
  },
  {
    id: "conv_j2",
    joinerId: "j2",
    joinerNome: "Ana Reis",
    joinerUsername: "@bunbun",
    gomId: GOM_PADRAO.id,
    gomUsername: GOM_PADRAO.username,
  },
  {
    id: "conv_j3",
    joinerId: "j3",
    joinerNome: "Marina Souza",
    joinerUsername: "@cherrymari",
    gomId: GOM_PADRAO.id,
    gomUsername: GOM_PADRAO.username,
  },
];

export const MOCK_MENSAGENS: Mensagem[] = [
  {
    id: "msg_01",
    conversaId: "conv_j1",
    autorId: "j1",
    texto: "oi! acabei de mandar o pedido dos 3 photocards, posso pagar o PIX amanhã cedo?",
    data: "2026-06-09T13:02:00Z",
    pedidoId: "req_07",
    lida: true,
  },
  {
    id: "msg_02",
    conversaId: "conv_j1",
    autorId: GOM_PADRAO.id,
    texto: "pode sim, bia! o vendedor segura até amanhã à noite 💖",
    data: "2026-06-09T13:20:00Z",
    pedidoId: "req_07",
    lida: true,
  },
  {
    id: "msg_03",
    conversaId: "conv_j1",
    autorId: "j1",
    texto: "obrigada!! outra coisa: vocês vão abrir caixa de álbuns em julho?",
    data: "2026-06-10T09:15:00Z",
    lida: true,
  },
  {
    id: "msg_04",
    conversaId: "conv_j1",
    autorId: GOM_PADRAO.id,
    texto: "vamos sim! devo anunciar semana que vem nas novidades ✨",
    data: "2026-06-10T10:02:00Z",
    lida: false,
  },
  {
    id: "msg_05",
    conversaId: "conv_j1",
    autorId: GOM_PADRAO.id,
    texto:
      "ah, e a caixa mercari 2 já saiu da warehouse! a cobrança do frete + taxas está em minhas compras.",
    data: "2026-06-10T10:05:00Z",
    pedidoId: "req_11",
    imagens: ["https://picsum.photos/seed/msg-caixa2/600/450"],
    lida: false,
  },
  {
    id: "msg_06",
    conversaId: "conv_j2",
    autorId: "j2",
    texto: "consigo parcelar o álbum em 3× mesmo?",
    data: "2026-06-08T20:10:00Z",
    pedidoId: "req_02",
    lida: true,
  },
  {
    id: "msg_07",
    conversaId: "conv_j2",
    autorId: GOM_PADRAO.id,
    texto: "consegue sim! já deixei como cartão 3×.",
    data: "2026-06-08T21:00:00Z",
    pedidoId: "req_02",
    lida: true,
  },
  {
    id: "msg_06b",
    conversaId: "conv_j2",
    autorId: "j2",
    texto: "achei esse outro anúncio, dá pra incluir na próxima caixa?",
    data: "2026-06-08T21:12:00Z",
    imagens: ["https://picsum.photos/seed/msg-ana-anuncio/600/600"],
    lida: true,
  },
  {
    id: "msg_08",
    conversaId: "conv_j2",
    autorId: "j2",
    texto: "e os postcards que eu pedi em maio, já chegaram na warehouse?",
    data: "2026-06-11T08:40:00Z",
    lida: false,
  },
  {
    id: "msg_09",
    conversaId: "conv_j3",
    autorId: "j3",
    texto: "a caixa vai fechar quando? queria juntar mais um item 🥺",
    data: "2026-06-05T16:30:00Z",
    pedidoId: "req_03",
    lida: false,
  },
];
