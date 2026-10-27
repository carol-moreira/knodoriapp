import { Injectable, inject } from "@angular/core";
import { autoriaDe, type AreaAuditoria, type Autoria } from "@/lib/autoria";
import { AuthService } from "./auth.service";

/**
 * Assina as alterações com o usuário logado.
 * Os services chamam `assinar()` em cada ação e gravam a autoria devolvida no registro alterado.
 * (O ComunidadeService não injeta este service — ver comentário lá — e recebe a autoria pronta.)
 */
@Injectable({ providedIn: "root" })
export class AssinaturaService {
  private readonly auth = inject(AuthService);

  /** Autoria do usuário logado agora. */
  autoria(): Autoria | undefined {
    const user = this.auth.user();
    return user ? autoriaDe(user) : undefined;
  }

  /**
   * Assina a ação e devolve a autoria para gravar no registro alterado.
   * `area` e `texto` descrevem a ação para a auditoria do servidor.
   */
  assinar(area: AreaAuditoria, texto: string, por = this.autoria()): Autoria | undefined {
    // 🔌 o servidor grava { area, texto, por } na auditoria de cada rota que altera dados
    void area;
    void texto;
    return por;
  }
}
