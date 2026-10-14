import { Component, ElementRef, computed, inject, signal, viewChild } from "@angular/core";
import { BarChart3, Clock, Layers, Megaphone, Package, Plus, Repeat2, Users } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { CegPostsService } from "@/services/ceg-posts.service";
import { CegsService } from "@/services/cegs.service";
import { RepassesService } from "@/services/repasses.service";
import { inputValue } from "@/shared/dom";
import {
  CEG_STATUS_META,
  FILTROS,
  MOCK_REPASSES,
  fmtDate,
  type CegGOM,
  type CegStatus,
  type Repasse,
} from "./cegs.model";
import { CriarCegModalComponent } from "./criar-ceg-modal/criar-ceg-modal.component";
import { NovidadesModalComponent } from "./novidades-modal/novidades-modal.component";
import {
  FilaRepassesComponent,
  type FiltroRepasseCeg,
} from "./fila-repasses/fila-repasses.component";
import {
  RepassesModalComponent,
  type RepasseUpdate,
} from "./repasses-modal/repasses-modal.component";

@Component({
  selector: "app-gerenciamento-cegs",
  imports: [
    IconDirective,
    CriarCegModalComponent,
    RepassesModalComponent,
    FilaRepassesComponent,
    NovidadesModalComponent,
  ],
  templateUrl: "./gerenciamento-cegs.component.html",
  styleUrl: "./gerenciamento-cegs.component.scss",
})
export class GerenciamentoCegsComponent {
  protected readonly repasseService = inject(RepassesService);

  protected readonly posts = inject(CegPostsService);

  protected readonly icons = { BarChart3, Clock, Layers, Megaphone, Package, Plus, Repeat2, Users };
  protected readonly filtros = FILTROS;
  protected readonly STATUS_META = CEG_STATUS_META;
  protected readonly steps = Object.keys(CEG_STATUS_META) as CegStatus[];
  protected readonly fmtDate = fmtDate;

  private readonly cegsService = inject(CegsService);
  protected readonly cegs = this.cegsService.cegs;
  protected readonly repasses = signal<Record<string, Repasse[]>>(MOCK_REPASSES);
  protected readonly filtro = signal<CegStatus | "TODAS">("TODAS");
  protected readonly criarOpen = signal(false);
  protected readonly repassesCeg = signal<CegGOM | null>(null);
  protected readonly novidadesCeg = signal<CegGOM | null>(null);
  protected readonly filaCeg = signal<FiltroRepasseCeg>("TODAS");
  private readonly filaSection = viewChild.required("filaSection", { read: ElementRef });

  protected readonly filtradas = computed(() => {
    const filtro = this.filtro();
    return filtro === "TODAS" ? this.cegs() : this.cegs().filter((c) => c.status === filtro);
  });

  protected readonly repassesDoModal = computed(() => {
    const ceg = this.repassesCeg();
    return ceg ? (this.repasses()[ceg.id] ?? []) : [];
  });

  protected filtroClass(value: CegStatus | "TODAS"): string {
    return `shrink-0 rounded-pill px-3.5 py-1.5 text-xs font-medium transition ${
      this.filtro() === value
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground hover:text-foreground"
    }`;
  }

  protected repassesPend(cegId: string): number {
    return (this.repasses()[cegId] ?? []).filter((r) => r.status !== "PAGO").length;
  }

  /** Abre a fila de repasses filtrada pela CEG. */
  protected verRepasses(cegId: string): void {
    this.filaCeg.set(cegId);
    (this.filaSection().nativeElement as HTMLElement).scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  protected stepClass(ceg: CegGOM, s: CegStatus): string {
    return `h-1.5 flex-1 rounded-full transition-all ${
      CEG_STATUS_META[s].step <= CEG_STATUS_META[ceg.status].step ? "bg-primary" : "bg-muted"
    }`;
  }

  protected onStatusChange(cegId: string, e: Event): void {
    const status = inputValue(e) as CegStatus;
    this.cegsService.atualizar(cegId, { status });
  }

  protected handleCriar(nova: CegGOM): void {
    this.cegsService.criar(nova);
    this.repasses.update((prev) => ({ ...prev, [nova.id]: [] }));
  }

  protected handleUpdateRepasse({ cegId, updated }: RepasseUpdate): void {
    this.repasses.update((prev) => ({
      ...prev,
      [cegId]: (prev[cegId] ?? []).map((r) => (r.id === updated.id ? updated : r)),
    }));
  }
}
