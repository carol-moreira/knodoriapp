import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { X } from "lucide-angular";
import { CegsService } from "@/services/cegs.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import {
  CEG_STATUS_META,
  INPUT_CLS,
  LOJAS,
  MOEDAS,
  type CegGOM,
  type CegStatus,
  type Moeda,
} from "../cegs.model";

/** GOM edita os dados gerais da CEG (nome, loja, moeda, prazo e status). */
@Component({
  selector: "app-editar-ceg-modal",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./editar-ceg-modal.component.html",
  styleUrl: "./editar-ceg-modal.component.scss",
})
export class EditarCegModalComponent {
  readonly open = input.required<boolean>();
  readonly ceg = input.required<CegGOM | null>();
  readonly closed = output<void>();

  private readonly cegs = inject(CegsService);

  protected readonly icons = { X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly moedas = MOEDAS;
  protected readonly STATUS_META = CEG_STATUS_META;
  protected readonly statusList = Object.keys(CEG_STATUS_META) as CegStatus[];
  protected readonly val = inputValue;

  protected readonly nome = signal("");
  protected readonly loja = signal("");
  protected readonly moeda = signal<Moeda>("JPY");
  protected readonly prazo = signal("");
  protected readonly status = signal<CegStatus>("ABERTA");

  /** Lojas sugeridas + a atual (caso seja uma loja fora da lista). */
  protected readonly lojas = computed(() =>
    LOJAS.includes(this.loja()) ? LOJAS : [this.loja(), ...LOJAS],
  );

  protected readonly canSave = computed(
    () => this.nome().trim().length > 0 && this.prazo().length > 0,
  );

  constructor() {
    effect(() => {
      const ceg = this.ceg();
      if (this.open() && ceg) {
        this.nome.set(ceg.nome);
        this.loja.set(ceg.loja);
        this.moeda.set(ceg.moeda);
        this.prazo.set(ceg.prazo);
        this.status.set(ceg.status);
      }
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected salvar(): void {
    const ceg = this.ceg();
    if (!ceg || !this.canSave()) return;
    this.cegs.editar(ceg.id, {
      nome: this.nome().trim(),
      loja: this.loja(),
      moeda: this.moeda(),
      prazo: this.prazo(),
      status: this.status(),
    });
    this.closed.emit();
  }
}
