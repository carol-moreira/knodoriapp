import { Component, computed, effect, input, output, signal } from "@angular/core";
import { CheckCircle2, X } from "lucide-angular";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import {
  DIALOG_CONTENT_CLS,
  DIALOG_OVERLAY_CLS,
  ROLE_META,
  type PendingRoleChange,
} from "../controle-usuarios.model";

/** Modal de confirmação de cargo com senha de administrador. */
@Component({
  selector: "app-role-change-dialog",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./role-change-dialog.component.html",
  styleUrl: "./role-change-dialog.component.scss",
})
export class RoleChangeDialogComponent {
  readonly pending = input.required<PendingRoleChange | null>();
  readonly confirmed = output<PendingRoleChange>();
  readonly cancelled = output<void>();

  protected readonly icons = { CheckCircle2, X };
  protected readonly ROLE_META = ROLE_META;
  protected readonly overlayCls = DIALOG_OVERLAY_CLS;
  protected readonly contentCls = DIALOG_CONTENT_CLS;

  protected readonly senha = signal("");
  protected readonly erro = signal("");
  protected readonly open = computed(() => !!this.pending());

  constructor() {
    effect(() => {
      if (this.pending()) {
        this.senha.set("");
        this.erro.set("");
      }
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.cancelled.emit();
  }

  protected onSenhaInput(e: Event): void {
    this.senha.set(inputValue(e));
    this.erro.set("");
  }

  protected handleConfirm(): void {
    const pending = this.pending();
    if (!pending) return;
    if (!this.senha().trim()) {
      this.erro.set("digite sua senha de administrador.");
      return;
    }
    // 🔌 Validar hash da senha via POST /api/admin/verify-password antes de aplicar
    this.confirmed.emit(pending);
  }
}
