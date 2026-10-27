/**
 * Moderação de joiners: a GOM (dona ou admin da comunidade) só SOLICITA — com motivo obrigatório —
 * e o admin da plataforma aprova ou recusa.
 *
 * - REMOCAO: a joiner sai da comunidade (some da lista de joiners e da vitrine de CEGs dela).
 * - BANIMENTO: a conta fica SUSPENSA na plataforma (não entra mais no app) e ela sai da comunidade.
 */

import type { Autoria } from "./autoria";

export type TipoModeracao = "REMOCAO" | "BANIMENTO";
export type StatusModeracao = "PENDENTE" | "APROVADA" | "RECUSADA";

/** Tamanho mínimo da justificativa. */
export const MOTIVO_MIN = 15;

export interface SolicitacaoModeracao {
  id: string;
  tipo: TipoModeracao;
  joinerId: string;
  joinerNome: string;
  joinerUsername: string;
  comunidadeId: string;
  comunidadeNome: string;
  motivo: string;
  status: StatusModeracao;
  solicitadoPor: Autoria;
  decididoPor?: Autoria;
  /** Resposta do admin para a GOM. */
  resposta?: string;
}

export const TIPO_MODERACAO_META: Record<
  TipoModeracao,
  { label: string; acao: string; descricao: string; badge: string }
> = {
  REMOCAO: {
    label: "remoção",
    acao: "remover da comunidade",
    descricao: "sai da comunidade, mas a conta continua ativa.",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  BANIMENTO: {
    label: "banimento",
    acao: "banir da plataforma",
    descricao: "a conta é suspensa e ela não entra mais no app.",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  },
};

export const STATUS_MODERACAO_META: Record<StatusModeracao, { label: string; badge: string }> = {
  PENDENTE: {
    label: "aguardando admin",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  APROVADA: { label: "aprovada", badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200" },
  RECUSADA: { label: "recusada", badge: "bg-muted text-muted-foreground" },
};

// 🔌 Mock — substituir por GET /api/admin/moderacao (admin) e /api/gom/moderacao (GOM)
export const MOCK_MODERACAO: SolicitacaoModeracao[] = [
  {
    id: "mod_01",
    tipo: "REMOCAO",
    joinerId: "j4",
    joinerNome: "Lara Kim",
    joinerUsername: "@larakim",
    comunidadeId: "com_01",
    comunidadeNome: "Knodori",
    motivo:
      "deu claim em 3 CEGs seguidas e não pagou nenhuma; já cobramos pelo WhatsApp e pelo app sem resposta.",
    status: "PENDENTE",
    solicitadoPor: {
      id: "adm_lia",
      nome: "Lia Park",
      username: "@liapark",
      em: "2026-06-10T19:20:00Z",
    },
  },
];
