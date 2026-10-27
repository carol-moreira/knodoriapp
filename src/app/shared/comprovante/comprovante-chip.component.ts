import { Component, computed, input } from "@angular/core";
import { Download, FileText } from "lucide-angular";
import { ehImagem, fmtTamanho, type Comprovante } from "@/lib/comprovante";
import { AssinaturaComponent } from "../assinatura/assinatura.component";
import { IconDirective } from "../icon.directive";

/**
 * Comprovante anexado: miniatura (imagem) ou ícone (PDF), abre em outra aba e baixa.
 * Mesmo componente para joiner e GOM.
 *
 *   <app-comprovante-chip [comprovante]="c" />
 */
@Component({
  selector: "app-comprovante-chip",
  imports: [IconDirective, AssinaturaComponent],
  templateUrl: "./comprovante-chip.component.html",
  styleUrl: "./comprovante-chip.component.scss",
})
export class ComprovanteChipComponent {
  readonly comprovante = input.required<Comprovante>();
  /** Versão de uma linha, sem assinatura (dentro de tabelas). */
  readonly compacto = input(false);

  protected readonly icons = { Download, FileText };
  protected readonly imagem = computed(() => ehImagem(this.comprovante()));
  protected readonly tamanho = computed(() => fmtTamanho(this.comprovante().tamanho));
}
