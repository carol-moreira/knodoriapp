import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from "@angular/cdk/menu";
import type { ConnectedPosition } from "@angular/cdk/overlay";
import { Component, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterLink, RouterOutlet } from "@angular/router";
import {
  BarChart2,
  Bell,
  Calculator,
  FileText,
  Hand,
  Heart,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Settings2,
  ShoppingBag,
  Store,
  Truck,
  Users,
  type LucideIconData,
} from "lucide-angular";
import { filter, map } from "rxjs";
import type { UserRole } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";
import { ClaimsService } from "@/services/claims.service";
import { EnviosService } from "@/services/envios.service";
import { MensagensService } from "@/services/mensagens.service";
import { ModeracaoService } from "@/services/moderacao.service";
import { NotificacoesService } from "@/services/notificacoes.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { ProfileSettingsModalComponent } from "../auth/profile-settings-modal/profile-settings-modal.component";

// ---------------------------------------------------------------------------
// Rotas que renderizam sem header/footer (tela cheia)
// ---------------------------------------------------------------------------

const FULL_PAGE_ROUTES = ["/login", "/onboarding"];

// ---------------------------------------------------------------------------
// Nav items por role
// ---------------------------------------------------------------------------

type NavItem = {
  to: string;
  label: string;
  icon: LucideIconData;
  exact?: boolean;
  /** Rótulo curto da barra inferior (celular). */
  curto?: string;
};

/** Itens fixos na barra inferior do celular; o resto vai para o "mais". */
const ITENS_BARRA = 4;

/** Mensagens ficam num ícone próprio no header (junto às notificações), fora da nav. */
const MENSAGENS_POR_ROLE: Partial<Record<UserRole, string>> = {
  GOM: "/gom/mensagens",
  JOINER: "/joiner/mensagens",
};

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { to: "/admin", label: "dashboard", curto: "início", icon: LayoutDashboard, exact: true },
    { to: "/admin/metricas", label: "métricas", icon: BarChart2 },
    { to: "/admin/usuarios", label: "usuários", icon: Users },
    { to: "/admin/configuracoes", label: "configurações", curto: "config.", icon: Settings2 },
  ],
  GOM: [
    // Os 4 primeiros ficam na barra inferior do celular
    { to: "/gom", label: "dashboard", curto: "início", icon: LayoutDashboard, exact: true },
    { to: "/gom/cegs", label: "CEGs", icon: Layers },
    { to: "/gom/claims", label: "claims", icon: Hand },
    { to: "/gom/fila", label: "fila mercari", curto: "fila", icon: ShoppingBag },
    { to: "/gom/envios", label: "envios", icon: Truck },
    { to: "/gom/financeiro", label: "financeiro", icon: BarChart2 },
    { to: "/gom/joiners", label: "joiners", icon: Users },
    { to: "/gom/ajustes", label: "ajustes", icon: Settings2 },
  ],
  JOINER: [
    // Os 4 primeiros ficam na barra inferior do celular
    { to: "/joiner", label: "dashboard", curto: "início", icon: LayoutDashboard, exact: true },
    { to: "/joiner/vitrine", label: "vitrine", icon: Store },
    { to: "/joiner/claims", label: "claims", icon: Hand },
    { to: "/joiner/compras", label: "minhas compras", curto: "compras", icon: ShoppingBag },
    { to: "/joiner/envios", label: "envios", icon: Truck },
    { to: "/joiner/cegs", label: "minhas CEGs", curto: "CEGs", icon: Layers },
    { to: "/calculadora", label: "calculadora", icon: Calculator },
    { to: "/joiner/extrato", label: "extrato", icon: FileText },
  ],
};

const PRESET_EMOJIS: Record<string, string> = {
  cherry: "🍒",
  star: "⭐",
  moon: "🌙",
  flower: "🌸",
  heart: "💖",
  crystal: "💎",
};

/** Dropdown alinhado à direita do gatilho, 8px abaixo (align="end", sideOffset={8}). */
const MENU_POSITION: ConnectedPosition[] = [
  { originX: "end", originY: "bottom", overlayX: "end", overlayY: "top", offsetY: 8 },
  { originX: "end", originY: "top", overlayX: "end", overlayY: "bottom", offsetY: -8 },
];

@Component({
  selector: "app-layout",
  imports: [
    RouterOutlet,
    RouterLink,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    DialogComponent,
    IconDirective,
    ProfileSettingsModalComponent,
  ],
  templateUrl: "./layout.component.html",
  styleUrl: "./layout.component.scss",
})
export class LayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly notificacoes = inject(NotificacoesService);
  protected readonly mensagens = inject(MensagensService);
  private readonly claims = inject(ClaimsService);
  private readonly moderacao = inject(ModeracaoService);
  private readonly envios = inject(EnviosService);

  protected readonly icons = { Bell, Heart, Menu, MessageCircle, Settings, LogOut };
  protected readonly menuPosition = MENU_POSITION;

  protected readonly profileOpen = signal(false);
  /** Sheet "mais" da barra inferior (celular). */
  protected readonly maisOpen = signal(false);
  protected readonly logoFailed = signal(false);

  /** pathname atual (sem query/hash). */
  protected readonly path = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => stripPath(e.urlAfterRedirects)),
    ),
    { initialValue: stripPath(this.router.url) },
  );

  // Telas de autenticação não usam o shell com header/footer
  protected readonly isFullPage = computed(() => {
    const path = this.path();
    return FULL_PAGE_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
  });

  protected readonly nav = computed(() => {
    const user = this.auth.user();
    return user ? NAV_BY_ROLE[user.role] : [];
  });

  /** Barra inferior: até 5 itens cabem inteiros; com mais, 4 + botão "mais". */
  protected readonly navBarra = computed(() => {
    const nav = this.nav();
    return nav.length <= ITENS_BARRA + 1 ? nav : nav.slice(0, ITENS_BARRA);
  });
  protected readonly navMais = computed(() => this.nav().slice(this.navBarra().length));
  protected readonly maisAtivo = computed(() => this.navMais().some((i) => this.isActive(i)));
  /** Algum item do "mais" tem pendência (ponto no botão). */
  protected readonly maisPendente = computed(() => this.navMais().some((i) => this.badge(i) > 0));
  protected readonly colunasBarra = computed(
    () => `repeat(${this.navBarra().length + (this.navMais().length ? 1 : 0)}, minmax(0, 1fr))`,
  );

  /** Título da página no header do celular. */
  protected readonly tituloAtual = computed(() => {
    const item = this.nav().find((i) => this.isActive(i));
    if (item) return item.label;
    return this.path() === this.mensagensRota() ? "mensagens" : "KNODORI";
  });

  protected readonly mensagensRota = computed(() => {
    const user = this.auth.user();
    return user ? (MENSAGENS_POR_ROLE[user.role] ?? null) : null;
  });

  protected readonly avatar = computed(() => {
    const user = this.auth.user();
    if (!user) return null;
    const avatarUrl = user.avatarUrl;
    if (avatarUrl && avatarUrl.startsWith("data:"))
      return { kind: "image" as const, src: avatarUrl };
    const presetEmoji = avatarUrl ? PRESET_EMOJIS[avatarUrl] : null;
    if (presetEmoji) return { kind: "emoji" as const, emoji: presetEmoji };
    return { kind: "initials" as const, initials: user.nome.slice(0, 2).toUpperCase() };
  });

  /** Contador no item da navegação (claims pendentes da GOM, pedidos de moderação do admin). */
  protected badge(item: NavItem): number {
    if (item.to === "/gom/claims") return this.claims.pendentes().length;
    if (item.to === "/admin/usuarios") return this.moderacao.pendentes().length;
    if (item.to === "/gom/envios") return this.envios.pendentesGom().length;
    if (item.to === "/joiner/envios") return this.envios.pendentesJoiner().length;
    return 0;
  }

  protected fmtNotificacao(iso: string): string {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  protected isActive(item: NavItem): boolean {
    const path = this.path();
    return item.exact
      ? path === item.to || path === item.to + "/"
      : path === item.to || path.startsWith(item.to + "/");
  }

  protected handleSignOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl("/login", { replaceUrl: true });
  }
}

function stripPath(url: string): string {
  return url.split(/[?#]/)[0] || "/";
}
