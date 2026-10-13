import { Component, effect, input, output, signal } from "@angular/core";
import { ChevronLeft, ChevronRight, X } from "lucide-angular";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";

/** Lightbox fullscreen com navegação e tira de miniaturas. */
@Component({
  selector: "app-image-lightbox",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./image-lightbox.component.html",
  styleUrl: "./image-lightbox.component.scss",
})
export class ImageLightboxComponent {
  readonly open = input.required<boolean>();
  readonly images = input.required<string[]>();
  readonly initialIndex = input.required<number>();
  readonly closed = output<void>();

  protected readonly icons = { ChevronLeft, ChevronRight, X };
  protected readonly idx = signal(0);

  constructor() {
    // Sincroniza índice quando o lightbox abre
    effect(() => {
      if (this.open()) this.idx.set(this.initialIndex());
    });

    // Navegação por teclado (ArrowLeft / ArrowRight)
    effect((onCleanup) => {
      if (!this.open()) return;
      const len = this.images().length;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") this.idx.update((i) => (i + 1) % len);
        if (e.key === "ArrowLeft") this.idx.update((i) => (i - 1 + len) % len);
      };
      window.addEventListener("keydown", onKey);
      onCleanup(() => window.removeEventListener("keydown", onKey));
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected prev(): void {
    const len = this.images().length;
    this.idx.update((i) => (i - 1 + len) % len);
  }

  protected next(): void {
    const len = this.images().length;
    this.idx.update((i) => (i + 1) % len);
  }

  protected thumbClass(i: number): string {
    return `shrink-0 h-14 w-14 overflow-hidden rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      i === this.idx()
        ? "border-primary scale-105 shadow-lg shadow-primary/30 opacity-100"
        : "border-white/15 opacity-50 hover:opacity-90 hover:border-white/35"
    }`;
  }
}
