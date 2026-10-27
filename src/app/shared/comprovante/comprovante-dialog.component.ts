import { Component, DestroyRef, effect, inject, signal, untracked } from "@angular/core";
import { FileText, Receipt, Upload, X } from "lucide-angular";
import { COMPROVANTE_ACCEPT, ehImagem, fmtTamanho, validarComprovante } from "@/lib/comprovante";
import { DialogComponent } from "../dialog.component";
import { IconDirective } from "../icon.directive";
import { ComprovanteChipComponent } from "./comprovante-chip.component";
import { ComprovanteService } from "./comprovante.service";

/** Pop-up de upload do comprovante de pagamento — uma instância só, na raiz do app. */
@Component({
  selector: "app-comprovante-dialog",
  imports: [DialogComponent, IconDirective, ComprovanteChipComponent],
  templateUrl: "./comprovante-dialog.component.html",
  styleUrl: "./comprovante-dialog.component.scss",
})
export class ComprovanteDialogComponent {
  protected readonly comprovantes = inject(ComprovanteService);

  protected readonly icons = { FileText, Receipt, Upload, X };
  protected readonly accept = COMPROVANTE_ACCEPT;
  protected readonly fmtTamanho = fmtTamanho;

  protected readonly arquivo = signal<File | null>(null);
  /** URL da prévia — vira a URL do comprovante ao confirmar. */
  protected readonly preview = signal<string | null>(null);
  protected readonly erro = signal("");
  protected readonly arrastando = signal(false);

  constructor() {
    // Cada pedido começa vazio
    effect(() => {
      this.comprovantes.pedido();
      untracked(() => this.descartar());
    });
    inject(DestroyRef).onDestroy(() => this.descartar());
  }

  protected ehImagem(f: File): boolean {
    return ehImagem({ tipo: f.type });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.comprovantes.responder(null);
  }

  protected onArquivo(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.escolher(input.files?.[0] ?? null);
    // Permite escolher o mesmo arquivo de novo depois de remover
    input.value = "";
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.arrastando.set(false);
    this.escolher(e.dataTransfer?.files?.[0] ?? null);
  }

  protected onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.arrastando.set(true);
  }

  protected confirmar(): void {
    const pedido = this.comprovantes.pedido();
    const arquivo = this.arquivo();
    const url = this.preview();
    if (!pedido) return;
    if (arquivo && url) {
      const comprovante = this.comprovantes.anexar(arquivo, url);
      if (!comprovante) {
        this.erro.set("não deu para anexar o comprovante. tente de novo.");
        return;
      }
      // A URL agora pertence ao comprovante — não revogar no reset
      this.preview.set(null);
      this.comprovantes.responder({ comprovante });
      return;
    }
    if (pedido.existentes?.length) {
      this.comprovantes.responder({});
      return;
    }
    this.erro.set("anexe o comprovante do pagamento.");
  }

  protected descartar(): void {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
    this.preview.set(null);
    this.arquivo.set(null);
    this.erro.set("");
    this.arrastando.set(false);
  }

  private escolher(arquivo: File | null): void {
    if (!arquivo) return;
    const erro = validarComprovante(arquivo);
    if (erro) {
      this.erro.set(erro);
      return;
    }
    this.descartar();
    this.arquivo.set(arquivo);
    this.preview.set(URL.createObjectURL(arquivo));
  }

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
}
