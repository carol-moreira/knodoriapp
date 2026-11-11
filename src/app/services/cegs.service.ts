import { Injectable, computed, inject, signal } from "@angular/core";
import {
  CEG_STATUS_META,
  MOCK_CEGS,
  type CegGOM,
} from "@/components/gom/gerenciamento-cegs/cegs.model";
import { proximoCodigo } from "@/lib/banco-itens-types";
import { AssinaturaService } from "./assinatura.service";
import { ComunidadeService } from "./comunidade.service";

/** CEGs da GOM logada — inclui as caixas mercari (CEGs do tipo CAIXA_MERCARI). */
@Injectable({ providedIn: "root" })
export class CegsService {
  private readonly assinatura = inject(AssinaturaService);
  private readonly comunidade = inject(ComunidadeService);

  // 🔌 substituir por HttpClient.get(`/api/gom/${gomId}/cegs`)
  private readonly _cegs = signal<CegGOM[]>(MOCK_CEGS);
  readonly cegs = this._cegs.asReadonly();

  readonly caixasMercari = computed(() => this._cegs().filter((c) => c.tipo === "CAIXA_MERCARI"));

  /** Caixas que ainda recebem pedidos. */
  readonly caixasAbertas = computed(() =>
    this.caixasMercari().filter((c) => c.status === "ABERTA"),
  );

  porId(id: string): CegGOM | undefined {
    return this._cegs().find((c) => c.id === id);
  }

  /** CEG pelo código legível ("CEG-004"), sem diferenciar maiúsculas. */
  porCodigo(codigo: string): CegGOM | undefined {
    const alvo = codigo.trim().toLowerCase();
    return this._cegs().find((c) => c.codigo.toLowerCase() === alvo);
  }

  /** Cria a CEG com o próximo código ("CEG-009") e devolve o registro salvo. */
  criar(nova: Omit<CegGOM, "codigo">): CegGOM {
    // 🔌 POST /api/gom/cegs — o servidor gera o código (sequência por comunidade)
    const codigo = proximoCodigo(
      "CEG",
      this._cegs().map((c) => c.codigo),
      3,
    );
    const atualizadoPor = this.assinatura.assinar("CEG", `criou a CEG ${codigo} · ${nova.nome}`);
    const ceg: CegGOM = { ...nova, codigo, atualizadoPor };
    this._cegs.update((prev) => [ceg, ...prev]);
    return ceg;
  }

  atualizar(id: string, patch: Partial<CegGOM>): void {
    // 🔌 PATCH /api/gom/cegs/:id
    this._cegs.update((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  /**
   * Edição feita pela equipe (modal "editar CEG", select de status): registra quem alterou.
   * `atualizar()` fica para ajustes automáticos (contagens, status da caixa…).
   */
  editar(
    id: string,
    patch: Partial<Pick<CegGOM, "nome" | "loja" | "moeda" | "prazo" | "status">>,
  ): void {
    const atual = this.porId(id);
    if (!atual) return;
    const mudancas = [
      patch.nome !== undefined && patch.nome !== atual.nome && `nome “${patch.nome}”`,
      patch.loja !== undefined && patch.loja !== atual.loja && `loja ${patch.loja}`,
      patch.moeda !== undefined && patch.moeda !== atual.moeda && `moeda ${patch.moeda}`,
      patch.prazo !== undefined && patch.prazo !== atual.prazo && `prazo ${patch.prazo}`,
      patch.status !== undefined &&
        patch.status !== atual.status &&
        `status “${CEG_STATUS_META[patch.status].label}”`,
    ].filter(Boolean);
    if (mudancas.length === 0) return;
    const atualizadoPor = this.assinatura.assinar(
      "CEG",
      `editou a CEG ${atual.nome}: ${mudancas.join(", ")}`,
    );
    this.atualizar(id, { ...patch, atualizadoPor });
  }

  /** Abre a próxima caixa mercari ("caixa mercari N"). */
  novaCaixaMercari(): CegGOM {
    const n = this.caixasMercari().length + 1;
    const prazo = new Date();
    prazo.setDate(prazo.getDate() + 30);
    const caixa: Omit<CegGOM, "codigo"> = {
      id: `ceg_cx${Date.now()}`,
      comunidadeId: this.comunidade.comunidade().id,
      nome: `caixa mercari ${n}`,
      loja: "Mercari",
      prazo: prazo.toISOString().slice(0, 10),
      status: "ABERTA",
      qtdJoiners: 0,
      qtdItens: 0,
      moeda: "JPY",
      tipo: "CAIXA_MERCARI",
    };
    return this.criar(caixa);
  }
}
