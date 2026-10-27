import { Injectable, inject, signal } from "@angular/core";
import { validarComprovante, type Comprovante, type ComprovanteTipo } from "@/lib/comprovante";
import { AssinaturaService } from "@/services/assinatura.service";

export interface PedidoComprovanteOpcoes {
  titulo: string;
  mensagem?: string;
  /** Valor do pagamento, mostrado em destaque. */
  valor?: number;
  /**
   * Comprovantes já anexados (ex.: o que a joiner enviou e a GOM está conferindo). Com eles,
   * anexar outro arquivo é opcional — confirmar sem arquivo vale como "conferi".
   */
  existentes?: Comprovante[];
  /** Texto do botão de confirmação (padrão: "enviar comprovante"). */
  confirmar?: string;
}

/** `comprovante` vem vazio quando a pessoa confirmou só com os `existentes`. */
export interface RespostaComprovante {
  comprovante?: Comprovante;
}

interface PedidoComprovante extends PedidoComprovanteOpcoes {
  resolver: (r: RespostaComprovante | null) => void;
}

/**
 * Pop-up global de comprovante de pagamento (renderizado por <app-comprovante-dialog> na raiz).
 * Todo pagamento registrado no app passa por aqui:
 *
 *   const r = await this.comprovantes.pedir({ titulo: "pagar frete", valor: 24.9 });
 *   if (r?.comprovante) this.envios.pagarFrete(id, r.comprovante);
 */
@Injectable({ providedIn: "root" })
export class ComprovanteService {
  private readonly assinatura = inject(AssinaturaService);

  private readonly _pedido = signal<PedidoComprovante | null>(null);
  readonly pedido = this._pedido.asReadonly();

  pedir(opcoes: PedidoComprovanteOpcoes): Promise<RespostaComprovante | null> {
    // Um pedido novo cancela o anterior que ainda estiver aberto
    this._pedido()?.resolver(null);
    return new Promise((resolver) => this._pedido.set({ ...opcoes, resolver }));
  }

  responder(r: RespostaComprovante | null): void {
    const pedido = this._pedido();
    if (!pedido) return;
    this._pedido.set(null);
    pedido.resolver(r);
  }

  /**
   * Registra o arquivo como comprovante assinado pela usuária logada.
   * `url` é a URL que o diálogo já criou para a prévia (reaproveitada, não duplicada).
   */
  anexar(arquivo: File, url: string): Comprovante | null {
    if (validarComprovante(arquivo)) return null;
    const por = this.assinatura.assinar("PAGAMENTO", `anexou o comprovante ${arquivo.name}`);
    if (!por) return null;
    // 🔌 POST /api/comprovantes { nome, tipo, tamanho } → { id, uploadUrl }; PUT do arquivo
    //    direto no R2 (com progresso) e o registro de pagamento guarda só o id
    return {
      id: `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nome: arquivo.name,
      tipo: arquivo.type as ComprovanteTipo,
      tamanho: arquivo.size,
      url,
      por,
    };
  }
}
