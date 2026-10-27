import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { Router } from "@angular/router";
import {
  Bell,
  BellOff,
  CheckCheck,
  Hand,
  Layers,
  MessageCircle,
  ShieldAlert,
  Trash2,
  TriangleAlert,
  Truck,
  Volume2,
  VolumeX,
  Wallet,
  X,
  type LucideIconData,
} from "lucide-angular";
import {
  CATEGORIA_DO_TIPO,
  FILTROS_NOTIFICACAO,
  quandoNotificacao,
  type CategoriaNotificacao,
  type FiltroNotificacao,
  type Notificacao,
  type TipoNotificacao,
} from "@/lib/notificacoes-types";
import { NotificacoesService } from "@/services/notificacoes.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { VisivelDirective } from "@/shared/visivel.directive";

/** Itens por "página" da lista infinita. */
const PAGINA = 15;

const VISUAL_CATEGORIA: Record<CategoriaNotificacao, { icon: LucideIconData; cls: string }> = {
  CLAIMS: { icon: Hand, cls: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300" },
  PACOTES: { icon: Truck, cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  CEGS: {
    icon: Layers,
    cls: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  FINANCEIRO: {
    icon: Wallet,
    cls: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
  },
  GERAL: { icon: Bell, cls: "bg-muted text-muted-foreground" },
};

/** Tipos com ícone próprio (alertas pedem atenção, mensagens e moderação não têm categoria). */
const VISUAL_TIPO: Partial<Record<TipoNotificacao, { icon: LucideIconData; cls: string }>> = {
  PACOTE_AGUARDANDO: {
    icon: TriangleAlert,
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  CONSOLIDACAO_PRAZO: {
    icon: TriangleAlert,
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  PRAZO_PAGAMENTO: {
    icon: TriangleAlert,
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  MENSAGEM: { icon: MessageCircle, cls: "bg-primary/10 text-primary" },
  MODERACAO: { icon: ShieldAlert, cls: "bg-muted text-muted-foreground" },
};

/**
 * Central de notificações: bottom sheet no celular, painel suspenso sob o sino no desktop.
 * Abas por categoria, lista infinita, "marcar todas como lidas", "limpar lidas" e toque que leva
 * direto à tela do item.
 */
@Component({
  selector: "app-central-notificacoes",
  imports: [DialogComponent, IconDirective, VisivelDirective],
  templateUrl: "./central-notificacoes.component.html",
  styleUrl: "./central-notificacoes.component.scss",
})
export class CentralNotificacoesComponent {
  readonly open = input.required<boolean>();
  readonly closed = output<void>();

  protected readonly notificacoes = inject(NotificacoesService);
  private readonly router = inject(Router);

  protected readonly icons = { BellOff, CheckCheck, Trash2, Volume2, VolumeX, X };
  protected readonly filtros = FILTROS_NOTIFICACAO;

  protected readonly filtro = signal<FiltroNotificacao>("TODAS");
  private readonly limite = signal(PAGINA);

  protected readonly doFiltro = computed(() => this.notificacoes.filtrar(this.filtro()));
  protected readonly lista = computed(() => this.doFiltro().slice(0, this.limite()));
  protected readonly temMais = computed(() => this.doFiltro().length > this.limite());
  protected readonly naoLidasDoFiltro = computed(
    () => this.notificacoes.naoLidasPorFiltro()[this.filtro()],
  );
  protected readonly lidasDoFiltro = computed(() => this.doFiltro().some((n) => !!n.readAt));

  constructor() {
    // Cada abertura começa do topo, na aba "todas"
    effect(() => {
      if (this.open()) {
        this.filtro.set("TODAS");
        this.limite.set(PAGINA);
      }
    });
  }

  protected escolher(f: FiltroNotificacao): void {
    this.filtro.set(f);
    this.limite.set(PAGINA);
  }

  protected carregarMais(): void {
    // 🔌 com a API paginada: buscar a próxima página pelo cursor
    if (this.temMais()) this.limite.update((l) => l + PAGINA);
  }

  protected abrir(n: Notificacao): void {
    this.notificacoes.marcarLida(n.id);
    this.closed.emit();
    if (n.linkUrl) void this.router.navigateByUrl(n.linkUrl);
  }

  protected visual(n: Notificacao): { icon: LucideIconData; cls: string } {
    return VISUAL_TIPO[n.type] ?? VISUAL_CATEGORIA[CATEGORIA_DO_TIPO[n.type]];
  }

  protected quando(n: Notificacao): string {
    return quandoNotificacao(n.createdAt);
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected filtroClass(f: FiltroNotificacao): string {
    return `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-medium transition ${
      this.filtro() === f
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground hover:text-foreground"
    }`;
  }
}
