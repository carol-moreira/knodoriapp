import { Injectable, signal } from "@angular/core";
import { Trash2, type LucideIconData } from "lucide-angular";

export interface ConfirmOptions {
  titulo: string;
  mensagem?: string;
  /** Texto do botão de confirmação (padrão: "excluir"). */
  confirmar?: string;
  cancelar?: string;
  /** Ícone do pop-up (padrão: lixeira). */
  icone?: LucideIconData;
}

interface PedidoConfirmacao extends Required<Omit<ConfirmOptions, "mensagem">> {
  mensagem?: string;
  resolver: (ok: boolean) => void;
}

/**
 * Pop-up de confirmação global (renderizado por <app-confirm-dialog> na raiz do app).
 * Toda exclusão (e ação destrutiva, como banir usuário) no app passa por aqui:
 *
 *   if (await this.confirm.confirmar({ titulo: "excluir item?" })) this.service.remover(id);
 */
@Injectable({ providedIn: "root" })
export class ConfirmService {
  private readonly _pedido = signal<PedidoConfirmacao | null>(null);
  readonly pedido = this._pedido.asReadonly();

  confirmar(opcoes: ConfirmOptions): Promise<boolean> {
    // Um pedido novo cancela o anterior que ainda estiver aberto
    this._pedido()?.resolver(false);
    return new Promise((resolver) => {
      this._pedido.set({
        titulo: opcoes.titulo,
        mensagem: opcoes.mensagem,
        confirmar: opcoes.confirmar ?? "excluir",
        cancelar: opcoes.cancelar ?? "cancelar",
        icone: opcoes.icone ?? Trash2,
        resolver,
      });
    });
  }

  responder(ok: boolean): void {
    const pedido = this._pedido();
    if (!pedido) return;
    this._pedido.set(null);
    pedido.resolver(ok);
  }
}
