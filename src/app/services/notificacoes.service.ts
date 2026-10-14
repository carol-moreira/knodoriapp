import { Injectable, computed, inject, signal } from "@angular/core";
import type { UserRole } from "@/lib/auth";
import { AuthService } from "./auth.service";

export interface Notificacao {
  id: string;
  /** id do usuário destinatário, ou um role inteiro (ex.: "GOM"). */
  para: string;
  titulo: string;
  mensagem: string;
  data: string; // ISO
  lida: boolean;
}

// 🔌 Mock — substituir por GET /api/notificacoes (+ push/websocket)
const MOCK_NOTIFICACOES: Notificacao[] = [
  {
    id: "ntf_01",
    para: "GOM",
    titulo: "nova solicitação de repasse",
    mensagem:
      "@miniheart quer repassar 2× photocard · 1× adesivo (Cherry Haul Jun/26) para @bunbun.",
    data: "2026-06-10T14:20:00Z",
    lida: false,
  },
  {
    id: "ntf_02",
    para: "GOM",
    titulo: "nova solicitação de repasse",
    mensagem: "@larakim quer repassar 1× álbum (Spring Box Ktown4u) para @cherrymari.",
    data: "2026-06-11T09:05:00Z",
    lida: false,
  },
];

/** Notificações in-app do usuário logado. */
@Injectable({ providedIn: "root" })
export class NotificacoesService {
  private readonly auth = inject(AuthService);
  private readonly _todas = signal<Notificacao[]>(MOCK_NOTIFICACOES);

  /** Notificações do usuário logado (pelo id ou pelo role), mais recentes primeiro. */
  readonly minhas = computed(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this._todas()
      .filter((n) => n.para === user.id || n.para === user.role)
      .sort((a, b) => b.data.localeCompare(a.data));
  });

  readonly naoLidas = computed(() => this.minhas().filter((n) => !n.lida).length);

  enviar(para: string | UserRole, titulo: string, mensagem: string): void {
    // 🔌 POST /api/notificacoes
    const nova: Notificacao = {
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      para,
      titulo,
      mensagem,
      data: new Date().toISOString(),
      lida: false,
    };
    this._todas.update((prev) => [nova, ...prev]);
  }

  marcarTodasLidas(): void {
    const ids = new Set(this.minhas().map((n) => n.id));
    this._todas.update((prev) => prev.map((n) => (ids.has(n.id) ? { ...n, lida: true } : n)));
  }
}
