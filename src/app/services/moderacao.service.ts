import { Injectable, computed, inject, signal } from "@angular/core";
import {
  MOCK_MODERACAO,
  MOTIVO_MIN,
  TIPO_MODERACAO_META,
  type SolicitacaoModeracao,
  type TipoModeracao,
} from "@/lib/moderacao-types";
import { AssinaturaService } from "./assinatura.service";
import { AuthService } from "./auth.service";
import { ComunidadeService } from "./comunidade.service";
import { NotificacoesService } from "./notificacoes.service";
import { UsuariosService } from "./usuarios.service";

/** Solicitações de remoção/banimento de joiners: a GOM pede, o admin decide. */
@Injectable({ providedIn: "root" })
export class ModeracaoService {
  private readonly auth = inject(AuthService);
  private readonly assinatura = inject(AssinaturaService);
  private readonly comunidade = inject(ComunidadeService);
  private readonly notificacoes = inject(NotificacoesService);
  private readonly usuarios = inject(UsuariosService);

  private readonly _solicitacoes = signal<SolicitacaoModeracao[]>(MOCK_MODERACAO);

  /** Mais recentes primeiro. */
  readonly solicitacoes = computed(() =>
    [...this._solicitacoes()].sort((a, b) => b.solicitadoPor.em.localeCompare(a.solicitadoPor.em)),
  );

  /** Fila do admin (badge da navegação). */
  readonly pendentes = computed(() => this.solicitacoes().filter((s) => s.status === "PENDENTE"));

  /** Última solicitação sobre a joiner na comunidade (mostra o andamento na página da GOM). */
  ultimaDoJoiner(joinerId: string, comunidadeId: string): SolicitacaoModeracao | undefined {
    return this.solicitacoes().find(
      (s) => s.joinerId === joinerId && s.comunidadeId === comunidadeId,
    );
  }

  /** GOM solicita. Retorna uma mensagem de erro, ou null se enviou. */
  solicitar(
    tipo: TipoModeracao,
    joiner: { id: string; nome: string; username: string },
    motivo: string,
  ): string | null {
    const user = this.auth.user();
    const justificativa = motivo.trim();
    if (!user || user.role !== "GOM" || !user.comunidadeId) return "só a GOM pode solicitar.";
    if (justificativa.length < MOTIVO_MIN) {
      return `explique o motivo (mínimo de ${MOTIVO_MIN} caracteres).`;
    }
    if (this.ultimaDoJoiner(joiner.id, user.comunidadeId)?.status === "PENDENTE") {
      return "já existe uma solicitação em análise para esta joiner.";
    }

    const meta = TIPO_MODERACAO_META[tipo];
    const solicitadoPor = this.assinatura.assinar(
      "MODERACAO",
      `solicitou ${meta.label} de ${joiner.username}: ${justificativa}`,
    );
    if (!solicitadoPor) return "sessão expirada.";

    // 🔌 POST /api/gom/moderacao { tipo, joinerId, motivo }
    this._solicitacoes.update((prev) => [
      {
        id: `mod_${Date.now()}`,
        tipo,
        joinerId: joiner.id,
        joinerNome: joiner.nome,
        joinerUsername: joiner.username,
        comunidadeId: user.comunidadeId!,
        comunidadeNome: user.comunidadeNome ?? "comunidade",
        motivo: justificativa,
        status: "PENDENTE",
        solicitadoPor,
      },
      ...prev,
    ]);
    this.notificacoes.enviar(
      "ADMIN",
      `pedido de ${meta.label} 🛡️`,
      `${solicitadoPor.username} (${user.comunidadeNome}) pediu ${meta.label} de ${joiner.username}.`,
    );
    return null;
  }

  /** Admin aprova: aplica a remoção / o banimento. */
  aprovar(id: string, resposta = ""): void {
    const s = this._solicitacoes().find((x) => x.id === id);
    if (!s || s.status !== "PENDENTE") return;
    const meta = TIPO_MODERACAO_META[s.tipo];
    const decididoPor = this.assinatura.assinar(
      "MODERACAO",
      `aprovou ${meta.label} de ${s.joinerUsername} (${s.comunidadeNome})`,
    );

    // 🔌 POST /api/admin/moderacao/:id/aprovar — transação: status da conta + participação
    if (s.tipo === "BANIMENTO") {
      const conta = this.usuarios.porUsername(s.joinerUsername);
      if (conta) this.usuarios.alterarStatus(conta.id, "SUSPENSO");
    }
    this.comunidade.removerJoiner(s.joinerId, s.comunidadeId);
    this.decidir(id, "APROVADA", decididoPor, resposta);

    this.notificacoes.enviar(
      "GOM",
      `${meta.label} aprovada`,
      `o admin aprovou a ${meta.label} de ${s.joinerUsername}.${resposta.trim() ? ` “${resposta.trim()}”` : ""}`,
    );
    if (s.tipo === "REMOCAO") {
      this.notificacoes.enviar(
        s.joinerId,
        `você saiu da comunidade ${s.comunidadeNome}`,
        "a GOM e o admin removeram sua participação. as CEGs dessa comunidade não aparecem mais pra você.",
      );
    }
  }

  recusar(id: string, resposta = ""): void {
    const s = this._solicitacoes().find((x) => x.id === id);
    if (!s || s.status !== "PENDENTE") return;
    const meta = TIPO_MODERACAO_META[s.tipo];
    const decididoPor = this.assinatura.assinar(
      "MODERACAO",
      `recusou ${meta.label} de ${s.joinerUsername} (${s.comunidadeNome})`,
    );
    // 🔌 POST /api/admin/moderacao/:id/recusar { resposta }
    this.decidir(id, "RECUSADA", decididoPor, resposta);
    this.notificacoes.enviar(
      "GOM",
      `${meta.label} recusada`,
      `o admin recusou a ${meta.label} de ${s.joinerUsername}.${resposta.trim() ? ` “${resposta.trim()}”` : ""}`,
    );
  }

  private decidir(
    id: string,
    status: "APROVADA" | "RECUSADA",
    decididoPor: SolicitacaoModeracao["decididoPor"],
    resposta: string,
  ): void {
    this._solicitacoes.update((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, status, decididoPor, resposta: resposta.trim() || undefined } : x,
      ),
    );
  }
}
