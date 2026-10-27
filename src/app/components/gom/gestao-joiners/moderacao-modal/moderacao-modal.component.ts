import { Component, computed, inject, input, output, signal } from "@angular/core";
import { ShieldAlert, UserMinus, X, type LucideIconData } from "lucide-angular";
import { MOTIVO_MIN, TIPO_MODERACAO_META, type TipoModeracao } from "@/lib/moderacao-types";
import { ModeracaoService } from "@/services/moderacao.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { INPUT_CLS } from "../../gerenciamento-cegs/cegs.model";

/** GOM solicita remoção ou banimento de uma joiner — com motivo obrigatório, para o admin. */
@Component({
  selector: "app-moderacao-modal",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./moderacao-modal.component.html",
  styleUrl: "./moderacao-modal.component.scss",
})
export class ModeracaoModalComponent {
  readonly joiner = input.required<{ id: string; nome: string; username: string }>();
  readonly closed = output<void>();

  private readonly moderacao = inject(ModeracaoService);

  protected readonly icons = { X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly META = TIPO_MODERACAO_META;
  protected readonly MOTIVO_MIN = MOTIVO_MIN;
  protected readonly val = inputValue;
  protected readonly tipos: { value: TipoModeracao; icon: LucideIconData }[] = [
    { value: "REMOCAO", icon: UserMinus },
    { value: "BANIMENTO", icon: ShieldAlert },
  ];

  protected readonly tipo = signal<TipoModeracao>("REMOCAO");
  protected readonly motivo = signal("");
  protected readonly erro = signal("");

  protected readonly faltam = computed(() => Math.max(0, MOTIVO_MIN - this.motivo().trim().length));

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected enviar(): void {
    const erro = this.moderacao.solicitar(this.tipo(), this.joiner(), this.motivo());
    this.erro.set(erro ?? "");
    if (!erro) this.closed.emit();
  }

  protected tipoClass(t: TipoModeracao): string {
    const ativo = this.tipo() === t;
    const cor =
      t === "BANIMENTO"
        ? "border-rose-300 bg-rose-50 text-rose-800"
        : "border-amber-300 bg-amber-50 text-amber-800";
    return `flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
      ativo ? cor : "border-border bg-card hover:bg-muted/50"
    }`;
  }
}
