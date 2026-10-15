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
  Heart,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Settings2,
  ShoppingBag,
  Users,
  type LucideIconData,
} from "lucide-angular";
import { filter, map } from "rxjs";
import type { UserRole } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";
import { MensagensService } from "@/services/mensagens.service";
import { NotificacoesService } from "@/services/notificacoes.service";
import { IconDirective } from "@/shared/icon.directive";
import { ProfileSettingsModalComponent } from "../auth/profile-settings-modal/profile-settings-modal.component";

// ---------------------------------------------------------------------------
// Rotas que renderizam sem header/footer (tela cheia)
// ---------------------------------------------------------------------------

const FULL_PAGE_ROUTES = ["/login", "/onboarding"];

// ---------------------------------------------------------------------------
// Nav items por role
// ---------------------------------------------------------------------------

type NavItem = { to: string; label: string; icon: LucideIconData; exact?: boolean };

/** Mensagens ficam num ícone próprio no header (junto às notificações), fora da nav. */
const MENSAGENS_POR_ROLE: Partial<Record<UserRole, string>> = {
  GOM: "/gom/mensagens",
  JOINER: "/joiner/mensagens",
};

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { to: "/admin", label: "dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/metricas", label: "métricas", icon: BarChart2 },
    { to: "/admin/usuarios", label: "usuários", icon: Users },
    { to: "/admin/configuracoes", label: "configurações", icon: Settings2 },
  ],
  GOM: [
    { to: "/gom", label: "dashboard", icon: LayoutDashboard, exact: true },
    { to: "/gom/cegs", label: "CEGs", icon: Layers },
    { to: "/gom/financeiro", label: "financeiro", icon: BarChart2 },
    { to: "/gom/fila", label: "fila mercari", icon: ShoppingBag },
    { to: "/gom/joiners", label: "joiners", icon: Users },
    { to: "/gom/taxas", label: "taxas", icon: Settings2 },
  ],
  JOINER: [
    { to: "/joiner", label: "dashboard", icon: LayoutDashboard, exact: true },
    { to: "/joiner/compras", label: "minhas compras", icon: ShoppingBag },
    { to: "/joiner/cegs", label: "minhas CEGs", icon: Layers },
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

  protected readonly icons = { Bell, Heart, MessageCircle, Settings, LogOut };
  protected readonly menuPosition = MENU_POSITION;

  protected readonly profileOpen = signal(false);
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
