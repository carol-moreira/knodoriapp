/**
 * Tipos compartilhados do sistema de precificação.
 * Este arquivo NÃO contém lógica de negócio nem taxas — apenas contratos de dados.
 * Pode ser importado livremente tanto no client quanto no server.
 */

import type { ItemKey } from "@/lib/gom-types";

export type { ItemKey };

// ---------------------------------------------------------------------------
// Input (enviado ao servidor)
// ---------------------------------------------------------------------------

export interface PricingInput {
  valorJpy: number; // Iene — inteiro positivo
  itens?: Record<string, number>; // tipo de item → quantidade (keys: ItemKey, sem undefined values)
  gomId?: string; // para buscar config específica da GOM
}

// ---------------------------------------------------------------------------
// Output (retornado pelo servidor — sem taxas expostas)
// ---------------------------------------------------------------------------

/** Uma opção de parcelamento calculada com precisão de centavos. */
export interface InstallmentOption {
  parcelas: number; // 1 = à vista; 2–7 = parcelado
  formaPagamento: "pix" | "cartao";
  totalCents: number; // total exato em centavos (inteiro)
  parcelaCents: number; // floor(total / parcelas); os primeiros (total % parcelas) são +1 centavo
  taxaPercent: number; // 0 para PIX; taxa do cartão para cartão
  economiaVsPix: number; // centavos economizados vs PIX (negativo = mais caro que PIX)
}

/** Resultado completo retornado por calcularPrecoFn. */
export interface PricingResult {
  baseJpy: number; // JPY original informado pelo usuário
  baseCents: number; // preço à vista no PIX em centavos
  installments: InstallmentOption[]; // [pix, cartao_1x, …, cartao_7x] (sempre 8 itens)
}

// ---------------------------------------------------------------------------
// Helpers de exibição (client-safe)
// ---------------------------------------------------------------------------

/** Converte centavos em string BRL localizada: 15_050 → "R$ 150,50" */
export function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Converte centavos em decimal: 15_050 → 150.50 */
export function centsToDecimal(cents: number): number {
  return cents / 100;
}
