import { Injectable, computed, signal } from "@angular/core";
import { isValidEmail } from "@/lib/auth";
import type { Autoria } from "@/lib/autoria";
import {
  MOCK_COMUNIDADE,
  MOCK_MEMBROS,
  MOCK_PARTICIPACOES,
  type Comunidade,
  type MembroComunidade,
  type ParticipacaoJoiner,
} from "@/lib/comunidade-types";

export interface NovoAdmin {
  nome: string;
  email: string;
  username: string;
}

/**
 * Comunidade da GOM e seus membros (dona + administradoras).
 * Não depende do AuthService nem do AssinaturaService (o AuthService consulta este service no
 * login — injetar os dois criaria um ciclo). Quem chama passa a autoria e registra o histórico.
 */
@Injectable({ providedIn: "root" })
export class ComunidadeService {
  // 🔌 GET /api/gom/comunidade
  private readonly _comunidade = signal<Comunidade>(MOCK_COMUNIDADE);
  // 🔌 GET /api/gom/comunidade/membros
  private readonly _membros = signal<MembroComunidade[]>(MOCK_MEMBROS);

  readonly comunidade = this._comunidade.asReadonly();

  // 🔌 GET /api/gom/comunidade/joiners e /api/joiner/comunidades
  private readonly _participacoes = signal<ParticipacaoJoiner[]>(MOCK_PARTICIPACOES);

  /** A joiner participa da comunidade? */
  participa(joinerId: string, comunidadeId: string): boolean {
    return this._participacoes().some(
      (p) => p.joinerId === joinerId && p.comunidadeId === comunidadeId,
    );
  }

  /** Comunidades da joiner (vitrine de CEGs). 🔌 o mock tem uma comunidade só. */
  comunidadesDaJoiner(joinerId: string): Comunidade[] {
    const c = this._comunidade();
    return this.participa(joinerId, c.id) ? [c] : [];
  }

  /** Remoção aprovada pelo admin (ModeracaoService). */
  removerJoiner(joinerId: string, comunidadeId: string): void {
    // 🔌 feito pelo servidor em POST /api/admin/moderacao/:id/aprovar
    this._participacoes.update((prev) =>
      prev.filter((p) => !(p.joinerId === joinerId && p.comunidadeId === comunidadeId)),
    );
  }

  /** Dona primeiro, depois as admins em ordem alfabética. */
  readonly membros = computed(() =>
    [...this._membros()].sort(
      (a, b) =>
        (a.papel === "DONA" ? 0 : 1) - (b.papel === "DONA" ? 0 : 1) ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    ),
  );

  /** Membro cadastrado com este e-mail (sem diferenciar maiúsculas). */
  membroPorEmail(email: string): MembroComunidade | undefined {
    const alvo = email.trim().toLowerCase();
    return this._membros().find((m) => m.email.toLowerCase() === alvo);
  }

  /** Primeiro login ativa o convite; todo login atualiza o último acesso. */
  registrarAcesso(membroId: string): void {
    // 🔌 feito pelo servidor no POST /api/auth/login
    const agora = new Date().toISOString();
    this._membros.update((prev) =>
      prev.map((m) => (m.id === membroId ? { ...m, status: "ATIVO", ultimoAcesso: agora } : m)),
    );
  }

  /** Retorna uma mensagem de erro, ou null se cadastrou. */
  adicionarAdmin(dados: NovoAdmin, por?: Autoria): string | null {
    const nome = dados.nome.trim();
    const email = dados.email.trim().toLowerCase();
    const username = normalizarUsername(dados.username);
    if (!nome) return "informe o nome.";
    if (!isValidEmail(email)) return "e-mail inválido.";
    if (this.membroPorEmail(email)) return "esse e-mail já faz parte da comunidade.";
    if (!username) return "informe o @ da admin.";

    // 🔌 POST /api/gom/comunidade/membros — o servidor envia o convite por e-mail
    const membro: MembroComunidade = {
      id: `adm_${Date.now()}`,
      comunidadeId: this._comunidade().id,
      nome,
      email,
      username,
      papel: "ADMIN",
      status: "CONVIDADO",
      adicionadoEm: new Date().toISOString(),
      adicionadoPor: por,
    };
    this._membros.update((prev) => [...prev, membro]);
    return null;
  }

  /** A dona não pode ser removida. */
  removerAdmin(id: string): void {
    // 🔌 DELETE /api/gom/comunidade/membros/:id (+ invalidar sessões dela)
    this._membros.update((prev) => prev.filter((m) => m.id !== id || m.papel === "DONA"));
  }

  atualizarComunidade(patch: Pick<Comunidade, "nome" | "instagram">, por?: Autoria): void {
    // 🔌 PATCH /api/gom/comunidade
    this._comunidade.update((c) => ({
      ...c,
      nome: patch.nome.trim() || c.nome,
      instagram: patch.instagram?.trim() ? normalizarUsername(patch.instagram) : undefined,
      atualizadoPor: por,
    }));
  }
}

function normalizarUsername(valor: string): string {
  const limpo = valor.trim().replace(/^@+/, "").replace(/\s+/g, "");
  return limpo ? `@${limpo}` : "";
}
