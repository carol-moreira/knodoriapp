import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
} from "@angular/core";

/**
 * Emite `visivel` quando o elemento entra na tela (IntersectionObserver) — sentinela de listas
 * infinitas. Respeita o recorte de containers com overflow. Quando `chave` muda (ex.: tamanho da
 * lista) o elemento é observado de novo, então uma sentinela que continua visível depois de
 * carregar mais itens dispara outra vez.
 *
 *   <div appVisivel [chave]="lista().length" (visivel)="carregarMais()"></div>
 */
@Directive({ selector: "[appVisivel]" })
export class VisivelDirective {
  readonly chave = input<unknown>();
  readonly visivel = output<void>();

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let observer: IntersectionObserver | undefined;
    afterNextRender(() => {
      observer = new IntersectionObserver(
        (entradas) => {
          if (entradas.some((e) => e.isIntersecting)) this.visivel.emit();
        },
        { rootMargin: "120px" },
      );
      observer.observe(el);
    });
    effect(() => {
      this.chave();
      if (!observer) return;
      observer.unobserve(el);
      observer.observe(el);
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}
