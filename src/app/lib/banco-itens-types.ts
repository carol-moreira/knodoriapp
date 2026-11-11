/**
 * Banco de itens da comunidade.
 *
 * A GOM cadastra os itens um a um (o que ela tem em mãos ou vai vender) e depois atrela cada um a
 * uma CEG. Atrelar cria o CegItem da CEG (com o código do claim e o valor daquela CEG) apontando
 * para o item do banco por `CegItem.bancoId`. O vínculo não é gravado no item do banco: ele é
 * derivado dos CegItems (ClaimsService.itemDoBanco), então não há duas fontes de verdade.
 *
 * Cada item do banco é uma unidade: fica em no máximo uma CEG por vez. Tirar o item da CEG (só
 * enquanto está disponível, sem claims) devolve ele ao banco.
 *
 * Códigos:
 *   ItemBanco.codigo  "ITM-0001"  único na comunidade, gerado no cadastro, não muda
 *   CegGOM.codigo     "CEG-001"   único na comunidade, gerado na criação, não muda
 *   CegItem.codigo    "07"        código do claim, único dentro da CEG (a joiner digita no chat)
 *   `id` de cada entidade é a chave interna (API/banco de dados) e não aparece na interface.
 */

import type { Autoria } from "./autoria";
import type { ItemKey } from "./gom-types";

export interface ItemBanco {
  id: string;
  /** "ITM-0001" — gerado no cadastro, único na comunidade. */
  codigo: string;
  comunidadeId: string;
  nome: string;
  /** Valor base em BRL (sugestão ao atrelar; cada CEG pode cobrar outro). */
  valor: number;
  categoria?: ItemKey;
  notas?: string;
  criadoEm: string; // ISO
  /** Cadastro ou última edição, e quem fez. */
  atualizadoPor?: Autoria;
}

export interface NovoItemBanco {
  nome: string;
  valor: number;
  categoria?: ItemKey;
  notas?: string;
}

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

/**
 * Próximo código sequencial com prefixo: ("ITM", ["ITM-0001", "ITM-0007"], 4) → "ITM-0008".
 * Usa o maior número já existente (não a contagem), então excluir não gera código repetido.
 */
export function proximoCodigo(prefixo: string, existentes: string[], digitos: number): string {
  const re = new RegExp(`^${prefixo}-(\\d+)$`, "i");
  const max = Math.max(0, ...existentes.map((c) => Number(re.exec(c)?.[1] ?? 0)));
  return `${prefixo}-${String(max + 1).padStart(digitos, "0")}`;
}

/**
 * Sugestões de código de claim para `qtd` itens novos numa CEG, sem colidir com os já usados.
 * Segue o padrão numérico da CEG ("01", "02"…); códigos alfanuméricos são só pulados.
 */
export function sugerirCodigosClaim(usados: string[], qtd: number): string[] {
  const ocupados = new Set(usados.map((c) => c.toLowerCase()));
  const numericos = usados.filter((c) => /^\d+$/.test(c)).map(Number);
  const largura = Math.max(2, ...usados.filter((c) => /^\d+$/.test(c)).map((c) => c.length));
  const sugestoes: string[] = [];
  let n = Math.max(0, ...numericos);
  while (sugestoes.length < qtd) {
    const codigo = String(++n).padStart(largura, "0");
    if (!ocupados.has(codigo)) sugestoes.push(codigo);
  }
  return sugestoes;
}

// ---------------------------------------------------------------------------
// Mocks — 🔌 substituir por GET /api/gom/comunidades/:id/banco-itens
// it_04 (ceg_03) e it_13 (ceg_01) vieram do banco (ver MOCK_CEG_ITENS).
// ---------------------------------------------------------------------------

export const MOCK_BANCO_ITENS: ItemBanco[] = [
  {
    id: "bi_01",
    codigo: "ITM-0001",
    comunidadeId: "com_01",
    nome: "pc sunghoon",
    valor: 29.9,
    categoria: "photocard",
    criadoEm: "2026-10-02T14:00:00Z",
  },
  {
    id: "bi_02",
    codigo: "ITM-0002",
    comunidadeId: "com_01",
    nome: "keyring cherry",
    valor: 25,
    categoria: "pequeno",
    criadoEm: "2026-10-02T14:05:00Z",
  },
  {
    id: "bi_03",
    codigo: "ITM-0003",
    comunidadeId: "com_01",
    nome: "pc karina armageddon",
    valor: 38,
    categoria: "photocard",
    notas: "veio no álbum ver. B, sem marcas",
    criadoEm: "2026-10-20T18:30:00Z",
  },
  {
    id: "bi_04",
    codigo: "ITM-0004",
    comunidadeId: "com_01",
    nome: "álbum seventeen fml (lacrado)",
    valor: 95,
    categoria: "album",
    criadoEm: "2026-10-21T10:12:00Z",
  },
  {
    id: "bi_05",
    codigo: "ITM-0005",
    comunidadeId: "com_01",
    nome: "pelúcia skzoo wolf chan",
    valor: 120,
    categoria: "pelucia_pequena",
    notas: "etiqueta original",
    criadoEm: "2026-11-03T21:40:00Z",
  },
];
