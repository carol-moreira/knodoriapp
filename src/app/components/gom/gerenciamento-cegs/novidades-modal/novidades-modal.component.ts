import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { Megaphone, Send, Trash2, TriangleAlert, X } from "lucide-angular";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { AuthService } from "@/services/auth.service";
import { CEG_POST_META, CegPostsService, type CegPostTipo } from "@/services/ceg-posts.service";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { INPUT_CLS, type CegGOM } from "../cegs.model";

/** GOM publica comunicados e avisos (postagens) para as joiners da CEG. */
@Component({
  selector: "app-novidades-modal",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./novidades-modal.component.html",
  styleUrl: "./novidades-modal.component.scss",
})
export class NovidadesModalComponent {
  readonly open = input.required<boolean>();
  readonly ceg = input.required<CegGOM | null>();
  readonly closed = output<void>();

  private readonly auth = inject(AuthService);
  private readonly pedidos = inject(PedidosMercariService);
  protected readonly posts = inject(CegPostsService);

  protected readonly icons = { Megaphone, Send, Trash2, TriangleAlert, X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly POST_META = CEG_POST_META;
  protected readonly tipos: CegPostTipo[] = ["COMUNICADO", "AVISO"];
  protected readonly val = inputValue;

  protected readonly tipo = signal<CegPostTipo>("COMUNICADO");
  protected readonly texto = signal("");

  protected readonly feed = computed(() => {
    const ceg = this.ceg();
    return ceg ? this.posts.daCeg(ceg.id) : [];
  });

  protected readonly participantes = computed(() => {
    const ceg = this.ceg();
    return ceg ? this.pedidos.joinersDaCaixa(ceg.id).length : 0;
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.tipo.set("COMUNICADO");
        this.texto.set("");
      }
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected publicar(): void {
    const ceg = this.ceg();
    if (!ceg || !this.texto().trim()) return;
    this.posts.publicar(ceg.id, this.tipo(), this.texto(), this.auth.user()?.username ?? "GOM");
    this.texto.set("");
  }

  protected tipoClass(t: CegPostTipo): string {
    return `flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium transition ${
      this.tipo() === t
        ? "bg-card text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    }`;
  }

  protected fmtDataHora(iso: string): string {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
