import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ArrowRight, ShoppingCart } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";

/** Seção do dashboard da GOM com contador, link e estado vazio opcional. */
@Component({
  selector: "app-dashboard-section",
  imports: [IconDirective, RouterLink],
  templateUrl: "./dashboard-section.component.html",
  styleUrl: "./dashboard-section.component.scss",
})
export class DashboardSectionComponent {
  readonly title = input.required<string>();
  readonly count = input.required<number>();
  readonly href = input.required<string>();
  readonly linkLabel = input.required<string>();
  readonly emptyLabel = input<string>();
  readonly alert = input(false);

  protected readonly icons = { ArrowRight, ShoppingCart };
}
