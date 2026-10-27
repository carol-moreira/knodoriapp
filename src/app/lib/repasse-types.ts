import type { Autoria } from "./autoria";
import type { Comprovante } from "./comprovante";
// ---------------------------------------------------------------------------
// Repasse de claim — tipos e mocks (sem estado).
// O estado vive em RepassesService (src/app/services/repasses.service.ts).
//
// Regras:
//  - só a joiner dona da claim pode repassar, e só itens já pagos por ela;
//  - a remetente informa o código de cadastro da destinatária, confirma que
//    já pagou o item e anexa o comprovante do pix que recebeu da destinatária;
//  - a GOM confirma o repasse → a dona do item passa a ser a destinatária.
// ---------------------------------------------------------------------------

export type RepasseStatus = "PENDENTE" | "CONFIRMADO";

/** Joiner identificada pelo código de cadastro. */
export interface JoinerCadastro {
  codigo: string;
  id: string;
  nome: string;
  username: string;
}

export interface SolicitacaoRepasse {
  id: string;
  cegId: string;
  cegNome: string;
  /** Pedido da joiner remetente (quando a remetente é a usuária logada). */
  pedidoId?: string;
  itemDescricao: string;
  valorBrl: number;
  remetente: { id: string; nome: string; username: string };
  destinatario: JoinerCadastro;
  /** A remetente declarou que já pagou o item. */
  pagamentoConfirmado: true;
  /** Comprovante do pagamento da destinatária para a remetente (a GOM confere antes de repassar). */
  comprovante?: Comprovante;
  observacao?: string;
  status: RepasseStatus;
  dataSolicitacao: string; // ISO
  dataConfirmacao?: string; // ISO
  /** Quem da equipe confirmou o repasse. */
  confirmadoPor?: Autoria;
}

export const REPASSE_STATUS_META: Record<RepasseStatus, { label: string; cls: string }> = {
  PENDENTE: { label: "pendente", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  CONFIRMADO: { label: "confirmado", cls: "bg-lime-50 text-lime-700 ring-1 ring-lime-200" },
};

/** Normaliza o código digitado (maiúsculas, sem espaços). */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\s+/g, "");
}

// ---------------------------------------------------------------------------
// Mocks — 🔌 substituir por GET /api/joiners/cadastro/:codigo e /api/gom/repasses
// ---------------------------------------------------------------------------

export const MOCK_CADASTROS: JoinerCadastro[] = [
  { codigo: "KN-1042", id: "j1", nome: "Bia Costa", username: "@miniheart" },
  { codigo: "KN-2087", id: "j2", nome: "Ana Reis", username: "@bunbun" },
  { codigo: "KN-3150", id: "j3", nome: "Marina Souza", username: "@cherrymari" },
  { codigo: "KN-4421", id: "j4", nome: "Lara Kim", username: "@larakim" },
];

export const MOCK_SOLICITACOES_REPASSE: SolicitacaoRepasse[] = [
  {
    id: "rep_01",
    cegId: "ceg_01",
    cegNome: "Cherry Haul Jun/26",
    itemDescricao: "2× photocard · 1× adesivo",
    valorBrl: 118.4,
    remetente: { id: "j1", nome: "Bia Costa", username: "@miniheart" },
    destinatario: MOCK_CADASTROS[1],
    pagamentoConfirmado: true,
    observacao: "já combinamos o PIX entre a gente ♡",
    status: "PENDENTE",
    dataSolicitacao: "2026-06-10T14:20:00Z",
  },
  {
    id: "rep_02",
    cegId: "ceg_02",
    cegNome: "Spring Box Ktown4u",
    itemDescricao: "1× álbum",
    valorBrl: 96.0,
    remetente: { id: "j4", nome: "Lara Kim", username: "@larakim" },
    destinatario: MOCK_CADASTROS[2],
    pagamentoConfirmado: true,
    status: "PENDENTE",
    dataSolicitacao: "2026-06-11T09:05:00Z",
  },
  {
    id: "rep_03",
    cegId: "ceg_01",
    cegNome: "Cherry Haul Jun/26",
    itemDescricao: "3× postcard",
    valorBrl: 54.9,
    remetente: { id: "j3", nome: "Marina Souza", username: "@cherrymari" },
    destinatario: MOCK_CADASTROS[0],
    pagamentoConfirmado: true,
    status: "CONFIRMADO",
    dataSolicitacao: "2026-06-02T18:40:00Z",
    dataConfirmacao: "2026-06-03T10:00:00Z",
  },
];
