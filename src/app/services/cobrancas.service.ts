import { Injectable, computed, inject, signal } from "@angular/core";
import { MOCK_JOINERS } from "@/lib/gom-types";
import { resumoItens } from "@/lib/mensagens-types";
import { CegsService } from "./cegs.service";
import { NotificacoesService } from "./notificacoes.service";
import { PedidosMercariService } from "./pedidos-mercari.service";

/** O que a joiner está devendo: o item (pedido aguardando pagamento) ou o frete/taxas da caixa. */
export type TipoDebito = "ITEM" | "FRETE" | "TAXA";

export interface Debito {
  /** `item:<pedidoId>`, `frete:<cegId>` ou `taxa:<cegId>`. */
  id: string;
  tipo: TipoDebito;
  descricao: string;
  valor: number;
  desde: string; // ISO
}

export interface Devedor {
  joinerId: string;
  nome: string;
  username: string;
  telefone?: string;
  debitos: Debito[];
  total: number;
  ultimaCobranca?: Cobranca;
}

export interface Cobranca {
  id: string;
  joinerId: string;
  debitoIds: string[];
  valor: number;
  mensagem: string;
  data: string; // ISO
}

export const TIPO_DEBITO_META: Record<TipoDebito, { label: string; badge: string }> = {
  ITEM: { label: "item", badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  FRETE: { label: "frete", badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
  TAXA: { label: "taxa", badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200" },
};

export function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "(11) 98765-4321" → "5511987654321" (formato do wa.me). */
export function telefoneWhatsApp(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return digitos.startsWith("55") && digitos.length >= 12 ? digitos : `55${digitos}`;
}

/** Texto padrão da cobrança com os débitos selecionados. */
export function mensagemCobranca(devedor: Devedor, debitos: Debito[], gomUsername: string): string {
  const primeiroNome = devedor.nome.split(" ")[0];
  const linhas = debitos.map((d) => `• ${d.descricao} — ${brl(d.valor)}`).join("\n");
  const total = debitos.reduce((t, d) => t + d.valor, 0);
  return (
    `oi, ${primeiroNome}! tudo bem? 💖\n` +
    `passando pra lembrar ${debitos.length > 1 ? "dos pagamentos pendentes" : "do pagamento pendente"} na KNODORI:\n\n` +
    `${linhas}\n\n` +
    `total: ${brl(total)}\n\n` +
    `qualquer dúvida é só me chamar por aqui ou pelo app. obrigada! ✨\n` +
    `— ${gomUsername}`
  );
}

/** Pagamentos pendentes das joiners da GOM e as cobranças enviadas a elas. */
@Injectable({ providedIn: "root" })
export class CobrancasService {
  private readonly pedidos = inject(PedidosMercariService);
  private readonly cegs = inject(CegsService);
  private readonly notificacoes = inject(NotificacoesService);

  // 🔌 GET /api/gom/cobrancas
  private readonly _cobrancas = signal<Cobranca[]>([
    {
      id: "cob_01",
      joinerId: "j3",
      debitoIds: ["frete:ceg_cx_mai", "taxa:ceg_cx_mai"],
      valor: 60,
      mensagem: "",
      data: "2026-06-06T12:00:00Z",
    },
  ]);
  readonly cobrancas = this._cobrancas.asReadonly();

  /** Débitos em aberto por joiner, derivados da fila mercari e das cobranças das caixas. */
  private readonly debitosPorJoiner = computed(() => {
    const porJoiner = new Map<string, Debito[]>();
    const add = (joinerId: string, d: Debito) =>
      porJoiner.set(joinerId, [...(porJoiner.get(joinerId) ?? []), d]);

    for (const s of this.pedidos.solicitacoes()) {
      if (s.status !== "AGUARDANDO_PAGAMENTO") continue;
      add(s.joinerId, {
        id: `item:${s.id}`,
        tipo: "ITEM",
        descricao: `${resumoItens(s.itens)} (pedido mercari)`,
        valor: s.valorBrl,
        desde: s.dataSolicitacao,
      });
    }

    for (const caixa of this.cegs.cegs()) {
      const cob = caixa.cobranca;
      if (!cob) continue;
      for (const [joinerId, valor] of Object.entries(cob.porJoiner)) {
        if (cob.pagoPor?.includes(joinerId)) continue;
        const frete = Math.round((valor - cob.taxaPorJoiner) * 100) / 100;
        if (frete > 0) {
          add(joinerId, {
            id: `frete:${caixa.id}`,
            tipo: "FRETE",
            descricao: `frete internacional · ${caixa.nome}`,
            valor: frete,
            desde: cob.data,
          });
        }
        if (cob.taxaPorJoiner > 0) {
          add(joinerId, {
            id: `taxa:${caixa.id}`,
            tipo: "TAXA",
            descricao: `taxas · ${caixa.nome}`,
            valor: cob.taxaPorJoiner,
            desde: cob.data,
          });
        }
      }
    }
    return porJoiner;
  });

  readonly devedores = computed<Devedor[]>(() => {
    const solicitacoes = this.pedidos.solicitacoes();
    return [...this.debitosPorJoiner()]
      .map(([joinerId, debitos]): Devedor => {
        // 🔌 dados da joiner virão do vínculo GOM ↔ joiner na API
        const cadastro = MOCK_JOINERS.find((j) => j.id === joinerId);
        const pedido = solicitacoes.find((s) => s.joinerId === joinerId);
        return {
          joinerId,
          nome: cadastro?.nome ?? pedido?.joinerNome ?? joinerId,
          username: cadastro?.username ?? pedido?.joinerUsername ?? "",
          telefone: cadastro?.telefone,
          debitos: debitos.sort((a, b) => a.desde.localeCompare(b.desde)),
          total: debitos.reduce((t, d) => t + d.valor, 0),
          ultimaCobranca: this.ultimaCobranca(joinerId),
        };
      })
      .sort((a, b) => b.total - a.total);
  });

  readonly totalEmAberto = computed(() => this.devedores().reduce((t, d) => t + d.total, 0));

  ultimaCobranca(joinerId: string): Cobranca | undefined {
    return this._cobrancas()
      .filter((c) => c.joinerId === joinerId)
      .sort((a, b) => b.data.localeCompare(a.data))[0];
  }

  /**
   * Envia a cobrança pelo WhatsApp e avisa a joiner no app.
   * 🔌 POST /api/gom/cobrancas/whatsapp { joinerId, debitoIds, mensagem } — o Worker envia
   *    pela WhatsApp Business Cloud API (token e número da GOM ficam só no servidor).
   */
  async enviarWhatsApp(devedor: Devedor, debitos: Debito[], mensagem: string): Promise<void> {
    if (!devedor.telefone || debitos.length === 0 || !mensagem.trim()) {
      throw new Error("cobrança incompleta.");
    }
    await new Promise((r) => setTimeout(r, 900));
    this.registrar(devedor, debitos, mensagem);
  }

  /** Registra a cobrança (também usada quando a GOM envia pelo próprio WhatsApp). */
  registrar(devedor: Devedor, debitos: Debito[], mensagem: string): void {
    const valor = debitos.reduce((t, d) => t + d.valor, 0);
    this._cobrancas.update((prev) => [
      {
        id: `cob_${Date.now()}`,
        joinerId: devedor.joinerId,
        debitoIds: debitos.map((d) => d.id),
        valor,
        mensagem,
        data: new Date().toISOString(),
      },
      ...prev,
    ]);
    this.notificacoes.enviar(
      devedor.joinerId,
      "pagamento pendente 💸",
      `a GOM enviou uma cobrança de ${brl(valor)}: ${debitos.map((d) => d.descricao).join(", ")}.`,
    );
  }
}
