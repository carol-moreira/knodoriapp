import { Injectable, computed, inject, signal } from "@angular/core";
import {
  MOCK_CADASTROS,
  MOCK_SOLICITACOES_REPASSE,
  normalizarCodigo,
  type JoinerCadastro,
  type SolicitacaoRepasse,
} from "@/lib/repasse-types";
import { AuthService } from "./auth.service";
import { NotificacoesService } from "./notificacoes.service";
import { PedidosMercariService } from "./pedidos-mercari.service";

export interface NovaSolicitacaoRepasse {
  cegId: string;
  cegNome: string;
  pedidoId: string;
  itemDescricao: string;
  valorBrl: number;
  destinatario: JoinerCadastro;
  observacao?: string;
}

/** Fila de repasses de claim (joiner → joiner), compartilhada entre joiner e GOM. */
@Injectable({ providedIn: "root" })
export class RepassesService {
  private readonly auth = inject(AuthService);
  private readonly notificacoes = inject(NotificacoesService);
  private readonly pedidos = inject(PedidosMercariService);

  private readonly _solicitacoes = signal<SolicitacaoRepasse[]>(MOCK_SOLICITACOES_REPASSE);
  readonly solicitacoes = this._solicitacoes.asReadonly();

  readonly pendentes = computed(() => this._solicitacoes().filter((s) => s.status === "PENDENTE"));

  /** pedidoId → repasse pendente (bloqueia nova solicitação para o mesmo item). */
  readonly pendentePorPedido = computed(
    () =>
      new Map(
        this.pendentes()
          .filter((s) => s.pedidoId)
          .map((s) => [s.pedidoId as string, s]),
      ),
  );

  pendentesDaCeg(cegId: string): number {
    return this.pendentes().filter((s) => s.cegId === cegId).length;
  }

  /** 🔌 GET /api/joiners/cadastro/:codigo */
  buscarCadastro(codigo: string): JoinerCadastro | null {
    const c = normalizarCodigo(codigo);
    return MOCK_CADASTROS.find((j) => j.codigo === c) ?? null;
  }

  async solicitar(nova: NovaSolicitacaoRepasse): Promise<void> {
    const user = this.auth.user();
    if (!user) throw new Error("sessão expirada.");
    if (nova.destinatario.id === user.id) throw new Error("você não pode repassar para si mesma.");
    if (this.pendentePorPedido().has(nova.pedidoId))
      throw new Error("este item já tem um repasse em análise.");

    // 🔌 POST /api/joiner/repasses — o servidor deve validar que o item é da remetente e está pago
    await new Promise((r) => setTimeout(r, 600));

    const solicitacao: SolicitacaoRepasse = {
      ...nova,
      id: `rep_${Date.now()}`,
      remetente: { id: user.id, nome: user.nome, username: user.username },
      pagamentoConfirmado: true,
      status: "PENDENTE",
      dataSolicitacao: new Date().toISOString(),
    };
    this._solicitacoes.update((prev) => [solicitacao, ...prev]);

    this.notificacoes.enviar(
      "GOM",
      "nova solicitação de repasse",
      `${user.username} quer repassar ${nova.itemDescricao} (${nova.cegNome}) para ${nova.destinatario.username}.`,
    );
  }

  /** GOM confirma: o item passa para a destinatária, que recebe a confirmação. */
  confirmar(id: string): void {
    const s = this._solicitacoes().find((x) => x.id === id);
    if (!s || s.status !== "PENDENTE") return;

    // 🔌 POST /api/gom/repasses/:id/confirmar — transfere a claim no servidor
    this._solicitacoes.update((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, status: "CONFIRMADO", dataConfirmacao: new Date().toISOString() } : x,
      ),
    );
    // O item muda de dona na fila Mercari
    if (s.pedidoId) this.pedidos.transferir(s.pedidoId, s.destinatario);

    this.notificacoes.enviar(
      s.destinatario.id,
      "repasse confirmado 🎉",
      `${s.itemDescricao} da CEG ${s.cegNome} agora é seu! repassado por ${s.remetente.username} e confirmado pela GOM.`,
    );
    this.notificacoes.enviar(
      s.remetente.id,
      "repasse confirmado",
      `a GOM confirmou o repasse de ${s.itemDescricao} (${s.cegNome}) para ${s.destinatario.username}.`,
    );
  }
}
