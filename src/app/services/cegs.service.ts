import { Injectable, computed, signal } from "@angular/core";
import { MOCK_CEGS, type CegGOM } from "@/components/gom/gerenciamento-cegs/cegs.model";

/** CEGs da GOM logada — inclui as caixas mercari (CEGs do tipo CAIXA_MERCARI). */
@Injectable({ providedIn: "root" })
export class CegsService {
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

  criar(nova: CegGOM): void {
    // 🔌 POST /api/gom/cegs
    this._cegs.update((prev) => [nova, ...prev]);
  }

  atualizar(id: string, patch: Partial<CegGOM>): void {
    // 🔌 PATCH /api/gom/cegs/:id
    this._cegs.update((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  /** Abre a próxima caixa mercari ("caixa mercari N"). */
  novaCaixaMercari(): CegGOM {
    const n = this.caixasMercari().length + 1;
    const prazo = new Date();
    prazo.setDate(prazo.getDate() + 30);
    const caixa: CegGOM = {
      id: `ceg_cx${Date.now()}`,
      nome: `caixa mercari ${n}`,
      loja: "Mercari",
      prazo: prazo.toISOString().slice(0, 10),
      status: "ABERTA",
      qtdJoiners: 0,
      qtdItens: 0,
      moeda: "JPY",
      tipo: "CAIXA_MERCARI",
    };
    this.criar(caixa);
    return caixa;
  }
}
