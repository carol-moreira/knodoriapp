import { Injectable, computed, inject, signal } from "@angular/core";
import {
  GOM_PADRAO,
  MOCK_CONVERSAS,
  MOCK_MENSAGENS,
  type Conversa,
  type Mensagem,
} from "@/lib/mensagens-types";
import { AuthService } from "./auth.service";
import { NotificacoesService } from "./notificacoes.service";

/** Mensagens diretas joiner ↔ GOM (opcionalmente vinculadas a um pedido). */
@Injectable({ providedIn: "root" })
export class MensagensService {
  private readonly auth = inject(AuthService);
  private readonly notificacoes = inject(NotificacoesService);

  private readonly _conversas = signal<Conversa[]>(MOCK_CONVERSAS);
  private readonly _mensagens = signal<Mensagem[]>(MOCK_MENSAGENS);

  /** Conversas do usuário logado — a joiner vê a dela; a GOM vê todas as suas. */
  readonly minhasConversas = computed(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this._conversas().filter((c) =>
      user.role === "GOM" ? c.gomId === user.id : c.joinerId === user.id,
    );
  });

  /** Total de mensagens recebidas e não lidas (badge da navegação). */
  readonly naoLidas = computed(() => {
    const ids = new Set(this.minhasConversas().map((c) => c.id));
    const meuId = this.auth.user()?.id;
    return this._mensagens().filter((m) => ids.has(m.conversaId) && m.autorId !== meuId && !m.lida)
      .length;
  });

  /** Mensagens da conversa em ordem cronológica. */
  daConversa(conversaId: string): Mensagem[] {
    return this._mensagens()
      .filter((m) => m.conversaId === conversaId)
      .sort((a, b) => a.data.localeCompare(b.data));
  }

  ultimaMensagem(conversaId: string): Mensagem | undefined {
    return this.daConversa(conversaId).at(-1);
  }

  naoLidasDa(conversaId: string): number {
    const meuId = this.auth.user()?.id;
    return this._mensagens().filter(
      (m) => m.conversaId === conversaId && m.autorId !== meuId && !m.lida,
    ).length;
  }

  /** Conversa da joiner logada com a GOM — criada na primeira visita. */
  conversaDaJoiner(): Conversa | null {
    const user = this.auth.user();
    if (!user || user.role !== "JOINER") return null;
    return this.abrirConversa({ id: user.id, nome: user.nome, username: user.username });
  }

  /** Conversa com a joiner (a GOM pode iniciar uma); cria se ainda não existir. */
  abrirConversa(joiner: { id: string; nome: string; username: string }): Conversa {
    const existente = this._conversas().find((c) => c.joinerId === joiner.id);
    if (existente) return existente;

    // 🔌 POST /api/conversas
    const nova: Conversa = {
      id: `conv_${joiner.id}`,
      joinerId: joiner.id,
      joinerNome: joiner.nome,
      joinerUsername: joiner.username,
      gomId: GOM_PADRAO.id,
      gomUsername: GOM_PADRAO.username,
    };
    this._conversas.update((prev) => [...prev, nova]);
    return nova;
  }

  /** Envia texto e/ou imagens — basta um dos dois. */
  enviar(
    conversaId: string,
    { texto, pedidoId, imagens = [] }: { texto: string; pedidoId?: string; imagens?: string[] },
  ): void {
    const user = this.auth.user();
    const conversa = this._conversas().find((c) => c.id === conversaId);
    const conteudo = texto.trim();
    if (!user || !conversa || (!conteudo && imagens.length === 0)) return;

    // 🔌 POST /api/conversas/:id/mensagens (multipart com as imagens; + push/websocket)
    const mensagem: Mensagem = {
      id: `msg_${Date.now()}`,
      conversaId,
      autorId: user.id,
      texto: conteudo,
      data: new Date().toISOString(),
      pedidoId,
      imagens: imagens.length > 0 ? imagens : undefined,
      lida: false,
    };
    this._mensagens.update((prev) => [...prev, mensagem]);

    const daGom = user.id === conversa.gomId;
    const resumo = !conteudo
      ? `📷 ${imagens.length} imagem${imagens.length > 1 ? "ns" : ""}`
      : conteudo.length > 90
        ? `${conteudo.slice(0, 90)}…`
        : conteudo;
    this.notificacoes.enviar(
      daGom ? conversa.joinerId : conversa.gomId,
      `nova mensagem de ${daGom ? conversa.gomUsername : conversa.joinerUsername} 💬`,
      resumo,
    );
  }

  /** Marca como lidas as mensagens que o usuário logado recebeu nesta conversa. */
  marcarLidas(conversaId: string): void {
    const meuId = this.auth.user()?.id;
    if (!meuId || this.naoLidasDa(conversaId) === 0) return;
    // 🔌 POST /api/conversas/:id/lidas
    this._mensagens.update((prev) =>
      prev.map((m) =>
        m.conversaId === conversaId && m.autorId !== meuId && !m.lida ? { ...m, lida: true } : m,
      ),
    );
  }
}
