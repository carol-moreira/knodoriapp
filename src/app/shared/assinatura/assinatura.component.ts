import { Component, computed, input } from "@angular/core";
import { PenLine } from "lucide-angular";
import type { Autoria } from "@/lib/autoria";
import { IconDirective } from "../icon.directive";

/**
 * Assinatura de uma alteração: "✎ confirmado por @liapark · 21 out, 14:02".
 * Formato único em todo o app — a cor e o tamanho vêm do elemento pai.
 *
 *   <app-assinatura [por]="claim.decididoPor" acao="confirmado por" />
 */
@Component({
  selector: "app-assinatura",
  imports: [IconDirective],
  templateUrl: "./assinatura.component.html",
  styleUrl: "./assinatura.component.scss",
})
export class AssinaturaComponent {
  readonly por = input.required<Autoria>();
  /** Texto antes do @ (ex.: "confirmado por", "cobrado por"). */
  readonly acao = input("por");
  /** Esconde data/hora (ex.: dentro de uma bolha de chat que já mostra o horário). */
  readonly semData = input(false);

  protected readonly icons = { PenLine };

  protected readonly quando = computed(() =>
    new Date(this.por().em).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
}
