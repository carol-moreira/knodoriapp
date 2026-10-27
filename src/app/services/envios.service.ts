import { Injectable, computed, inject, signal } from "@angular/core";
import type { Autoria } from "@/lib/autoria";
import type { Comprovante } from "@/lib/comprovante";
import {
  ANTES_DE_POSTAR,
  MOCK_ENVIOS,
  MODALIDADE_META,
  PRAZO_PAGAMENTO_DIAS,
  enderecoValido,
  etapaAntesDeAguardar,
  rotuloEtapa,
  type Endereco,
  type EnvioNacional,
  type ItemEnvio,
  type ModalidadeEnvio,
  type StatusEnvio,
} from "@/lib/envios-types";
import { MOCK_JOINERS } from "@/lib/gom-types";
import { resumoItens } from "@/lib/mensagens-types";
import type { TipoNotificacao } from "@/lib/notificacoes-types";
import { AssinaturaService } from "./assinatura.service";
import { AuthService } from "./auth.service";
import { CegsService } from "./cegs.service";
import { ClaimsService } from "./claims.service";
import { ComunidadeService } from "./comunidade.service";
import { NotificacoesService } from "./notificacoes.service";
import { PedidosMercariService } from "./pedidos-mercari.service";

export interface NovoEnvio {
  itens: ItemEnvio[];
  modalidade: ModalidadeEnvio;
  endereco?: Endereco;
  observacao?: string;
}

/** CEGs cujos itens já estão com a GOM no Brasil. */
const CEG_CHEGOU = new Set(["CHEGOU_BR", "FINALIZADA"]);

/** Envio que já saiu da GOM (não cancela mais). */
const CONCLUIDO = new Set<StatusEnvio>(["ENTREGUE", "FEEDBACK_FEITO"]);

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Envios nacionais: a joiner junta os itens que já chegaram e pede o envio; a GOM embala, cota o
 * frete, confere o comprovante, posta com rastreio e marca a entrega; a joiner avalia. Qualquer
 * intercorrência vira "aguardando" com o motivo. Cada etapa é assinada e avisa o outro lado.
 */
@Injectable({ providedIn: "root" })
export class EnviosService {
  private readonly auth = inject(AuthService);
  private readonly assinatura = inject(AssinaturaService);
  private readonly notificacoes = inject(NotificacoesService);
  private readonly pedidos = inject(PedidosMercariService);
  private readonly claims = inject(ClaimsService);
  private readonly cegs = inject(CegsService);
  private readonly comunidade = inject(ComunidadeService);

  // 🔌 GET /api/gom/envios (GOM) e /api/joiner/envios (joiner)
  private readonly _envios = signal<EnvioNacional[]>(MOCK_ENVIOS);
  readonly todos = this._envios.asReadonly();

  /** Mais recentes primeiro (pela solicitação). */
  private readonly ordenados = computed(() =>
    [...this._envios()].sort((a, b) => b.eventos[0].por.em.localeCompare(a.eventos[0].por.em)),
  );

  /** Visão da GOM: envios da comunidade dela. */
  readonly daComunidade = computed(() => {
    const id = this.auth.user()?.comunidadeId ?? this.comunidade.comunidade().id;
    return this.ordenados().filter((e) => e.comunidadeId === id);
  });

  /** Visão da joiner: os envios dela. */
  readonly meus = computed(() => {
    const id = this.auth.user()?.id;
    return this.ordenados().filter((e) => e.joinerId === id);
  });

  /** O que espera a GOM (badge): pedidos novos, comprovantes para conferir e pendências. */
  readonly pendentesGom = computed(() =>
    this.daComunidade().filter(
      (e) =>
        e.status === "PENDENTE" ||
        e.status === "AGUARDANDO" ||
        (e.status === "COTACAO_ENVIADA" && !!e.comprovantes?.length),
    ),
  );

  /** O que espera a joiner (badge): frete para pagar e entrega para avaliar. */
  readonly pendentesJoiner = computed(() =>
    this.meus().filter(
      (e) => (e.status === "COTACAO_ENVIADA" && !e.comprovantes?.length) || e.status === "ENTREGUE",
    ),
  );

  /** Itens que já estão em algum envio. */
  private readonly emEnvio = computed(
    () => new Set(this._envios().flatMap((e) => e.itens.map((i) => i.refId))),
  );

  /** Itens da joiner logada prontos para envio: Mercari com envio liberado + claims pagos que chegaram. */
  readonly prontos = computed<ItemEnvio[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    const emEnvio = this.emEnvio();

    const mercari: ItemEnvio[] = this.pedidos
      .solicitacoes()
      .filter((s) => s.joinerId === user.id && s.status === "ENVIO_LIBERADO" && !emEnvio.has(s.id))
      .map((s) => ({
        origem: "MERCARI",
        refId: s.id,
        descricao: resumoItens(s.itens),
        cegNome: s.cegNome ?? "caixa mercari",
      }));

    const claims: ItemEnvio[] = this.claims
      .meusClaims()
      .filter((c) => c.status === "CONFIRMADO")
      .flatMap((c) => {
        const item = this.claims.itensDa(c.cegId).find((i) => i.id === c.itemId);
        const ceg = this.cegs.porId(c.cegId);
        if (!item || !ceg || item.pagamento !== "PAGO" || !CEG_CHEGOU.has(ceg.status)) return [];
        if (emEnvio.has(item.id)) return [];
        return [
          {
            origem: "CLAIM" as const,
            refId: item.id,
            descricao: `#${item.codigo} ${item.nome}`,
            cegNome: ceg.nome,
          },
        ];
      });

    return [...mercari, ...claims];
  });

  /** Claims confirmados da joiner que ainda não chegaram (ou não foram pagos). */
  readonly aCaminho = computed(
    () =>
      this.claims.meusClaims().filter((c) => {
        if (c.status !== "CONFIRMADO") return false;
        const item = this.claims.itensDa(c.cegId).find((i) => i.id === c.itemId);
        const ceg = this.cegs.porId(c.cegId);
        return !!item && !!ceg && (item.pagamento !== "PAGO" || !CEG_CHEGOU.has(ceg.status));
      }).length,
  );

  /** Envio que contém o item — pedido Mercari ou item de claim. */
  envioDoItem(refId: string): EnvioNacional | undefined {
    return this._envios().find((e) => e.itens.some((i) => i.refId === refId));
  }

  /** Último endereço usado pela joiner (pré-preenche o próximo envio). */
  ultimoEndereco(joinerId: string): Endereco | undefined {
    return this.ordenados().find((e) => e.joinerId === joinerId && e.endereco)?.endereco;
  }

  // ── Joiner ───────────────────────────────────────────────────────────────

  /** Retorna uma mensagem de erro, ou null se solicitou. */
  solicitar(novo: NovoEnvio): string | null {
    const user = this.auth.user();
    if (!user || user.role !== "JOINER") return "só joiners solicitam envio.";
    const prontos = new Set(this.prontos().map((i) => i.refId));
    if (novo.itens.length === 0) return "escolha pelo menos um item.";
    if (novo.itens.some((i) => !prontos.has(i.refId)))
      return "algum item não está mais disponível.";
    if (novo.modalidade !== "RETIRADA" && (!novo.endereco || !enderecoValido(novo.endereco))) {
      return "preencha o endereço (CEP, rua, número e cidade).";
    }
    const por = this.assinatura.assinar(
      "ENVIO",
      `pediu envio nacional (${MODALIDADE_META[novo.modalidade].label}) de ${novo.itens.length} item(ns)`,
    );
    if (!por) return "sessão expirada.";

    // 🔌 POST /api/joiner/envios
    const envio: EnvioNacional = {
      id: `env_${Date.now()}`,
      comunidadeId:
        this.comunidade.comunidadesDaJoiner(user.id)[0]?.id ?? this.comunidade.comunidade().id,
      joinerId: user.id,
      joinerNome: user.nome,
      joinerUsername: user.username,
      joinerTelefone: user.telefone ?? MOCK_JOINERS.find((j) => j.id === user.id)?.telefone,
      itens: novo.itens,
      endereco: novo.modalidade === "RETIRADA" ? undefined : novo.endereco,
      modalidade: novo.modalidade,
      observacao: novo.observacao?.trim() || undefined,
      status: "PENDENTE",
      eventos: [{ status: "PENDENTE", por }],
    };
    this._envios.update((prev) => [envio, ...prev]);
    this.avisarGom(
      "PACOTE_NOVO",
      "novo pedido de envio nacional 📦",
      `${user.username} pediu ${MODALIDADE_META[novo.modalidade].label} de ${novo.itens.length} item(ns).`,
    );
    return null;
  }

  /** Joiner paga o frete: o comprovante é obrigatório (a GOM confere e confirma). */
  pagarFrete(id: string, comprovante: Comprovante): string | null {
    const envio = this.porId(id);
    if (!envio || envio.status !== "COTACAO_ENVIADA") return "este envio não espera pagamento.";
    // 🔌 POST /api/joiner/envios/:id/comprovantes { comprovanteId }
    const por = this.assinatura.assinar(
      "PAGAMENTO",
      `enviou o comprovante do frete do envio ${id}`,
    );
    this.patch(id, { comprovantes: [...(envio.comprovantes ?? []), comprovante] });
    this.avisarGom(
      "COMPROVANTE_ENVIADO",
      "comprovante de frete para conferir 🧾",
      `${por?.username ?? envio.joinerUsername} pagou o frete (${brl(envio.frete ?? 0)}) e enviou o comprovante.`,
    );
    return null;
  }

  /** Joiner avalia o recebimento (fecha o envio). */
  darFeedback(id: string, nota: number, texto: string): string | null {
    const envio = this.porId(id);
    if (!envio || envio.status !== "ENTREGUE") return "este envio ainda não foi entregue.";
    if (envio.joinerId !== this.auth.user()?.id) return "só quem recebeu avalia o envio.";
    if (!(nota >= 1 && nota <= 5)) return "escolha de 1 a 5 estrelas.";
    const por = this.avancar(
      id,
      "FEEDBACK_FEITO",
      `${nota}★${texto.trim() ? ` — ${texto.trim()}` : ""}`,
    );
    if (!por) return "sessão expirada.";
    this.patch(id, { feedback: { nota, texto: texto.trim() || undefined, por } });
    this.avisarGom(
      "PACOTE_STATUS",
      `feedback do envio: ${"★".repeat(nota)}`,
      `${envio.joinerUsername} avaliou o pacote${texto.trim() ? `: “${texto.trim()}”` : "."}`,
    );
    return null;
  }

  // ── GOM ──────────────────────────────────────────────────────────────────

  embalar(id: string): void {
    const envio = this.porId(id);
    if (!envio || envio.status !== "PENDENTE") return;
    const por = this.avancar(id, "EMBALADO");
    this.avisarJoiner(
      envio,
      "PACOTE_STATUS",
      "pacote embalado 📦",
      envio.modalidade === "RETIRADA"
        ? `${quem(por)} embalou seus itens. já já fica pronto para retirada.`
        : `${quem(por)} embalou seus itens e vai mandar a cotação do frete.`,
    );
  }

  /** GOM manda a cotação do frete (abre o prazo de pagamento). */
  enviarCotacao(id: string, valor: number): string | null {
    const envio = this.porId(id);
    if (!envio || envio.status !== "EMBALADO") return "embale o pacote antes de cotar o frete.";
    if (envio.modalidade === "RETIRADA") return "retirada em mãos não tem frete.";
    if (!(valor > 0)) return "informe o valor do frete.";
    const prazo = new Date(Date.now() + PRAZO_PAGAMENTO_DIAS * 86_400_000).toISOString();
    const por = this.avancar(id, "COTACAO_ENVIADA", `frete ${brl(valor)}`, {
      frete: valor,
      prazoPagamento: prazo,
    });
    this.avisarJoiner(
      envio,
      "COTACAO_FRETE",
      "cotação de frete disponível 💸",
      `${quem(por)} cotou o frete em ${brl(valor)}. pague até ${fmtPrazo(prazo)} e anexe o comprovante em envios.`,
    );
    return null;
  }

  /**
   * GOM confere o pagamento do frete. Exige comprovante — o da joiner ou `comprovante`, anexado
   * agora pela GOM (ex.: pix recebido por fora do app).
   */
  confirmarPagamento(id: string, comprovante?: Comprovante): string | null {
    const envio = this.porId(id);
    if (!envio || envio.status !== "COTACAO_ENVIADA") return "este envio não espera pagamento.";
    const comprovantes = [...(envio.comprovantes ?? []), ...(comprovante ? [comprovante] : [])];
    if (comprovantes.length === 0) return "anexe o comprovante do frete.";
    const por = this.avancar(id, "FRETE_PAGO", "frete pago", { comprovantes });
    this.avisarJoiner(
      envio,
      "PAGAMENTO_CONFIRMADO",
      "frete pago ✓",
      `${quem(por)} conferiu o pagamento do frete. seu pacote vai ser postado.`,
    );
    return null;
  }

  /** Retorna uma mensagem de erro, ou null se postou. */
  postar(id: string, rastreio: string): string | null {
    const envio = this.porId(id);
    const retirada = envio?.modalidade === "RETIRADA";
    if (!envio || envio.status !== (retirada ? "EMBALADO" : "FRETE_PAGO")) {
      return retirada ? "embale o pacote antes." : "o frete ainda não foi pago.";
    }
    const codigo = rastreio.trim().toUpperCase().replace(/\s+/g, "");
    if (!retirada && !/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(codigo)) {
      return "código de rastreio inválido (ex: AA123456785BR).";
    }
    const por = this.avancar(
      id,
      "A_CAMINHO",
      retirada ? "pronto para retirada" : `rastreio ${codigo}`,
      { rastreio: retirada ? undefined : codigo },
    );
    if (!retirada) {
      const pedidos = envio.itens.filter((i) => i.origem === "MERCARI").map((i) => i.refId);
      this.pedidos.registrarRastreio(pedidos, codigo);
    }
    this.avisarJoiner(
      envio,
      "PACOTE_STATUS",
      retirada ? "pronto para retirada 🎁" : "seu pacote está a caminho 🚚",
      retirada
        ? `${quem(por)} separou seus itens — combine a retirada pelo chat.`
        : `${quem(por)} postou seu pacote. rastreio: ${codigo}`,
    );
    return null;
  }

  /** GOM marca entregue, ou a joiner confirma que recebeu. */
  marcarEntregue(id: string): void {
    const envio = this.porId(id);
    if (!envio || envio.status !== "A_CAMINHO") return;
    const por = this.avancar(id, "ENTREGUE");
    const daJoiner = this.auth.user()?.id === envio.joinerId;
    if (daJoiner) {
      this.avisarGom(
        "PACOTE_STATUS",
        "envio recebido 💖",
        `${envio.joinerUsername} confirmou que recebeu o pacote.`,
      );
    } else {
      this.avisarJoiner(
        envio,
        "PACOTE_STATUS",
        `pacote ${rotuloEtapa("ENTREGUE", envio.modalidade)} ✓`,
        `${quem(por)} marcou seu envio como entregue. conta pra gente como chegou!`,
      );
    }
  }

  /** Intercorrência (transportadora, retenção, dados pendentes…). O motivo é obrigatório. */
  marcarAguardando(id: string, motivo: string): string | null {
    const envio = this.porId(id);
    const texto = motivo.trim();
    if (!envio || !(ANTES_DE_POSTAR.includes(envio.status) || envio.status === "A_CAMINHO")) {
      return "este envio não pode ficar aguardando agora.";
    }
    if (texto.length < 5) return "explique o motivo para a joiner.";
    this.avancar(id, "AGUARDANDO", texto);
    this.avisarJoiner(
      envio,
      "PACOTE_STATUS",
      "pacote aguardando ⏳",
      `seu envio está aguardando: ${texto}`,
    );
    return null;
  }

  /** Resolve a pendência: o envio volta para a etapa em que estava. */
  retomar(id: string): void {
    const envio = this.porId(id);
    if (!envio || envio.status !== "AGUARDANDO") return;
    const etapa = etapaAntesDeAguardar(envio);
    const por = this.avancar(id, etapa, "pendência resolvida");
    this.avisarJoiner(
      envio,
      "PACOTE_STATUS",
      "pendência resolvida ✓",
      `${quem(por)} resolveu a pendência — seu envio voltou para “${rotuloEtapa(etapa, envio.modalidade)}”.`,
    );
  }

  /**
   * Cancela (joiner: só enquanto pendente; GOM: até o frete pago ou durante uma pendência).
   * O pedido de envio é apagado e os itens voltam a ficar prontos.
   */
  cancelar(id: string, motivo = ""): void {
    const envio = this.porId(id);
    if (!envio) return;
    const etapa = envio.status === "AGUARDANDO" ? etapaAntesDeAguardar(envio) : envio.status;
    if (etapa === "A_CAMINHO" || CONCLUIDO.has(etapa)) return;
    const daJoiner = this.auth.user()?.id === envio.joinerId;
    if (daJoiner && envio.status !== "PENDENTE") return;
    // 🔌 DELETE /api/{joiner|gom}/envios/:id — o servidor guarda o cancelamento na auditoria
    const por = this.assinatura.assinar(
      "ENVIO",
      `cancelou o envio ${id} de ${envio.joinerUsername}${motivo.trim() ? ` (${motivo.trim()})` : ""}`,
    );
    this._envios.update((prev) => prev.filter((e) => e.id !== id));
    if (daJoiner) {
      this.avisarGom(
        "PACOTE_STATUS",
        "envio cancelado",
        `${envio.joinerUsername} cancelou o pedido de envio.`,
      );
    } else {
      this.avisarJoiner(
        envio,
        "PACOTE_STATUS",
        "envio cancelado",
        `${quem(por)} cancelou seu envio${motivo.trim() ? `: ${motivo.trim()}` : "."} os itens voltaram para “prontos para envio”.`,
      );
    }
  }

  // ── Internos ─────────────────────────────────────────────────────────────

  private porId(id: string): EnvioNacional | undefined {
    return this._envios().find((e) => e.id === id);
  }

  /** Muda a etapa e registra o evento assinado. */
  private avancar(
    id: string,
    status: StatusEnvio,
    nota?: string,
    patch: Partial<EnvioNacional> = {},
  ): Autoria | undefined {
    const envio = this.porId(id);
    const por = this.assinatura.assinar(
      "ENVIO",
      `envio ${id} de ${envio?.joinerUsername}: ${rotuloEtapa(status, envio?.modalidade ?? "PAC")}${nota ? ` (${nota})` : ""}`,
    );
    if (!por) return undefined;
    // 🔌 POST /api/gom/envios/:id/{embalar|cotacao|pagamento|postar|entregue|aguardando|retomar}
    this._envios.update((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, ...patch, status, eventos: [...e.eventos, { status, por, nota }] }
          : e,
      ),
    );
    return por;
  }

  private avisarJoiner(
    envio: EnvioNacional,
    tipo: TipoNotificacao,
    titulo: string,
    mensagem: string,
  ): void {
    this.notificacoes.enviar(envio.joinerId, tipo, titulo, mensagem, "/joiner/envios");
  }

  private avisarGom(tipo: TipoNotificacao, titulo: string, mensagem: string): void {
    this.notificacoes.enviar("GOM", tipo, titulo, mensagem, "/gom/envios");
  }

  private patch(id: string, patch: Partial<EnvioNacional>): void {
    this._envios.update((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
}

function quem(por: Autoria | undefined): string {
  return por?.username ?? "a GOM";
}

function fmtPrazo(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
