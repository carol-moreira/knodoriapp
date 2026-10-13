import { Component, computed, effect, input, output, signal } from "@angular/core";
import { X } from "lucide-angular";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { INPUT_CLS, LOJAS, MOEDAS, type CegGOM, type Moeda } from "../cegs.model";

@Component({
  selector: "app-criar-ceg-modal",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./criar-ceg-modal.component.html",
  styleUrl: "./criar-ceg-modal.component.scss",
})
export class CriarCegModalComponent {
  readonly open = input.required<boolean>();
  readonly closed = output<void>();
  readonly saved = output<CegGOM>();

  protected readonly icons = { X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly lojas = LOJAS;
  protected readonly moedas = MOEDAS;
  protected readonly val = inputValue;
  protected readonly hoje = new Date().toISOString().split("T")[0];

  protected readonly nome = signal("");
  protected readonly loja = signal("Mercari");
  protected readonly prazo = signal("");
  protected readonly moeda = signal<Moeda>("JPY");
  protected readonly saving = signal(false);

  protected readonly canSave = computed(
    () => this.nome().trim().length > 0 && this.prazo().length > 0,
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        this.nome.set("");
        this.loja.set("Mercari");
        this.prazo.set("");
        this.moeda.set("JPY");
      }
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open && !this.saving()) this.closed.emit();
  }

  protected async handleSave(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    // 🔌 await fetch(`/api/gom/${gomId}/cegs`, { method: "POST", body: JSON.stringify({...}) })
    await new Promise((r) => setTimeout(r, 500));
    this.saved.emit({
      id: `ceg_${Date.now()}`,
      nome: this.nome().trim(),
      loja: this.loja(),
      prazo: this.prazo(),
      moeda: this.moeda(),
      status: "ABERTA",
      qtdJoiners: 0,
      qtdItens: 0,
    });
    this.saving.set(false);
    this.closed.emit();
  }
}
