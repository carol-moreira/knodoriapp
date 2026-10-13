import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ArrowRight, CheckCircle2, type LucideIconData } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";

/** Seção do dashboard admin com header, badge, link e estado vazio opcional. */
@Component({
  selector: "app-painel-section",
  imports: [IconDirective, RouterLink],
  templateUrl: "./painel-section.component.html",
  styleUrl: "./painel-section.component.scss",
})
export class PainelSectionComponent {
  readonly icon = input.required<LucideIconData>();
  readonly title = input.required<string>();
  readonly count = input.required<number>();
  readonly countLabel = input("total");
  readonly href = input.required<string>();
  readonly linkLabel = input.required<string>();
  readonly iconColor = input.required<string>();
  readonly iconBg = input.required<string>();
  readonly alert = input(false);
  readonly emptyLabel = input<string>();

  protected readonly icons = { ArrowRight, CheckCircle2 };
}
