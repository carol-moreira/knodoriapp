/**
 * Calculadora de preço — interface client para POST /api/pricing.
 *
 * Uso (em um componente, no field initializer):
 *   protected readonly pricing = inject(PricingService).createCalculator();
 *   this.pricing.calcular({ valorJpy: 3800, itens: { photocard: 1 } });
 *   // template: pricing.resultado(), pricing.loading(), pricing.error()
 *
 * Cada calculadora é debounced (padrão 350 ms) para evitar chamadas excessivas
 * enquanto o usuário digita. As taxas nunca chegam ao navegador: o servidor
 * (server/worker.ts) devolve apenas os valores finais em centavos.
 */

import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { DestroyRef, Injectable, inject, signal, type Signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { PricingInput, PricingResult } from "@/lib/pricing";

export interface PricingCalculator {
  /**
   * Dispara o cálculo (debounced).
   * Zera o resultado se valorJpy for 0 ou negativo, sem chamar o servidor.
   */
  calcular: (input: PricingInput) => void;
  /** Resultado mais recente. Null enquanto não houver cálculo ou após resetar(). */
  resultado: Signal<PricingResult | null>;
  /** True durante o debounce E durante a chamada ao servidor. */
  loading: Signal<boolean>;
  /** Erro da última chamada ao servidor. Null em caso de sucesso. */
  error: Signal<Error | null>;
  /** Cancela o debounce pendente e limpa resultado/error/loading. */
  resetar: () => void;
}

@Injectable({ providedIn: "root" })
export class PricingService {
  private readonly http = inject(HttpClient);

  /** Chamada direta ao servidor (sem debounce). */
  calcularPreco(input: PricingInput): Promise<PricingResult> {
    return firstValueFrom(this.http.post<PricingResult>("/api/pricing", input));
  }

  /**
   * Cria uma calculadora com estado próprio. Deve ser chamada em contexto de
   * injeção (field initializer ou constructor) — o timer é limpo no destroy.
   */
  createCalculator({ debounceMs = 350 }: { debounceMs?: number } = {}): PricingCalculator {
    const resultado = signal<PricingResult | null>(null);
    const loading = signal(false);
    const error = signal<Error | null>(null);
    let timer: ReturnType<typeof setTimeout> | null = null;

    inject(DestroyRef).onDestroy(() => {
      if (timer) clearTimeout(timer);
    });

    const calcular = (input: PricingInput) => {
      // Cancela qualquer chamada pendente antes de agendar a nova
      if (timer) clearTimeout(timer);

      // Entrada inválida: limpa estado sem chamar o servidor
      if (!input.valorJpy || input.valorJpy <= 0) {
        resultado.set(null);
        error.set(null);
        loading.set(false);
        return;
      }

      // Indica "carregando" imediatamente (antes do debounce expirar)
      loading.set(true);

      timer = setTimeout(async () => {
        try {
          const res = await this.calcularPreco(input);
          resultado.set(res);
          error.set(null);
        } catch (e) {
          error.set(toError(e));
          resultado.set(null);
        } finally {
          loading.set(false);
        }
      }, debounceMs);
    };

    const resetar = () => {
      if (timer) clearTimeout(timer);
      resultado.set(null);
      error.set(null);
      loading.set(false);
    };

    return {
      calcular,
      resultado: resultado.asReadonly(),
      loading: loading.asReadonly(),
      error: error.asReadonly(),
      resetar,
    };
  }
}

function toError(e: unknown): Error {
  if (e instanceof HttpErrorResponse) {
    const msg = (e.error as { message?: string } | null)?.message;
    return new Error(msg ?? "erro inesperado ao calcular o preço.");
  }
  return e instanceof Error ? e : new Error("erro inesperado ao calcular o preço.");
}
