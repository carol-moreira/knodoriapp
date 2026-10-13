import { Directive, ElementRef, effect, inject, input } from "@angular/core";

/**
 * Vincula um número a um <input type="number"> com a mesma semântica de input
 * controlado do ReactDOM: quando o valor muda, o DOM só é reescrito se o texto
 * digitado diferir por comparação frouxa (`!=`) — ou se o valor for 0 e o campo
 * estiver vazio. Assim "2." não vira "2" enquanto a usuária digita.
 *
 *   <input type="number" [appNumberValue]="valor()" (input)="..." />
 */
@Directive({ selector: "input[appNumberValue]" })
export class NumberValueDirective {
  readonly appNumberValue = input.required<number>();

  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  constructor() {
    effect(() => {
      const value = this.appNumberValue();
      const current = this.el.value;
      if ((value === 0 && current === "") || Number(current) != value || current === "") {
        this.el.value = String(value);
      }
    });
  }
}
