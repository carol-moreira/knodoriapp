/**
 * Autoria de uma alteração — quem fez, segundo o cadastro, e quando.
 *
 * Toda ação que muda dados (cobrança, mensagem, claim, item, CEG, repasse…) grava a autoria no
 * próprio registro, e a interface mostra no formato de assinatura (<app-assinatura>). Com várias
 * admins na mesma comunidade, é isso que diz qual delas fez o quê.
 * 🔌 Em produção o servidor preenche a autoria a partir da sessão — nunca do corpo da requisição.
 */

import type { AuthUser } from "./auth";

export interface Autoria {
  id: string;
  nome: string;
  username: string;
  em: string; // ISO
}

export function autoriaDe(user: AuthUser): Autoria {
  return { id: user.id, nome: user.nome, username: user.username, em: new Date().toISOString() };
}

/** Área da ação — vai junto no registro de auditoria do servidor. */
export type AreaAuditoria =
  | "CEG"
  | "ITEM"
  | "CLAIM"
  | "PEDIDO"
  | "CAIXA"
  | "COBRANCA"
  | "PAGAMENTO"
  | "REPASSE"
  | "NOVIDADE"
  | "COMUNIDADE"
  | "MODERACAO"
  | "ENVIO"
  | "TAXAS";
