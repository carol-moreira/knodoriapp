import { Injectable, inject, signal } from "@angular/core";
import type { Autoria } from "@/lib/autoria";
import { CegsService } from "./cegs.service";
import { AssinaturaService } from "./assinatura.service";
import { NotificacoesService } from "./notificacoes.service";
import { PedidosMercariService } from "./pedidos-mercari.service";

/** COMUNICADO = novidade geral; AVISO = algo que pede atenção (prazo, pagamento, atraso…). */
export type CegPostTipo = "COMUNICADO" | "AVISO";

export interface CegPost {
  id: string;
  cegId: string;
  tipo: CegPostTipo;
  texto: string;
  autor: string;
  data: string; // ISO
  /** Quem publicou (dona ou admin). */
  por?: Autoria;
}

export const CEG_POST_META: Record<CegPostTipo, { label: string; badge: string }> = {
  COMUNICADO: { label: "comunicado", badge: "bg-primary/10 text-primary ring-1 ring-primary/30" },
  AVISO: { label: "aviso", badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
};

// 🔌 Mock — substituir por GET /api/cegs/:id/posts
const MOCK_POSTS: CegPost[] = [
  {
    id: "post_01",
    cegId: "ceg_cx1",
    tipo: "COMUNICADO",
    texto:
      "caixa mercari 3 aberta! 🍒 os pedidos com compra confirmada entram aqui. a previsão de fechamento é no fim do mês.",
    autor: "@knodori_gom",
    data: "2026-05-16T12:00:00Z",
  },
  {
    id: "post_03",
    cegId: "ceg_cx_mai",
    tipo: "COMUNICADO",
    texto:
      "caixa mercari 2 saiu da warehouse ✈️ a cobrança do frete internacional + taxas já está em minhas compras.",
    autor: "@knodori_gom",
    data: "2026-06-04T15:10:00Z",
  },
  {
    id: "post_04",
    cegId: "ceg_cx_abr",
    tipo: "COMUNICADO",
    texto:
      "caixa mercari 1 chegou e o envio nacional está liberado! 🚚 peçam o envio em minhas compras.",
    autor: "@knodori_gom",
    data: "2026-05-20T10:00:00Z",
  },
  {
    id: "post_02",
    cegId: "ceg_cx1",
    tipo: "AVISO",
    texto:
      "a warehouse avisou atraso de ~3 dias na consolidação. assim que tudo chegar eu fecho a caixa e mando a cobrança do frete.",
    autor: "@knodori_gom",
    data: "2026-06-08T18:30:00Z",
  },
];

/** Novidades (postagens) que a GOM publica em cada CEG. */
@Injectable({ providedIn: "root" })
export class CegPostsService {
  private readonly cegs = inject(CegsService);
  private readonly pedidos = inject(PedidosMercariService);
  private readonly notificacoes = inject(NotificacoesService);
  private readonly assinatura = inject(AssinaturaService);

  private readonly _posts = signal<CegPost[]>(MOCK_POSTS);
  readonly posts = this._posts.asReadonly();

  /** Postagens da CEG, mais recentes primeiro. */
  daCeg(cegId: string): CegPost[] {
    return this._posts()
      .filter((p) => p.cegId === cegId)
      .sort((a, b) => b.data.localeCompare(a.data));
  }

  publicar(cegId: string, tipo: CegPostTipo, texto: string): void {
    const ceg = this.cegs.porId(cegId);
    const conteudo = texto.trim();
    if (!ceg || !conteudo) return;

    // 🔌 POST /api/gom/cegs/:id/posts
    const por = this.assinatura.assinar(
      "NOVIDADE",
      `publicou ${tipo === "AVISO" ? "um aviso" : "um comunicado"} em ${ceg.nome}`,
    );
    const post: CegPost = {
      id: `post_${Date.now()}`,
      cegId,
      tipo,
      texto: conteudo,
      autor: por?.username ?? "GOM",
      data: new Date().toISOString(),
      por,
    };
    this._posts.update((prev) => [post, ...prev]);

    const resumo = conteudo.length > 90 ? `${conteudo.slice(0, 90)}…` : conteudo;
    for (const joinerId of this.pedidos.joinersDaCaixa(cegId)) {
      this.notificacoes.enviar(
        joinerId,
        `${tipo === "AVISO" ? "aviso" : "novidade"} na ${ceg.nome}`,
        resumo,
      );
    }
  }

  remover(id: string): void {
    // 🔌 DELETE /api/gom/cegs/posts/:id
    const post = this._posts().find((p) => p.id === id);
    if (!post) return;
    this.assinatura.assinar(
      "NOVIDADE",
      `excluiu ${post.tipo === "AVISO" ? "um aviso" : "um comunicado"} de ${this.cegs.porId(post.cegId)?.nome ?? "CEG"}`,
    );
    this._posts.update((prev) => prev.filter((p) => p.id !== id));
  }
}
