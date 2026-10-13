import { Directive, ElementRef, afterNextRender, inject } from "@angular/core";

/** Foca o elemento assim que ele é renderizado (equivalente ao `autoFocus` do React). */
@Directive({ selector: "[appAutofocus]" })
export class AutofocusDirective {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => el.focus());
  }
}
