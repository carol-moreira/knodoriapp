import { Injectable, inject, signal } from "@angular/core";
import {
  ITEM_META,
  MOCK_SOLICITACOES,
  etapaMercari,
  type ItemKey,
  type MercariStatus,
  type SolicitacaoGOM,
} from "@/lib/gom-types";
import { CegsService } from "./cegs.service";
import { NotificacoesService } from "./notificacoes.service";

/** Mensagens enviadas à joiner quando o pedido avança (etapas alteradas pedido a pedido). */
const AVISO_POR_STATUS: Partial<Record<MercariStatus, (s: SolicitacaoGOM) => [string, string]>> = {
  PEDIDO_FEITO: (s) => [
    "pedido feito 🛍️",
    `a GOM fez a compra de ${resumo(s)} com a proxy. assim que a compra for confirmada você recebe o proof.`,
  ],
  NA_WAREHOUSE: (s) => [
    "chegou na warehouse 📦",
    `${resumo(s)} chegou na warehouse e está aguardando o fechamento da ${s.cegNome ?? "caixa"}.`,
  ],
};

function resumo(s: SolicitacaoGOM): string {
  return Object.entries(s.itens)
    .filter(([, q]) => q > 0)
    .map(([k, q]) => `${q}× ${ITEM_META[k as ItemKey]?.label ?? k}`)
    .join(", ");
}

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Pedidos Mercari da GOM e o ciclo das caixas mercari:
 * fila → pagamento → pedido feito → compra confirmada (proof + caixa) → warehouse
 * → caixa fechada → fretes/taxas cobrados → caixa chegou → envio nacional liberado.
 */
@Injectable({ providedIn: "root" })
export class PedidosMercariService {
  private readonly cegs = inject(CegsService);
  private readonly notificacoes = inject(NotificacoesService);

  // 🔌 substituir por HttpClient.get(`/api/gom/${gomId}/solicitacoes`)
  private readonly _solicitacoes = signal<SolicitacaoGOM[]>(MOCK_SOLICITACOES);
  readonly solicitacoes = this._solicitacoes.asReadonly();

  /** Joiner envia um pedido Mercari (calculadora) → entra na fila da GOM. */
  criar(
    nova: Omit<
      SolicitacaoGOM,
      "id" | "status" | "dataSolicitacao" | "cegId" | "cegNome" | "proofs"
    >,
  ): void {
    // 🔌 POST /api/joiner/solicitacoes
    const solicitacao: SolicitacaoGOM = {
      ...nova,
      id: `req_${Date.now()}`,
      status: "PENDENTE",
      dataSolicitacao: new Date().toISOString().slice(0, 10),
    };
    this._solicitacoes.update((prev) => [solicitacao, ...prev]);
    this.notificacoes.enviar(
      "GOM",
      "novo pedido mercari 🛒",
      `${nova.joinerUsername} enviou ${resumo(solicitacao)} (${brl(nova.valorBrl)}) para a fila.`,
    );
  }

  /** Repasse confirmado: o pedido passa a ser da joiner destinatária. */
  transferir(id: string, para: { id: string; nome: string; username: string }): void {
    const atual = this._solicitacoes().find((s) => s.id === id);
    if (!atual) return;
    // 🔌 feito no servidor junto com POST /api/gom/repasses/:id/confirmar
    this.patch(id, { joinerId: para.id, joinerNome: para.nome, joinerUsername: para.username });
    if (atual.cegId) this.recontarCaixa(atual.cegId);
  }

  pedidosDaCaixa(cegId: string): SolicitacaoGOM[] {
    return this._solicitacoes().filter((s) => s.cegId === cegId);
  }

  /** Muda a etapa de um pedido. "compra confirmada" passa por confirmarCompra (exige proof). */
  alterarStatus(id: string, status: MercariStatus): void {
    const atual = this._solicitacoes().find((s) => s.id === id);
    if (!atual || atual.status === status || status === "COMPRADO") return;
    // Depois de confirmada a compra o pedido está numa caixa e não volta para antes disso
    if (atual.cegId && etapaMercari(status) < etapaMercari("COMPRADO")) return;
    if (status === "NA_WAREHOUSE" && !atual.cegId) return;

    // 🔌 PATCH /api/gom/solicitacoes/:id { status }
    this.patch(id, { status });

    const aviso = AVISO_POR_STATUS[status];
    if (aviso && etapaMercari(status) > etapaMercari(atual.status)) {
      const [titulo, mensagem] = aviso({ ...atual, status });
      this.notificacoes.enviar(atual.joinerId, titulo, mensagem);
    }
  }

  /** GOM confirma a compra, anexa o proof e direciona o pedido para uma caixa mercari aberta. */
  confirmarCompra(id: string, proofs: string[], cegId: string): void {
    const atual = this._solicitacoes().find((s) => s.id === id);
    const caixa = this.cegs.porId(cegId);
    if (!atual || !caixa || caixa.status !== "ABERTA" || proofs.length === 0) return;

    // 🔌 POST /api/gom/solicitacoes/:id/confirmar-compra (multipart com as imagens)
    this.patch(id, { status: "COMPRADO", proofs, cegId: caixa.id, cegNome: caixa.nome });
    this.recontarCaixa(caixa.id);

    this.notificacoes.enviar(
      atual.joinerId,
      "compra confirmada ✅",
      `a compra de ${resumo(atual)} foi confirmada e o proof já está disponível. seu pedido entrou na ${caixa.nome}.`,
    );
  }

  /** Pedidos da caixa que ainda não chegaram na warehouse (bloqueiam o fechamento). */
  faltandoWarehouse(cegId: string): number {
    return this.pedidosDaCaixa(cegId).filter((s) => s.status !== "NA_WAREHOUSE").length;
  }

  fecharCaixa(cegId: string): void {
    const caixa = this.cegs.porId(cegId);
    const pedidos = this.pedidosDaCaixa(cegId);
    if (!caixa || caixa.status !== "ABERTA" || pedidos.length === 0) return;
    if (this.faltandoWarehouse(cegId) > 0) return;

    // 🔌 POST /api/gom/cegs/:id/fechar
    this.patchCaixa(cegId, { status: "CAIXA_FECHADA" });
    this.cegs.atualizar(cegId, { status: "TRANSITO" });
    for (const joinerId of this.joinersDaCaixa(cegId)) {
      this.notificacoes.enviar(
        joinerId,
        `${caixa.nome} fechada 📦`,
        `a ${caixa.nome} foi fechada e vai sair da warehouse. em breve você recebe a cobrança do frete internacional e das taxas.`,
      );
    }
  }

  /** Rateia o frete igualmente entre as joiners da caixa e soma a taxa por joiner. */
  cobrarFreteTaxas(cegId: string, freteTotal: number, taxaPorJoiner: number): void {
    const caixa = this.cegs.porId(cegId);
    if (!caixa || caixa.status !== "TRANSITO" || caixa.cobranca) return;
    const joiners = this.joinersDaCaixa(cegId);
    if (joiners.length === 0) return;

    const parte = Math.round((freteTotal / joiners.length) * 100) / 100;
    const porJoiner = Object.fromEntries(joiners.map((j) => [j, parte + taxaPorJoiner]));

    // 🔌 POST /api/gom/cegs/:id/cobranca
    this.cegs.atualizar(cegId, {
      cobranca: { freteTotal, taxaPorJoiner, porJoiner, data: new Date().toISOString() },
    });
    for (const joinerId of joiners) {
      this.notificacoes.enviar(
        joinerId,
        "frete e taxas da caixa 💸",
        `cobrança da ${caixa.nome}: ${brl(porJoiner[joinerId])} (frete internacional ${brl(parte)} + taxas ${brl(taxaPorJoiner)}).`,
      );
    }
  }

  caixaChegou(cegId: string): void {
    const caixa = this.cegs.porId(cegId);
    if (!caixa || caixa.status !== "TRANSITO" || !caixa.cobranca) return;
    // 🔌 POST /api/gom/cegs/:id/chegou
    this.patchCaixa(cegId, { status: "CHEGOU_GOM" });
    this.cegs.atualizar(cegId, { status: "CHEGOU_BR" });
  }

  liberarEnvio(cegId: string): void {
    const caixa = this.cegs.porId(cegId);
    if (!caixa || caixa.status !== "CHEGOU_BR") return;
    // 🔌 POST /api/gom/cegs/:id/liberar-envio
    this.patchCaixa(cegId, { status: "ENVIO_LIBERADO" });
    this.cegs.atualizar(cegId, { status: "FINALIZADA" });
    for (const joinerId of this.joinersDaCaixa(cegId)) {
      this.notificacoes.enviar(
        joinerId,
        "envio nacional liberado 🚚",
        `seus itens da ${caixa.nome} chegaram na GOM! já pode solicitar o envio nacional em minhas compras.`,
      );
    }
  }

  joinersDaCaixa(cegId: string): string[] {
    return [...new Set(this.pedidosDaCaixa(cegId).map((s) => s.joinerId))];
  }

  private patch(id: string, patch: Partial<SolicitacaoGOM>): void {
    this._solicitacoes.update((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  private patchCaixa(cegId: string, patch: Partial<SolicitacaoGOM>): void {
    this._solicitacoes.update((prev) =>
      prev.map((s) => (s.cegId === cegId ? { ...s, ...patch } : s)),
    );
  }

  private recontarCaixa(cegId: string): void {
    const pedidos = this.pedidosDaCaixa(cegId);
    this.cegs.atualizar(cegId, {
      qtdJoiners: new Set(pedidos.map((s) => s.joinerId)).size,
      qtdItens: pedidos.reduce((t, s) => t + Object.values(s.itens).reduce((a, q) => a + q, 0), 0),
    });
  }
}
