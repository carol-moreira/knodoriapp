import { ErrorHandler, Injectable, inject, signal } from "@angular/core";
import { reportLovableError } from "@/lib/lovable-error-reporting";

/** Último erro não tratado — quando presente, o App mostra a tela "This page didn't load". */
@Injectable({ providedIn: "root" })
export class AppErrorService {
  private readonly _error = signal<unknown>(null);
  readonly error = this._error.asReadonly();

  set(error: unknown): void {
    this._error.set(error ?? new Error("Erro desconhecido."));
  }

  reset(): void {
    this._error.set(null);
  }
}

/**
 * ErrorHandler global (substitui o errorComponent da rota raiz do TanStack Router).
 * Erros de renderização/eventos não tratados derrubam a tela para o fallback de erro.
 */
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly errors = inject(AppErrorService);

  handleError(error: unknown): void {
    console.error(error);
    reportLovableError(error, { boundary: "angular_root_error_handler" });
    this.errors.set(error);
  }
}
