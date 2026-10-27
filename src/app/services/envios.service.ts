import { Injectable, computed, inject, signal } from "@angular/core";
import type { Autoria } from "@/lib/autoria";
import {
  MOCK_ENVIOS,
  MODALIDADE_META,
  enderecoValido,
  rotuloEtapa,
  type Endereco,
  type EnvioNacional,
  type ItemEnvio,
  type ModalidadeEnvio,
  type StatusEnvio,
} from "@/lib/envios-types";
import { MOCK_JOINERS } from "@/lib/gom-types";
import { resumoItens } from "@/lib/mensagens-types";
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

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Envios nacionais: a joiner junta os itens que já chegaram e pede o envio; a GOM cobra o frete,
 * separa, posta com rastreio e marca a entrega. Cada etapa é assinada e avisa o outro lado.
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

  /** O que espera a GOM (badge): pedidos novos e pagamentos avisados pela joiner. */
  readonly pendentesGom = computed(() =>
    this.daComunidade().filter(
      (e) =>
        e.status === "SOLICITADO" || (e.status === "AGUARDANDO_PAGAMENTO" && e.pagamentoInformado),
    ),
  );

  /** O que espera a joiner (badge): frete para pagar. */
  readonly pendentesJoiner = computed(() =>
    this.meus().filter((e) => e.status === "AGUARDANDO_PAGAMENTO" && !e.pagamentoInformado),
  );

  /** Itens que já estão em algum envio ativo. */
  private readonly emEnvio = computed(
    () =>
      new Set(
        this._envios()
          .filter((e) => e.status !== "CANCELADO")
          .flatMap((e) => e.itens.map((i) => i.refId)),
      ),
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

  /** Envio ativo (não cancelado) que contém o item — pedido Mercari ou item de claim. */
  envioDoItem(refId: string): EnvioNacional | undefined {
    return this._envios().find(
      (e) => e.status !== "CANCELADO" && e.itens.some((i) => i.refId === refId),
    );
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
      status: "SOLICITADO",
      eventos: [{ status: "SOLICITADO", por }],
    };
    this._envios.update((prev) => [envio, ...prev]);
    this.notificacoes.enviar(
      "GOM",
      "novo pedido de envio nacional 📦",
      `${user.username} pediu ${MODALIDADE_META[novo.modalidade].label} de ${novo.itens.length} item(ns).`,
    );
    return null;
  }

  /** Joiner avisa que pagou o frete (a GOM confere e confirma). */
  informarPagamento(id: string): void {
    const envio = this.porId(id);
    if (!envio || envio.status !== "AGUARDANDO_PAGAMENTO" || envio.pagamentoInformado) return;
    // 🔌 POST /api/joiner/envios/:id/paguei
    const por = this.assinatura.assinar("ENVIO", `avisou que pagou o frete do envio ${id}`);
    this.patch(id, { pagamentoInformado: true });
    this.notificacoes.enviar(
      "GOM",
      "frete pago 💸",
      `${por?.username ?? envio.joinerUsername} avisou que pagou o frete (${brl(envio.frete ?? 0)}). confira e confirme.`,
    );
  }

  // ── GOM ──────────────────────────────────────────────────────────────────

  /** GOM informa o frete. Retirada (ou frete zero) vai direto para separação. */
  informarFrete(id: string, valor: number): string | null {
    const envio = this.porId(id);
    if (!envio || envio.status !== "SOLICITADO") return "este envio não espera frete.";
    if (envio.modalidade !== "RETIRADA" && !(valor > 0)) return "informe o valor do frete.";
    const frete = envio.modalidade === "RETIRADA" ? 0 : valor;
    if (frete === 0) {
      const por = this.avancar(id, "EM_SEPARACAO", "sem frete", { frete: 0 });
      this.avisarJoiner(
        envio,
        "envio em separação 📦",
        `${quem(por)} já está separando seus itens.`,
      );
    } else {
      const por = this.avancar(id, "AGUARDANDO_PAGAMENTO", `frete ${brl(frete)}`, { frete });
      this.avisarJoiner(
        envio,
        "frete do envio nacional 💸",
        `${quem(por)} informou o frete: ${brl(frete)}. pague e avise em envios.`,
      );
    }
    return null;
  }

  confirmarPagamento(id: string): void {
    const envio = this.porId(id);
    if (!envio || envio.status !== "AGUARDANDO_PAGAMENTO") return;
    const por = this.avancar(id, "EM_SEPARACAO", "frete pago");
    this.avisarJoiner(
      envio,
      "frete confirmado ✓",
      `${quem(por)} confirmou o pagamento e vai separar seus itens.`,
    );
  }

  /** Retorna uma mensagem de erro, ou null se postou. */
  postar(id: string, rastreio: string): string | null {
    const envio = this.porId(id);
    if (!envio || envio.status !== "EM_SEPARACAO") return "este envio não está em separação.";
    const codigo = rastreio.trim().toUpperCase().replace(/\s+/g, "");
    if (envio.modalidade !== "RETIRADA" && !/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(codigo)) {
      return "código de rastreio inválido (ex: AA123456785BR).";
    }
    const retirada = envio.modalidade === "RETIRADA";
    const por = this.avancar(
      id,
      "POSTADO",
      retirada ? "pronto para retirada" : `rastreio ${codigo}`,
      {
        rastreio: retirada ? undefined : codigo,
      },
    );
    if (!retirada) {
      const pedidos = envio.itens.filter((i) => i.origem === "MERCARI").map((i) => i.refId);
      this.pedidos.registrarRastreio(pedidos, codigo);
    }
    this.avisarJoiner(
      envio,
      retirada ? "pronto para retirada 🎁" : "seu envio foi postado 🚚",
      retirada
        ? `${quem(por)} separou seus itens — combine a retirada pelo chat.`
        : `${quem(por)} postou seu pacote. rastreio: ${codigo}`,
    );
    return null;
  }

  /** GOM marca entregue, ou a joiner confirma que recebeu. */
  marcarEntregue(id: string): void {
    const envio = this.porId(id);
    if (!envio || envio.status !== "POSTADO") return;
    const por = this.avancar(id, "ENTREGUE");
    const daJoiner = this.auth.user()?.id === envio.joinerId;
    if (daJoiner) {
      this.notificacoes.enviar(
        "GOM",
        "envio recebido 💖",
        `${envio.joinerUsername} confirmou que recebeu o pacote.`,
      );
    } else {
      this.avisarJoiner(
        envio,
        `envio ${rotuloEtapa("ENTREGUE", envio.modalidade)} ✓`,
        `${quem(por)} marcou seu envio como entregue.`,
      );
    }
  }

  /** Cancela (joiner: só enquanto solicitado; GOM: antes de postar). Os itens voltam a ficar prontos. */
  cancelar(id: string, motivo = ""): void {
    const envio = this.porId(id);
    if (!envio || ["POSTADO", "ENTREGUE", "CANCELADO"].includes(envio.status)) return;
    const user = this.auth.user();
    const daJoiner = user?.id === envio.joinerId;
    if (daJoiner && envio.status !== "SOLICITADO") return;
    const por = this.avancar(id, "CANCELADO", motivo.trim() || undefined);
    if (daJoiner) {
      this.notificacoes.enviar(
        "GOM",
        "envio cancelado",
        `${envio.joinerUsername} cancelou o pedido de envio.`,
      );
    } else {
      this.avisarJoiner(
        envio,
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
    // 🔌 POST /api/gom/envios/:id/{frete|pagamento|postar|entregue|cancelar}
    this._envios.update((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, ...patch, status, eventos: [...e.eventos, { status, por, nota }] }
          : e,
      ),
    );
    return por;
  }

  private avisarJoiner(envio: EnvioNacional, titulo: string, mensagem: string): void {
    this.notificacoes.enviar(envio.joinerId, titulo, mensagem);
  }

  private patch(id: string, patch: Partial<EnvioNacional>): void {
    this._envios.update((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
}

function quem(por: Autoria | undefined): string {
  return por?.username ?? "a GOM";
}
