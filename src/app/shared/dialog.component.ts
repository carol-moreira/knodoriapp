import { CdkTrapFocus } from "@angular/cdk/a11y";
import { DomPortalOutlet, TemplatePortal } from "@angular/cdk/portal";
import { DOCUMENT } from "@angular/common";
import {
  Component,
  DestroyRef,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from "@angular/core";

/** Pilha de diálogos abertos — Esc fecha apenas o mais recente. */
const openStack: DialogComponent[] = [];

/**
 * Diálogo modal controlado (substitui @radix-ui/react-dialog).
 *
 *   <app-dialog [open]="aberto()" (openChange)="!$event && fechar()"
 *               contentClass="fixed left-1/2 top-1/2 z-50 ...">
 *     ...conteúdo...
 *   </app-dialog>
 *
 * Comportamento equivalente ao Radix:
 *  - renderiza em portal no <body> (escapa de containing blocks como backdrop-blur);
 *  - Esc e clique no overlay emitem openChange(false);
 *  - foco preso dentro do conteúdo e devolvido ao elemento anterior ao fechar;
 *  - scroll do <body> bloqueado enquanto aberto.
 */
@Component({
  selector: "app-dialog",
  imports: [CdkTrapFocus],
  templateUrl: "./dialog.component.html",
})
export class DialogComponent {
  readonly open = input.required<boolean>();
  readonly overlayClass = input(
    "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150",
  );
  readonly contentClass = input.required<string>();
  readonly openChange = output<boolean>();

  private readonly tpl = viewChild.required<TemplateRef<unknown>>("tpl");
  private readonly vcr = inject(ViewContainerRef);
  private readonly document = inject(DOCUMENT);

  private outlet: DomPortalOutlet | null = null;
  private host: HTMLElement | null = null;
  private previousFocus: Element | null = null;
  private previousOverflow = "";

  private readonly onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && openStack[openStack.length - 1] === this) {
      e.preventDefault();
      this.requestClose();
    }
  };

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const tpl = this.tpl();
      untracked(() => (isOpen ? this.attach(tpl) : this.detach()));
    });
    inject(DestroyRef).onDestroy(() => this.detach());
  }

  requestClose(): void {
    this.openChange.emit(false);
  }

  private attach(tpl: TemplateRef<unknown>): void {
    if (this.outlet) return;
    this.previousFocus = this.document.activeElement;
    this.host = this.document.createElement("div");
    this.document.body.appendChild(this.host);
    this.outlet = new DomPortalOutlet(this.host);
    this.outlet.attach(new TemplatePortal(tpl, this.vcr));

    if (openStack.length === 0) {
      this.previousOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = "hidden";
    }
    openStack.push(this);
    this.document.addEventListener("keydown", this.onKeydown);
  }

  private detach(): void {
    if (!this.outlet) return;
    this.outlet.dispose();
    this.host?.remove();
    this.outlet = null;
    this.host = null;

    const idx = openStack.indexOf(this);
    if (idx >= 0) openStack.splice(idx, 1);
    if (openStack.length === 0) this.document.body.style.overflow = this.previousOverflow;
    this.document.removeEventListener("keydown", this.onKeydown);

    const prev = this.previousFocus as HTMLElement | null;
    if (prev && typeof prev.focus === "function" && this.document.contains(prev)) prev.focus();
    this.previousFocus = null;
  }
}
