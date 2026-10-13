import { Component, input, signal, type OnInit } from "@angular/core";
import { ChevronDown, ChevronUp, type LucideIconData } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";

/** Seção colapsável do extrato. */
@Component({
  selector: "app-extrato-section",
  imports: [IconDirective],
  templateUrl: "./extrato-section.component.html",
  styleUrl: "./extrato-section.component.scss",
})
export class ExtratoSectionComponent implements OnInit {
  readonly icon = input.required<LucideIconData>();
  readonly titulo = input.required<string>();
  readonly badge = input.required<string>();
  readonly defaultOpen = input(false);

  protected readonly icons = { ChevronDown, ChevronUp };
  protected readonly open = signal(false);

  ngOnInit(): void {
    // Estado inicial vem de defaultOpen (como useState(defaultOpen))
    this.open.set(this.defaultOpen());
  }
}
