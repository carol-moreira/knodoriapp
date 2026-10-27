import { Component, inject } from "@angular/core";
import { DialogComponent } from "../dialog.component";
import { IconDirective } from "../icon.directive";
import { ConfirmService } from "./confirm.service";

/** Pop-up de confirmação de exclusão — uma instância só, na raiz do app. */
@Component({
  selector: "app-confirm-dialog",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./confirm-dialog.component.html",
  styleUrl: "./confirm-dialog.component.scss",
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);

  protected onOpenChange(open: boolean): void {
    if (!open) this.confirm.responder(false);
  }
}
