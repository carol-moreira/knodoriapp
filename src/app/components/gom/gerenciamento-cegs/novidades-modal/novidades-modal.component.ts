import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { Landmark, Megaphone, Receipt, Send, Trash2, TriangleAlert, X } from "lucide-angular";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { CEG_POST_META, CegPostsService, type CegPostTipo } from "@/services/ceg-posts.service";
import { INPUT_CLS, type CegGOM } from "../cegs.model";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";

/** GOM publica comunicados e avisos (postagens) para as joiners da CEG. */
@Component({
  selector: "app-novidades-modal",
  imports: [DialogComponent, IconDirective, AssinaturaComponent],
  templateUrl: "./novidades-modal.component.html",
  styleUrl: "./novidades-modal.component.scss",
})
export class NovidadesModalComponent {
  readonly open = input.required<boolean>();
  readonly ceg = input.required<CegGOM | null>();
  readonly closed = output<void>();

  protected readonly posts = inject(CegPostsService);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = { Megaphone, Send, Trash2, TriangleAlert, X };
  protected readonly iconeTipo: Record<CegPostTipo, typeof Megaphone> = {
    COMUNICADO: Megaphone,
    AVISO: TriangleAlert,
    TAXACAO: Receipt,
    ALFANDEGA: Landmark,
  };
  protected readonly placeholder: Record<CegPostTipo, string> = {
    COMUNICADO: "ex: caixa fechada! já saiu da warehouse 📦",
    AVISO: "ex: o prazo de pagamento do frete vence sexta!",
    TAXACAO: "ex: a caixa foi taxada em R$ 180 — o rateio sai junto com o frete.",
    ALFANDEGA: "ex: liberada pela receita! agora é com os correios 🚚",
  };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly POST_META = CEG_POST_META;
  protected readonly tipos: CegPostTipo[] = ["COMUNICADO", "AVISO", "TAXACAO", "ALFANDEGA"];
  protected readonly val = inputValue;

  protected readonly tipo = signal<CegPostTipo>("COMUNICADO");
  protected readonly texto = signal("");

  protected readonly feed = computed(() => {
    const ceg = this.ceg();
    return ceg ? this.posts.daCeg(ceg.id) : [];
  });

  protected readonly participantes = computed(() => {
    const ceg = this.ceg();
    return ceg ? this.posts.joinersDaCeg(ceg.id).length : 0;
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
    this.posts.publicar(ceg.id, this.tipo(), this.texto());
    this.texto.set("");
  }

  protected async remover(id: string): Promise<void> {
    const ok = await this.confirm.confirmar({
      titulo: "excluir postagem?",
      mensagem: "ela some do feed das joiners da CEG.",
    });
    if (ok) this.posts.remover(id);
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
