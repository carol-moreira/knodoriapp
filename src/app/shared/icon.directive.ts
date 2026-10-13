import { Directive, ElementRef, Renderer2, effect, inject, input } from "@angular/core";
import type { LucideIconData } from "lucide-angular";

/**
 * Renderiza um ícone Lucide diretamente no elemento <svg> do template.
 *
 *   <svg [appIcon]="icons.Heart" class="h-5 w-5" fill="currentColor"></svg>
 *
 * Gera exatamente o mesmo markup do lucide-react (atributos padrão + filhos), então
 * classes Tailwind aplicadas no <svg> funcionam igual à versão React. Atributos
 * escritos no template (ex.: fill="currentColor") têm prioridade sobre os padrões.
 */
const DEFAULT_ATTRS: Record<string, string> = {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

@Directive({
  selector: "svg[appIcon]",
  host: { class: "lucide", "aria-hidden": "true" },
})
export class IconDirective {
  readonly appIcon = input.required<LucideIconData>();

  private readonly el = inject<ElementRef<SVGSVGElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);

  constructor() {
    for (const [name, value] of Object.entries(DEFAULT_ATTRS)) {
      if (!this.el.hasAttribute(name)) this.renderer.setAttribute(this.el, name, value);
    }

    effect(() => {
      const data = this.appIcon();
      while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
      for (const [tag, attrs] of data) {
        const child = this.renderer.createElement(tag, "svg") as SVGElement;
        for (const [name, value] of Object.entries(attrs ?? {})) {
          if (name === "key") continue;
          this.renderer.setAttribute(child, name, String(value));
        }
        this.renderer.appendChild(this.el, child);
      }
    });
  }
}
