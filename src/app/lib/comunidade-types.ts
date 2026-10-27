/**
 * Comunidade de uma GOM: a conta da GOM (dona) + as administradoras que ela cadastrou.
 *
 * Cada membro faz login com o próprio e-mail. Ao entrar, o membro assume o role GOM no escopo da
 * comunidade (`gomId` = conta da dona) e vê os mesmos dados: CEGs, fila, mensagens, claims.
 * Só a dona cadastra/remove administradoras e edita os dados da comunidade.
 */

import type { Autoria } from "./autoria";

export type PapelComunidade = "DONA" | "ADMIN";

/** CONVIDADO até o primeiro login com o e-mail cadastrado. */
export type StatusMembro = "CONVIDADO" | "ATIVO";

export interface Comunidade {
  id: string;
  nome: string;
  instagram?: string;
  /** Conta da GOM dona — escopo de todos os dados da comunidade. */
  gomId: string;
  criadaEm: string; // ISO
  atualizadoPor?: Autoria;
}

export interface MembroComunidade {
  id: string;
  comunidadeId: string;
  nome: string;
  email: string;
  username: string;
  papel: PapelComunidade;
  status: StatusMembro;
  adicionadoEm: string; // ISO
  ultimoAcesso?: string; // ISO
  /** Quem cadastrou a admin. */
  adicionadoPor?: Autoria;
}

/** Joiner que participa da comunidade (vê as CEGs dela na vitrine). */
export interface ParticipacaoJoiner {
  joinerId: string;
  comunidadeId: string;
  desde: string; // ISO
}

export const PAPEL_META: Record<PapelComunidade, { label: string; badge: string }> = {
  DONA: { label: "dona", badge: "bg-primary/10 text-primary ring-1 ring-primary/30" },
  ADMIN: { label: "admin", badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
};

export const STATUS_MEMBRO_META: Record<StatusMembro, { label: string; badge: string }> = {
  ATIVO: { label: "ativo", badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200" },
  CONVIDADO: {
    label: "aguardando 1º login",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
};

// ---------------------------------------------------------------------------
// Mocks — 🔌 substituir por GET /api/gom/comunidade (+ /membros)
// ---------------------------------------------------------------------------

export const MOCK_COMUNIDADE: Comunidade = {
  id: "com_01",
  nome: "Knodori",
  instagram: "@knodori_gom",
  gomId: "usr_gom_01",
  criadaEm: "2025-11-02T12:00:00Z",
};

export const MOCK_MEMBROS: MembroComunidade[] = [
  {
    id: "usr_gom_01",
    comunidadeId: "com_01",
    nome: "Knodori",
    email: "gom@knodori.app",
    username: "@knodori_gom",
    papel: "DONA",
    status: "ATIVO",
    adicionadoEm: "2025-11-02T12:00:00Z",
  },
  {
    id: "adm_lia",
    comunidadeId: "com_01",
    nome: "Lia Park",
    email: "lia@knodori.app",
    username: "@liapark",
    papel: "ADMIN",
    status: "ATIVO",
    adicionadoEm: "2026-02-14T15:30:00Z",
    ultimoAcesso: "2026-06-09T22:10:00Z",
  },
  {
    id: "adm_duda",
    comunidadeId: "com_01",
    nome: "Duda Lima",
    email: "duda@knodori.app",
    username: "@dudalima",
    papel: "ADMIN",
    status: "CONVIDADO",
    adicionadoEm: "2026-06-01T10:00:00Z",
  },
];

export const MOCK_PARTICIPACOES: ParticipacaoJoiner[] = [
  { joinerId: "j1", comunidadeId: "com_01", desde: "2025-12-01T12:00:00Z" },
  { joinerId: "j2", comunidadeId: "com_01", desde: "2025-12-03T12:00:00Z" },
  { joinerId: "j3", comunidadeId: "com_01", desde: "2026-01-15T12:00:00Z" },
  { joinerId: "j4", comunidadeId: "com_01", desde: "2026-03-20T12:00:00Z" },
];
