import { Component, computed, effect, input, output, signal } from "@angular/core";
import { CheckCircle2, X } from "lucide-angular";
import type { GlobalUser } from "@/lib/admin-types";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { DIALOG_CONTENT_CLS, DIALOG_OVERLAY_CLS, type UserEdit } from "../controle-usuarios.model";

/** Modal de edição de nome/e-mail do usuário. */
@Component({
  selector: "app-edit-user-dialog",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./edit-user-dialog.component.html",
  styleUrl: "./edit-user-dialog.component.scss",
})
export class EditUserDialogComponent {
  readonly user = input.required<GlobalUser | null>();
  readonly closed = output<void>();
  readonly saved = output<UserEdit>();

  protected readonly icons = { CheckCircle2, X };
  protected readonly overlayCls = DIALOG_OVERLAY_CLS;
  protected readonly contentCls = DIALOG_CONTENT_CLS;
  protected readonly val = inputValue;

  protected readonly nome = signal("");
  protected readonly email = signal("");
  protected readonly isSaved = signal(false);
  protected readonly open = computed(() => !!this.user());

  constructor() {
    effect(() => {
      const user = this.user();
      if (user) {
        this.nome.set(user.nome);
        this.email.set(user.email);
        this.isSaved.set(false);
      }
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) {
      this.closed.emit();
      this.isSaved.set(false);
    }
  }

  protected handleSave(): void {
    const user = this.user();
    if (!user) return;
    this.saved.emit({ id: user.id, dados: { nome: this.nome(), email: this.email() } });
    this.isSaved.set(true);
    setTimeout(() => {
      this.isSaved.set(false);
      this.closed.emit();
    }, 800);
  }
}
