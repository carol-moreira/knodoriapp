/**
 * Rodada de claims de uma CEG.
 *
 * A GOM cadastra os itens (CegItem) e agenda a abertura (CegSchedule). Na hora marcada o chat
 * da rodada aceita claims: a joiner só digita o código (ou o nome) do item e o claim sai com os
 * dados do perfil dela (nome, @ e WhatsApp). A GOM confirma ou rejeita; claims simultâneos no
 * mesmo item formam uma fila ordenada pelo timestamp do servidor (+ `seq` para empates).
 *
 * Relações: CegGOM 1─N CegItem · CegGOM 1─1 CegSchedule · CegItem 1─N Claim · User 1─N Claim
 * Contrato da API e arquitetura de tempo real: docs/claims.md
 */

import type { Autoria } from "./autoria";
import type { Comprovante } from "./comprovante";
import { MOCK_JOINERS } from "./gom-types";

// ---------------------------------------------------------------------------
// Entidades
// ---------------------------------------------------------------------------

/** DISPONIVEL → RESERVADO (há claim pendente) → CONFIRMADO (GOM aceitou). */
export type CegItemStatus = "DISPONIVEL" | "RESERVADO" | "CONFIRMADO";

export type PagamentoItem = "PENDENTE" | "PAGO";

export interface CegItem {
  id: string;
  cegId: string;
  /** Código que a joiner digita no chat (único por CEG, sem diferenciar maiúsculas). */
  codigo: string;
  nome: string;
  /** Valor unitário em BRL. */
  valor: number;
  status: CegItemStatus;
  /** Claim confirmado — dono do item. */
  claimId?: string;
  /** Só existe depois do claim confirmado. */
  pagamento?: PagamentoItem;
  /** Comprovantes do pagamento (enviados pela joiner ou anexados pela GOM ao marcar pago). */
  comprovantes?: Comprovante[];
  /** Item chegou avariado (amassado, riscado, faltando parte…). */
  avaria?: boolean;
  /** O que aconteceu com o item — visível para a dona do claim. */
  avariaNota?: string;
  /** A joiner largou o item (não pagou / desistiu). Só faz sentido com claim confirmado. */
  abandonado?: boolean;
  /** Última alteração (cadastro, edição, pagamento…) e quem fez. */
  atualizadoPor?: Autoria;
}

export interface CegSchedule {
  cegId: string;
  /** Abertura exata dos claims (ISO). */
  abreEm: string;
  /** Encerramento opcional (ISO); sem ele a rodada fica aberta até a GOM encerrar. */
  fechaEm?: string;
  /** Minutos de antecedência do aviso prévio (0 = sem aviso). */
  avisoMinutos: number;
  avisoEnviado: boolean;
  aberturaEnviada: boolean;
  /** Quem agendou (ou reagendou / encerrou). */
  por?: Autoria;
}

export type ClaimStatus = "PENDENTE" | "CONFIRMADO" | "REJEITADO";

export interface Claim {
  id: string;
  cegId: string;
  itemId: string;
  /** Mensagem do chat que gerou o claim. */
  mensagemId: string;
  // Dados do perfil copiados no envio (snapshot) — a joiner não preenche nada.
  joinerId: string;
  joinerNome: string;
  joinerUsername: string;
  joinerTelefone?: string;
  /** Timestamp atribuído pelo servidor (ISO com ms). */
  criadoEm: string;
  /** Ordem de chegada no servidor — desempata claims no mesmo milissegundo. */
  seq: number;
  status: ClaimStatus;
  decididoEm?: string;
  motivo?: string;
  /** Quem da equipe confirmou ou rejeitou. */
  decididoPor?: Autoria;
}

export type ClaimMensagemTipo = "TEXTO" | "CLAIM" | "SISTEMA";

export interface ClaimMensagem {
  id: string;
  cegId: string;
  /** "sistema" nas mensagens automáticas. */
  autorId: string;
  autorUsername: string;
  texto: string;
  data: string; // ISO
  tipo: ClaimMensagemTipo;
  /** Claims gerados por esta mensagem. */
  claimIds?: string[];
}

export type EstadoRodada = "SEM_AGENDA" | "AGENDADA" | "ABERTA" | "ENCERRADA";

// ---------------------------------------------------------------------------
// Metadados de UI
// ---------------------------------------------------------------------------

export const ITEM_STATUS_META: Record<CegItemStatus, { label: string; badge: string }> = {
  DISPONIVEL: { label: "disponível", badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200" },
  RESERVADO: { label: "reservado", badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  CONFIRMADO: { label: "confirmado", badge: "bg-primary/10 text-primary ring-1 ring-primary/30" },
};

export const CLAIM_STATUS_META: Record<ClaimStatus, { label: string; badge: string }> = {
  PENDENTE: { label: "pendente", badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  CONFIRMADO: { label: "confirmado", badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200" },
  REJEITADO: { label: "rejeitado", badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
};

export const RODADA_META: Record<EstadoRodada, { label: string; badge: string }> = {
  SEM_AGENDA: { label: "sem agenda", badge: "bg-muted text-muted-foreground" },
  AGENDADA: { label: "agendada", badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
  ABERTA: { label: "claims abertos", badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200" },
  ENCERRADA: { label: "encerrada", badge: "bg-muted text-muted-foreground" },
};

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

/** Ordem de prioridade entre claims: timestamp do servidor, depois `seq`. */
export function compararClaims(a: Claim, b: Claim): number {
  return a.criadoEm.localeCompare(b.criadoEm) || a.seq - b.seq;
}

export function estadoDaRodada(schedule: CegSchedule | undefined, agora: number): EstadoRodada {
  if (!schedule) return "SEM_AGENDA";
  if (schedule.fechaEm && agora >= Date.parse(schedule.fechaEm)) return "ENCERRADA";
  return agora >= Date.parse(schedule.abreEm) ? "ABERTA" : "AGENDADA";
}

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Itens citados numa mensagem de claim. Aceita o código solto ou com # ("07", "#a12",
 * "claim 3 e 5") e o nome completo do item ("pc jungwon"). Códigos numéricos também casam
 * sem zeros à esquerda ("7" → "07").
 */
export function itensCitados(texto: string, itens: CegItem[]): CegItem[] {
  const msg = normalizar(texto);
  const tokens = new Set(
    msg
      .split(/[^a-z0-9-]+/)
      .filter(Boolean)
      .flatMap((t) => (/^\d+$/.test(t) ? [t, String(Number(t))] : [t])),
  );
  return itens.filter((item) => {
    const codigo = normalizar(item.codigo);
    if (tokens.has(codigo) || (/^\d+$/.test(codigo) && tokens.has(String(Number(codigo))))) {
      return true;
    }
    const nome = normalizar(item.nome);
    return nome.length >= 3 && new RegExp(`(^|\\W)${escapeRegex(nome)}($|\\W)`).test(msg);
  });
}

/** WhatsApp cadastrado da joiner (perfil > cadastro na GOM). */
export function telefoneDaJoiner(joinerId: string, perfil?: string): string | undefined {
  return perfil || MOCK_JOINERS.find((j) => j.id === joinerId)?.telefone;
}

// ---------------------------------------------------------------------------
// Mocks — 🔌 substituir por GET /api/cegs/:id/claims (itens + agenda + claims + chat)
// Horários relativos ao carregamento para a demo: ceg_03 já está aberta e ceg_01 abre em
// 20 min (o aviso prévio de 15 min dispara ~5 min depois de abrir o app).
// ---------------------------------------------------------------------------

const MIN = 60_000;
const t0 = Date.now();
const iso = (offsetMin: number, ms = 0) => new Date(t0 + offsetMin * MIN + ms).toISOString();

export const MOCK_CEG_ITENS: CegItem[] = [
  // ceg_03 — WTS Álbuns Dopamine (aberta)
  {
    id: "it_01",
    cegId: "ceg_03",
    codigo: "01",
    nome: "álbum dopamine ver. A",
    valor: 89.9,
    status: "CONFIRMADO",
    claimId: "clm_01",
    pagamento: "PAGO",
  },
  {
    id: "it_02",
    cegId: "ceg_03",
    codigo: "02",
    nome: "álbum dopamine ver. B",
    valor: 89.9,
    status: "RESERVADO",
  },
  {
    id: "it_03",
    cegId: "ceg_03",
    codigo: "03",
    nome: "pc jungwon",
    valor: 34.5,
    status: "RESERVADO",
  },
  {
    id: "it_04",
    cegId: "ceg_03",
    codigo: "04",
    nome: "pc sunghoon",
    valor: 29.9,
    status: "DISPONIVEL",
  },
  {
    id: "it_05",
    cegId: "ceg_03",
    codigo: "05",
    nome: "pc ni-ki",
    valor: 31.0,
    status: "DISPONIVEL",
  },
  {
    id: "it_06",
    cegId: "ceg_03",
    codigo: "06",
    nome: "postcard set",
    valor: 18.0,
    status: "DISPONIVEL",
  },
  // ceg_01 — Cherry Haul Jun/26 (agendada)
  {
    id: "it_11",
    cegId: "ceg_01",
    codigo: "A1",
    nome: "pc wonyoung lucky draw",
    valor: 42.0,
    status: "DISPONIVEL",
  },
  {
    id: "it_12",
    cegId: "ceg_01",
    codigo: "A2",
    nome: "pc yujin lucky draw",
    valor: 38.0,
    status: "DISPONIVEL",
  },
  {
    id: "it_13",
    cegId: "ceg_01",
    codigo: "B1",
    nome: "keyring cherry",
    valor: 25.0,
    status: "DISPONIVEL",
  },
  // ceg_05 — Idol Power CEG (finalizada: itens já chegaram, prontos para envio nacional)
  {
    id: "it_51",
    cegId: "ceg_05",
    codigo: "B1",
    nome: "photocard set idol power",
    valor: 45.0,
    status: "CONFIRMADO",
    claimId: "clm_51",
    pagamento: "PAGO",
  },
  {
    id: "it_52",
    cegId: "ceg_05",
    codigo: "B2",
    nome: "photobook idol power",
    valor: 120.0,
    status: "CONFIRMADO",
    claimId: "clm_52",
    pagamento: "PAGO",
  },
];

export const MOCK_CEG_SCHEDULES: CegSchedule[] = [
  {
    cegId: "ceg_03",
    abreEm: iso(-12),
    avisoMinutos: 15,
    avisoEnviado: true,
    aberturaEnviada: true,
  },
  {
    cegId: "ceg_01",
    abreEm: iso(20),
    avisoMinutos: 15,
    avisoEnviado: false,
    aberturaEnviada: false,
  },
];

export const MOCK_CLAIMS: Claim[] = [
  {
    id: "clm_01",
    cegId: "ceg_03",
    itemId: "it_01",
    mensagemId: "cmsg_02",
    joinerId: "j2",
    joinerNome: "Ana Reis",
    joinerUsername: "@bunbun",
    joinerTelefone: "(21) 99123-4567",
    criadoEm: iso(-12, 412),
    seq: 1,
    status: "CONFIRMADO",
    decididoEm: iso(-10),
  },
  // Empate no mesmo milissegundo no item 03: @cherrymari chegou antes (seq menor)
  {
    id: "clm_02",
    cegId: "ceg_03",
    itemId: "it_03",
    mensagemId: "cmsg_03",
    joinerId: "j3",
    joinerNome: "Marina Souza",
    joinerUsername: "@cherrymari",
    joinerTelefone: "(31) 98888-1122",
    criadoEm: iso(-11, 87),
    seq: 2,
    status: "PENDENTE",
  },
  {
    id: "clm_03",
    cegId: "ceg_03",
    itemId: "it_03",
    mensagemId: "cmsg_04",
    joinerId: "j4",
    joinerNome: "Lara Kim",
    joinerUsername: "@larakim",
    criadoEm: iso(-11, 87),
    seq: 3,
    status: "PENDENTE",
  },
  {
    id: "clm_04",
    cegId: "ceg_03",
    itemId: "it_02",
    mensagemId: "cmsg_04",
    joinerId: "j4",
    joinerNome: "Lara Kim",
    joinerUsername: "@larakim",
    criadoEm: iso(-11, 87),
    seq: 4,
    status: "PENDENTE",
  },
  {
    id: "clm_51",
    cegId: "ceg_05",
    itemId: "it_51",
    mensagemId: "cmsg_51",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    joinerTelefone: "(11) 98765-4321",
    criadoEm: "2026-04-02T20:00:00.120Z",
    seq: 51,
    status: "CONFIRMADO",
    decididoEm: "2026-04-02T20:10:00Z",
  },
  {
    id: "clm_52",
    cegId: "ceg_05",
    itemId: "it_52",
    mensagemId: "cmsg_52",
    joinerId: "j3",
    joinerNome: "Marina Souza",
    joinerUsername: "@cherrymari",
    joinerTelefone: "(31) 98888-1122",
    criadoEm: "2026-04-02T20:00:01.480Z",
    seq: 52,
    status: "CONFIRMADO",
    decididoEm: "2026-04-02T20:10:00Z",
  },
];

export const MOCK_CLAIM_MENSAGENS: ClaimMensagem[] = [
  {
    id: "cmsg_01",
    cegId: "ceg_03",
    autorId: "sistema",
    autorUsername: "KNODORI",
    texto: "claims abertos! digite o código ou o nome do item para dar claim ✦",
    data: iso(-12),
    tipo: "SISTEMA",
  },
  {
    id: "cmsg_02",
    cegId: "ceg_03",
    autorId: "j2",
    autorUsername: "@bunbun",
    texto: "01",
    data: iso(-12, 412),
    tipo: "CLAIM",
    claimIds: ["clm_01"],
  },
  {
    id: "cmsg_03",
    cegId: "ceg_03",
    autorId: "j3",
    autorUsername: "@cherrymari",
    texto: "claim 03 pfv",
    data: iso(-11, 87),
    tipo: "CLAIM",
    claimIds: ["clm_02"],
  },
  {
    id: "cmsg_04",
    cegId: "ceg_03",
    autorId: "j4",
    autorUsername: "@larakim",
    texto: "03 e 02!!",
    data: iso(-11, 87),
    tipo: "CLAIM",
    claimIds: ["clm_03", "clm_04"],
  },
  {
    id: "cmsg_05",
    cegId: "ceg_03",
    autorId: "sistema",
    autorUsername: "KNODORI",
    texto: "@bunbun · claim do 01 (álbum dopamine ver. A) confirmado ✓",
    data: iso(-10),
    tipo: "SISTEMA",
  },
  {
    id: "cmsg_06",
    cegId: "ceg_03",
    autorId: "usr_gom_01",
    autorUsername: "@knodori_gom",
    texto: "o 03 deu empate, quem chegou primeiro no servidor leva — já confiro!",
    data: iso(-9),
    tipo: "TEXTO",
  },
];
