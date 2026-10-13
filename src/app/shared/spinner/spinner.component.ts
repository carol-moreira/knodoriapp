import { Component, input } from "@angular/core";

/** Spinner centralizado usado pelos guards e redirecionamentos. */
@Component({
  selector: "app-spinner",
  templateUrl: "./spinner.component.html",
  styleUrl: "./spinner.component.scss",
})
export class SpinnerComponent {
  /** Classes do container (padrão: área de conteúdo; "screen": tela cheia). */
  readonly variant = input<"content" | "screen">("content");
}
