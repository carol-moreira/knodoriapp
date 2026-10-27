import { DestroyRef, Injectable, computed, inject, signal } from "@angular/core";
import {
  MOCK_CEG_ITENS,
  MOCK_CEG_SCHEDULES,
  MOCK_CLAIM_MENSAGENS,
  MOCK_CLAIMS,
  compararClaims,
  estadoDaRodada,
  itensCitados,
  telefoneDaJoiner,
  type CegItem,
  type CegSchedule,
  type Claim,
  type ClaimMensagem,
  type EstadoRodada,
  type PagamentoItem,
} from "@/lib/claims-types";
import { MOCK_JOINERS } from "@/lib/gom-types";
import { AuthService } from "./auth.service";
import { CegsService } from "./cegs.service";
import { ComunidadeService } from "./comunidade.service";
import { AssinaturaService } from "./assinatura.service";
import { NotificacoesService } from "./notificacoes.service";

export interface NovoItem {
  codigo: string;
  nome: string;
  valor: number;
  avaria?: boolean;
  avariaNota?: string;
  abandonado?: boolean;
}

/** Resultado de uma mensagem enviada no chat de claims. */
export interface ResultadoEnvio {
  claims: Claim[];
  /** Itens citados que não geraram claim (já confirmados ou já pedidos pela joiner). */
  ignorados: { item: CegItem; motivo: string }[];
  /** Claim bloqueado (rodada fechada, joiner fora da comunidade…). */
  erro?: string;
}

const SISTEMA = { id: "sistema", username: "KNODORI" };

/**
 * Rodadas de claims das CEGs: itens, agenda, chat e claims.
 *
 * Mock em memória. Em produção cada CEG é uma sala (Durable Object) que serializa os claims,
 * atribui `criadoEm`/`seq` e transmite os eventos por WebSocket — ver docs/claims.md.
 */
@Injectable({ providedIn: "root" })
export class ClaimsService {
  private readonly auth = inject(AuthService);
  private readonly cegs = inject(CegsService);
  private readonly comunidade = inject(ComunidadeService);
  private readonly notificacoes = inject(NotificacoesService);
  private readonly assinatura = inject(AssinaturaService);

  private readonly _itens = signal<CegItem[]>(MOCK_CEG_ITENS);
  private readonly _schedules = signal<CegSchedule[]>(MOCK_CEG_SCHEDULES);
  private readonly _claims = signal<Claim[]>(MOCK_CLAIMS);
  private readonly _mensagens = signal<ClaimMensagem[]>(MOCK_CLAIM_MENSAGENS);
  private seq = Math.max(0, ...MOCK_CLAIMS.map((c) => c.seq));

  /** Relógio (1 s) — dirige contagens regressivas e o disparo de avisos. */
  private readonly _agora = signal(Date.now());
  readonly agora = this._agora.asReadonly();

  readonly claims = this._claims.asReadonly();

  /** CEGs que podem ter rodada de claims (caixas mercari não têm). */
  readonly cegsComClaims = computed(() =>
    this.cegs.cegs().filter((c) => c.tipo !== "CAIXA_MERCARI"),
  );

  /** CEGs (com rodada) das comunidades da joiner logada — vitrine e sala de claims dela. */
  readonly cegsDaJoiner = computed(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this.cegsComClaims().filter((c) => this.comunidade.participa(user.id, c.comunidadeId));
  });

  /** Claims pendentes de todas as CEGs (badge da GOM). */
  readonly pendentes = computed(() => this._claims().filter((c) => c.status === "PENDENTE"));

  /** Claims da joiner logada, mais recentes primeiro. */
  readonly meusClaims = computed(() => {
    const id = this.auth.user()?.id;
    return this._claims()
      .filter((c) => c.joinerId === id)
      .sort((a, b) => compararClaims(b, a));
  });

  constructor() {
    // 🔌 em produção os avisos saem do alarm do Durable Object (ou Cron Trigger), não do cliente
    const timer = setInterval(() => {
      this._agora.set(Date.now());
      this.dispararAvisos();
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  // ── Leitura ──────────────────────────────────────────────────────────────

  itensDa(cegId: string): CegItem[] {
    return this._itens()
      .filter((i) => i.cegId === cegId)
      .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
  }

  agendaDa(cegId: string): CegSchedule | undefined {
    return this._schedules().find((s) => s.cegId === cegId);
  }

  /** Estado da rodada. Uma CEG que saiu de "aberta" encerra a rodada (não aceita mais claims). */
  estado(cegId: string): EstadoRodada {
    const estado = estadoDaRodada(this.agendaDa(cegId), this._agora());
    const ceg = this.cegs.porId(cegId);
    if (ceg && ceg.status !== "ABERTA" && (estado === "ABERTA" || estado === "AGENDADA")) {
      return "ENCERRADA";
    }
    return estado;
  }

  mensagensDa(cegId: string): ClaimMensagem[] {
    return this._mensagens()
      .filter((m) => m.cegId === cegId)
      .sort((a, b) => a.data.localeCompare(b.data));
  }

  claimPorId(id: string): Claim | undefined {
    return this._claims().find((c) => c.id === id);
  }

  /** Fila de claims pendentes do item, na ordem de prioridade. */
  filaDoItem(itemId: string): Claim[] {
    return this._claims()
      .filter((c) => c.itemId === itemId && c.status === "PENDENTE")
      .sort(compararClaims);
  }

  /** Posição (1 = primeira) do claim pendente na fila do item. */
  posicaoNaFila(claim: Claim): number {
    return this.filaDoItem(claim.itemId).findIndex((c) => c.id === claim.id) + 1;
  }

  pendentesDa(cegId: string): Claim[] {
    return this._claims()
      .filter((c) => c.cegId === cegId && c.status === "PENDENTE")
      .sort(compararClaims);
  }

  /** Todos os claims do item (histórico), na ordem de chegada. */
  claimsDoItem(itemId: string): Claim[] {
    return this._claims()
      .filter((c) => c.itemId === itemId)
      .sort(compararClaims);
  }

  /** Claims da CEG agrupados por joiner (ordem alfabética). */
  claimsPorJoiner(cegId: string): { joinerId: string; claims: Claim[] }[] {
    const grupos = new Map<string, Claim[]>();
    for (const c of this._claims()
      .filter((x) => x.cegId === cegId)
      .sort(compararClaims)) {
      grupos.set(c.joinerId, [...(grupos.get(c.joinerId) ?? []), c]);
    }
    return [...grupos.entries()]
      .map(([joinerId, claims]) => ({ joinerId, claims }))
      .sort((a, b) => a.claims[0].joinerNome.localeCompare(b.claims[0].joinerNome, "pt-BR"));
  }

  /** Claim confirmado (dono) do item. */
  donoDo(item: CegItem): Claim | undefined {
    return item.claimId ? this.claimPorId(item.claimId) : undefined;
  }

  // ── Configuração (GOM) ───────────────────────────────────────────────────

  /** Agenda (ou reagenda) a abertura. Reagendar rearma os avisos. */
  agendar(cegId: string, abreEm: string, avisoMinutos: number, fechaEm?: string): void {
    // 🔌 PUT /api/gom/cegs/:id/claims/agenda
    const agenda: CegSchedule = {
      cegId,
      abreEm,
      fechaEm,
      avisoMinutos,
      avisoEnviado: false,
      aberturaEnviada: false,
      por: this.assinatura.assinar(
        "CLAIM",
        `agendou os claims de ${this.cegs.porId(cegId)?.nome ?? "CEG"} para ${fmtDataHora(abreEm)}`,
      ),
    };
    this._schedules.update((prev) => [...prev.filter((s) => s.cegId !== cegId), agenda]);
    this.dispararAvisos();
  }

  /** Encerra a rodada agora (claims pendentes continuam aguardando a GOM). */
  encerrar(cegId: string): void {
    const agenda = this.agendaDa(cegId);
    if (!agenda) return;
    // 🔌 POST /api/gom/cegs/:id/claims/encerrar
    const agora = new Date().toISOString();
    const por = this.assinatura.assinar(
      "CLAIM",
      `encerrou a rodada de claims de ${this.cegs.porId(cegId)?.nome ?? "CEG"}`,
    );
    this.patchAgenda(cegId, { fechaEm: agora, por });
    this.sistema(cegId, "rodada de claims encerrada. obrigada! ✦");
  }

  /** Retorna uma mensagem de erro, ou null se salvou. */
  adicionarItem(cegId: string, novo: NovoItem): string | null {
    const erro = this.validarItem(cegId, novo);
    if (erro) return erro;
    // 🔌 POST /api/gom/cegs/:id/itens
    const item: CegItem = {
      id: `it_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cegId,
      codigo: novo.codigo.trim(),
      nome: novo.nome.trim(),
      valor: novo.valor,
      status: "DISPONIVEL",
      avaria: !!novo.avaria,
      avariaNota: novo.avaria ? novo.avariaNota?.trim() || undefined : undefined,
      atualizadoPor: this.assinatura.assinar(
        "ITEM",
        `cadastrou o item #${novo.codigo.trim()} (${novo.nome.trim()}) por ${brl(novo.valor)} em ${this.cegs.porId(cegId)?.nome ?? "CEG"}`,
      ),
    };
    this._itens.update((prev) => [...prev, item]);
    this.sincronizarInventario(cegId);
    return null;
  }

  atualizarItem(id: string, dados: NovoItem): string | null {
    const item = this._itens().find((i) => i.id === id);
    if (!item) return "item não encontrado.";
    const erro = this.validarItem(item.cegId, dados, id);
    if (erro) return erro;
    // 🔌 PATCH /api/gom/cegs/:id/itens/:itemId
    const avaria = !!dados.avaria;
    const abandonado = item.status === "CONFIRMADO" && !!dados.abandonado;
    const mudancas = [
      dados.codigo.trim() !== item.codigo && `código ${item.codigo} → ${dados.codigo.trim()}`,
      dados.nome.trim() !== item.nome && `nome “${dados.nome.trim()}”`,
      dados.valor !== item.valor && `valor ${brl(item.valor)} → ${brl(dados.valor)}`,
      avaria !== !!item.avaria && (avaria ? "marcou avaria" : "tirou a avaria"),
      abandonado !== !!item.abandonado && (abandonado ? "marcou abandonado" : "tirou abandonado"),
    ].filter(Boolean);
    const atualizadoPor =
      mudancas.length > 0
        ? this.assinatura.assinar("ITEM", `editou o item #${item.codigo}: ${mudancas.join(", ")}`)
        : item.atualizadoPor;
    this.patchItem(id, {
      atualizadoPor,
      codigo: dados.codigo.trim(),
      nome: dados.nome.trim(),
      valor: dados.valor,
      avaria,
      avariaNota: avaria ? dados.avariaNota?.trim() || undefined : undefined,
      abandonado,
    });

    // Avisa a dona do item quando a GOM marca uma avaria nova
    const dono = this.donoDo(item);
    if (dono && avaria && !item.avaria) {
      this.notificacoes.enviar(
        dono.joinerId,
        "item com avaria",
        `o ${item.codigo} (${item.nome}) chegou com avaria${
          dados.avariaNota?.trim() ? `: ${dados.avariaNota.trim()}` : "."
        } fale com a GOM pelo chat.`,
      );
    }
    return null;
  }

  /**
   * Item abandonado volta ao estoque: o claim confirmado vira rejeitado (motivo "abandonado") e o
   * item fica disponível para um novo claim.
   */
  liberarItem(id: string): void {
    const item = this._itens().find((i) => i.id === id);
    const dono = item ? this.donoDo(item) : undefined;
    if (!item || !dono || !item.abandonado) return;
    // 🔌 POST /api/gom/cegs/:id/itens/:itemId/liberar
    const por = this.assinatura.assinar(
      "ITEM",
      `devolveu ao estoque o item #${item.codigo} (${item.nome}), abandonado por ${dono.joinerUsername}`,
    );
    const agora = new Date().toISOString();
    this._claims.update((prev) =>
      prev.map((c) =>
        c.id === dono.id
          ? {
              ...c,
              status: "REJEITADO",
              decididoEm: agora,
              motivo: "item abandonado",
              decididoPor: por,
            }
          : c,
      ),
    );
    this.patchItem(id, {
      atualizadoPor: por,
      status: "DISPONIVEL",
      claimId: undefined,
      pagamento: undefined,
      abandonado: false,
    });
    this.sistema(item.cegId, `o ${item.codigo} (${item.nome}) voltou para o estoque ✦`);
    this.notificacoes.enviar(
      dono.joinerId,
      "item liberado",
      `o ${item.codigo} (${item.nome}) foi marcado como abandonado e voltou para o estoque.`,
    );
  }

  /** Só itens sem claims (pendentes ou confirmados) podem ser removidos. */
  removerItem(id: string): void {
    const item = this._itens().find((i) => i.id === id);
    if (!item || item.status !== "DISPONIVEL") return;
    // 🔌 DELETE /api/gom/cegs/:id/itens/:itemId
    this.assinatura.assinar("ITEM", `excluiu o item #${item.codigo} (${item.nome})`);
    this._itens.update((prev) => prev.filter((i) => i.id !== id));
    this.sincronizarInventario(item.cegId);
  }

  marcarPagamento(itemId: string, pagamento: PagamentoItem): void {
    // 🔌 PATCH /api/gom/cegs/:id/itens/:itemId  { pagamento }
    const item = this._itens().find((i) => i.id === itemId);
    if (!item || item.pagamento === pagamento) return;
    const dono = this.donoDo(item);
    const atualizadoPor = this.assinatura.assinar(
      "PAGAMENTO",
      `marcou o item #${item.codigo}${dono ? ` de ${dono.joinerUsername}` : ""} como ${
        pagamento === "PAGO" ? "pago" : "pagamento pendente"
      }`,
    );
    this.patchItem(itemId, { pagamento, atualizadoPor });
  }

  // ── Chat e claims ────────────────────────────────────────────────────────

  /**
   * Envia uma mensagem no chat da rodada. Se a autora é joiner e a rodada está aberta, cada
   * item citado vira um claim com os dados do perfil dela. Itens já reservados entram na fila.
   */
  enviar(cegId: string, texto: string): ResultadoEnvio {
    const user = this.auth.user();
    const conteudo = texto.trim();
    if (!user || !conteudo) return { claims: [], ignorados: [] };
    const citados =
      user.role === "JOINER" && this.estado(cegId) === "ABERTA"
        ? itensCitados(conteudo, this.itensDa(cegId))
        : [];
    return this.publicar(cegId, conteudo, citados);
  }

  /**
   * Claim pela vitrine: segue o mesmo caminho do chat — vira uma mensagem de claim na sala da
   * rodada, entra na fila do item e espera a GOM confirmar.
   */
  darClaim(cegId: string, itemId: string): ResultadoEnvio {
    const item = this.itensDa(cegId).find((i) => i.id === itemId);
    const bloqueio = this.bloqueioDeClaim(cegId);
    if (bloqueio || !item)
      return { claims: [], ignorados: [], erro: bloqueio ?? "item não encontrado." };
    return this.publicar(cegId, `claim #${item.codigo} · ${item.nome} (pela vitrine)`, [item]);
  }

  /** Por que a joiner logada não pode dar claim nesta CEG agora (null = pode). */
  bloqueioDeClaim(cegId: string): string | null {
    const user = this.auth.user();
    const ceg = this.cegs.porId(cegId);
    if (!user || user.role !== "JOINER") return "só joiners dão claim.";
    if (!ceg || !this.comunidade.participa(user.id, ceg.comunidadeId)) {
      return "você não participa da comunidade desta CEG.";
    }
    const estado = this.estado(cegId);
    if (estado === "AGENDADA") return "os claims ainda não abriram.";
    if (estado !== "ABERTA") return "a rodada de claims não está aberta.";
    return null;
  }

  /** Claim ativo (pendente/confirmado) da joiner logada no item. */
  meuClaimNoItem(itemId: string): Claim | undefined {
    const id = this.auth.user()?.id;
    return this._claims().find(
      (c) => c.itemId === itemId && c.joinerId === id && c.status !== "REJEITADO",
    );
  }

  /** Grava a mensagem no chat e, para cada item, cria o claim (fila + reserva + aviso à GOM). */
  private publicar(cegId: string, texto: string, itens: CegItem[]): ResultadoEnvio {
    const user = this.auth.user();
    const resultado: ResultadoEnvio = { claims: [], ignorados: [] };
    if (!user) return resultado;

    // 🔌 ws.send({ type: "message", texto }) — o servidor faz o parse, carimba criadoEm/seq e
    // responde com o broadcast (a ordem de chegada no Durable Object é a ordem dos claims)
    const data = new Date().toISOString();
    const mensagemId = `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (itens.length > 0) {
      const bloqueio = this.bloqueioDeClaim(cegId);
      if (bloqueio) {
        resultado.erro = bloqueio;
        itens = [];
      }
    }
    for (const item of itens) {
      if (item.status === "CONFIRMADO") {
        resultado.ignorados.push({ item, motivo: "já confirmado" });
      } else if (this.meuClaimNoItem(item.id)) {
        resultado.ignorados.push({ item, motivo: "você já pediu" });
      } else {
        resultado.claims.push({
          id: `clm_${Date.now()}_${item.id}`,
          cegId,
          itemId: item.id,
          mensagemId,
          joinerId: user.id,
          joinerNome: user.nome,
          joinerUsername: user.username,
          joinerTelefone: telefoneDaJoiner(user.id, user.telefone),
          criadoEm: data,
          seq: ++this.seq,
          status: "PENDENTE",
        });
      }
    }

    this._mensagens.update((prev) => [
      ...prev,
      {
        id: mensagemId,
        cegId,
        autorId: user.id,
        autorUsername: user.username,
        texto,
        data,
        tipo: resultado.claims.length > 0 ? "CLAIM" : "TEXTO",
        claimIds: resultado.claims.length > 0 ? resultado.claims.map((c) => c.id) : undefined,
      },
    ]);

    if (resultado.claims.length > 0) {
      this._claims.update((prev) => [...prev, ...resultado.claims]);
      const ids = new Set(resultado.claims.map((c) => c.itemId));
      this._itens.update((prev) =>
        prev.map((i) =>
          ids.has(i.id) && i.status === "DISPONIVEL" ? { ...i, status: "RESERVADO" } : i,
        ),
      );
      const ceg = this.cegs.porId(cegId);
      const rotulos = resultado.claims.map((c) => this.rotulo(c.itemId)).join(", ");
      this.assinatura.assinar("CLAIM", `deu claim em ${rotulos} (${ceg?.nome ?? "CEG"})`);
      this.notificacoes.enviar(
        "GOM",
        `novo claim em ${ceg?.nome ?? "CEG"} ✋`,
        `${user.username} pediu ${rotulos}.`,
      );
    }
    return resultado;
  }

  /** GOM aceita o claim: o item fica com a joiner e os outros pedidos do item são recusados. */
  confirmar(claimId: string): void {
    const claim = this.claimPorId(claimId);
    if (!claim || claim.status !== "PENDENTE") return;
    // 🔌 POST /api/gom/claims/:id/confirmar — transação: claim + item + demais da fila
    const agora = new Date().toISOString();
    const perdedores = this.filaDoItem(claim.itemId).filter((c) => c.id !== claimId);
    const rotulo = this.rotulo(claim.itemId);
    const por = this.assinatura.assinar(
      "CLAIM",
      `confirmou o claim do ${rotulo} para ${claim.joinerUsername}`,
    );

    this._claims.update((prev) =>
      prev.map((c) => {
        if (c.id === claimId) {
          return { ...c, status: "CONFIRMADO", decididoEm: agora, decididoPor: por };
        }
        if (perdedores.some((p) => p.id === c.id)) {
          return {
            ...c,
            status: "REJEITADO",
            decididoEm: agora,
            motivo: "item confirmado para outra joiner",
            decididoPor: por,
          };
        }
        return c;
      }),
    );
    this.patchItem(claim.itemId, {
      status: "CONFIRMADO",
      claimId,
      pagamento: "PENDENTE",
      atualizadoPor: por,
    });
    this.sincronizarInventario(claim.cegId);

    const quem = por ? ` por ${por.username}` : "";
    this.sistema(claim.cegId, `${claim.joinerUsername} · claim do ${rotulo} confirmado${quem} ✓`);
    this.notificacoes.enviar(
      claim.joinerId,
      "claim confirmado ✓",
      `seu claim do ${rotulo} foi confirmado${quem}. o pagamento aparece em minhas CEGs.`,
    );
    for (const p of perdedores) {
      this.notificacoes.enviar(
        p.joinerId,
        "claim não confirmado",
        `o ${rotulo} foi confirmado para quem chegou antes na fila. :(`,
      );
    }
  }

  rejeitar(claimId: string, motivo = ""): void {
    const claim = this.claimPorId(claimId);
    if (!claim || claim.status !== "PENDENTE") return;
    // 🔌 POST /api/gom/claims/:id/rejeitar  { motivo }
    const agora = new Date().toISOString();
    const rotulo = this.rotulo(claim.itemId);
    const por = this.assinatura.assinar(
      "CLAIM",
      `rejeitou o claim do ${rotulo} de ${claim.joinerUsername}${motivo.trim() ? ` (${motivo.trim()})` : ""}`,
    );
    this._claims.update((prev) =>
      prev.map((c) =>
        c.id === claimId
          ? {
              ...c,
              status: "REJEITADO",
              decididoEm: agora,
              motivo: motivo.trim() || undefined,
              decididoPor: por,
            }
          : c,
      ),
    );
    // Sem ninguém na fila o item volta a ficar disponível
    if (this.filaDoItem(claim.itemId).length === 0) {
      this.patchItem(claim.itemId, { status: "DISPONIVEL" });
    }

    const quem = por ? ` por ${por.username}` : "";
    this.sistema(claim.cegId, `${claim.joinerUsername} · claim do ${rotulo} rejeitado${quem}`);
    this.notificacoes.enviar(
      claim.joinerId,
      "claim rejeitado",
      `seu claim do ${rotulo} foi rejeitado${quem}${motivo.trim() ? `: ${motivo.trim()}` : "."}`,
    );
  }

  // ── Internos ─────────────────────────────────────────────────────────────

  /** Aviso prévio e abertura — idempotente (flags na agenda). */
  private dispararAvisos(): void {
    const agora = Date.now();
    for (const agenda of this._schedules()) {
      const abre = Date.parse(agenda.abreEm);
      const ceg = this.cegs.porId(agenda.cegId);
      if (!ceg || ceg.status !== "ABERTA") continue;
      if (agenda.fechaEm && agora >= Date.parse(agenda.fechaEm)) continue;

      const hora = new Date(abre).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (agora >= abre) {
        if (agenda.aberturaEnviada) continue;
        this.patchAgenda(agenda.cegId, { avisoEnviado: true, aberturaEnviada: true });
        this.sistema(
          agenda.cegId,
          "claims abertos! digite o código ou o nome do item para dar claim ✦",
        );
        this.avisarJoiners(
          `claims abertos: ${ceg.nome} ✋`,
          "corre! digite o código do item no chat da rodada.",
        );
      } else if (
        agenda.avisoMinutos > 0 &&
        !agenda.avisoEnviado &&
        agora >= abre - agenda.avisoMinutos * 60_000
      ) {
        this.patchAgenda(agenda.cegId, { avisoEnviado: true });
        const faltam = Math.max(1, Math.round((abre - agora) / 60_000));
        this.avisarJoiners(
          `claims de ${ceg.nome} em ${faltam} min ⏰`,
          `a rodada abre às ${hora}. separe os códigos dos itens que você quer!`,
        );
      }
    }
  }

  /** 🔌 em produção: joiners vinculadas à GOM (+ Web Push para quem permitiu). */
  private avisarJoiners(titulo: string, mensagem: string): void {
    for (const j of MOCK_JOINERS) this.notificacoes.enviar(j.id, titulo, mensagem);
  }

  private sistema(cegId: string, texto: string): void {
    this._mensagens.update((prev) => [
      ...prev,
      {
        id: `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        cegId,
        autorId: SISTEMA.id,
        autorUsername: SISTEMA.username,
        texto,
        data: new Date().toISOString(),
        tipo: "SISTEMA",
      },
    ]);
  }

  /** "03 (pc jungwon)" */
  private rotulo(itemId: string): string {
    const item = this._itens().find((i) => i.id === itemId);
    return item ? `${item.codigo} (${item.nome})` : "item";
  }

  private validarItem(cegId: string, dados: NovoItem, ignorarId?: string): string | null {
    const codigo = dados.codigo.trim().toLowerCase();
    if (!codigo || !dados.nome.trim()) return "preencha código e nome.";
    if (/\s/.test(codigo)) return "o código não pode ter espaços.";
    if (!(dados.valor > 0)) return "informe um valor maior que zero.";
    const repetido = this.itensDa(cegId).some(
      (i) => i.id !== ignorarId && i.codigo.toLowerCase() === codigo,
    );
    return repetido ? `já existe um item com o código ${dados.codigo.trim()}.` : null;
  }

  /** Mantém o qtdItens do card da CEG em dia com o inventário. */
  private sincronizarInventario(cegId: string): void {
    this.cegs.atualizar(cegId, { qtdItens: this.itensDa(cegId).length });
  }

  private patchItem(id: string, patch: Partial<CegItem>): void {
    this._itens.update((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  private patchAgenda(cegId: string, patch: Partial<CegSchedule>): void {
    this._schedules.update((prev) => prev.map((s) => (s.cegId === cegId ? { ...s, ...patch } : s)));
  }
}

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
