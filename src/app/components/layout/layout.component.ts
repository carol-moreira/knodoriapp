import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from "@angular/cdk/menu";
import type { ConnectedPosition } from "@angular/cdk/overlay";
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterLink, RouterOutlet } from "@angular/router";
import {
  BarChart2,
  Bell,
  Calculator,
  Ellipsis,
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
import { CentralNotificacoesComponent } from "./central-notificacoes/central-notificacoes.component";

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

/** Dropdown "mais" da nav do desktop, alinhado à esquerda do gatilho. */
const NAV_MAIS_POSITION: ConnectedPosition[] = [
  { originX: "start", originY: "bottom", overlayX: "start", overlayY: "top", offsetY: 8 },
  { originX: "end", originY: "bottom", overlayX: "end", overlayY: "top", offsetY: 8 },
];

/** gap-0.5 entre os itens e p-1 da pílula da nav (px). */
const NAV_GAP = 2;
const NAV_PADDING = 8;

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
    CentralNotificacoesComponent,
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

  protected readonly icons = { Bell, Ellipsis, Heart, Menu, MessageCircle, Settings, LogOut };
  protected readonly menuPosition = MENU_POSITION;
  protected readonly navMaisPosition = NAV_MAIS_POSITION;

  protected readonly profileOpen = signal(false);
  /** Sheet "mais" da barra inferior (celular). */
  protected readonly maisOpen = signal(false);
  /** Central de notificações. */
  protected readonly notifOpen = signal(false);
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

  // ── Nav do desktop: os itens que não cabem vão para o dropdown "mais" ──

  private readonly navArea = viewChild<ElementRef<HTMLElement>>("navArea");
  private readonly navMedida = viewChild<ElementRef<HTMLElement>>("navMedida");
  /** Quantos itens da nav cabem na barra do desktop. */
  private readonly navCabem = signal(Number.POSITIVE_INFINITY);
  protected readonly navDesktop = computed(() => this.nav().slice(0, this.navCabem()));
  protected readonly navDesktopMais = computed(() => this.nav().slice(this.navCabem()));
  protected readonly desktopMaisAtivo = computed(() =>
    this.navDesktopMais().some((i) => this.isActive(i)),
  );
  protected readonly desktopMaisPendente = computed(() =>
    this.navDesktopMais().some((i) => this.badge(i) > 0),
  );

  constructor() {
    // Remede quando a área muda de largura ou quando os itens mudam (role, badges, breakpoint)
    effect((onCleanup) => {
      const area = this.navArea()?.nativeElement;
      const medida = this.navMedida()?.nativeElement;
      if (!area || !medida) return;
      const ro = new ResizeObserver(() => this.medirNav(area, medida));
      ro.observe(area);
      ro.observe(medida);
      onCleanup(() => ro.disconnect());
    });
  }

  private medirNav(area: HTMLElement, medida: HTMLElement): void {
    const itens = [...medida.children] as HTMLElement[];
    // O último filho da medição é o botão "mais"
    const mais = itens.pop()?.offsetWidth ?? 0;
    const larguras = itens.map((el) => el.offsetWidth);
    const disponivel = area.clientWidth - NAV_PADDING;
    const ocupa = (n: number) =>
      larguras.slice(0, n).reduce((t, w) => t + w, 0) + Math.max(0, n - 1) * NAV_GAP;
    if (ocupa(larguras.length) <= disponivel) {
      this.navCabem.set(larguras.length);
      return;
    }
    let n = larguras.length - 1;
    while (n > 0 && ocupa(n) + NAV_GAP + mais > disponivel) n--;
    this.navCabem.set(n);
  }

  protected navItemClass(ativo: boolean): string {
    return `relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 py-2 text-[13px] font-medium transition xl:px-3.5 xl:text-sm ${
      ativo
        ? "bg-primary text-primary-foreground shadow"
        : "text-foreground/70 hover:text-foreground"
    }`;
  }

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
