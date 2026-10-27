import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import type { UserRole } from "@/lib/auth";
import {
  CATEGORIA_DO_TIPO,
  MOCK_NOTIFICACOES,
  ROLES,
  type FiltroNotificacao,
  type Notificacao,
  type TipoNotificacao,
} from "@/lib/notificacoes-types";
import { AuthService } from "./auth.service";

const FEEDBACK_KEY = "knodori-notif-feedback";

/** Notificações in-app do usuário logado (central no header). */
@Injectable({ providedIn: "root" })
export class NotificacoesService {
  private readonly auth = inject(AuthService);
  // 🔌 GET /api/notificacoes?cursor= (paginado) + websocket/Web Push para as novas
  private readonly _todas = signal<Notificacao[]>(MOCK_NOTIFICACOES);

  /** Som + vibração quando chega notificação nova (preferência do aparelho). */
  readonly feedbackAtivo = signal(lerPreferencia());

  /**
   * Notificações do usuário logado, mais recentes primeiro: as endereçadas a ele, à conta da GOM
   * (as admins da comunidade enxergam as da dona) e ao role inteiro.
   */
  readonly minhas = computed(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this._todas()
      .filter(
        (n) =>
          n.userId === user.id ||
          (!!user.gomId && n.userId === user.gomId) ||
          (n.userId === null && n.role === user.role),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  readonly naoLidas = computed(() => this.minhas().filter((n) => !n.readAt).length);

  /** Não lidas por aba da central. */
  readonly naoLidasPorFiltro = computed(() => {
    const c: Record<FiltroNotificacao, number> = {
      TODAS: 0,
      CLAIMS: 0,
      PACOTES: 0,
      CEGS: 0,
      FINANCEIRO: 0,
    };
    for (const n of this.minhas()) {
      if (n.readAt) continue;
      c.TODAS++;
      const cat = CATEGORIA_DO_TIPO[n.type];
      if (cat !== "GERAL") c[cat]++;
    }
    return c;
  });

  constructor() {
    // Feedback sutil só para notificações que chegam durante a sessão (não no login)
    let usuario: string | null = null;
    const vistas = new Set<string>();
    effect(() => {
      const id = this.auth.user()?.id ?? null;
      const lista = this.minhas();
      untracked(() => {
        const novas = id === usuario ? lista.filter((n) => !n.readAt && !vistas.has(n.id)) : [];
        if (id !== usuario) {
          usuario = id;
          vistas.clear();
        }
        for (const n of lista) vistas.add(n.id);
        if (novas.length > 0 && this.feedbackAtivo()) tocarFeedback();
      });
    });
  }

  filtrar(filtro: FiltroNotificacao): Notificacao[] {
    const lista = this.minhas();
    return filtro === "TODAS" ? lista : lista.filter((n) => CATEGORIA_DO_TIPO[n.type] === filtro);
  }

  /**
   * Envia uma notificação.
   * `para` é o id da destinatária ou um role inteiro ("GOM", "JOINER", "ADMIN").
   * `link` é a rota aberta ao tocar; o role de uma destinatária individual sai da área do link
   * (/gom, /admin, senão joiner) quando não é informado.
   */
  enviar(
    para: string | UserRole,
    tipo: TipoNotificacao,
    titulo: string,
    mensagem: string,
    link?: string,
    role?: UserRole,
  ): void {
    const paraRole = (ROLES as readonly string[]).includes(para);
    // 🔌 POST /api/notificacoes — em produção quem cria é o servidor, junto com a ação
    const nova: Notificacao = {
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: paraRole ? null : para,
      role: paraRole ? (para as UserRole) : (role ?? roleDoLink(link)),
      type: tipo,
      title: titulo,
      message: mensagem,
      linkUrl: link,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    this._todas.update((prev) => [nova, ...prev]);
  }

  marcarLida(id: string): void {
    // 🔌 PATCH /api/notificacoes/:id { read_at }
    const agora = new Date().toISOString();
    this._todas.update((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: agora } : n)),
    );
  }

  /** Marca como lidas as notificações do filtro (padrão: todas). */
  marcarTodasLidas(filtro: FiltroNotificacao = "TODAS"): void {
    // 🔌 POST /api/notificacoes/ler { filtro }
    const ids = new Set(this.filtrar(filtro).map((n) => n.id));
    const agora = new Date().toISOString();
    this._todas.update((prev) =>
      prev.map((n) => (ids.has(n.id) && !n.readAt ? { ...n, readAt: agora } : n)),
    );
  }

  /** Remove as já lidas do filtro (padrão: todas). */
  limparLidas(filtro: FiltroNotificacao = "TODAS"): void {
    // 🔌 DELETE /api/notificacoes?lidas=1&filtro=
    const ids = new Set(
      this.filtrar(filtro)
        .filter((n) => n.readAt)
        .map((n) => n.id),
    );
    this._todas.update((prev) => prev.filter((n) => !ids.has(n.id)));
  }

  alternarFeedback(): void {
    const ativo = !this.feedbackAtivo();
    this.feedbackAtivo.set(ativo);
    try {
      localStorage.setItem(FEEDBACK_KEY, ativo ? "1" : "0");
    } catch {
      // storage bloqueado — vale só nesta sessão
    }
    if (ativo) tocarFeedback();
  }
}

function roleDoLink(link?: string): UserRole {
  if (link?.startsWith("/gom")) return "GOM";
  if (link?.startsWith("/admin")) return "ADMIN";
  return "JOINER";
}

function lerPreferencia(): boolean {
  try {
    return localStorage.getItem(FEEDBACK_KEY) !== "0";
  } catch {
    return true;
  }
}

let audio: AudioContext | null = null;

/** Vibração curta + "plim" baixinho. Navegadores sem suporte (ou sem gesto ainda) ignoram. */
function tocarFeedback(): void {
  try {
    navigator.vibrate?.([12, 60, 12]);
  } catch {
    // sem vibração (desktop, iOS)
  }
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.24);
  } catch {
    // autoplay bloqueado até o primeiro toque na página
  }
}
