import { Component, computed, effect, input, output, signal } from "@angular/core";
import { CheckCircle2, ImagePlus, Package, X } from "lucide-angular";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { ITEM_META, type SolicitacaoGOM } from "@/lib/gom-types";
import { INPUT_CLS, type CegGOM } from "../../gerenciamento-cegs/cegs.model";

/** "NOVA" = abrir a próxima caixa mercari ao confirmar. */
export interface ConfirmarCompra {
  id: string;
  proofs: string[];
  cegId: string | "NOVA";
}

const MAX_PROOF_BYTES = 4 * 1024 * 1024;

@Component({
  selector: "app-confirmar-compra-modal",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./confirmar-compra-modal.component.html",
  styleUrl: "./confirmar-compra-modal.component.scss",
})
export class ConfirmarCompraModalComponent {
  readonly open = input.required<boolean>();
  readonly solicitacao = input.required<SolicitacaoGOM | null>();
  /** Caixas mercari abertas (recebendo pedidos). */
  readonly caixas = input.required<CegGOM[]>();
  /** Nome que a próxima caixa receberá se nenhuma estiver aberta. */
  readonly proximaCaixa = input.required<string>();
  readonly closed = output<void>();
  readonly confirmed = output<ConfirmarCompra>();

  protected readonly icons = { CheckCircle2, ImagePlus, Package, X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly val = inputValue;

  protected readonly proofs = signal<string[]>([]);
  protected readonly cegId = signal<string>("NOVA");
  protected readonly erro = signal("");

  protected readonly resumo = computed(() => {
    const s = this.solicitacao();
    if (!s) return "";
    return Object.entries(s.itens)
      .filter(([, q]) => q > 0)
      .map(([k, q]) => `${q}× ${ITEM_META[k as keyof typeof ITEM_META]?.label ?? k}`)
      .join(", ");
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.proofs.set([]);
      this.erro.set("");
      this.cegId.set(this.caixas()[0]?.id ?? "NOVA");
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected handleFiles(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = "";
    this.erro.set("");
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        this.erro.set("selecione apenas imagens (JPG, PNG, WebP).");
        continue;
      }
      if (file.size > MAX_PROOF_BYTES) {
        this.erro.set(`${file.name} é muito grande. máximo 4 MB por imagem.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (ev) => this.proofs.update((p) => [...p, ev.target?.result as string]);
      reader.readAsDataURL(file);
    }
  }

  protected remover(i: number): void {
    this.proofs.update((p) => p.filter((_, idx) => idx !== i));
  }

  protected handleConfirm(): void {
    const s = this.solicitacao();
    if (!s) return;
    if (this.proofs().length === 0) {
      this.erro.set("anexe ao menos uma imagem de proof da compra.");
      return;
    }
    this.confirmed.emit({ id: s.id, proofs: this.proofs(), cegId: this.cegId() });
  }
}
