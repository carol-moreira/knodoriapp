/**
 * Motor de precificação — servidor exclusivo.
 * Este arquivo só é importado por server/worker.ts (Cloudflare Worker) e nunca
 * entra no bundle do Angular. As taxas internas (TAXAS_CARTAO, markupItens,
 * spreadWise, etc.) nunca chegam ao navegador. O client recebe apenas os
 * valores finais em centavos.
 *
 * Toda a aritmética usa inteiros (centavos) para evitar deriva de ponto flutuante.
 */

import { z } from "zod";
import { CONFIG_TAXAS_DEFAULT, type ConfigTaxasGOM, type ItemKey } from "../src/app/lib/gom-types";
import type { PricingResult, InstallmentOption } from "../src/app/lib/pricing";

// ---------------------------------------------------------------------------
// Tabela de taxas de cartão — NUNCA exposta ao client
// Indexada pelo número de parcelas (1x a 7x).
// Nota: 1x no cartão tem taxa própria (custo de processamento); PIX é 0%.
// ---------------------------------------------------------------------------

const TAXAS_CARTAO = [
  { parcelas: 1, taxa: 0.0498 },
  { parcelas: 2, taxa: 0.0964 },
  { parcelas: 3, taxa: 0.1123 },
  { parcelas: 4, taxa: 0.1136 },
  { parcelas: 5, taxa: 0.1431 },
  { parcelas: 6, taxa: 0.1432 },
  { parcelas: 7, taxa: 0.1672 },
] as const satisfies ReadonlyArray<{ parcelas: number; taxa: number }>;

// ---------------------------------------------------------------------------
// Schema de validação (executado no servidor antes do cálculo)
// ---------------------------------------------------------------------------

export const PricingInputSchema = z.object({
  valorJpy: z
    .number({ invalid_type_error: "valorJpy deve ser número" })
    .int("valorJpy deve ser inteiro")
    .positive("valorJpy deve ser positivo")
    .max(9_999_999, "valorJpy excessivamente alto"),
  itens: z.record(z.string(), z.number().int().min(0).max(99)).optional().default({}),
  gomId: z.string().optional(),
});

export type PricingRequest = z.infer<typeof PricingInputSchema>;

// ---------------------------------------------------------------------------
// Handler (antes era a server function calcularPrecoFn do TanStack Start)
// ---------------------------------------------------------------------------

export async function calcularPreco(data: PricingRequest): Promise<PricingResult> {
  // 🔌 Buscar config específica da GOM no banco:
  // const config = data.gomId
  //   ? (await db.query.gomConfigs.findFirst({
  //       where: eq(gomConfigs.gomId, data.gomId),
  //     })) ?? CONFIG_TAXAS_DEFAULT
  //   : CONFIG_TAXAS_DEFAULT;
  const config: ConfigTaxasGOM = CONFIG_TAXAS_DEFAULT;

  return pricingEngine(
    data.valorJpy,
    (data.itens ?? {}) as Partial<Record<ItemKey, number>>,
    config,
  );
}

// ---------------------------------------------------------------------------
// Motor de precificação
// Toda a aritmética usa centavos (inteiros) para eliminar erros de centavo.
// ---------------------------------------------------------------------------

function pricingEngine(
  valorJpy: number,
  itens: Partial<Record<ItemKey, number>>,
  config: ConfigTaxasGOM,
): PricingResult {
  // ── Etapa 1: Acréscimo fixo em JPY ────────────────────────────────────────
  // Ambos são inteiros; sem ponto flutuante aqui.
  const jpyTotal = valorJpy + config.acrescimoBaseJpy;

  // ── Etapa 2: JPY → IDR ────────────────────────────────────────────────────
  // fatorIdrJpy é inteiro → resultado continua inteiro.
  const valorIdr = jpyTotal * config.fatorIdrJpy;

  // ── Etapa 3: IDR → BRL (primeira fronteira de ponto flutuante) ────────────
  // Multiplicamos por 100 e arredondamos NESTE EXATO PONTO para converter para
  // centavos inteiros. Erros de ponto flutuante ficam confinados aqui (≤ 0,5 cent).
  const brlBrutoCents = Math.round(valorIdr * config.taxaIdrBrl * 100);

  // ── Etapa 4: Spread Wise ───────────────────────────────────────────────────
  // config.spreadWise está em percentual (ex: 2.5 → ×1.025).
  // Math.round novamente para manter inteiros.
  const spreadMultiplier = 1 + config.spreadWise / 100;
  const brlComSpreadCents = Math.round(brlBrutoCents * spreadMultiplier);

  // ── Etapa 5: Markup por item ───────────────────────────────────────────────
  // Cada markup unitário é convertido para centavos ANTES de multiplicar pela
  // quantidade. Evita: R$ 2.50 × 3 = 7.499999… em float.
  const markupCents = (Object.entries(itens) as [ItemKey, number][]).reduce((acc, [key, qty]) => {
    if (!qty || qty <= 0) return acc;
    const unitCents = Math.round((config.markupItens[key] ?? 0) * 100);
    return acc + unitCents * qty; // unitCents × inteiro = inteiro
  }, 0);

  // ── Etapa 6: Preço final à vista (PIX) ────────────────────────────────────
  const baseCents = brlComSpreadCents + markupCents;

  return {
    baseJpy: valorJpy,
    baseCents,
    installments: buildInstallments(baseCents),
  };
}

// ---------------------------------------------------------------------------
// Construtor da tabela de parcelamento
// ---------------------------------------------------------------------------

function buildInstallments(baseCents: number): InstallmentOption[] {
  const result: InstallmentOption[] = [];

  // ── PIX ── referência de custo mínimo, sempre o primeiro elemento ─────────
  result.push({
    parcelas: 1,
    formaPagamento: "pix",
    totalCents: baseCents,
    parcelaCents: baseCents,
    taxaPercent: 0,
    economiaVsPix: 0,
  });

  // ── Cartão 1× a 7× ────────────────────────────────────────────────────────
  for (const { parcelas, taxa } of TAXAS_CARTAO) {
    // Total exato arredondado para o centavo mais próximo
    const totalCents = Math.round(baseCents * (1 + taxa));

    // Distribuição justa das parcelas:
    //   floor(total / n) = parcela base
    //   (total % n) primeiras parcelas são (base + 1 centavo)
    // Para exibição mostramos a parcela base (caso majoritário).
    const parcelaCents = Math.floor(totalCents / parcelas);

    result.push({
      parcelas,
      formaPagamento: "cartao",
      totalCents,
      parcelaCents,
      taxaPercent: parseFloat((taxa * 100).toFixed(2)),
      economiaVsPix: baseCents - totalCents, // negativo = mais caro que PIX
    });
  }

  return result; // sempre 8 elementos: [pix, 1x, 2x, 3x, 4x, 5x, 6x, 7x]
}
