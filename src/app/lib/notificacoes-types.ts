/**
 * Notificações in-app. Estado em NotificacoesService (src/app/services/notificacoes.service.ts).
 *
 * Schema (tabela `notifications`):
 *   id · user_id (null = todo o role) · role (JOINER | GOM | ADMIN) · type · title · message ·
 *   link_url · read_at (null = não lida) · created_at
 * No cliente os campos ficam em camelCase (`Notificacao`); `NotificacaoRow` + `deRow()` fazem a
 * ponte com a API. 🔌 Em produção um envio para o role inteiro vira uma linha por usuária (cada
 * uma com seu read_at); no mock a linha é compartilhada.
 */

import type { UserRole } from "./auth";

export type TipoNotificacao =
  // claims
  | "CLAIM_ABRE_EM_BREVE"
  | "CLAIM_ABERTO"
  | "CLAIM_NOVO"
  | "CLAIM_DECIDIDO"
  | "CLAIM_ITEM"
  | "REPASSE"
  // pacotes (envio nacional)
  | "PACOTE_NOVO"
  | "PACOTE_STATUS"
  | "PACOTE_AGUARDANDO"
  // CEGs e caixas mercari
  | "CEG_STATUS"
  | "CEG_NOVIDADE"
  | "CONSOLIDACAO_PRAZO"
  | "PEDIDO_NOVO"
  | "PEDIDO_STATUS"
  // financeiro
  | "COTACAO_FRETE"
  | "PRAZO_PAGAMENTO"
  | "COMPROVANTE_ENVIADO"
  | "PAGAMENTO_CONFIRMADO"
  | "COBRANCA"
  // geral
  | "MENSAGEM"
  | "MODERACAO";

/** Abas da central de notificações ("geral" só aparece em "todas"). */
export type CategoriaNotificacao = "CLAIMS" | "PACOTES" | "CEGS" | "FINANCEIRO" | "GERAL";

export const CATEGORIA_DO_TIPO: Record<TipoNotificacao, CategoriaNotificacao> = {
  CLAIM_ABRE_EM_BREVE: "CLAIMS",
  CLAIM_ABERTO: "CLAIMS",
  CLAIM_NOVO: "CLAIMS",
  CLAIM_DECIDIDO: "CLAIMS",
  CLAIM_ITEM: "CLAIMS",
  REPASSE: "CLAIMS",
  PACOTE_NOVO: "PACOTES",
  PACOTE_STATUS: "PACOTES",
  PACOTE_AGUARDANDO: "PACOTES",
  CEG_STATUS: "CEGS",
  CEG_NOVIDADE: "CEGS",
  CONSOLIDACAO_PRAZO: "CEGS",
  PEDIDO_NOVO: "CEGS",
  PEDIDO_STATUS: "CEGS",
  COTACAO_FRETE: "FINANCEIRO",
  PRAZO_PAGAMENTO: "FINANCEIRO",
  COMPROVANTE_ENVIADO: "FINANCEIRO",
  PAGAMENTO_CONFIRMADO: "FINANCEIRO",
  COBRANCA: "FINANCEIRO",
  MENSAGEM: "GERAL",
  MODERACAO: "GERAL",
};

export type FiltroNotificacao = "TODAS" | Exclude<CategoriaNotificacao, "GERAL">;

export const FILTROS_NOTIFICACAO: { value: FiltroNotificacao; label: string }[] = [
  { value: "TODAS", label: "todas" },
  { value: "CLAIMS", label: "claims" },
  { value: "PACOTES", label: "pacotes" },
  { value: "CEGS", label: "CEGs" },
  { value: "FINANCEIRO", label: "financeiro" },
];

export const ROLES: readonly UserRole[] = ["ADMIN", "GOM", "JOINER"];

export interface Notificacao {
  id: string;
  /** Destinatária; null = todas as usuárias do `role`. */
  userId: string | null;
  role: UserRole;
  type: TipoNotificacao;
  title: string;
  message: string;
  /** Rota do app aberta ao tocar na notificação. */
  linkUrl?: string;
  readAt: string | null; // ISO
  createdAt: string; // ISO
}

/** Linha como vem da API (GET /api/notificacoes). */
export interface NotificacaoRow {
  id: string;
  user_id: string | null;
  role: UserRole;
  type: TipoNotificacao;
  title: string;
  message: string;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
}

export function deRow(r: NotificacaoRow): Notificacao {
  return {
    id: r.id,
    userId: r.user_id,
    role: r.role,
    type: r.type,
    title: r.title,
    message: r.message,
    linkUrl: r.link_url ?? undefined,
    readAt: r.read_at,
    createdAt: r.created_at,
  };
}

/** "agora" · "há 5 min" · "há 3 h" · "ontem" · "12 jun". */
export function quandoNotificacao(iso: string, agora = Date.now()): string {
  const min = Math.floor((agora - Date.parse(iso)) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  if (h < 48) return "ontem";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ---------------------------------------------------------------------------
// Mocks — 🔌 substituir por GET /api/notificacoes (+ push/websocket)
// ---------------------------------------------------------------------------

function mock(n: Omit<NotificacaoRow, "read_at" | "link_url"> & Partial<NotificacaoRow>) {
  return deRow({ read_at: null, link_url: null, ...n });
}

export const MOCK_NOTIFICACOES: Notificacao[] = [
  mock({
    id: "ntf_01",
    user_id: null,
    role: "GOM",
    type: "REPASSE",
    title: "nova solicitação de repasse",
    message:
      "@miniheart quer repassar 2× photocard · 1× adesivo (Cherry Haul Jun/26) para @bunbun.",
    link_url: "/gom/cegs",
    created_at: "2026-06-10T14:20:00Z",
  }),
  mock({
    id: "ntf_02",
    user_id: null,
    role: "GOM",
    type: "REPASSE",
    title: "nova solicitação de repasse",
    message: "@larakim quer repassar 1× álbum (Spring Box Ktown4u) para @cherrymari.",
    link_url: "/gom/cegs",
    created_at: "2026-06-11T09:05:00Z",
  }),
  mock({
    id: "ntf_03",
    user_id: null,
    role: "GOM",
    type: "CLAIM_NOVO",
    title: "novo claim em Idol Power CEG ✋",
    message: "@cherrymari pediu #B4 photocard set.",
    link_url: "/gom/claims",
    read_at: "2026-06-09T12:00:00Z",
    created_at: "2026-06-09T11:58:00Z",
  }),
  mock({
    id: "ntf_04",
    user_id: "j1",
    role: "JOINER",
    type: "PACOTE_STATUS",
    title: "pacote aguardando ⏳",
    message: "seu envio está aguardando: os correios não fizeram a coleta, nova tentativa amanhã.",
    link_url: "/joiner/envios",
    created_at: "2026-06-12T16:30:00Z",
  }),
  mock({
    id: "ntf_05",
    user_id: "j1",
    role: "JOINER",
    type: "CEG_STATUS",
    title: "caixa mercari 1 chegou no Brasil 🇧🇷",
    message: "a caixa passou pela alfândega e está com a GOM. o envio nacional sai em breve.",
    link_url: "/joiner/cegs",
    read_at: "2026-05-20T11:00:00Z",
    created_at: "2026-05-20T10:00:00Z",
  }),
];
