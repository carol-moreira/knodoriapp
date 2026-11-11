import { Injectable, computed, inject, signal } from "@angular/core";
import {
  MOCK_BANCO_ITENS,
  proximoCodigo,
  type ItemBanco,
  type NovoItemBanco,
} from "@/lib/banco-itens-types";
import { AssinaturaService } from "./assinatura.service";
import { AuthService } from "./auth.service";
import { ComunidadeService } from "./comunidade.service";

/**
 * Banco de itens da comunidade da GOM logada: cadastro unitário, edição e exclusão.
 * Atrelar a uma CEG é com o ClaimsService (`atrelarDoBanco`), que é quem cria os CegItems; o
 * vínculo é lido de lá (`itemDoBanco`). Este service não injeta o ClaimsService.
 */
@Injectable({ providedIn: "root" })
export class BancoItensService {
  private readonly auth = inject(AuthService);
  private readonly comunidade = inject(ComunidadeService);
  private readonly assinatura = inject(AssinaturaService);

  // 🔌 substituir por HttpClient.get(`/api/gom/comunidades/${comunidadeId}/banco-itens`)
  private readonly _itens = signal<ItemBanco[]>(MOCK_BANCO_ITENS);

  private readonly comunidadeId = computed(
    () => this.auth.user()?.comunidadeId ?? this.comunidade.comunidade().id,
  );

  /** Itens da comunidade, mais recentes primeiro. */
  readonly itens = computed(() =>
    this._itens()
      .filter((i) => i.comunidadeId === this.comunidadeId())
      .sort((a, b) => b.codigo.localeCompare(a.codigo, "pt-BR", { numeric: true })),
  );

  porId(id: string): ItemBanco | undefined {
    return this._itens().find((i) => i.id === id);
  }

  /** Cadastra o item com o próximo código ("ITM-0006"). Retorna o item ou a mensagem de erro. */
  adicionar(dados: NovoItemBanco): ItemBanco | string {
    const erro = validar(dados);
    if (erro) return erro;
    const comunidadeId = this.comunidadeId();
    // 🔌 POST /api/gom/banco-itens — o servidor gera o código (sequência por comunidade)
    const codigo = proximoCodigo(
      "ITM",
      this._itens()
        .filter((i) => i.comunidadeId === comunidadeId)
        .map((i) => i.codigo),
      4,
    );
    const item: ItemBanco = {
      id: `bi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      codigo,
      comunidadeId,
      ...limpar(dados),
      criadoEm: new Date().toISOString(),
      atualizadoPor: this.assinatura.assinar(
        "ITEM",
        `cadastrou no banco o item ${codigo} (${dados.nome.trim()}) por ${brl(dados.valor)}`,
      ),
    };
    this._itens.update((prev) => [...prev, item]);
    return item;
  }

  /** Edita os dados do banco. Não mexe nos CegItems já criados (cada CEG tem o seu valor). */
  atualizar(id: string, dados: NovoItemBanco): string | null {
    const item = this.porId(id);
    if (!item) return "item não encontrado.";
    const erro = validar(dados);
    if (erro) return erro;
    const novo = limpar(dados);
    const mudancas = [
      novo.nome !== item.nome && `nome “${novo.nome}”`,
      novo.valor !== item.valor && `valor ${brl(item.valor)} → ${brl(novo.valor)}`,
      novo.categoria !== item.categoria && "categoria",
      novo.notas !== item.notas && "notas",
    ].filter(Boolean);
    if (mudancas.length === 0) return null;
    // 🔌 PATCH /api/gom/banco-itens/:id
    const atualizadoPor = this.assinatura.assinar(
      "ITEM",
      `editou o item ${item.codigo} do banco: ${mudancas.join(", ")}`,
    );
    this._itens.update((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...novo, atualizadoPor } : i)),
    );
    return null;
  }

  /** Exclui do banco. Quem chama garante que o item não está atrelado a nenhuma CEG. */
  remover(id: string): void {
    const item = this.porId(id);
    if (!item) return;
    // 🔌 DELETE /api/gom/banco-itens/:id (o servidor recusa se houver CegItem com bancoId)
    this.assinatura.assinar("ITEM", `excluiu do banco o item ${item.codigo} (${item.nome})`);
    this._itens.update((prev) => prev.filter((i) => i.id !== id));
  }
}

function validar(dados: NovoItemBanco): string | null {
  if (!dados.nome.trim()) return "dê um nome para o item.";
  if (!(dados.valor > 0)) return "informe um valor maior que zero.";
  return null;
}

function limpar(dados: NovoItemBanco): NovoItemBanco {
  return {
    nome: dados.nome.trim(),
    valor: dados.valor,
    categoria: dados.categoria || undefined,
    notas: dados.notas?.trim() || undefined,
  };
}

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
